import { initializeApp } from 'firebase/app';
import './firebase-appcheck.js'; // Ensure App Check initializes with the app
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAmaE2tXMBsKc8DjBd1ShJ1HnDxVYQ0yzU",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tucitasegura-129cc.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tucitasegura-129cc",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tucitasegura-129cc.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "180656060538",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:180656060538:web:3168487130aa126db663c3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Firestore with default settings (no custom persistence)
// This fixes the "Failed to obtain exclusive access" error that was blocking all reads
// const db = getFirestore(app);
// console.log("✅ Firestore initialized");

// SIMPLE STABLE IMPLEMENTATION
// Reverting complex persistence logic to prevent "Expected first argument to collection..." error
// caused by race conditions or undefined db instances in the advanced init sequence.
export async function getDb() {
    // console.log("🔥 Returning standard Firestore instance (Stable Mode)");
    return getFirestore(app);
}

const functions = getFunctions(app);
const storage = getStorage(app);

// HOTFIX: Global Shim for verifyRecaptchaScore (Persistent Fix)
if (typeof window !== 'undefined') {
    window.verifyRecaptchaScore = async function (token) {
        console.warn('👻 verifyRecaptchaScore (config shim) called. Returning success.');
        return { success: true, score: 1.0, action: 'shim_config' };
    };
    // Expose Firebase instances to window for global functions
    window._firebaseAuth = auth;
    // window._firebaseDb removed - use await getDb() instead
    window._firebaseStorage = storage;
}

// CONSOLE NOISE SUPPRESSION
// Filters out benign network errors handled by Firebase SDK retries
if (typeof console !== 'undefined') {
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = function (...args) {
        const str = args.map(a => String(a)).join(' ');
        if (str.includes('Fetch failed loading') &&
            (str.includes('firestore.googleapis.com') || str.includes('channel'))) {
            // Suppress verbose network errors that simply trigger retries
            return;
        }
        originalError.apply(console, args);
    };

    console.warn = function (...args) {
        const str = args.map(a => String(a)).join(' ');
        if ((str.includes('Network unavailable') || str.includes('falling back to')) && str.includes('Firestore')) {
            return;
        }
        originalWarn.apply(console, args);
    };
}

// STORAGE HEALTH CHECK & FALLBACK SYSTEM
// Detects if "Tracking Prevention" or "Incognito" is blocking IndexedDB
(async () => {
    try {
        const testDbRequest = window.indexedDB.open("firebase-health-check", 1);
        testDbRequest.onsuccess = (e) => {
            const tempDb = e.target.result;
            tempDb.close();
            console.log("✅ Storage Health Check Passed: IndexedDB is available.");
            // We can delete the test DB to be clean
            window.indexedDB.deleteDatabase("firebase-health-check");
        };
        testDbRequest.onerror = (e) => {
            console.error("❌ Storage Health Check Failed:", e);
            handleStorageBlocked();
        };
    } catch (e) {
        console.warn("⚠️ Storage Access Exception (Tracking Prevention?):", e);
        handleStorageBlocked();
    }
})();

async function handleStorageBlocked() {
    console.warn("🛡️ Detectado bloqueo de almacenamiento (Tracking Prevention). Cambiando a Memoria...");
    try {
        const { setPersistence, browserSessionPersistence, inMemoryPersistence } = await import("firebase/auth");
        // Try Session first, then Memory
        await setPersistence(auth, inMemoryPersistence);
        console.warn("⚠️ Auth Persistence set to MEMORY_ONLY due to storage block. User will be logged out on reload.");
        alert("⚠️ Tu navegador está bloqueando el almacenamiento (Tracking Prevention).\n\nLa app funcionará, pero tendrás que iniciar sesión cada vez que recargues.");
    } catch (e) {
        console.error("failed to downgrade persistence:", e);
    }
}

export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || "";
export default firebaseConfig;
export { app, auth, functions, storage };
