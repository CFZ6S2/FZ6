// Firebase App Check Configuration
// Importar ANTES de firebase-config.js en todos los archivos HTML

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import app from './firebase-config.js';
import { logger } from './logger.js';

// ============================================================================
// CONFIGURACIÓN DE APP CHECK CON RECAPTCHA ENTERPRISE
// ============================================================================

// IMPORTANTE: Esta es tu reCAPTCHA ENTERPRISE site key (verificar en GCP)
const RECAPTCHA_ENTERPRISE_SITE_KEY = '6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w';

// Detectar entorno
const FORCE_DEVELOPMENT_MODE = location.hostname === 'localhost' ||
                               location.hostname === '127.0.0.1' ||
                               location.hostname === '' ||  // file://
                               location.protocol === 'file:';

const isDevelopment = FORCE_DEVELOPMENT_MODE ||
                      location.hostname === "localhost" ||
                      location.hostname === "127.0.0.1" ||
                      location.hostname.includes("192.168.");

// Dominios configurados en reCAPTCHA Enterprise
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

if (isDevelopment) {
  logger.info('🔧 Modo DESARROLLO detectado');
} else {
  logger.info(`🚀 Entorno: ${location.hostname}`);
}

// ============================================================================
// DEBUG TOKEN: sólo en desarrollo
// - No dejar enabled en producción.
// - Para desarrollo: establece window.__FIREBASE_APPCHECK_DEBUG_TOKEN antes de cargar
//   este archivo o en la consola, y registra el token en Firebase Console.
// ============================================================================
const DEBUG_TOKEN =
  (typeof window !== 'undefined' &&
    (window.__FIREBASE_APPCHECK_DEBUG_TOKEN || window.FIREBASE_APPCHECK_DEBUG_TOKEN)) ||
  null;

const enableDebugToken = isDevelopment && !!DEBUG_TOKEN;

if (enableDebugToken) {
  logger.info('🔧 Activando App Check Debug Token (DESARROLLO) ANTES de inicializar SDK');
  try {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
    globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
    window.FIREBASE_APPCHECK_DEBUG_TOKEN = DEBUG_TOKEN;
  } catch (e) {
    logger.warn('⚠️  No se pudo establecer debug token globalmente:', e.message);
  }
} else if (DEBUG_TOKEN && !isDevelopment) {
  logger.warn('⚠️  Debug token detectado pero NO estamos en desarrollo — ignorándolo para producción');
}

// ============================================================================
// Funciones para detectar y limpiar el throttling de App Check (24h)
// Sólo ejecutarlas en desarrollo (no borrar datos en producción)
// ============================================================================
function keysToRemoveFromStorage() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k) continue;
    if (k.includes('firebase') || k.includes('appCheck') || k.includes('fac') || k.includes('heartbeat') || k.includes('firebaseLocalStorage')) {
      keys.push(k);
    }
  }
  return keys;
}

async function clearIndexedDBDatabases() {
  if (!window.indexedDB) return;
  const dbs = [
    'firebaseLocalStorageDb',
    'firebase-app-check-database',
    'firebase-heartbeat-database',
    'firebase-installations-database'
  ];
  const promises = dbs.map(name => {
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(name);
      req.onsuccess = () => resolve({ name, ok: true });
      req.onerror = () => resolve({ name, ok: false });
      req.onblocked = () => resolve({ name, ok: false });
    });
  });
  return Promise.all(promises);
}

async function clearAppCheckStorage() {
  if (!isDevelopment) {
    logger.warn('⚠️  clearAppCheckStorage llamada fuera de desarrollo — abortando');
    return false;
  }

  const lsKeys = keysToRemoveFromStorage();
  lsKeys.forEach(k => {
    try { localStorage.removeItem(k); logger.debug('Removed localStorage:', k); } catch (e) { logger.debug('Could not remove localStorage key', k, e.message); }
  });

  const ssKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i);
    if (!k) continue;
    if (k.includes('firebase') || k.includes('appCheck') || k.includes('fac') || k.includes('heartbeat')) {
      ssKeys.push(k);
    }
  }
  ssKeys.forEach(k => {
    try { sessionStorage.removeItem(k); logger.debug('Removed sessionStorage:', k); } catch (e) { logger.debug('Could not remove sessionStorage key', k, e.message); }
  });

  const dbResults = await clearIndexedDBDatabases();
  logger.info('🧹 IndexedDB cleared results:', dbResults);
  return true;
}

window.clearAppCheckThrottle = async function({ reload = true } = {}) {
  if (!isDevelopment) {
    logger.warn('⚠️  clearAppCheckThrottle is allowed only in development');
    return false;
  }
  logger.info('🧹 Clearing App Check state (development only)...');
  await clearAppCheckStorage();
  logger.success('✅ App Check state cleared locally. Si enforcement estaba activo, recuérdalo en Firebase Console.');

  if (reload) {
    logger.info('🔁 Reloading page to apply changes...');
    setTimeout(() => location.reload(), 800);
  }
  return true;
};

