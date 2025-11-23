// Firebase Configuration - FIXED FOR BROWSER COMPATIBILITY
const FIREBASE_API_KEY = "AIzaSyBU0Q8RYHSOVS9ugm8IOwxJSTNWHOG48OA";
const FIREBASE_AUTH_DOMAIN = "tuscitasseguras-2d1a6.firebaseapp.com";
const FIREBASE_PROJECT_ID = "tuscitasseguras-2d1a6";
const FIREBASE_STORAGE_BUCKET = "tuscitasseguras-2d1a6.firebasestorage.app";
const FIREBASE_MESSAGING_SENDER_ID = "924208562587";
const FIREBASE_APP_ID = "1:924208562587:web:5291359426fe390b36213e";

// Firebase SDK URLs - FIXED VERSIONS
const FIREBASE_SDK_VERSION = "10.12.2";
const FIREBASE_AUTH_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-auth.js`;
const FIREBASE_FIRESTORE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-firestore.js`;
const FIREBASE_STORAGE_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-storage.js`;
const FIREBASE_FUNCTIONS_URL = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-functions.js`;

// Global Firebase references
let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let firebaseFunctions = null;

// Load Firebase SDK dynamically with error handling
function loadFirebaseSDK(url, moduleName) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.type = 'text/javascript';
        script.async = true;
        
        script.onload = () => {
            console.log(`✅ Firebase ${moduleName} SDK loaded successfully`);
            resolve();
        };
        
        script.onerror = (error) => {
            console.error(`❌ Failed to load Firebase ${moduleName} SDK:`, error);
            reject(new Error(`Failed to load Firebase ${moduleName}`));
        };
        
        document.head.appendChild(script);
    });
}

// Initialize Firebase with fallback support
async function initializeFirebase() {
    try {
        console.log('🚀 Initializing Firebase...');
        
        // Check if Firebase is already loaded
        if (typeof firebase !== 'undefined') {
            console.log('Firebase global object already available');
        } else {
            // Load Firebase core if not available
            await loadFirebaseSDK(`https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}/firebase-app.js`, 'app');
        }
        
        // Load required Firebase modules
        await Promise.all([
            loadFirebaseSDK(FIREBASE_AUTH_URL, 'auth'),
            loadFirebaseSDK(FIREBASE_FIRESTORE_URL, 'firestore'),
            loadFirebaseSDK(FIREBASE_STORAGE_URL, 'storage'),
            loadFirebaseSDK(FIREBASE_FUNCTIONS_URL, 'functions')
        ]);
        
        // Initialize Firebase app
        const firebaseConfig = {
            apiKey: FIREBASE_API_KEY,
            authDomain: FIREBASE_AUTH_DOMAIN,
            projectId: FIREBASE_PROJECT_ID,
            storageBucket: FIREBASE_STORAGE_BUCKET,
            messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
            appId: FIREBASE_APP_ID
        };
        
        // Initialize Firebase with error handling
        try {
            firebaseApp = firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase app initialized successfully');
        } catch (error) {
            if (error.code === 'app/duplicate-app') {
                console.log('Firebase app already initialized, using existing instance');
                firebaseApp = firebase.app();
            } else {
                throw error;
            }
        }
        
        // Get Firebase services
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        firebaseStorage = firebase.storage();
        firebaseFunctions = firebase.functions();
        
        console.log('✅ All Firebase services initialized successfully');
        
        // Configure Firestore settings
        if (firebaseDb) {
            firebaseDb.settings({ 
                timestampsInSnapshots: true,
                merge: true 
            });
        }
        
        return {
            app: firebaseApp,
            auth: firebaseAuth,
            db: firebaseDb,
            storage: firebaseStorage,
            functions: firebaseFunctions
        };
        
    } catch (error) {
        console.error('❌ Firebase initialization failed:', error);
        throw error;
    }
}

// Fallback function for when Firebase SDK fails to load
function createFallbackFirebase() {
    console.warn('⚠️ Creating fallback Firebase objects due to SDK loading issues');
    
    return {
        app: {
            name: '[DEFAULT]',
            options: {}
        },
        auth: {
            currentUser: null,
            onAuthStateChanged: () => () => {}, // Return unsubscribe function
            signInWithEmailAndPassword: () => Promise.reject(new Error('Firebase Auth not available')),
            signOut: () => Promise.resolve(),
            createUserWithEmailAndPassword: () => Promise.reject(new Error('Firebase Auth not available'))
        },
        db: {
            collection: () => ({
                doc: () => ({
                    get: () => Promise.resolve({ exists: false, data: () => null }),
                    set: () => Promise.resolve(),
                    update: () => Promise.resolve()
                })
            }),
            doc: () => ({
                get: () => Promise.resolve({ exists: false, data: () => null }),
                set: () => Promise.resolve(),
                update: () => Promise.resolve()
            })
        },
        storage: {
            ref: () => ({
                put: () => Promise.reject(new Error('Firebase Storage not available')),
                getDownloadURL: () => Promise.reject(new Error('Firebase Storage not available'))
            })
        },
        functions: {
            httpsCallable: () => () => Promise.reject(new Error('Firebase Functions not available'))
        }
    };
}

// Initialize Firebase and make services available globally
let firebaseServices = null;

// Try to initialize Firebase, with fallback
initializeFirebase().then(services => {
    firebaseServices = services;
    console.log('🎉 Firebase services ready for use');
}).catch(error => {
    console.error('❌ Firebase initialization failed, using fallback:', error);
    firebaseServices = createFallbackFirebase();
});

// Export for both module and global use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FIREBASE_API_KEY,
        FIREBASE_AUTH_DOMAIN,
        FIREBASE_PROJECT_ID,
        FIREBASE_STORAGE_BUCKET,
        FIREBASE_MESSAGING_SENDER_ID,
        FIREBASE_APP_ID,
        initializeFirebase,
        createFallbackFirebase
    };
} else {
    // Make available globally for browser use
    window.firebaseConfig = {
        FIREBASE_API_KEY,
        FIREBASE_AUTH_DOMAIN,
        FIREBASE_PROJECT_ID,
        FIREBASE_STORAGE_BUCKET,
        FIREBASE_MESSAGING_SENDER_ID,
        FIREBASE_APP_ID,
        initializeFirebase,
        createFallbackFirebase,
        getFirebaseServices: () => firebaseServices
    };
    
    // Also make individual services available
    window.getFirebaseAuth = () => firebaseServices?.auth;
    window.getFirebaseDb = () => firebaseServices?.db;
    window.getFirebaseStorage = () => firebaseServices?.storage;
    window.getFirebaseFunctions = () => firebaseServices?.functions;
}