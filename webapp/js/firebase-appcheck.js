// Firebase App Check initialization with dynamic providers
// ============================================================================
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider, getToken, onTokenChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js';
import app from './firebase-config.js';
import { logger } from './logger.js';

// Configuration helpers
function getScriptDataset() {
  const currentScript = document.currentScript;
  return currentScript?.dataset || {};
}

function parseList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

// Load configuration from window or data-* attributes
const scriptDataset = getScriptDataset();
const APP_CHECK_PROVIDER = (window.APP_CHECK_PROVIDER || scriptDataset.appCheckProvider || (window.USE_RECAPTCHA_V3 ? 'V3' : null) || 'ENTERPRISE').toUpperCase();
const SITE_KEY_V3 = window.RECAPTCHA_V3_SITE_KEY || scriptDataset.recaptchaV3SiteKey || scriptDataset.siteKey;
const SITE_KEY_ENTERPRISE = window.RECAPTCHA_ENTERPRISE_SITE_KEY || scriptDataset.recaptchaEnterpriseSiteKey;
const ALLOWED_DOMAINS_CONFIG = parseList(window.APP_CHECK_ALLOWED_DOMAINS || scriptDataset.appCheckAllowedDomains);

const DEFAULT_ALLOWED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '[::1]',
  'tucitasegura.com',
  'www.tucitasegura.com',
  'tucitasegura.app',
];

const ALLOWED_DOMAINS = Array.from(new Set([...DEFAULT_ALLOWED_DOMAINS, ...ALLOWED_DOMAINS_CONFIG]));

function isAllowedDomain(hostname) {
  return ALLOWED_DOMAINS.some((allowed) => {
    if (allowed === hostname) return true;
    return hostname.endsWith(`.${allowed}`);
  });
}

const hostname = window.location.hostname;
let appCheckInstance = null;

if (!isAllowedDomain(hostname)) {
  logger.warn('⚠️  App Check no se inicializó: dominio no permitido', { hostname, ALLOWED_DOMAINS });
} else {
  function getProvider() {
    if (APP_CHECK_PROVIDER === 'V3' || APP_CHECK_PROVIDER === 'RECAPTCHAV3') {
      if (!SITE_KEY_V3) {
        throw new Error('Falta la site key para ReCaptcha v3');
      }
      return new ReCaptchaV3Provider(SITE_KEY_V3);
    }

    const siteKey = SITE_KEY_ENTERPRISE || SITE_KEY_V3;
    if (!siteKey) {
      throw new Error('Falta la site key para ReCaptcha Enterprise o v3');
    }
    return new ReCaptchaEnterpriseProvider(siteKey);
  }

  try {
    const provider = getProvider();
    appCheckInstance = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
    logger.info('✅ App Check inicializado', {
      provider: APP_CHECK_PROVIDER,
      hostname,
    });

    onTokenChanged(appCheckInstance, (token) => {
      if (token) {
        logger.debug('🔄 App Check token actualizado', {
          expirationTimeMillis: token.expireTimeMillis,
        });
      }
    });
  } catch (error) {
    logger.error('❌ Error al inicializar App Check', error);
    appCheckInstance = null;
  }
}

export const appCheck = appCheckInstance;
window._appCheckInstance = appCheckInstance;

window.getAppCheckToken = async function (forceRefresh = false) {
  if (!appCheckInstance) {
    logger.error('❌ App Check no está disponible');
    return null;
  }

  try {
    return await getToken(appCheckInstance, forceRefresh);
  } catch (error) {
    logger.error('❌ Error al obtener App Check token', error);
    return null;
  }
};