window.detectAppCheckThrottled = function() {
  // Detecta indicios de throttling en localStorage (busca el texto 'appCheck/throttled')
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const val = localStorage.getItem(key) || '';
    if (val.includes('appCheck/throttled') || val.includes('Requests throttled')) {
      return true;
    }
  }
  return false;
};

// ============================================================================
// Inicializar App Check (solo si dominio permitido y en producción
// o con debug token en dev)
// ============================================================================
let appCheck = null;

async function initAppCheck() {
  if (!isAllowedDomain) {
    logger.warn('⚠️  App Check DESACTIVADO: dominio no permitido:', location.hostname);
    window._appCheckInstance = null;
    return;
  }

  // En desarrollo sin debug token: no inicializar App Check
  if (isDevelopment && !enableDebugToken) {
    logger.info('⚠️  App Check DESACTIVADO en desarrollo (no hay debug token configurado).');
    window._appCheckInstance = null;
    return;
  }

  // Si estamos en desarrollo y parece throttleado, no lo inicializamos hasta limpiar
  const throttled = isDevelopment && window.detectAppCheckThrottled();
  if (throttled) {
    logger.error('🚨 App Check parece throttled (bloqueo 24h). Llama a clearAppCheckThrottle() o abre /webapp/clear-appcheck-throttle.html para limpiar estado local.');
    window._appCheckInstance = null;
    return;
  }

  try {
    if (!RECAPTCHA_ENTERPRISE_SITE_KEY || RECAPTCHA_ENTERPRISE_SITE_KEY === 'YOUR_RECAPTCHA_SITE_KEY') {
      throw new Error('reCAPTCHA Enterprise site key no configurada');
    }

    logger.info('🔐 Inicializando App Check...');

    // Configuración con manejo de errores mejorado
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true
    });

    logger.success('✅ App Check inicializado correctamente');
    logger.info(`📍 Modo: ${isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN'} (${location.hostname})`);

    // Instrucciones de configuración para producción
    if (location.hostname === 'tucitasegura.com') {
      logger.info('📝 Si ves errores 403: Configura tucitasegura.com en Google Cloud Console');
      logger.info('🔗 https://console.cloud.google.com/security/recaptcha → Edita key 6Lc4QBcsAAAAA...');
    }

  } catch (e) {
    logger.error('❌ Error inicializando App Check:', e.message);
    logger.warn('⚠️  La aplicación continuará sin App Check (funcionalidad reducida)');
    appCheck = null;
  }

  window._appCheckInstance = appCheck;
}

(async function bootstrap() {
  await initAppCheck();

  // En producción, prueba a conseguir un token automáticamente
  if (!isDevelopment && appCheck) {
    setTimeout(async () => {
      try {
        const { getToken } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
        const tokenResult = await getToken(appCheck, false);
        if (tokenResult && tokenResult.token) {
          logger.success('✅ App Check token obtenido (producción)');
        } else {
          logger.warn('⚠️  No fue posible obtener App Check token en producción');
        }
      } catch (err) {
        // Manejar errores de throttling específicamente
        if (err.message && err.message.includes('throttled')) {
          logger.error('🚨 App Check throttled (403) - Bloqueo de 24h activo');
          logger.info('🔧 SOLUCIÓN 1: Limpia el cache del navegador');
          logger.info('   → Abre /webapp/clear-appcheck-throttle.html');
          logger.info('   → O presiona Ctrl+Shift+Delete y borra todo');
          logger.info('🔧 SOLUCIÓN 2: Configura reCAPTCHA Enterprise correctamente');
          logger.info('   → https://console.cloud.google.com/security/recaptcha');
          logger.info('   → Agrega tucitasegura.com a dominios permitidos');
          logger.info('💡 La aplicación funcionará sin App Check mientras tanto');
        } else if (err.message && err.message.includes('403')) {
          logger.error('🚨 Error 403 en App Check - Dominio no configurado');
          logger.info('🔧 SOLUCIÓN: Configura tucitasegura.com en reCAPTCHA Enterprise');
          logger.info('   → https://console.cloud.google.com/security/recaptcha');
          logger.info('   → Edita la key: 6Lc4QBcsAAAAACFZLEgaTz3DuLGiBuXpScrBKt7w');
          logger.info('   → Agrega tucitasegura.com a los dominios permitidos');
        } else {
          logger.warn('⚠️  App Check error en producción:', err.message || err);
        }
        logger.info('✅ Firebase Auth y Firestore funcionan sin App Check');
      }
    }, 2000);
  }
})();

// Helper: obtener token manualmente (si appCheck inicializado)
window.getAppCheckToken = async function() {
  if (!window._appCheckInstance) {
    logger.error('App Check no está inicializado');
    return null;
  }
  try {
    const { getToken } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
    const tokenResult = await getToken(window._appCheckInstance, false);
    logger.success('✅ App Check Token obtenido');
    return tokenResult;
  } catch (e) {
    logger.error('❌ Error obteniendo token:', e.message || e);
    return null;
  }
};

export { appCheck };
