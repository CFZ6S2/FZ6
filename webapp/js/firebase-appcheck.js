// Firebase App Check - COMPLETAMENTE DESACTIVADO
// ============================================================================
// App Check ha sido desactivado para evitar errores 403 y problemas de throttling
// ============================================================================

import { logger } from './logger.js';

logger.warn('⚠️  App Check COMPLETAMENTE DESACTIVADO');
logger.info('💡 La app funcionará sin App Check en todos los entornos');

// App Check está desactivado - exportamos null
export const appCheck = null;

// Hacer appCheck disponible globalmente para compatibilidad
window._appCheckInstance = null;

// Función helper desactivada - siempre retorna null
window.getAppCheckToken = async function() {
  logger.error('❌ App Check está desactivado');
  return null;
};
