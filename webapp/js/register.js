
import './firebase-appcheck.js';
import { verifyRecaptchaScore } from './recaptcha-enterprise.js';
import { sanitizer } from './sanitizer.js';
import { auth, db } from './firebase-config-env.js';
import { RateLimiters, showRateLimitError } from './rate-limiter.js';
import { validators, sanitize } from './input-validator.js';
import { SecurityLogger } from './security-logger.js';
import { logger } from './logger.js';
import { handleFirebaseNetworkError, showNetworkError, retryOperation } from './network-error-handler.js';
import { isDemoMode, getDemoUser, initializeDemoMode } from './demo-mode.js';
import {
    createUserWithEmailAndPassword,
    sendEmailVerification
} from 'firebase/auth';
import {
    doc,
    setDoc,
    serverTimestamp
} from 'firebase/firestore';
import { setupGlobalErrorHandling } from './error-handler.js';

// Setup global error handling
setupGlobalErrorHandling();

// Set max date to 18 years ago
const today = new Date();
const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
const birthDateInput = document.getElementById('birthDate');
if (birthDateInput) {
    birthDateInput.max = eighteenYearsAgo.toISOString().split('T')[0];
}

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
    }, 5000);
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

// Password strength indicator
const passwordInput = document.getElementById('password');
if (passwordInput) {
    passwordInput.addEventListener('input', function () {
        const password = this.value;
        const strengthDiv = document.getElementById('passwordStrength');
        if (!strengthDiv) return;

        if (password.length === 0) {
            strengthDiv.innerHTML = '';
            return;
        }

        let strength = 0;
        let feedback = '';

        if (password.length >= 8) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z\d]/.test(password)) strength++;

        if (strength <= 1) {
            feedback = '<span class="text-red-400">Débil</span>';
        } else if (strength === 2) {
            feedback = '<span class="text-yellow-400">Media</span>';
        } else if (strength === 3) {
            feedback = '<span class="text-blue-400">Buena</span>';
        } else {
            feedback = '<span class="text-green-400">Muy fuerte</span>';
        }

        strengthDiv.innerHTML = `Seguridad: ${feedback}`;
    });
}

// Age validation
function validateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        return age - 1;
    }

    return age;
}

if (birthDateInput) {
    birthDateInput.addEventListener('change', function () {
        const age = validateAge(this.value);
        const ageError = document.getElementById('ageError');

        if (age < 18) {
            if (ageError) ageError.classList.remove('hidden');
            this.setCustomValidity('Debes tener al menos 18 años');
        } else {
            if (ageError) ageError.classList.add('hidden');
            this.setCustomValidity('');
        }
    });
}

