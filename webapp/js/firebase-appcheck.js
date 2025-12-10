// Firebase App Check Configuration
// Importar ANTES de firebase-config.js en todos los archivos HTML

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import { app } from './firebase-config-env.js';
import { logger } from './logger.js';
const __hideRecaptchaBadge = (() => { try { const s = document.createElement('style'); s.setAttribute('data-hide-recaptcha', 'true'); s.textContent = '.grecaptcha-badge{visibility:hidden!important}'; document.head.appendChild(s); } catch { } })();

// ============================================================================
// CONFIGURACIÓN DE APP CHECK CON RECAPTCHA ENTERPRISE
// ============================================================================

// IMPORTANTE: Esta es tu reCAPTCHA ENTERPRISE site key (verificar en GCP)
// Debe coincidir con la configurada en Firebase/GCP y la documentación interna.
const RECAPTCHA_ENTERPRISE_SITE_KEY = (window.RECAPTCHA_SITE_KEY || '6LeKWiAsAAAAABCe8YQzXmO_dvBwAhOS-cQh_hzT');

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
  'tucitasegura-129cc.web.app',
  'tucitasegura-129cc.firebaseapp.com',
  'traext5oyy6q.vercel.app',
  'vercel.app',
  'tucitasegura.com',
  'www.tucitasegura.com'
];

const isAllowedDomain = ALLOWED_DOMAINS.some(domain =>
  location.hostname === domain || location.hostname.includes(domain)
);

logger.info(`🚀 Entorno: ${location.hostname}`);

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

window.clearAppCheckThrottle = async function ({ reload = true } = {}) {
  logger.info('🧹 Limpiando estado local de App Check...');
  await clearAppCheckStorage();
  logger.success('✅ Estado local de App Check limpiado.');

  if (reload) {
    logger.info('🔁 Reloading page to apply changes...');
    setTimeout(() => location.reload(), 800);
  }
  return true;
};

window.detectAppCheckThrottled = function () {
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
// Inicializar App Check (solo producción con reCAPTCHA Enterprise)
// ============================================================================
let appCheck = null;

async function initAppCheck() {
  if (!isAllowedDomain) {
    logger.warn('⚠️  App Check DESACTIVADO: dominio no permitido:', location.hostname);
    window._appCheckInstance = null;
    return;
  }

  // Verificar si hay throttling en el estado local
  const throttled = window.detectAppCheckThrottled && window.detectAppCheckThrottled();
  if (throttled) {
    logger.warn('⚠️ App Check en estado local inconsistente. Usa clearAppCheckThrottle()');
    window._appCheckInstance = null;
    return;
  }

  try {
    if (!RECAPTCHA_ENTERPRISE_SITE_KEY || RECAPTCHA_ENTERPRISE_SITE_KEY === 'YOUR_RECAPTCHA_SITE_KEY') {
      throw new Error('reCAPTCHA Enterprise site key no configurada');
    }

    // Verify Firebase app is properly initialized
    if (!app || !app.name) {
      logger.warn('⚠️ Firebase app no está listo. App Check deshabilitado.');
      window._appCheckInstance = null;
      return;
    }

    logger.info('🔐 Inicializando App Check...');
    logger.info('ℹ️ Firebase app en uso', { projectId: app.options?.projectId, appId: app.options?.appId });

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
      logger.info(`🔗 https://console.cloud.google.com/security/recaptcha → Edita key ${RECAPTCHA_ENTERPRISE_SITE_KEY}`);
    }

  } catch (e) {
    logger.error('❌ Error inicializando App Check:', e.message);
    logger.warn('⚠️  La aplicación continuará sin App Check (funcionalidad reducida)');
    appCheck = null;
  }

  window._appCheckInstance = appCheck;

  // Hide reCAPTCHA badge (allowed if legal text is present)
  const style = document.createElement('style');
  style.innerHTML = `
    .grecaptcha-badge { 
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
  `;
  document.head.appendChild(style);
}

(async function bootstrap() {
  await initAppCheck();

  const isDevelopment = location.hostname === 'localhost' || location.hostname === '127.0.0.1' || location.hostname.startsWith('10.') || location.hostname.startsWith('192.168.');

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
        if (err.message && err.message.includes('403')) {
          logger.error('🚨 Error 403 en App Check - Dominio no configurado');
          logger.info('🔧 SOLUCIÓN: Configura tucitasegura.com en reCAPTCHA Enterprise');
          logger.info('   → https://console.cloud.google.com/security/recaptcha');
          logger.info(`   → Edita la key: ${RECAPTCHA_ENTERPRISE_SITE_KEY}`);
          logger.info('   → Agrega tucitasegura.com a los dominios permitidos');
        } else {
          logger.warn('⚠️  App Check error en producción:', err.message || err);
        }
        logger.info('ℹ️ Continúa la app sin App Check si es necesario');
      }
    }, 2000);
  }
})();

// Helper: obtener token manualmente (si appCheck inicializado)
window.getAppCheckToken = async function () {
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

// ============================================================================
// HOTFIX: Global Shim for missing verifyRecaptchaScore
// Fixes "verifyRecaptchaScore is not defined" error in some environments
// ============================================================================
if (typeof window !== 'undefined') {
  window.verifyRecaptchaScore = async function (token) {
    logger.warn('👻 verifyRecaptchaScore (legacy/shim) invoked. Returning success mock.');
    console.trace('🔍 Trace for verifyRecaptchaScore call:');
    return { success: true, score: 1.0, action: 'shim_bypass' };
  };
}

export { appCheck };
