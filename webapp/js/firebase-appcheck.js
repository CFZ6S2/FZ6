// Firebase App Check Configuration
// Importar ANTES de firebase-config.js en todos los archivos HTML

// ============================================================================
// DEBUG TOKEN - Para evitar bloqueos de reCAPTCHA durante desarrollo
// ============================================================================
// IMPORTANTE: Debe configurarse ANTES de importar firebase-app-check
// Token de depuración de reCAPTCHA - regenerar cada 24h en:
// https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck/apps
const DEBUG_TOKEN = '8279043B-00B6-486C-86E1-83C06DA57DBA';

// TEMPORAL: Activar debug token incluso en producción para evitar throttling
// TODO: Quitar esto cuando App Check esté configurado correctamente
const enableDebugToken = true; // Siempre activado temporalmente

if (enableDebugToken && DEBUG_TOKEN) {
  console.log('🔧 Activando App Check Debug Token ANTES de importar SDK');
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
  globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
}

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import app from './firebase-config.js';
import { logger } from './logger.js';

// ============================================================================
// CONFIGURACIÓN DE APP CHECK CON RECAPTCHA ENTERPRISE
// ============================================================================

// IMPORTANTE: Esta es tu reCAPTCHA ENTERPRISE site key
// reCAPTCHA Enterprise != reCAPTCHA v3 (requiere provider diferente)
const RECAPTCHA_ENTERPRISE_SITE_KEY = '6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2';

// Forzar modo desarrollo en localhost (deshabilita App Check completamente)
const FORCE_DEVELOPMENT_MODE = location.hostname === 'localhost' || 
                               location.hostname === '127.0.0.1' || 
                               location.hostname === '' || // file:// protocol
                               location.protocol === 'file:' ||
                               location.hostname.includes('vercel.app'); // Also disable on Vercel for now

// ============================================================================
// 1. DETECTAR ENTORNO
// ============================================================================
const isDevelopment = FORCE_DEVELOPMENT_MODE ||
                     location.hostname === "localhost" ||
                     location.hostname === "127.0.0.1" ||
                     location.hostname.includes("192.168.");

// Dominios configurados en reCAPTCHA Enterprise
// IMPORTANTE: Solo se inicializará App Check si el dominio está aquí
const ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  'tuscitasseguras-2d1a6.web.app',
  'tuscitasseguras-2d1a6.firebaseapp.com',
  'traext5oyy6q.vercel.app',
  'vercel.app',
  'tucitasegura.com'
];

const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
  location.hostname === domain || location.hostname.includes(domain)
);

// ============================================================================
// PRODUCTION SAFETY CHECK
// ============================================================================
const isProductionVercel = location.hostname.includes('vercel.app') || 
                          location.hostname.includes('traext5oyy6q');

if (isDevelopment) {
  logger.info('🔧 Modo DESARROLLO detectado');
  logger.info('💡 App Check se desactivará para evitar errores');
} else if (isProductionVercel) {
  logger.info('🚀 Producción en Vercel detectada');
  logger.info('🔒 App Check será configurado con medidas de seguridad adicionales');
}

// ============================================================================
// 2. INICIALIZAR APP CHECK CON RECAPTCHA ENTERPRISE
// ============================================================================
let appCheck = null;

// DESACTIVADO TEMPORALMENTE - App Check causando errores 403
logger.warn('⚠️  App Check COMPLETAMENTE DESACTIVADO');
logger.info('💡 La app funcionará sin App Check en todos los entornos');
appCheck = null;

// Código original comentado para referencia futura
/*
// Solo inicializar App Check si el dominio está permitido
if (!isAllowedDomain) {
  logger.warn('⚠️  App Check DESACTIVADO');
  logger.warn(`📍 Dominio actual: ${location.hostname}`);
  logger.info('🔧 Para activar App Check: Ver documentación en firebase-appcheck.js');
  // NO inicializar App Check
  appCheck = null;
} else if (isDevelopment) {
  logger.info('⚠️  App Check COMPLETAMENTE DESACTIVADO en modo desarrollo');
  logger.info('💡 La app funcionará sin App Check en localhost');
  // NO inicializar App Check en desarrollo
  appCheck = null;
} else if (isProductionVercel) {
  logger.warn('⚠️  App Check DESACTIVADO temporalmente en Vercel');
  logger.info('🔧 Configura App Check en Firebase Console para producción');
  // Temporalmente desactivar App Check en Vercel
  appCheck = null;
} else {
  // Dominio permitido y en producción
  try {
    // Validar site key
    if (!RECAPTCHA_ENTERPRISE_SITE_KEY || RECAPTCHA_ENTERPRISE_SITE_KEY === 'YOUR_RECAPTCHA_SITE_KEY') {
      throw new Error('reCAPTCHA Enterprise site key no configurada');
    }

    // Inicializar App Check con reCAPTCHA ENTERPRISE
    logger.info('🔐 Inicializando App Check...');
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true // Auto-refresh tokens antes de expirar
    });

    logger.success('✅ App Check inicializado correctamente');
    logger.info(`📍 Modo: PRODUCCIÓN (${location.hostname})`);
    logger.info('🔑 Provider: reCAPTCHA Enterprise');
  } catch (error) {
    logger.error('❌ Error inicializando App Check:', error.message);
    logger.warn('💡 La app continuará sin App Check');
  }
}
*/

// Hacer appCheck disponible globalmente (útil para debugging)
window._appCheckInstance = appCheck;

// ============================================================================
// 3. FUNCIÓN HELPER PARA OBTENER TOKEN MANUALMENTE (DEBUGGING)
// ============================================================================
window.getAppCheckToken = async function() {
  if (!appCheck) {
    logger.error('App Check no está inicializado');
    return null;
  }

  try {
    const { getToken } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
    const tokenResult = await getToken(appCheck, /* forceRefresh */ false);

    logger.success('✅ App Check Token obtenido');
    logger.debug('Token:', tokenResult.token.substring(0, 50) + '...');
    logger.debug('Expira en:', new Date(Date.now() + 3600000)); // ~1 hora

    return tokenResult;
  } catch (error) {
    logger.error('❌ Error obteniendo token:', error);
    logger.error('Code:', error.code);
    logger.error('Message:', error.message);

    if (error.message.includes('400')) {
      logger.error('🚨 400 BAD REQUEST - Ver documentación de App Check para solución');
    }

    return null;
  }
};

// ============================================================================
// 4. AUTO-VERIFICAR QUE APP CHECK FUNCIONA (SOLO EN PRODUCCIÓN)
// ============================================================================
if (!isDevelopment && appCheck) {
  // Esperar un momento para que App Check se inicialice
  setTimeout(async () => {
    logger.info('🧪 Verificando App Check...');
    const tokenResult = await window.getAppCheckToken();

    if (tokenResult) {
      logger.success('✅ App Check funcionando correctamente');
      logger.info('✅ Todas las requests incluirán App Check tokens');
    } else {
      logger.warn('⚠️  App Check no pudo obtener token');
      logger.info('Ver documentación de App Check para solucionar');
    }
  }, 2000);
}

// Export para usar en otros módulos si es necesario
export { appCheck };
