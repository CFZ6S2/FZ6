// Firebase Configuration - TuCitaSegura Production
// ============================================================================
// IMPORTANTE: Esta es la configuración de producción del proyecto
// Project ID: tuscitasseguras-2d1a6
// API Key: Browser key con restricciones HTTP configuradas
// ============================================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js";

export const firebaseConfig = {
    apiKey: "AIzaSyAmaE2tXMBsKc8DjBd1ShJ1HnDxVYQ0yzU",
    authDomain: "tucitasegura-129cc.firebaseapp.com",
    projectId: "tucitasegura-129cc",
    storageBucket: "tucitasegura-129cc.firebasestorage.app",
    messagingSenderId: "180656060538",
    appId: "1:180656060538:web:3168487130aa126db663c3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// ============================================================================
// Firebase Cloud Messaging (FCM) - VAPID Key for Web Push Notifications
// ============================================================================
// Clave pública VAPID para notificaciones push web
// NOTA: La clave privada debe mantenerse segura en el backend
// ============================================================================
export const VAPID_PUBLIC_KEY = "BJW5I1B7KSEvM1q8FuwNokyu4sgoUy0u93C2XSQ8kpDVUdw6jv1UgYo9k_lIRjs-Rpte-YUkFqM7bbOYAD32T-w";

// Default export
export default app;

// Export for CommonJS modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, app, auth, db, storage, functions, VAPID_PUBLIC_KEY };
}
