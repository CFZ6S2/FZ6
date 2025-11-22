// Firebase App Check Configuration
// Importar ANTES de firebase-config.js en todos los archivos HTML

import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";
import app from './firebase-config.js';

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
  console.log('🔧 Modo DESARROLLO detectado');
  console.log('💡 App Check se desactivará para evitar errores');
} else if (isProductionVercel) {
  console.log('🚀 Producción en Vercel detectada');
  console.log('🔒 App Check será configurado con medidas de seguridad adicionales');
}

// ============================================================================
// 2. INICIALIZAR APP CHECK CON RECAPTCHA ENTERPRISE
// ============================================================================
let appCheck = null;

// Solo inicializar App Check si el dominio está permitido
if (!isAllowedDomain) {
  console.warn('⚠️  App Check DESACTIVADO');
  console.warn(`📍 Dominio actual: ${location.hostname}`);
  console.warn('');
  console.warn('🔧 Para activar App Check en este dominio:');
  console.warn('');
  console.warn('1. Ve a Google Cloud Console:');
  console.warn('   https://console.cloud.google.com/security/recaptcha?project=tuscitasseguras-2d1a6');
  console.warn('');
  console.warn('2. Click en la key: 6LfdTvQrAAAAACkGjvbbFIkqHMsTHwRYYZS_CGq2');
  console.warn('');
  console.warn(`3. En "Domains", añade: ${location.hostname}`);
  console.warn('');
  console.warn('4. Guarda y espera 2-3 minutos');
  console.warn('');
  console.warn('5. Añade el dominio a ALLOWED_DOMAINS en firebase-appcheck.js');
  console.warn('');
  console.warn('💡 Mientras tanto, la app funcionará sin App Check');
  console.warn('');
} else if (isDevelopment) {
  console.log('⚠️  App Check COMPLETAMENTE DESACTIVADO en modo desarrollo');
  console.log('💡 La app funcionará sin App Check en localhost');
  console.log('✅ Todas las operaciones funcionarán sin restricciones');
  console.log('🔧 Esto evita el baneo temporal de App Check');
  // NO inicializar App Check en desarrollo
  appCheck = null;
} else if (isProductionVercel) {
  console.log('⚠️  App Check DESACTIVADO temporalmente en Vercel');
  console.log('💡 Para evitar errores de red, App Check se desactivará');
  console.log('🔧 Configura App Check correctamente en Firebase Console');
  console.log('📋 Pasos: https://console.firebase.google.com/project/tuscitasseguras-2d1a6/appcheck');
  // Temporalmente desactivar App Check en Vercel hasta configuración completa
  appCheck = null;
} else {
  // Dominio permitido y en producción
  try {
    // Validar site key
    if (!RECAPTCHA_ENTERPRISE_SITE_KEY || RECAPTCHA_ENTERPRISE_SITE_KEY === 'YOUR_RECAPTCHA_SITE_KEY') {
      throw new Error('reCAPTCHA Enterprise site key no configurada');
    }

    // Inicializar App Check con reCAPTCHA ENTERPRISE
    console.log('🔐 Inicializando App Check...');
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_ENTERPRISE_SITE_KEY),
      isTokenAutoRefreshEnabled: true // Auto-refresh tokens antes de expirar
    });

    console.log('✅ App Check inicializado correctamente');
    console.log(`📍 Modo: PRODUCCIÓN (${location.hostname})`);
    console.log('🔑 Provider: reCAPTCHA Enterprise');
  } catch (error) {
    console.error('❌ Error inicializando App Check:', error.message);
    console.warn('💡 La app continuará sin App Check');
  }
}

// Hacer appCheck disponible globalmente (útil para debugging)
window._appCheckInstance = appCheck;

// ============================================================================
// 3. FUNCIÓN HELPER PARA OBTENER TOKEN MANUALMENTE (DEBUGGING)
// ============================================================================
window.getAppCheckToken = async function() {
  if (!appCheck) {
    console.error('App Check no está inicializado');
    return null;
  }

  try {
    const { getToken } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js");
    const tokenResult = await getToken(appCheck, /* forceRefresh */ false);

    console.log('✅ App Check Token obtenido:');
    console.log('   Token:', tokenResult.token.substring(0, 50) + '...');
    console.log('   Expira en:', new Date(Date.now() + 3600000)); // ~1 hora

    return tokenResult;
  } catch (error) {
    console.error('❌ Error obteniendo token:', error);
    console.error('   Code:', error.code);
    console.error('   Message:', error.message);

    if (error.message.includes('400')) {
      console.error('');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('🚨 400 BAD REQUEST');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('');
      console.error('Causas comunes:');
      console.error('  1. Site key no registrada en Firebase Console App Check');
      console.error('  2. Dominio (localhost) no autorizado en reCAPTCHA');
      console.error('  3. Enforcement activado sin configuración correcta');
      console.error('');
      console.error('SOLUCIÓN RÁPIDA:');
      console.error('  1. Firebase Console → App Check → Overview');
      console.error('  2. Desactiva Enforcement en:');
      console.error('     - Authentication → Unenforced');
      console.error('     - Cloud Firestore → Unenforced');
      console.error('     - Cloud Storage → Unenforced');
      console.error('  3. Recarga la página (Ctrl + Shift + R)');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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
    console.log('🧪 Verificando App Check...');
    const tokenResult = await window.getAppCheckToken();

    if (tokenResult) {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ App Check funcionando correctamente');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ Todas las requests incluirán App Check tokens');
      console.log('✅ NO deberías ver errores 401 o 403');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else {
      console.log('');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚠️  App Check no pudo obtener token');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('');
      console.log('Posibles causas:');
      console.log('  ❌ Debug token no añadido en Firebase Console');
      console.log('  ❌ Site key no registrada en Firebase Console App Check');
      console.log('  ❌ Enforcement activado pero configuración incorrecta');
      console.log('');
      console.log('Pasos para solucionar:');
      console.log('  1. Busca "App Check debug token:" arriba y copia el token');
      console.log('  2. Registra el token en Firebase Console');
      console.log('  3. Verifica que Enforcement está desactivado (Unenforced)');
      console.log('  4. Recarga esta página');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, 2000);
}

// Export para usar en otros módulos si es necesario
export { appCheck };
