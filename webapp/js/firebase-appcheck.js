// Firebase App Check Configuration
// Importar ANTES de firebase-config.js en todos los archivos HTML

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import app from './firebase-config.js';
import { logger } from './logger.js';

// ============================================================================
// AUTO-LIMPIEZA AGRESIVA DE THROTTLE DE APP CHECK
// ============================================================================
(function autoCleanAppCheckThrottle() {
  try {
    // Verificar si ya se limpió en esta sesión
    if (sessionStorage.getItem('appCheckCleaned')) {
      return; // Ya se limpió, no hacerlo de nuevo
    }

    // Detectar si hay throttle de App Check
    const storageKeys = Object.keys(localStorage);
    let needsClean = false;

    // Buscar CUALQUIER dato de App Check (no solo throttled)
    storageKeys.forEach(key => {
      if (key.includes('firebase') ||
          key.includes('appCheck') ||
          key.includes('app-check') ||
          key.toLowerCase().includes('recaptcha')) {
        needsClean = true;
      }
    });

    // SIEMPRE limpiar en la primera carga para asegurar
    if (needsClean || !sessionStorage.getItem('appCheckCleaned')) {
      console.warn('🧹 LIMPIEZA COMPLETA de App Check y Firebase...');

      // 1. Limpiar TODOS los datos de Firebase en localStorage
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (key.includes('firebase') ||
            key.includes('appCheck') ||
            key.includes('app-check') ||
            key.toLowerCase().includes('recaptcha')) {
          console.log('🗑️ Eliminando:', key);
          localStorage.removeItem(key);
        }
      });

      // 2. Limpiar sessionStorage también
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (key.includes('firebase') ||
            key.includes('appCheck') ||
            key !== 'appCheckCleaned') { // Mantener nuestra flag
          sessionStorage.removeItem(key);
        }
      });

      // 3. Limpiar TODAS las bases de datos IndexedDB de Firebase
      if (window.indexedDB) {
        const databasesToDelete = [
          'firebase-app-check-database',
          'firebaseLocalStorageDb',
          'firebase-heartbeat-database',
          'firebase-installations-database'
        ];

        databasesToDelete.forEach(dbName => {
          try {
            console.log('🗑️ Eliminando DB:', dbName);
            indexedDB.deleteDatabase(dbName);
          } catch (e) {
            console.warn('No se pudo eliminar DB:', dbName, e);
          }
        });
      }

      // Marcar que ya se limpió
      sessionStorage.setItem('appCheckCleaned', 'true');

      console.info('✅ Limpieza completa. Recargando en 1 segundo...');

      // Recargar página después de limpiar
      setTimeout(() => {
        location.reload();
      }, 1000);

      return; // Detener ejecución del resto del script
    }
  } catch (error) {
    console.error('Error al limpiar throttle de App Check:', error);
  }
})();

// ============================================================================
// CONFIGURACIÓN DE APP CHECK CON RECAPTCHA ENTERPRISE
// ============================================================================

// IMPORTANTE: Esta es tu reCAPTCHA ENTERPRISE site key (verificar en GCP)
// Debe coincidir con la configurada en Firebase/GCP y la documentación interna.
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
  'tucitasegura.com',
  'www.tucitasegura.com'
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
  logger.info('🧹 Clearing App Check state...');
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
  // DESHABILITADO TEMPORALMENTE (24h) para solucionar problemas de throttle
  logger.warn('🚨 App Check DESHABILITADO TEMPORALMENTE (24h) - Solución de throttle');
  logger.info('ℹ️  La aplicación funciona normalmente sin App Check durante este período');
  window._appCheckInstance = null;
  return;

  /* CÓDIGO ORIGINAL COMENTADO - REACTIVAR DESPUÉS DE 24H
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
  const throttled = window.detectAppCheckThrottled && window.detectAppCheckThrottled();
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
      logger.info('🔗 https://console.cloud.google.com/security/recaptcha → Edita key 6LfdTvQrAAAAA...');
    }

  } catch (e) {
    // Suppress ReCAPTCHA configuration errors in production
    const isReCaptchaError = e.message && (
      e.message.includes('recaptcha') ||
      e.message.includes('ReCAPTCHA') ||
      e.code === 'appCheck/recaptcha-error'
    );

    if (isReCaptchaError) {
      logger.warn('⚠️  App Check: ReCAPTCHA no disponible (continuando sin App Check)');
      if (isDevelopment) {
        logger.info('💡 Para desarrollo: Configura un debug token o usa localhost');
      }
    } else {
      logger.error('❌ Error inicializando App Check:', e.message);
    }

    logger.info('✅ La aplicación funciona normalmente sin App Check');
    appCheck = null;
  }

  window._appCheckInstance = appCheck;
  */
}

// DESHABILITADO TEMPORALMENTE (24h) - Bootstrap de App Check
/* CÓDIGO ORIGINAL COMENTADO - REACTIVAR DESPUÉS DE 24H
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
        // Manejar errores de ReCAPTCHA y throttling de manera más silenciosa
        const errorCode = err.code || '';
        const errorMsg = err.message || '';

        if (errorMsg.includes('throttled') || errorCode === 'appCheck/throttled') {
          logger.warn('⚠️  App Check: Límite de solicitudes alcanzado (continuando sin App Check)');
          if (isDevelopment) {
            logger.info('💡 Desarrollo: Visita /webapp/clear-appcheck-throttle.html para limpiar');
          }
        } else if (errorMsg.includes('403') || errorMsg.includes('recaptcha') || errorCode === 'appCheck/recaptcha-error') {
          logger.warn('⚠️  App Check: ReCAPTCHA no disponible (continuando sin App Check)');
          if (isDevelopment) {
            logger.info('💡 Desarrollo: Configura dominio en Google Cloud Console');
            logger.info('   → https://console.cloud.google.com/security/recaptcha');
          }
        } else if (errorMsg.includes('400')) {
          // Suppress 400 errors - these are typically ReCAPTCHA configuration issues
          logger.warn('⚠️  App Check: Configuración de ReCAPTCHA pendiente (continuando sin App Check)');
        } else {
          // Only log unexpected errors
          logger.debug('App Check token error:', errorMsg);
        }
        // Don't log success message - it's confusing when there's an error
      }
    }, 2000);
  }
})();
*/

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
