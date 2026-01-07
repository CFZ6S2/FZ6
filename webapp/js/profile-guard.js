// Profile Guard - Bloquea acceso a funcionalidades hasta que el perfil esté completo
// ============================================================================

import { auth, getDb } from './firebase-config-env.js';
import { doc, getDoc } from 'firebase/firestore';
import { logger } from './logger.js';

/**
 * Verifica si el perfil del usuario está completo
 * @returns {Object} { isComplete: boolean, missingFields: string[], userData: Object }
 */
import { apiService } from './api-service.js';

/**
 * Verifica si el perfil del usuario está completo
 * @returns {Object} { isComplete: boolean, missingFields: string[], userData: Object }
 */
export async function checkProfileComplete() {
  const user = auth.currentUser;

  if (!user) {
    return {
      isComplete: false,
      missingFields: ['authentication'],
      userData: null,
      redirectTo: '/login.html'
    };
  }

  // 1. Verificar email
  if (!user.emailVerified) {
    logger.warn('Email no verificado');
    return {
      isComplete: false,
      missingFields: ['emailVerification'],
      userData: null,
      redirectTo: '/verify-email.html'
    };
  }

  // 2. Obtener datos de Firestore usando API (Seguro vs Reglas Client-Side)
  try {
    // CRITICAL FIX: Ensure SDK has token
    const token = await user.getIdToken();
    apiService.setToken(token);

    // Usamos API Service para evitar bloqueos por reglas de Firestore en el cliente
    const response = await apiService.getUserProfile();

    // Si la API no encuentra el usuario, devuelve 404/error manejado
    if (!response || !response.success || !response.profile) {
      logger.warn('Perfil no encontrado via API');
      return {
        isComplete: false,
        missingFields: ['userDocument'],
        userData: null,
        redirectTo: '/perfil.html?complete=true' // Redirect to create profile
      };
    }

    const userData = response.profile;
    const missingFields = [];

    // 3. Verificar campos requeridos del perfil
    if (!userData.alias || userData.alias.trim() === '') missingFields.push('alias');
    if (!userData.gender || userData.gender === '') missingFields.push('gender');
    // PhotoURL could come from auth or profile, the API merges them.
    if (!userData.photoURL || userData.photoURL === '') missingFields.push('photo');
    if (!userData.bio || userData.bio.trim() === '') missingFields.push('bio');
    // Check for city OR municipio OR coordinates
    const loc = userData.municipio || userData.city;
    const hasCoords = (userData.latitude && userData.longitude) || (userData.location && userData.location.lat);

    if ((!loc || loc === '') && !hasCoords) {
      missingFields.push('location');
    }

    // 4. Verificar que tenga al menos una foto (Gallery)
    // The API maps 'photos' to user's gallery array
    if (!userData.photos || !Array.isArray(userData.photos) || userData.photos.length === 0) {
      // Fallback: check legacy field
      if (!userData.galleryPhotos || userData.galleryPhotos.length === 0) {
        missingFields.push('photos');
      }
    }

    const isComplete = missingFields.length === 0;

    return {
      isComplete,
      missingFields,
      userData,
      redirectTo: isComplete ? null : '/perfil.html?complete=true'
    };

  } catch (error) {
    logger.error('Error verificando perfil via API:', error);
    // CRITICAL FIX: Stop infinite loop on error (e.g. Network error)
    // Return incomplete but DO NOT loop redirect if error is severe
    return {
      isComplete: false,
      missingFields: ['error'],
      userData: null,
      redirectTo: null
    };
  }
}

/**
 * Bloquea el acceso a una página si el perfil no está completo
 * Redirige automáticamente si falta algo
 *
 * @param {Object} options - Opciones de configuración
 * @param {boolean} options.requireEmailVerification - Requiere email verificado (default: true)
 * @param {boolean} options.requireCompleteProfile - Requiere perfil completo (default: true)
 * @param {boolean} options.silent - No mostrar mensajes (default: false)
 */
