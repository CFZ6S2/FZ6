// Firebase App Check - DESACTIVADO TEMPORALMENTE
// Para debugging del problema de login

import app from './firebase-config.js';
import { logger } from './logger.js';

logger.warn('⚠️ App Check DESACTIVADO temporalmente para debugging');
logger.info('🔓 Login funcionará sin verificación de App Check');

// No inicializar App Check
export const appCheck = null;

// Función dummy para compatibilidad
export const getAppCheckToken = async () => {
  logger.warn('App Check desactivado - no se generará token');
  return null;
};
