/**
 * Firebase Configuration - SECURE VERSION
 * Uses environment variables instead of hardcoded credentials
 *
 * IMPORTANT:
 * 1. Never commit actual credentials to version control
 * 2. Use a build tool (Vite, Webpack, etc.) to inject env vars
 * 3. Rotate credentials immediately if they were exposed
 */

// Check if we're using a build tool with env var support
const isProduction = import.meta?.env?.MODE === 'production';

// Firebase configuration using environment variables
export const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || process.env.FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID || process.env.FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || process.env.FIREBASE_MEASUREMENT_ID
};

// Validate that all required config values are present
const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);

if (missingKeys.length > 0) {
    console.error('Missing Firebase configuration:', missingKeys);
    throw new Error(
        `Missing Firebase environment variables: ${missingKeys.join(', ')}\n` +
        'Please check your .env file and ensure all VITE_FIREBASE_* variables are set.'
    );
}

// Log configuration status (without exposing sensitive data)
if (!isProduction) {
    console.log('Firebase configuration loaded:', {
        projectId: firebaseConfig.projectId,
        authDomain: firebaseConfig.authDomain,
        configComplete: missingKeys.length === 0
    });
}

export default firebaseConfig;

// Export for CommonJS modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { firebaseConfig };
}
