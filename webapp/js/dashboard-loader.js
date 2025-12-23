/**
 * Dashboard Data Loader con retry logic y fallback
 */

import { auth, db } from './firebase-config-env.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { showToast } from './utils.js';
import { logger } from './logger.js';
import { loadTheme } from './theme.js';
import { shareReferralCode, generateReferralCode } from './referral-system.js';
import { initInAppNotifications } from './in-app-notifications.js';
import { initEmailVerificationBanner } from './email-verification-banner.js';

/**
 * Cargar datos del usuario con retry y fallback a Auth
 */
export async function loadDashboardData(user) {
    console.log('📥 Loading dashboard for user:', user.uid);

    // Initialize In-App Notifications listener
    initInAppNotifications(user);

    // Initialize Email Verification Banner
    initEmailVerificationBanner();

    // 1. Forzar refresh del token para asegurar custom claims actualizados
    try {
        await user.getIdToken(true);
        console.log('✅ Token refreshed');
    } catch (error) {
        console.warn('⚠️ Token refresh failed:', error);
    }

    // 2. Intentar cargar desde Firestore con reintentos
    let retries = 3;
    let firestoreData = null;

    while (retries > 0 && !firestoreData) {
        try {
            console.log(`🔍 Attempting to load Firestore profile (attempt ${4 - retries}/3)...`);

            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                firestoreData = userDoc.data();
                console.log('✅ Firestore profile loaded successfully');
            } else {
                console.warn('⚠️ Profile document does not exist');
                break; // No reintentar si no existe
            }
        } catch (error) {
            console.error(`❌ Firestore error (attempt ${4 - retries}/3):`, error);
            retries--;

            if (retries > 0) {
                // Esperar antes de reintentar
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
    }

    // 3. Status check
    if (!firestoreData) {
        console.error('❌ Failed to load Firestore data after retries.');
        // Show visible error to user
        if (typeof window.showToast === 'function') {
            window.showToast('⚠️ Error de conexión: No se pudieron cargar tus datos completos.', 'error');
        } else {
            alert('⚠️ Error de conexión con la base de datos.\n\nEs posible que tu conexión sea inestable o que el sistema de seguridad (App Check) esté bloqueando el acceso.\n\nSe mostrarán datos básicos.');
        }
    }

    // 4. Actualizar UI con datos de Firestore o fallback a Auth
    updateDashboardUI(user, firestoreData);
}

/**
 * Actualizar la UI del dashboard
 */
function updateDashboardUI(user, firestoreData) {
    // Si tenemos datos de Firestore, usarlos
    if (firestoreData) {
        // Theme
        loadTheme(firestoreData);

        // Alias
        const alias = firestoreData.alias || user.displayName || user.email?.split('@')[0] || 'Usuario';
        if (document.getElementById('userAlias')) document.getElementById('userAlias').textContent = alias;

        // Avatar
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            if (firestoreData.photoURL) {
                avatar.src = firestoreData.photoURL;
            } else {
                avatar.src = `https://ui-avatars.com/api/?name=${alias}&background=random&color=fff`;
            }
        }

        // Verification Badges
        if (user.emailVerified) {
            const emailBadge = document.getElementById('emailBadge');
            if (emailBadge) {
                emailBadge.innerHTML = '<i class="fas fa-check-circle mr-1 text-green-400"></i> Email';
                emailBadge.classList.replace('text-slate-400', 'text-white');
                emailBadge.classList.add('bg-green-500/10', 'border-green-500/20');
            }
        }

        if (firestoreData.phoneVerified) {
            const phoneBadge = document.getElementById('phoneBadge');
            if (phoneBadge) {
                phoneBadge.innerHTML = '<i class="fas fa-check-circle mr-1 text-green-400"></i> Móvil';
                phoneBadge.classList.replace('text-slate-400', 'text-white');
                phoneBadge.classList.add('bg-green-500/10', 'border-green-500/20');
                phoneBadge.onclick = null;
            }
        } else {
            const phoneBadge = document.getElementById('phoneBadge');
            if (phoneBadge) {
                phoneBadge.onclick = () => {
                    const modal = document.getElementById('phoneModal');
                    if (modal) modal.classList.remove('hidden');
                };
            }
        }

        // Update Stats if they exist
        if (firestoreData.stats || firestoreData.wallet) {
            // Balance: Check wallet first, then stats, default to 0
            const balance = firestoreData.wallet?.balance ?? firestoreData.stats?.balance ?? 0;
            if (document.getElementById('balanceStat')) {
                document.getElementById('balanceStat').textContent = balance + '€';
            }

            // Other stats default to 0 if stats object is missing
            const stats = firestoreData.stats || {};
            if (document.getElementById('messagesStat')) document.getElementById('messagesStat').textContent = stats.messages || 0;
            if (document.getElementById('datesStat')) document.getElementById('datesStat').textContent = stats.dates || 0;
            if (document.getElementById('likesStat')) document.getElementById('likesStat').textContent = stats.likes || 0;
        }

        // Female User Features (Referral System)
        const userGender = firestoreData.basicInfo?.gender || firestoreData.gender;
        if (userGender === 'femenino') {
            const referralCard = document.getElementById('referralCard');
            if (referralCard) {
                referralCard.classList.remove('hidden');

                // Populate Code and Earnings
                const codeEl = document.getElementById('dashboardReferralCode');
                const earnEl = document.getElementById('dashboardReferralEarnings');

                const referralCode = firestoreData.referralCode || '...';

                if (codeEl) codeEl.textContent = referralCode;
                if (earnEl) earnEl.textContent = (firestoreData.referralEarnings || 0) + '€';

                // 1. Copy Function
                window.copyDashboardCode = () => {
                    if (referralCode && referralCode !== '...') {
                        navigator.clipboard.writeText(referralCode).then(() => {
                            // Dynamically import showToast only when needed or expect it globally? 
                            // better to duplicate/import logic. Assuming showToast is globally available or imported.
                            // We need to import showToast at top of file.
                            import('./utils.js').then(({ showToast }) => {
                                showToast('Código copiado al portapapeles', 'success');
                            });
                        });
                    }
                };

                // 2. Share Function (WhatsApp prioritized)
                window.triggerDashboardShare = async () => {
                    const alias = firestoreData.alias || 'Usuario';

                    if (!referralCode || referralCode === '...') {
                        console.warn('No referral code available');
                        return;
                    }

                    // Construct WhatsApp Link
                    const link = `${window.location.origin}/register.html?ref=${referralCode}`;
                    const text = `¡Hola! Únete a TuCitaSegura conmigo. Usa mi código *${referralCode}* al registrarte. Aquí tienes el link: ${link}`;
                    const waLink = `https://wa.me/?text=${encodeURIComponent(text)}`;

                    // Open WhatsApp directly
                    window.open(waLink, '_blank');
                };
            }
        }
        console.log('✅ Dashboard UI updated with Firestore data');
    } else {
        // Fallback: usar solo datos de Auth
        console.log('⚠️ Using Auth fallback (no Firestore data available)');

        const alias = user.displayName || user.email?.split('@')[0] || 'Usuario';
        if (document.getElementById('userAlias')) document.getElementById('userAlias').textContent = alias;

        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            if (user.photoURL) {
                avatar.src = user.photoURL;
            } else {
                avatar.src = `https://ui-avatars.com/api/?name=${alias}&background=random&color=fff`;
            }
        }

        // Email badge si está verificado
        if (user.emailVerified) {
            const emailBadge = document.getElementById('emailBadge');
            if (emailBadge) {
                emailBadge.innerHTML = '<i class="fas fa-check-circle mr-1 text-green-400"></i> Email';
                emailBadge.classList.replace('text-slate-400', 'text-white');
                emailBadge.classList.add('bg-green-500/10', 'border-green-500/20');
            }
        }

        // Mostrar mensaje al usuario de que debe completar perfil
        console.warn('⚠️ Using Auth fallback - Firestore access blocked');

        // Explicitly show that stats are missing/zero
        if (document.getElementById('balanceStat')) document.getElementById('balanceStat').textContent = '-';
        if (document.getElementById('messagesStat')) document.getElementById('messagesStat').textContent = '-';
        if (document.getElementById('datesStat')) document.getElementById('datesStat').textContent = '-';
        if (document.getElementById('likesStat')) document.getElementById('likesStat').textContent = '-';
    }

    // -----------------------------------------------------------------------
    // ADMIN ACCESS CHECK
    // -----------------------------------------------------------------------
    const admins = ['admin@tucitasegura.com', 'cesar.herrera.rojo@gmail.com'];
    const adminUids = ['Y1rNgj4KYpWSFlPqgrpAaGuAk033'];

    // Trust UID or Email
    if (admins.includes(user.email) || adminUids.includes(user.uid) || (firestoreData && firestoreData.role === 'admin')) {
        const adminCard = document.getElementById('adminPanelCard');
        if (adminCard) {
            adminCard.classList.remove('hidden');
            console.log('🛡️ Admin Panel button UNHIDDEN');
        } else {
            console.error('🛡️ Admin Panel Check Passed but Element #adminPanelCard NOT FOUND');
        }
    } else {
        console.log('🛡️ User is NOT Admin');
    }
}
