/**
 * Quick fixes for common JavaScript errors
 * Include this file AFTER firebase-config.js
 */

console.log('🔧 Loading error fixes...');

// ========== FIX 1: updateGenderDependentFields ==========
if (typeof updateGenderDependentFields === 'undefined') {
    window.updateGenderDependentFields = function() {
        try {
            const genderSelect = document.getElementById('gender');
            if (!genderSelect) return;

            const gender = genderSelect.value;
            console.log('Updating gender-dependent fields for:', gender);

            // Show/Hide VIP Events button (only for women)
            const vipEventsBtn = document.getElementById('vipEventsBtn');
            if (vipEventsBtn) {
                if (gender === 'femenino') {
                    vipEventsBtn.classList.remove('hidden');
                } else {
                    vipEventsBtn.classList.add('hidden');
                }
            }

            // Show/Hide SOS button (only for women)
            const sosSection = document.getElementById('sos-section');
            if (sosSection) {
                if (gender === 'femenino') {
                    sosSection.classList.remove('hidden');
                    sosSection.classList.add('flex');
                } else {
                    sosSection.classList.add('hidden');
                    sosSection.classList.remove('flex');
                }
            }

            console.log('✅ Gender-dependent fields updated');
        } catch (error) {
            console.error('Error in updateGenderDependentFields:', error);
        }
    };

    // Auto-call when gender changes
    document.addEventListener('DOMContentLoaded', () => {
        const genderSelect = document.getElementById('gender');
        if (genderSelect) {
            genderSelect.addEventListener('change', window.updateGenderDependentFields);
            // Call once on load
            window.updateGenderDependentFields();
        }
    });
}

// ========== FIX 2: Suppress Google Maps Warnings ==========
const originalConsoleWarn = console.warn;
console.warn = function(...args) {
    const message = args[0]?.toString() || '';

    // Suppress Google Maps loading warnings
    if (message.includes('Google Maps') && message.includes('loading=async')) {
        return; // Suppress
    }

    // Suppress PlaceAutocomplete deprecation warning
    if (message.includes('PlaceAutocompleteElement')) {
        return; // Suppress
    }

    // Suppress InvalidKey warning (we know about it)
    if (message.includes('InvalidKey')) {
        console.error('⚠️ Configure Google Maps API Key in your HTML files');
        return;
    }

    originalConsoleWarn.apply(console, args);
};

// ========== FIX 3: Handle Firebase Storage Errors Gracefully ==========
const originalConsoleError = console.error;
console.error = function(...args) {
    const message = args[0]?.toString() || '';

    // Handle storage/unauthenticated errors
    if (message.includes('storage/unauthenticated')) {
        console.warn('⚠️ Firebase Storage: User not authenticated. Please login first.');
        return;
    }

    // Handle App Check throttled errors (reduce noise)
    if (message.includes('appCheck/throttled')) {
        // Already logged by Firebase, don't duplicate
        return;
    }

    if (message.includes('google.firestore.v1.Firestore') && message.includes('net::ERR_ABORTED')) {
        console.warn('⚠️ Firestore canal abortado (dev)');
        return;
    }

    if (message.includes('PushManager') && message.includes('no active Service Worker')) {
        console.warn('⚠️ Notificaciones: Service Worker no activo');
        return;
    }

    originalConsoleError.apply(console, args);
};

// ========== FIX 4: Helper to Initialize RecaptchaVerifier Safely ==========
window.initRecaptchaSafely = function(auth, containerId) {
    return new Promise((resolve, reject) => {
        try {
            // Check if container exists
            const container = document.getElementById(containerId);
            if (!container) {
                const div = document.createElement('div');
                div.id = containerId;
                div.style.display = 'none';
                document.body.appendChild(div);
            }

            // Import RecaptchaVerifier
            import('https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js')
                .then(({ RecaptchaVerifier }) => {
                    const verifier = new RecaptchaVerifier(auth, containerId, {
                        'size': 'invisible',
                        'callback': (response) => {
                            console.log('✅ reCAPTCHA verified');
                            resolve(verifier);
                        },
                        'expired-callback': () => {
                            console.warn('⚠️ reCAPTCHA expired, please try again');
                        }
                    });

                    verifier.render()
                        .then(() => resolve(verifier))
                        .catch(reject);
                })
                .catch(reject);

        } catch (error) {
            console.error('Error initializing RecaptchaVerifier:', error);
            reject(error);
        }
    });
};

// ========== FIX 5: Show Friendly Error Messages ==========
window.showUserFriendlyError = function(error) {
    const errorMessages = {
        'auth/invalid-email': 'Email no válido',
        'auth/user-not-found': 'Usuario no encontrado',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/email-already-in-use': 'Este email ya está registrado',
        'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.',
        'storage/unauthenticated': 'Debes iniciar sesión primero',
        'storage/unauthorized': 'No tienes permisos para esta acción',
        'storage/retry-limit-exceeded': 'Demasiados intentos. Intenta más tarde.',
        'appCheck/throttled': 'Demasiadas solicitudes. Espera un momento.'
    };

    const code = error?.code || '';
    const friendlyMessage = errorMessages[code] || error?.message || 'Error desconocido';

    console.error('Error:', friendlyMessage);

    // Show toast if function exists
    if (typeof showToast === 'function') {
        showToast(friendlyMessage, 'error');
    } else {
        alert(friendlyMessage);
    }

    return friendlyMessage;
};

// ========== FIX 6: Auto-retry for App Check errors ==========
let appCheckRetryCount = 0;
const maxAppCheckRetries = 3;

window.addEventListener('error', function(e) {
    const message = e.message || '';

    if (message.includes('appCheck') && appCheckRetryCount < maxAppCheckRetries) {
        appCheckRetryCount++;
        console.log(`🔄 Retrying App Check... (${appCheckRetryCount}/${maxAppCheckRetries})`);

        // Retry after delay
        setTimeout(() => {
            window.location.reload();
        }, 2000 * appCheckRetryCount);

        e.preventDefault();
    }
}, true);

console.log('✅ Error fixes loaded successfully');
