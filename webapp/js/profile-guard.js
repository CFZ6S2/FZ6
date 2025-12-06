import { auth, db } from './firebase-config-env.js';
import { doc, getDoc } from "firebase/firestore";
import { logger } from './logger.js';

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

  // 2. Obtener datos de Firestore
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));

    if (!userDoc.exists()) {
      logger.error('Usuario no encontrado en Firestore');
      return {
        isComplete: false,
        missingFields: ['userDocument'],
        userData: null,
        redirectTo: '/login.html'
      };
    }

    const userData = userDoc.data();
    const missingFields = [];

    // 3. Verificar campos requeridos del perfil
    // CAMPOS INMUTABLES (establecidos en registro):
    // - birthDate (fecha de nacimiento)

    // CAMPOS QUE DEBEN COMPLETARSE EN EL PERFIL:
    if (!userData.alias || userData.alias.trim() === '') {
      missingFields.push('alias');
    }

    if (!userData.gender || userData.gender === '') {
      missingFields.push('gender');
    }

    if (!userData.photoURL || userData.photoURL === '') {
      missingFields.push('photo');
    }

    if (!userData.bio || userData.bio.trim() === '') {
      missingFields.push('bio');
    }

    if (!userData.municipio || userData.municipio === '') {
      missingFields.push('location');
    }

    // 4. Verificar que tenga al menos una foto
    if (!userData.photos || userData.photos.length === 0) {
      missingFields.push('photos');
    }

    const isComplete = missingFields.length === 0;

    return {
      isComplete,
      missingFields,
      userData,
      redirectTo: isComplete ? null : '/perfil.html?complete=true'
    };

  } catch (error) {
    logger.error('Error verificando perfil:', error);
    return {
      isComplete: false,
      missingFields: ['error'],
      userData: null,
      redirectTo: '/perfil.html'
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
      if (!silent) {
        logger.warn('Perfil incompleto - redirigiendo');
        const message = getIncompleteProfileMessage(profileCheck.missingFields);
        showBlockMessage(message, 'info');
      }

      setTimeout(() => {
        window.location.href = profileCheck.redirectTo;
      }, 2000);
      return false;
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
