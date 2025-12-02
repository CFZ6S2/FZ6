/**
 * Phone Authentication Module
 *
 * Proporciona autenticación por SMS usando Firebase Phone Auth con reCAPTCHA v2.
 *
 * IMPORTANTE: Este módulo es DIFERENTE e INDEPENDIENTE de App Check:
 * - App Check usa reCAPTCHA Enterprise para proteger recursos de Firebase
 * - Phone Auth usa reCAPTCHA v2 para verificar que el usuario es humano antes de enviar SMS
 *
 * Ambos sistemas pueden coexistir sin conflictos.
 *
 * @module phone-auth
 */

import { auth } from './firebase-config.js';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  signInWithCredential
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { logger } from './logger.js';

// ============================================================================
// ESTADO DEL MÓDULO
// ============================================================================

let recaptchaVerifier = null;
let confirmationResult = null;
let currentPhoneNumber = null;

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const CONFIG = {
  // Contenedor donde se renderizará el reCAPTCHA
  defaultContainerId: 'recaptcha-container',

  // Idioma del widget (español)
  language: 'es',

  // Timeout para SMS (60 segundos)
  smsTimeout: 60000,

  // Países permitidos (puedes restringir)
  allowedCountries: ['ES', 'MX', 'AR', 'CO', 'CL', 'PE', 'VE'],

  // Formato de teléfono para España
  defaultCountryCode: '+34'
};

// ============================================================================
// INICIALIZACIÓN DE RECAPTCHA
// ============================================================================

/**
 * Inicializar reCAPTCHA Visible
 * El usuario verá el widget "No soy un robot" y debe resolverlo
 *
 * @param {string} containerId - ID del div donde renderizar el reCAPTCHA
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<RecaptchaVerifier>}
 *
 * @example
 * await initRecaptchaVisible('recaptcha-container');
 */
export async function initRecaptchaVisible(containerId = CONFIG.defaultContainerId, options = {}) {
  try {
    // Limpiar instancia anterior si existe
    if (recaptchaVerifier) {
      logger.warn('⚠️  Limpiando instancia anterior de reCAPTCHA');
      await cleanupRecaptcha();
    }

    logger.info('🔐 Inicializando reCAPTCHA Visible para Phone Auth...');

    // Verificar que el contenedor existe
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Contenedor #${containerId} no encontrado en el DOM`);
    }

    // Crear RecaptchaVerifier con modo VISIBLE
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'normal',
      callback: (response) => {
        logger.success('✅ reCAPTCHA resuelto correctamente');
        if (options.onSuccess) options.onSuccess(response);
      },
      'expired-callback': () => {
        logger.warn('⚠️  reCAPTCHA expirado, por favor resuelve nuevamente');
        if (options.onExpired) options.onExpired();
      },
      'error-callback': (error) => {
        logger.error('❌ Error en reCAPTCHA:', error);
        if (options.onError) options.onError(error);
      }
    });

    // Renderizar el widget
    await recaptchaVerifier.render();
    logger.success('✅ reCAPTCHA Visible renderizado');

    return recaptchaVerifier;

  } catch (error) {
    logger.error('❌ Error inicializando reCAPTCHA Visible:', error);
    throw error;
  }
}

/**
 * Inicializar reCAPTCHA Invisible
 * El usuario NO verá ningún widget, se dispara automáticamente
 *
 * @param {string} containerId - ID del div contenedor (puede estar oculto)
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<RecaptchaVerifier>}
 *
 * @example
 * await initRecaptchaInvisible('recaptcha-container');
 */
