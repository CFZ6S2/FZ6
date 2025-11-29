// Helper para verificar reCAPTCHA Enterprise desde el frontend
import { createLogger } from './logger.js';

const logger = createLogger('recaptcha-helper');

// Site key de reCAPTCHA Enterprise
const RECAPTCHA_SITE_KEY = '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w';

// URL de la Cloud Function para verificación
const VERIFY_ENDPOINT = 'https://us-central1-tuscitasseguras-2d1a6.cloudfunctions.net/verifyRecaptcha';

/**
 * Ejecutar reCAPTCHA Enterprise y obtener token
 * @param {string} action - Acción a ejecutar (ej: 'login', 'register', 'submit_form')
 * @returns {Promise<string|null>} Token de reCAPTCHA o null si falla
 */
export async function executeRecaptcha(action) {
  try {
    // Verificar que grecaptcha esté cargado
    if (typeof grecaptcha === 'undefined' || !grecaptcha.enterprise) {
      logger.error('reCAPTCHA Enterprise no está cargado');
      logger.info('💡 Asegúrate de incluir el script de reCAPTCHA en tu HTML');
      return null;
    }

    logger.debug('Ejecutando reCAPTCHA Enterprise', { action });

    // Ejecutar reCAPTCHA
    const token = await grecaptcha.enterprise.execute(RECAPTCHA_SITE_KEY, { action });

    logger.debug('reCAPTCHA token obtenido', {
      action,
      tokenLength: token.length
    });

    return token;
  } catch (error) {
    logger.error('Error ejecutando reCAPTCHA', error, { action });
    return null;
  }
}

/**
 * Verificar token de reCAPTCHA con el backend (Cloud Function)
 * @param {string} token - Token obtenido de grecaptcha.enterprise.execute()
 * @param {string} action - Acción esperada
 * @returns {Promise<Object>} Resultado de la verificación
 */
export async function verifyRecaptchaToken(token, action) {
  try {
    logger.debug('Verificando token con backend', { action });

    const response = await fetch(VERIFY_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        token: token,
        action: action
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      logger.info('✅ reCAPTCHA verificado', {
        score: result.score,
        action: result.action
      });
      return {
        success: true,
        score: result.score,
        action: result.action
      };
    } else {
      logger.warn('⚠️ reCAPTCHA verificación falló', {
        reason: result.reason,
        score: result.score
      });
      return {
        success: false,
        score: result.score || 0,
        reason: result.reason || result.message
      };
    }
  } catch (error) {
    logger.error('Error verificando reCAPTCHA con backend', error);
    return {
      success: false,
      score: 0,
      reason: 'NETWORK_ERROR'
    };
  }
}

/**
 * Ejecutar y verificar reCAPTCHA en un solo paso
 * @param {string} action - Acción a verificar
 * @returns {Promise<boolean>} true si es humano, false si es bot o error
 */
export async function checkRecaptcha(action) {
  try {
    // 1. Ejecutar reCAPTCHA y obtener token
    const token = await executeRecaptcha(action);

    if (!token) {
      logger.warn('No se pudo obtener token de reCAPTCHA');
      return false;
    }

    // 2. Verificar token con el backend
    const result = await verifyRecaptchaToken(token, action);

    return result.success;
  } catch (error) {
    logger.error('Error en verificación completa de reCAPTCHA', error);
    return false;
  }
}

/**
 * Agregar script de reCAPTCHA Enterprise al documento
 * @returns {Promise<void>}
 */
export async function loadRecaptchaScript() {
  return new Promise((resolve, reject) => {
    // Verificar si ya está cargado
    if (typeof grecaptcha !== 'undefined' && grecaptcha.enterprise) {
      logger.debug('reCAPTCHA ya está cargado');
      resolve();
      return;
    }

    // Crear script tag
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      logger.info('✅ Script de reCAPTCHA Enterprise cargado');
      resolve();
    };

    script.onerror = (error) => {
      logger.error('❌ Error cargando script de reCAPTCHA', error);
      reject(error);
    };

    document.head.appendChild(script);
  });
}

// Acciones predefinidas comunes
export const RECAPTCHA_ACTIONS = {
  LOGIN: 'login',
  REGISTER: 'register',
  PASSWORD_RESET: 'password_reset',
  SUBMIT_FORM: 'submit_form',
  PAYMENT: 'payment',
  CONTACT: 'contact',
  PROFILE_UPDATE: 'profile_update',
  MESSAGE_SEND: 'message_send'
};

logger.debug('reCAPTCHA helper module loaded');
