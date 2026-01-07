
import './firebase-appcheck.js';
import { auth, getDb } from './firebase-config-env.js';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { showToast } from './utils.js';
import { loadTheme } from './theme.js';
import './error-fixes.js';

(async () => {
    let currentUser = null;
    let db = null;

    // Check authentication
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            currentUser = user;
            const loadingOverlay = document.getElementById('loadingOverlay');
            if (loadingOverlay) loadingOverlay.classList.add('hidden');

            // Fetch user data for theme
            try {
                db = await getDb();
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    loadTheme({ id: userDoc.id, ...userDoc.data() });
                }
            } catch (e) {
                console.error("Theme load error", e);
            }

            initPayPalButton();
        } else {
            // Redirect to login if not authenticated
            window.location.href = '/login.html';
        }
    });

    // Initialize PayPal Button
    function initPayPalButton() {
        if (!window.paypal) {
            console.error('PayPal SDK not loaded completely or blocked by CSP.');
            // Retry once after 1 second?
            setTimeout(() => {
                if (window.paypal) {
                    console.log('PayPal loaded on retry.');
                    renderPayPal();
                } else {
                    console.error('PayPal failed to load on retry.');
                    const container = document.getElementById('paypal-button-container');
                    if (container) container.innerHTML = '<p class="text-red-400">Error cargando sistema de pagos. Por favor recarga la página.</p>';
                }
            }, 1000);
            return;
        }
        renderPayPal();
    }

    function renderPayPal() {
        // NOTA: Necesitarás crear un plan de suscripción en tu cuenta de PayPal
        // y reemplazar 'YOUR_SUBSCRIPTION_PLAN_ID' con el ID real del plan

        try {
            window.paypal.Buttons({
                style: {
                    shape: 'rect',
                    color: 'gold',
                    layout: 'vertical',
                    label: 'subscribe',
                    height: 50
                },

                createSubscription: function (data, actions) {
                    return actions.subscription.create({
                        'plan_id': 'P-43X73253LN792734JNEMEYLA',
                        'custom_id': currentUser.uid // Vincula la suscripción al usuario
                    });
                },

                onApprove: async function (data, actions) {
                    console.log('Subscription approved:', data);

                    // Mostrar overlay de carga
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

                    try {
                        // Actualizar Firestore con los datos de la suscripción
                        const userRef = doc(db, 'users', currentUser.uid);

                        const subscriptionEndDate = new Date();
                        subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);

                        await updateDoc(userRef, {
                            hasActiveSubscription: true,
                            subscriptionId: data.subscriptionID,
                            subscriptionStartDate: serverTimestamp(),
                            subscriptionEndDate: subscriptionEndDate,
                            subscriptionStatus: 'active',
                            updatedAt: serverTimestamp()
                        });

                        console.log('Firestore updated successfully');

                        // Ocultar overlay de carga
                        if (loadingOverlay) loadingOverlay.classList.add('hidden');

                        // Mostrar modal de éxito
                        const successModal = document.getElementById('successModal');
                        if (successModal) successModal.classList.remove('opacity-0', 'pointer-events-none');

                    } catch (error) {
                        console.error('Error updating Firestore:', error);
                        if (loadingOverlay) loadingOverlay.classList.add('hidden');
                        showError('Error al activar tu membresía. Por favor contacta soporte.');
                    }
                },

                onError: function (err) {
                    console.error('PayPal error:', err);
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    if (loadingOverlay) loadingOverlay.classList.add('hidden');
                    showError('Hubo un error al procesar el pago. Por favor intenta nuevamente.');
                },

                onCancel: function (data) {
                    console.log('Subscription cancelled:', data);
                    const loadingOverlay = document.getElementById('loadingOverlay');
                    if (loadingOverlay) loadingOverlay.classList.add('hidden');
                    showError('Cancelaste el proceso de pago. Tu membresía no fue activada.');
                }

            }).render('#paypal-button-container');
        } catch (err) {
            console.error('Error rending PayPal buttons:', err);
        }
    }

    // Show error modal
    function showError(message) {
        const errorModal = document.getElementById('errorModal');
        const errorMessage = document.getElementById('errorMessage');
        if (errorMessage) errorMessage.textContent = message;
        if (errorModal) errorModal.classList.remove('opacity-0', 'pointer-events-none');
    }

    // Close error modal
    window.closeErrorModal = function () {
        const errorModal = document.getElementById('errorModal');
        if (errorModal) errorModal.classList.add('opacity-0', 'pointer-events-none');
    };

    // Redirect to search page
    window.redirectToSearch = function () {
        window.location.href = '/buscar-usuarios.html';
    };
})();