export async function initRecaptchaInvisible(containerId = CONFIG.defaultContainerId, options = {}) {
  try {
    // Limpiar instancia anterior si existe
    if (recaptchaVerifier) {
      logger.warn('⚠️  Limpiando instancia anterior de reCAPTCHA');
      await cleanupRecaptcha();
    }

    logger.info('🔐 Inicializando reCAPTCHA Invisible para Phone Auth...');

    // Verificar que el contenedor existe
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Contenedor #${containerId} no encontrado en el DOM`);
    }

    // Crear RecaptchaVerifier con modo INVISIBLE
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: (response) => {
        logger.success('✅ reCAPTCHA verificado automáticamente');
        if (options.onSuccess) options.onSuccess(response);
      },
      'expired-callback': () => {
        logger.warn('⚠️  reCAPTCHA expirado');
        if (options.onExpired) options.onExpired();
      },
      'error-callback': (error) => {
        logger.error('❌ Error en reCAPTCHA:', error);
        if (options.onError) options.onError(error);
      }
    });

    logger.success('✅ reCAPTCHA Invisible inicializado (no requiere render)');

    return recaptchaVerifier;

  } catch (error) {
    logger.error('❌ Error inicializando reCAPTCHA Invisible:', error);
    throw error;
  }
}

// ============================================================================
// ENVÍO DE SMS
// ============================================================================

/**
 * Enviar código de verificación por SMS
 *
 * @param {string} phoneNumber - Número de teléfono en formato internacional (+34XXXXXXXXX)
 * @param {RecaptchaVerifier} verifier - Instancia de RecaptchaVerifier (opcional si ya existe)
 * @returns {Promise<Object>} - Objeto de confirmación para verificar el código
 *
 * @example
 * const confirmation = await sendSmsCode('+34612345678');
 * // Usuario recibe SMS con código de 6 dígitos
 */
export async function sendSmsCode(phoneNumber, verifier = null) {
  try {
    // Validar formato de teléfono
    if (!phoneNumber || !phoneNumber.startsWith('+')) {
      throw new Error('El número de teléfono debe incluir el código de país (ej: +34612345678)');
    }

    // Usar el verifier proporcionado o el global
    const captchaVerifier = verifier || recaptchaVerifier;

    if (!captchaVerifier) {
      throw new Error('reCAPTCHA no inicializado. Llama a initRecaptchaVisible() o initRecaptchaInvisible() primero');
    }

    logger.info('📱 Enviando SMS a:', phoneNumber);

    // Para reCAPTCHA invisible, verificar manualmente antes de enviar
    if (captchaVerifier.type === 'invisible') {
      logger.debug('Verificando reCAPTCHA invisible...');
      await captchaVerifier.verify();
    }

    // Enviar SMS
    confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, captchaVerifier);
    currentPhoneNumber = phoneNumber;

    logger.success('✅ SMS enviado correctamente a', phoneNumber);
    logger.info('💬 El código expira en 60 segundos');

    return confirmationResult;

  } catch (error) {
    logger.error('❌ Error enviando SMS:', error);

    // Mensajes de error más amigables
    if (error.code === 'auth/invalid-phone-number') {
      throw new Error('Número de teléfono inválido. Usa formato internacional: +34XXXXXXXXX');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Demasiados intentos. Por favor espera unos minutos e intenta de nuevo.');
    } else if (error.code === 'auth/quota-exceeded') {
      throw new Error('Límite de SMS alcanzado. Contacta con soporte.');
    }

    throw error;
  }
}

// ============================================================================
// VERIFICACIÓN DE CÓDIGO SMS
// ============================================================================

/**
 * Verificar código SMS recibido por el usuario
 *
 * @param {string} code - Código de 6 dígitos recibido por SMS
 * @param {Object} confirmation - Objeto de confirmación (opcional si ya existe)
 * @returns {Promise<UserCredential>} - Credenciales del usuario autenticado
 *
 * @example
 * const userCredential = await verifySmsCode('123456');
 * console.log('Usuario autenticado:', userCredential.user.uid);
 */
export async function verifySmsCode(code, confirmation = null) {
  try {
    // Validar formato del código
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      throw new Error('El código debe ser de 6 dígitos numéricos');
    }

    const confirmResult = confirmation || confirmationResult;

    if (!confirmResult) {
      throw new Error('No hay SMS pendiente de verificación. Envía un SMS primero con sendSmsCode()');
    }

    logger.info('🔍 Verificando código SMS...');

    // Confirmar el código
    const userCredential = await confirmResult.confirm(code);

    logger.success('✅ Código verificado correctamente');
    logger.info('👤 Usuario autenticado:', userCredential.user.uid);

    // Limpiar estado
    confirmationResult = null;
    currentPhoneNumber = null;

    return userCredential;

  } catch (error) {
    logger.error('❌ Error verificando código SMS:', error);

    // Mensajes de error más amigables
    if (error.code === 'auth/invalid-verification-code') {
      throw new Error('Código incorrecto. Verifica el SMS recibido.');
    } else if (error.code === 'auth/code-expired') {
      throw new Error('El código ha expirado. Solicita un nuevo SMS.');
    }

    throw error;
  }
}