export async function guardPage(options = {}) {
  const {
    requireEmailVerification = true,
    requireCompleteProfile = true,
    silent = false
  } = options;

  // Esperar a que Firebase Auth se inicialice
  const user = await new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });

  // 1. Verificar autenticación
  if (!user) {
    if (!silent) {
      logger.warn('Usuario no autenticado - redirigiendo a login');
    }
    window.location.href = '/login.html';
    return false;
  }

  // 2. Verificar email si es requerido
  if (requireEmailVerification && !user.emailVerified) {
    if (!silent) {
      logger.warn('Email no verificado - redirigiendo');
      showBlockMessage('Debes verificar tu email antes de continuar', 'warning');
    }
    setTimeout(() => {
      window.location.href = '/verify-email.html';
    }, 2000);
    return false;
  }

  // 3. Verificar perfil completo si es requerido
  if (requireCompleteProfile) {
    const profileCheck = await checkProfileComplete();

    if (!profileCheck.isComplete) {
      const currentPath = window.location.pathname;
      const isAlreadyOnProfile = currentPath.includes('perfil.html');

      if (!silent) {
        // Only warn if NOT on profile page
        if (!isAlreadyOnProfile) {
          logger.warn('Perfil incompleto - redirigiendo');
          const message = getIncompleteProfileMessage(profileCheck.missingFields);
          showBlockMessage(message, 'info');
        }
      }

      setTimeout(() => {
        if (profileCheck.redirectTo && !isAlreadyOnProfile) {
          window.location.href = profileCheck.redirectTo;
        } else if (isAlreadyOnProfile) {
          // Si ya estamos en perfil, no hacer nada (permitir edición)
          logger.info('Ya en página de perfil, permitiendo edición.');
        } else {
          logger.warn('🚫 Redirección cancelada (Destino nulo/error)');
        }
      }, 2000);
      return false; // Return false but stay on page if isAlreadyOnProfile
    }
  }

  // Todo OK - permitir acceso
  return true;
}

/**
 * Obtiene un mensaje descriptivo de lo que falta en el perfil
 */
function getIncompleteProfileMessage(missingFields) {
  if (missingFields.includes('emailVerification')) {
    return '📧 Debes verificar tu email antes de continuar';
  }

  if (missingFields.includes('authentication')) {
    return '🔐 Debes iniciar sesión para acceder';
  }

  const messages = {
    alias: 'nombre de usuario',
    gender: 'género',
    photo: 'foto de perfil',
    photos: 'al menos una foto',
    bio: 'biografía',
    location: 'ubicación'
  };

  const missing = missingFields
    .filter(field => messages[field])
    .map(field => messages[field]);

  if (missing.length === 0) {
    return '⚠️ Tu perfil está incompleto';
  }

  return `⚠️ Completa tu perfil: falta ${missing.join(', ')}`;
}

/**
 * Muestra un mensaje de bloqueo en pantalla
 */
function showBlockMessage(message, type = 'warning') {
  // Crear overlay de bloqueo
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
  overlay.innerHTML = `
    <div class="glass-strong rounded-2xl p-8 max-w-md mx-4 text-center animate-fade-in">
      <i class="fas ${type === 'warning' ? 'fa-exclamation-triangle text-yellow-400' : 'fa-info-circle text-blue-400'} text-6xl mb-4"></i>
      <h2 class="text-2xl font-bold mb-4 text-white">${message}</h2>
      <p class="text-slate-300 mb-6">Serás redirigido automáticamente...</p>
      <div class="w-full bg-slate-700 rounded-full h-2">
        <div class="bg-blue-500 h-2 rounded-full animate-pulse" style="width: 100%; animation: shrink 2s linear;"></div>
      </div>
    </div>
  `;

  // Agregar estilo de animación
  const style = document.createElement('style');
  style.textContent = `
    @keyframes shrink {
      from { width: 100%; }
      to { width: 0%; }
    }
    .animate-fade-in {
      animation: fadeIn 0.3s ease-in;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
  `;
  document.head.appendChild(style);
  document.body.appendChild(overlay);
}

/**
 * Verifica el perfil en tiempo real y actualiza la UI
 * Útil para mostrar badges de "perfil completo" etc.
 */
export async function getProfileCompletionPercentage() {
  const profileCheck = await checkProfileComplete();

  if (!profileCheck.userData) {
    return 0;
  }

  const requiredFields = ['alias', 'gender', 'photoURL', 'bio', 'municipio', 'photos'];
  const completedFields = requiredFields.filter(field => {
    if (field === 'photos') {
      return profileCheck.userData.photos && profileCheck.userData.photos.length > 0;
    }
    if (field === 'alias' || field === 'gender') {
      return profileCheck.userData[field] && profileCheck.userData[field].trim() !== '';
    }
    return profileCheck.userData[field] && profileCheck.userData[field] !== '';
  });

  const emailVerified = auth.currentUser?.emailVerified ? 1 : 0;
  const totalFields = requiredFields.length + 1; // +1 por email verification
  const completed = completedFields.length + emailVerified;

  return Math.round((completed / totalFields) * 100);
}

/**
 * Inicializa el guardián en una página
 * Ejecuta la verificación cuando el usuario se autentica
 */
export function initProfileGuard(options = {}) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      await guardPage(options);
    } else {
      // No autenticado - redirigir a login
      if (!options.silent) {
        logger.warn('Usuario no autenticado');
      }
      window.location.href = '/login.html';
    }
  });
}
