// Email Verification Banner Component
import { auth } from './firebase-config-env.js';
import { sendEmailVerification } from 'firebase/auth';
import { showToast } from './utils.js';

let bannerElement = null;
let checkInterval = null;

export function initEmailVerificationBanner() {
    const user = auth.currentUser;

    if (!user) return;

    // If email is already verified, don't show banner
    if (user.emailVerified) {
        removeBanner();
        return;
    }

    // Create banner if it doesn't exist
    if (!bannerElement) {
        createBanner();
    }

    // Check verification status every 30 seconds
    if (!checkInterval) {
        checkInterval = setInterval(async () => {
            await user.reload();
            if (user.emailVerified) {
                removeBanner();
                showToast('✅ Email verificado correctamente', 'success');
                clearInterval(checkInterval);
                checkInterval = null;
            }
        }, 30000);
    }
}

function createBanner() {
    bannerElement = document.createElement('div');
    bannerElement.id = 'emailVerificationBanner';
    bannerElement.className = 'fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 px-4 shadow-lg';
    bannerElement.innerHTML = `
    <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <i class="fas fa-exclamation-triangle text-xl"></i>
        <div>
          <p class="font-bold text-sm sm:text-base">⚠️ Verifica tu email para desbloquear todas las funciones</p>
          <p class="text-xs opacity-90">Revisa tu bandeja de entrada y haz clic en el enlace de verificación</p>
        </div>
      </div>
      <div class="flex gap-2">
        <button id="resendEmailBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition">
          <i class="fas fa-envelope mr-1"></i> Reenviar
        </button>
        <button id="refreshVerificationBtn" class="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-semibold transition">
          <i class="fas fa-sync mr-1"></i> Ya verifiqué
        </button>
      </div>
    </div>
  `;

    document.body.prepend(bannerElement);

    // Add event listeners
    document.getElementById('resendEmailBtn').addEventListener('click', resendVerificationEmail);
    document.getElementById('refreshVerificationBtn').addEventListener('click', checkVerificationStatus);

    // Add padding to body to account for banner
    document.body.style.paddingTop = '80px';
}

function removeBanner() {
    if (bannerElement) {
        bannerElement.remove();
        bannerElement = null;
        document.body.style.paddingTop = '0';
    }
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
}

async function resendVerificationEmail() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await sendEmailVerification(user);
        showToast('📧 Email de verificación enviado. Revisa tu bandeja de entrada.', 'success');
    } catch (error) {
        console.error('Error sending verification email:', error);
        if (error.code === 'auth/too-many-requests') {
            showToast('⏳ Espera unos minutos antes de solicitar otro email', 'warning');
        } else {
            showToast('Error al enviar email: ' + error.message, 'error');
        }
    }
}

async function checkVerificationStatus() {
    const user = auth.currentUser;
    if (!user) return;

    const btn = document.getElementById('refreshVerificationBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Verificando...';
    btn.disabled = true;

    try {
        await user.reload();
        if (user.emailVerified) {
            removeBanner();
            showToast('✅ Email verificado correctamente', 'success');
            // Reload page to update UI
            setTimeout(() => window.location.reload(), 1000);
        } else {
            showToast('⚠️ Email aún no verificado. Revisa tu bandeja de entrada.', 'warning');
        }
    } catch (error) {
        console.error('Error checking verification:', error);
        showToast('Error al verificar: ' + error.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

export function cleanupEmailVerificationBanner() {
    removeBanner();
}