// ============================================================================
// FUNCIÓN COMPLETA: ENVIAR SMS + ESPERAR CÓDIGO
// ============================================================================

/**
 * Flujo completo de autenticación por SMS
 * Envía SMS y espera que el usuario ingrese el código
 *
 * @param {string} phoneNumber - Número de teléfono en formato internacional
 * @param {Function} getCodeFromUser - Función que obtiene el código del usuario (async)
 * @returns {Promise<UserCredential>}
 *
 * @example
 * // Con prompt (solo para pruebas)
 * const user = await phoneLogin('+34612345678', async () => prompt('Código SMS:'));
 *
 * // Con formulario HTML
 * const user = await phoneLogin('+34612345678', async () => {
 *   return await waitForUserInput('#sms-code-input');
 * });
 */
export async function phoneLogin(phoneNumber, getCodeFromUser) {
  try {
    logger.info('🚀 Iniciando login por SMS...');

    // 1. Enviar SMS
    await sendSmsCode(phoneNumber);

    // 2. Esperar código del usuario
    logger.info('⏳ Esperando código del usuario...');
    const code = await getCodeFromUser();

    if (!code) {
      throw new Error('No se ingresó ningún código');
    }

    // 3. Verificar código
    const userCredential = await verifySmsCode(code);

    logger.success('✅ Login por SMS completado');
    return userCredential;

  } catch (error) {
    logger.error('❌ Error en login por SMS:', error);
    throw error;
  }
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Limpiar instancia de reCAPTCHA
 * Útil antes de crear una nueva instancia o al cambiar de página
 */
export async function cleanupRecaptcha() {
  try {
    if (recaptchaVerifier) {
      logger.debug('🧹 Limpiando reCAPTCHA...');
      await recaptchaVerifier.clear();
      recaptchaVerifier = null;
    }
    confirmationResult = null;
    currentPhoneNumber = null;
  } catch (error) {
    logger.warn('⚠️  Error limpiando reCAPTCHA:', error);
  }
}

/**
 * Formatear número de teléfono para España
 * Convierte "612345678" → "+34612345678"
 */
export function formatSpanishPhone(phone) {
  // Eliminar espacios y caracteres no numéricos
  let cleaned = phone.replace(/\D/g, '');

  // Si empieza con 34, agregar +
  if (cleaned.startsWith('34')) {
    return '+' + cleaned;
  }

  // Si no tiene código de país, asumir España
  if (cleaned.length === 9) {
    return '+34' + cleaned;
  }

  return phone; // Devolver sin cambios si no se puede formatear
}

/**
 * Validar formato de número de teléfono
 */
export function isValidPhoneNumber(phone) {
  // Debe empezar con + seguido de 1-3 dígitos (código país) y 6-14 dígitos más
  const regex = /^\+[1-9]\d{1,3}\d{6,14}$/;
  return regex.test(phone);
}

/**
 * Obtener información del estado actual
 */
export function getPhoneAuthState() {
  return {
    hasRecaptcha: !!recaptchaVerifier,
    hasPendingConfirmation: !!confirmationResult,
    currentPhone: currentPhoneNumber,
    isReady: !!recaptchaVerifier && !confirmationResult
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Inicialización
  initRecaptchaVisible,
  initRecaptchaInvisible,

  // Autenticación
  sendSmsCode,
  verifySmsCode,
  phoneLogin,

  // Utilidades
  cleanupRecaptcha,
  formatSpanishPhone,
  isValidPhoneNumber,
  getPhoneAuthState,

  // Configuración
  CONFIG
};