// Registration form handler
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const birthDate = document.getElementById('birthDate').value;
        const gender = document.getElementById('gender').value; // Capture Gender
        const registerButton = document.getElementById('registerButton');

        // ✅ Email validation
        if (!validators.email(email)) {
            showToast('Por favor ingresa un email válido', 'error');
            return;
        }

        // ✅ Gender validation
        if (!gender || gender === "") {
            showToast('Por favor selecciona tu género', 'error');
            return;
        }

        // ✅ Password strength validation
        const passwordValidation = validators.password(password);
        if (!passwordValidation.isValid) {
            showToast('Contraseña inválida: ' + passwordValidation.errors.join(', '), 'error');
            return;
        }

        // ✅ Rate limiting check (3 attempts per 5 minutes)
        if (!RateLimiters.register.tryRequest(email)) {
            const retryAfter = RateLimiters.register.getRetryAfter(email);
            showRateLimitError('registro', retryAfter);
            return;
        }

        // Validate passwords match
        if (password !== confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error');
            return;
        }

        // ✅ Validate age (18+)
        if (!validators.age(birthDate)) {
            showToast('Debes tener al menos 18 años para registrarte', 'error');
            return;
        }

        const age = validateAge(birthDate);

        // Disable button
        registerButton.disabled = true;
        registerButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creando cuenta...';

        try {
            const recaptcha = await verifyRecaptchaScore('register');

            if (!recaptcha.success || (recaptcha.score ?? 0) < 0.5) {
                showToast('Verificación reCAPTCHA fallida. Intenta de nuevo.', 'error');
                registerButton.disabled = false;
                registerButton.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Crear Cuenta';
                return;
            }
            // 1. Create Firebase Auth user
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 2. Send email verification
            await sendEmailVerification(user);

            // 3. Create Firestore user document with NEW SCHEMA
            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                basicInfo: {
                    email: email, // Added for easier query access
                    alias: '',
                    birthDate: birthDate,
                    gender: gender, // ✅ Save Gender
                    profession: '',
                    municipality: ''
                },
                preferences: {
                    ageRange: [18, 99],
                    maxDistance: 50,
                    genderInterest: gender === 'masculino' ? 'femenino' : 'masculino' // ✅ Auto-set preference
                },
                membership: {
                    type: 'free',
                    expiresAt: null
                },
                verification: {
                    email: false,
                    identity: 'pending',
                    trustLevel: 'bronze'
                },
                stats: {
                    score: 0,
                    flakeCount: 0
                },
                // Keep root metadata for standard Firebase querying/rules
                createdAt: serverTimestamp(),
                isOnline: true,
                lastActivity: serverTimestamp(),
                // Legacy fields support (optional, can be removed if strictly following new schema, but safer to keep some for transition)
                email: email,
                userRole: 'regular',
                birthDate: birthDate // Required by Firestore Rules isAdult() check
            });

            // Success! Show clear feedback
            registerButton.disabled = true;
            registerButton.innerHTML = '<i class="fas fa-check-circle mr-2"></i>¡Cuenta Creada!';
            registerButton.classList.remove('from-blue-500', 'to-blue-700');
            registerButton.classList.add('from-green-500', 'to-green-700');

            showToast('✅ ¡Cuenta creada exitosamente!', 'success');
            showToast('📧 Revisa tu correo para verificar tu cuenta', 'info');
            showToast('⏳ Redirigiendo en 5 segundos...', 'info');

            // Sign out user (they must verify email first)
            await auth.signOut();

            // Redirect to login after 5 seconds
            setTimeout(() => {
                window.location.href = '/login.html?registered=true';
            }, 5000);

        } catch (error) {
            logger.error('Registration error:', error);

            // Handle network errors with detailed information
            if (error.code === 'auth/network-request-failed' ||
                error.code === 'auth/internal-error' ||
                error.code === 'auth/unavailable' ||
                error.code === 'auth/timeout') {

                const errorInfo = handleFirebaseNetworkError(error, 'registro');
                showNetworkError(errorInfo, showToast);

                // Log additional debugging information
                console.error('[REGISTRATION NETWORK ERROR]', {
                    code: error.code,
                    hostname: location.hostname,
                    protocol: location.protocol,
                    online: navigator.onLine,
                    timestamp: new Date().toISOString()
                });

                // Offer demo mode for development/testing
                if (errorInfo.isDomainIssue) {
                    // Automatically activate demo mode for domain issues
                    try {
                        console.log('🔄 Activando modo demo automáticamente...');

                        // Demo mode registration (for testing only)
                        const demoUserId = 'demo_' + Date.now();
                        const demoUserData = {
                            uid: demoUserId,
                            email: email,
                            displayName: email.split('@')[0],
                            role: 'user',
                            subscription: 'free',
                            createdAt: new Date().toISOString(),
                            isDemo: true,
                            demoMessage: 'Modo demo activado - dominio no autorizado en Firebase'
                        };

                        // Store demo user data in localStorage for testing
                        localStorage.setItem('demoUser', JSON.stringify(demoUserData));
                        localStorage.setItem('demoToken', 'demo_token_' + Date.now());
                        localStorage.setItem('isDemoMode', 'true');

                        showToast('✅ Modo demo activado automáticamente', 'success');
                        showToast('🎯 Cuenta demo creada exitosamente', 'info');
                        showToast('💡 Nota: Estás en modo demo - funcionalidad limitada', 'warning');

                        // Redirect to demo dashboard
                        setTimeout(() => {
                            window.location.href = '/perfil.html?demo=true&auto=true';
                        }, 3000);

                        return; // Exit early since we handled it
                    } catch (demoError) {
                        console.error('Demo mode error:', demoError);
                        showToast('❌ Error incluso en modo demo', 'error');
                    }
                }

            } else {
                // Handle other authentication errors
                let errorMessage = 'Error al crear la cuenta';

                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Este correo electrónico ya está registrado';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Correo electrónico inválido';
                        break;
                    case 'auth/operation-not-allowed':
                        errorMessage = 'Registro no permitido. Contacta soporte';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'La contraseña es demasiado débil';
                        break;
                    default:
                        errorMessage = error.message;
                }

                showToast(errorMessage, 'error');
            }

            // Re-enable button
            registerButton.disabled = false;
            registerButton.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Crear Cuenta';

            // Delete user if Firestore write failed
            if (error.code?.startsWith('permission-denied') || error.code?.startsWith('firestore')) {
                try {
                    if (auth.currentUser) {
                        await auth.currentUser.delete();
                    }
                } catch (deleteError) {
                    logger.error('Error cleaning up user:', deleteError);
                }
            }
        }
    });
}

// Initialize demo mode UI if active
initializeDemoMode();
