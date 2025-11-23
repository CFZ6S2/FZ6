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
    apiKey: "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s",
    authDomain: "tuscitasseguras-2d1a6.firebaseapp.com",
    projectId: "tuscitasseguras-2d1a6",
    storageBucket: "tuscitasseguras-2d1a6.firebasestorage.app",
    messagingSenderId: "924208562587",
    appId: "1:924208562587:web:5291359426fe390b36213e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Default export
export default app;

// Export for CommonJS modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig, app, auth, db, storage, functions };
}
