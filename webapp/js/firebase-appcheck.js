// Firebase App Check Configuration
// Importar ANTES de firebase-config.js en todos los archivos HTML

// ============================================================================ 
// DEBUG TOKEN - Para evitar bloqueos de reCAPTCHA durante desarrollo
// ============================================================================ 
// El token de debug caduca cada ~24h. Para no redeployar, se puede inyectar de
// varias formas:
// - Query param: ?appcheck_debug_token=<TOKEN>
// - localStorage/sessionStorage: clave APP_CHECK_DEBUG_TOKEN
// - Variable global definida antes de importar este archivo: window.APP_CHECK_DEBUG_TOKEN
// - Marcado inline en el HTML: <script>window.APP_CHECK_DEBUG_TOKEN = '...'</script>
// Si ningún token está presente, no se activará el modo debug.
const DEBUG_TOKEN_STORAGE_KEY = 'APP_CHECK_DEBUG_TOKEN';
const DEBUG_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24h (límite de Firebase)

const parseStoredDebugToken = () => {
  try {
    const raw = localStorage.getItem(DEBUG_TOKEN_STORAGE_KEY) || sessionStorage.getItem(DEBUG_TOKEN_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed.token) return null;

    const isExpired = parsed.savedAt && (Date.now() - parsed.savedAt) > DEBUG_TOKEN_EXPIRATION_MS;
    if (isExpired) {
      console.warn('⚠️  App Check debug token expirado. Genera uno nuevo en Firebase Console.');
      return null;
    }

    return parsed;
  } catch (error) {
    console.warn('⚠️  No se pudo leer el debug token almacenado:', error);
    return null;
  }
};

const resolveDebugToken = () => {
  const fromQuery = new URLSearchParams(window.location.search).get('appcheck_debug_token');
  const fromWindow = window.APP_CHECK_DEBUG_TOKEN;
  const stored = parseStoredDebugToken();

  // Prioridad: query > window var > almacenado
  const token = fromQuery || fromWindow || (stored ? stored.token : null);
  const source = fromQuery ? 'querystring' : fromWindow ? 'window.APP_CHECK_DEBUG_TOKEN' : stored ? 'storage' : null;

  if (!token) return null;

  const payload = { token, savedAt: stored?.savedAt || Date.now(), source };

  // Persistir para no depender del querystring tras el primer uso
  try {
    localStorage.setItem(DEBUG_TOKEN_STORAGE_KEY, JSON.stringify({ token: payload.token, savedAt: payload.savedAt }));
  } catch (error) {
    console.warn('⚠️  No se pudo guardar el debug token en localStorage:', error);
  }

  return payload;
};

const debugTokenPayload = resolveDebugToken();
const DEBUG_TOKEN = debugTokenPayload?.token;
const enableDebugToken = Boolean(DEBUG_TOKEN);

if (enableDebugToken) {
  console.log(`🔧 Activando App Check Debug Token (${debugTokenPayload?.source || 'desconocido'})`);
  console.log('💡 El token expira en ~24h; reemplázalo desde Firebase Console → App Check → Debug tokens.');
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
                               location.protocol === 'file:';

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
  location.hostname === domain || location.hostname.endsWith(`.${domain}`) || location.hostname.includes(domain)
);

// ============================================================================
// PRODUCTION SAFETY CHECK
// ============================================================================
const isProductionVercel = location.hostname.includes('vercel.app') ||
                          location.hostname.includes('traext5oyy6q');

if (isDevelopment && !enableDebugToken) {
  logger.info('🔧 Modo DESARROLLO detectado');
  logger.info('💡 App Check se desactivará salvo que uses un debug token');
} else if (isProductionVercel) {
  logger.info('🚀 Producción en Vercel detectada');
  logger.info('🔒 App Check activo con reCAPTCHA Enterprise');
}

// ============================================================================
// 2. INICIALIZAR APP CHECK CON RECAPTCHA ENTERPRISE
// ============================================================================
let appCheck = null;

// Solo inicializar App Check si el dominio está permitido o si existe debug token
if (!isAllowedDomain && !enableDebugToken) {
  logger.warn('⚠️  App Check DESACTIVADO (dominio no permitido)');
  logger.warn(`📍 Dominio actual: ${location.hostname}`);
  logger.info('💡 Añade el dominio a ALLOWED_DOMAINS o usa un debug token temporal');
  appCheck = null;
} else if (isDevelopment && !enableDebugToken) {
  logger.info('⚠️  App Check desactivado en desarrollo');
  logger.info('💡 Usa ?appcheck_debug_token=<TOKEN> para probar sin esperar 24h');
  appCheck = null;
} else {
  // Dominio permitido o modo debug explícito
  try {
    if (!RECAPTCHA_ENTERPRISE_SITE_KEY || RECAPTCHA_ENTERPRISE_SITE_KEY === 'YOUR_RECAPTCHA_SITE_KEY') {
      throw new Error('reCAPTCHA Enterprise site key no configurada');
    }

    logger.info('🔐 Inicializando App Check...');
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true // Auto-refresh tokens antes de expirar
    });

    logger.success('✅ App Check inicializado correctamente');
    logger.info(`📍 Dominio: ${location.hostname}`);

    if (enableDebugToken) {
      logger.info('🧪 Modo debug activo (token válido por ~24h)');
    }
  } catch (error) {
    logger.error('❌ Error inicializando App Check:', error.message);
    logger.warn('💡 La app continuará sin App Check');
  }
}

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
