
import './firebase-appcheck.js';
import { auth, getDb } from './firebase-config-env.js';
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

// Version of the Terms. Increment this to force re-acceptance for all users.
const CURRENT_LEGAL_VERSION = "2026.1.0";

// HTML for the Blocking Modal
const CONSENT_MODAL_HTML = `
<div id="legal-consent-modal" class="fixed inset-0 z-[9999] bg-slate-900/95 flex items-center justify-center p-4 backdrop-blur-sm">
    <div class="bg-slate-800 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        
        <!-- Header -->
        <div class="p-6 border-b border-slate-700 bg-slate-800/50 rounded-t-2xl">
            <h2 class="text-2xl font-bold text-white mb-2">
                <i class="fas fa-file-contract text-blue-500 mr-2"></i> Actualización Legal Importante
            </h2>
            <p class="text-slate-400 text-sm">
                Para continuar usando TuCitaSegura, debes leer y aceptar nuestros nuevos Términos de Servicio y Política de Privacidad.
            </p>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-6 text-slate-300 text-sm space-y-4" id="legal-content-scroll">
            <div class="bg-slate-900/50 p-4 rounded-xl border border-slate-700/50">
                <h3 class="text-white font-bold mb-2">Resumen de Cambios Clave:</h3>
                <ul class="list-disc pl-5 space-y-1">
                    <li><strong>Edad Mínima:</strong> Confirmas que tienes 18+ años.</li>
                    <li><strong>Depósito de Seguridad:</strong> Aceptas la política de retención de 120€ y sus condiciones de captura por "plantón".</li>
                    <li><strong>Naturaleza del Servicio:</strong> Entiendes que este es un sitio de citas y compañía, prohibiendo explícitamente la prostitución y la trata.</li>
                    <li><strong>Jurisdicción:</strong> Aceptas que cualquier disputa se rige por las leyes de New Mexico, USA.</li>
                </ul>
            </div>
            
            <p>
                Por favor, lee los documentos completos antes de continuar:
                <br>
                <a href="/terminos.html" target="_blank" class="text-blue-400 hover:text-blue-300 underline">Términos de Servicio</a> y 
                <a href="/privacidad.html" target="_blank" class="text-blue-400 hover:text-blue-300 underline">Política de Privacidad</a>.
            </p>
            
            <p class="text-xs text-slate-500 mt-4">
                ID de versión legal: ${CURRENT_LEGAL_VERSION}
            </p>
        </div>

        <!-- Footer / Actions -->
        <div class="p-6 border-t border-slate-700 bg-slate-800/50 rounded-b-2xl">
            <div class="flex items-start gap-3 mb-6">
                <input type="checkbox" id="legal-check-1" class="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500">
                <label for="legal-check-1" class="text-sm text-slate-300 cursor-pointer select-none">
                    He leído y acepto los <span class="text-white font-semibold">Términos de Servicio</span> y la <span class="text-white font-semibold">Política de Privacidad</span>. Entiendo las reglas sobre el depósito de seguridad.
                </label>
            </div>
            
            <div class="flex items-start gap-3 mb-6">
                <input type="checkbox" id="legal-check-2" class="mt-1 w-5 h-5 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500">
                <label for="legal-check-2" class="text-sm text-slate-300 cursor-pointer select-none">
                    Declaro bajo pena de perjurio que tengo <strong>más de 18 años</strong>.
                </label>
            </div>

            <button id="btn-accept-legal" disabled 
                class="w-full py-3 px-6 rounded-xl font-bold text-white transition-all duration-200
                bg-slate-700 cursor-not-allowed opacity-50
                hover:shadow-lg focus:ring-2 focus:ring-blue-500/50">
                Aceptar y Continuar
            </button>
        </div>
    </div>
</div>
`;

class LegalConsentManager {
    constructor() {
        this.init();
    }

    init() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                await this.checkConsent(user);
            }
        });
    }

    async checkConsent(user) {
        // Skip check if we are already ON the legal pages to avoid loops
        const path = window.location.pathname;
        if (path.includes('terminos.html') || path.includes('privacidad.html')) {
            return;
        }

        try {
            const db = await getDb();
            const userRef = doc(db, "users", user.uid);
            const snapshot = await getDoc(userRef);

            if (snapshot.exists()) {
                const data = snapshot.data();
                const consent = data.legalConsent;

                // Needs consent if: Code never signed OR Code outdated
                if (!consent || consent.version !== CURRENT_LEGAL_VERSION) {
                    console.log(`⚠️ Legal Consent Required (Current: ${consent?.version || 'None'}, Required: ${CURRENT_LEGAL_VERSION})`);
                    this.showBlockingModal(user);
                } else {
                    console.log("✅ Legal Consent Verified");
                }
            }
        } catch (error) {
            console.error("Error checking legal consent:", error);
            // On error, err on side of caution? Or let pass? 
            // For now, let's log. If critical, we might want to show modal anyway to be safe.
        }
    }

    showBlockingModal(user) {
        // Prevent Scrolling on Body
        document.body.style.overflow = 'hidden';

        // Inject Modal
        const container = document.createElement('div');
        container.innerHTML = CONSENT_MODAL_HTML;
        document.body.appendChild(container);

        const modal = document.getElementById('legal-consent-modal');
        const btnAccept = document.getElementById('btn-accept-legal');
        const check1 = document.getElementById('legal-check-1');
        const check2 = document.getElementById('legal-check-2');

        // Logic to enable button
        const validateChecks = () => {
            if (check1.checked && check2.checked) {
                btnAccept.disabled = false;
                btnAccept.classList.remove('bg-slate-700', 'cursor-not-allowed', 'opacity-50');
                btnAccept.classList.add('bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'hover:from-blue-500', 'hover:to-blue-400', 'transform', 'hover:scale-[1.02]');
            } else {
                btnAccept.disabled = true;
                btnAccept.classList.add('bg-slate-700', 'cursor-not-allowed', 'opacity-50');
                btnAccept.classList.remove('bg-gradient-to-r', 'from-blue-600', 'to-blue-500', 'hover:from-blue-500', 'hover:to-blue-400', 'transform', 'hover:scale-[1.02]');
            }
        };

        check1.addEventListener('change', validateChecks);
        check2.addEventListener('change', validateChecks);

        // Accept Action
        btnAccept.onclick = async () => {
            btnAccept.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Guardando...';
            btnAccept.disabled = true;

            try {
                await this.saveConsent(user);

                // Close Modal
                modal.classList.add('opacity-0', 'transition-opacity', 'duration-300');
                setTimeout(() => {
                    modal.remove();
                    document.body.style.overflow = ''; // Restore scrolling
                    // Optional: Reload to ensure clean state
                    // window.location.reload(); 
                }, 300);

            } catch (error) {
                console.error("Error saving consent:", error);
                btnAccept.innerHTML = 'Error. Intentar de nuevo';
                btnAccept.disabled = false;
                alert("Hubo un error al guardar tu consentimiento. Por favor verifica tu conexión.");
            }
        };
    }

    async saveConsent(user) {
        const db = await getDb();
        const userRef = doc(db, "users", user.uid);

        // Metadata
        const consentData = {
            legalConsent: {
                version: CURRENT_LEGAL_VERSION,
                acceptedAt: serverTimestamp(),
                ip: "recorded_by_server", // Client IP is best captured by Cloud Function, but this timestamp proves intent
                userAgent: navigator.userAgent
            }
        };

        // Merge update
        await setDoc(userRef, consentData, { merge: true });
    }
}

// Auto-start
new LegalConsentManager();
