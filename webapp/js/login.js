
// Firebase configuration
// Firebase configuration (AppCheck lazy loaded below)
// import './firebase-appcheck.js';
import { auth } from './firebase-config-env.js';
import { sanitizer } from './sanitizer.js';
import { RateLimiters, showRateLimitError } from './rate-limiter.js';
import { validators } from './input-validator.js';
import { SecurityLogger } from './security-logger.js';
import { logger } from './logger.js';
import { handleFirebaseNetworkError, showNetworkError } from './network-error-handler.js';
import { isDemoMode, getDemoUser, initializeDemoMode } from './demo-mode.js';
import {
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    setPersistence,
    browserSessionPersistence,
    browserLocalPersistence

} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Check if already logged in
auth.onAuthStateChanged((user) => {
    if (user && user.emailVerified) {
        console.log('🔄 User already authenticated and verified. Auto-redirecting to dashboard...', {
            uid: user.uid,
            email: user.email
        });
        // Already logged in, redirect to app
        window.location.href = '/dashboard.html';
    } else if (user && !user.emailVerified) {
        console.warn('⚠️ User authenticated but email not verified. Staying on login page.', {
            uid: user.uid,
            email: user.email
        });
    } else {
        console.log('👤 No authenticated user. Login page ready.');
    }
});

// Lazy Load AppCheck (Performance Optimization)
let appCheckLoaded = false;
const loadAppCheck = async () => {
    if (appCheckLoaded) return;
    appCheckLoaded = true;
    console.log('[Login] 🚀 Starting Lazy AppCheck Load...');

    try {
        console.log('🛡️ Lazy Loading AppCheck...');
        await import('./firebase-appcheck.js');
        console.log('[Login] ✅ AppCheck module loaded');
    } catch (e) {
        console.error('[Login] ❌ Failed to load AppCheck:', e);
    }
};

// Trigger AppCheck on interaction or timeout
const interactionEvents = ['click', 'keydown', 'touchstart', 'focusin'];
const triggerLazyLoad = () => {
    loadAppCheck();
    interactionEvents.forEach(e => window.removeEventListener(e, triggerLazyLoad));
};

interactionEvents.forEach(e => window.addEventListener(e, triggerLazyLoad, { once: true, passive: true }));
// Also triggers after 4s just in case
setTimeout(loadAppCheck, 4000);

// Toast notification function
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `glass-strong rounded-lg p-4 shadow-lg transform transition-all duration-300 ${type === 'success' ? 'border-l-4 border-green-500' :
        type === 'error' ? 'border-l-4 border-red-500' :
            type === 'warning' ? 'border-l-4 border-yellow-500' :
                'border-l-4 border-blue-500'
        }`;

    const icon = type === 'success' ? 'fa-check-circle' :
        type === 'error' ? 'fa-exclamation-circle' :
            type === 'warning' ? 'fa-exclamation-triangle' :
                'fa-info-circle';

    const color = type === 'success' ? 'text-green-400' :
        type === 'error' ? 'text-red-400' :
            type === 'warning' ? 'text-yellow-400' :
                'text-blue-400';

    // Sanitize message to prevent XSS
    const safeMessage = sanitizer.text(message);

    toast.innerHTML = `
    <div class="flex items-center gap-3">
      <i class="fas ${icon} ${color} text-xl"></i>
      <span class="text-white">${safeMessage}</span>
    </div>
  `;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Toggle password visibility
const togglePasswordBtn = document.getElementById('togglePassword');
if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', function () {
        const passwordInput = document.getElementById('password');
        const icon = this.querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    });
}

// Forgot password handler
const forgotPasswordBtn = document.getElementById('forgotPassword');
if (forgotPasswordBtn) {
    forgotPasswordBtn.addEventListener('click', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value;

        if (!email) {
            showToast('Por favor ingresa tu correo electrónico', 'warning');
            document.getElementById('email').focus();
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            showToast('Correo de recuperación enviado. Revisa tu bandeja de entrada.', 'success');
        } catch (error) {
            logger.error('Error sending password reset:', error);
            if (error.code === 'auth/user-not-found') {
                showToast('No existe una cuenta con este correo electrónico', 'error');
            } else {
                showToast('Error al enviar correo de recuperación: ' + error.message, 'error');
            }
        }
    });
}

// Login form handler
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;
        const loginButton = document.getElementById('loginButton');

        // DEBUG: START
        console.log('🚀 Login Submit Triggered');
        const debugInfo = { email, hasPassword: !!password, rememberMe };

        // Disable button immediately
        loginButton.disabled = true;
        loginButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Verificando...';

        // ✅ Rate limiting check
        if (!RateLimiters.login.tryRequest(email)) {
            console.warn('⚠️ Rate limited:', email);
            const retryAfter = RateLimiters.login.getRetryAfter(email);
            showRateLimitError('inicio de sesión', retryAfter);
            alert(`⚠️ Demasiados intentos. Espera ${retryAfter} segundos.`);
            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Iniciar Sesión';
            return;
        }

        try {
            // Set persistence
            console.log('💾 Setting persistence...');
            const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
            await setPersistence(auth, persistence);

            // Sign in
            console.log('🔐 Authenticating with Firebase...');
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            console.log('✅ Auth successful. UID:', user.uid);

            // Get user token
            const tokenResult = await user.getIdTokenResult();
            const isAdmin = tokenResult.claims.role === 'admin';

            // ADMINS: Bypass checks
            if (!isAdmin) {
                console.log('📧 Checking email verification...');
                if (!user.emailVerified) {
                    throw new Error('EMAIL_NOT_VERIFIED');
                }

                console.log('📄 Fetching user profile from Firestore...');
                try {
                    // Lazy load Firestore
                    const { getDb } = await import('./firebase-config-env.js');
                    const db = await getDb();

                    const userDoc = await getDoc(doc(db, 'users', user.uid));
                    if (!userDoc.exists()) {
                        throw new Error('PROFILE_NOT_FOUND');
                    }
                    console.log('✅ Profile found.');
                } catch (firestoreError) {
                    console.error('❌ Firestore Error:', firestoreError);
                    if (firestoreError.code === 'permission-denied') {
                        throw new Error('FIRESTORE_PERMISSION_DENIED');
                    }
                    throw firestoreError;
                }
            }

            // Success
            SecurityLogger.logSuccessfulLogin(user.uid, email);
            showToast('¡Bienvenido!', 'success');
            window.location.href = '/dashboard.html';

        } catch (error) {
            console.error('❌ LOGIN ERROR:', error);

            let errorMessage = 'Error desconocido';

            // Custom Error Mapping
            if (error.message === 'EMAIL_NOT_VERIFIED') errorMessage = 'Email no verificado. Revisa tu correo.';
            else if (error.message === 'PROFILE_NOT_FOUND') errorMessage = 'Usuario autenticado pero sin perfil. Contacta soporte.';
            else if (error.message === 'FIRESTORE_PERMISSION_DENIED') errorMessage = 'Acceso denegado a la base de datos (App Check/Reglas).';
            else if (error.code === 'auth/invalid-credential') errorMessage = 'Correo o contraseña incorrectos.';
            else if (error.code === 'auth/user-not-found') errorMessage = 'Cuenta no encontrada.';
            else if (error.code === 'auth/wrong-password') errorMessage = 'Contraseña incorrecta.';
            else if (error.code === 'auth/too-many-requests') errorMessage = 'La cuenta ha sido bloqueada temporalmente. Restablece tu contraseña.';
            else if (error.message) errorMessage = error.message;

            // Show both Toast and Alert to be sure
            showToast(errorMessage, 'error');

            // If it's a system error, use Alert
            if (!errorMessage.includes('Contraseña') && !errorMessage.includes('inválido')) {
                alert(`Error de Inicio de Sesión:\n${errorMessage}`);
            }

            SecurityLogger.logFailedLogin(email, errorMessage);

            loginButton.disabled = false;
            loginButton.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Iniciar Sesión';
        }
    });
}


// Initialize demo mode UI if active
initializeDemoMode();


