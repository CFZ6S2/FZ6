// Firebase REST API Authentication - Complete bypass of Cloud Functions
// This module uses direct HTTP calls to Firebase Auth REST API

const FIREBASE_API_KEY = "AIzaSyAgFcoHwoBpo80rlEHL2hHVZ2DqtjWXh2s";
const FIREBASE_PROJECT_ID = "tuscitasseguras-2d1a6";

// Firebase Auth REST API endpoints
const FIREBASE_AUTH_ENDPOINTS = {
  signInWithPassword: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
  signUp: `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
  getAccountInfo: `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
  sendPasswordReset: `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_API_KEY}`,
  refreshToken: `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
  verifyPassword: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`
};

// User session management
let currentUser = null;
let currentToken = null;
let refreshToken = null;

/**
 * Authenticate user using Firebase REST API - COMPLETE BYPASS
 */
export async function restSignInWithEmailAndPassword(email, password) {
  console.log('🔐 REST API: Attempting direct authentication...');
  
  try {
    const response = await fetch(FIREBASE_AUTH_ENDPOINTS.signInWithPassword, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: email,
        password: password,
        returnSecureToken: true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ REST API Error:', errorData);
      
      // Map Firebase REST API errors to Firebase Auth SDK errors
      const errorCode = errorData.error?.message || 'UNKNOWN_ERROR';
      let mappedError = new Error(errorCode);
      
      switch (errorCode) {
        case 'EMAIL_NOT_FOUND':
          mappedError.code = 'auth/user-not-found';
          break;
        case 'INVALID_PASSWORD':
          mappedError.code = 'auth/wrong-password';
          break;
        case 'INVALID_EMAIL':
          mappedError.code = 'auth/invalid-email';
          break;
        case 'USER_DISABLED':
          mappedError.code = 'auth/user-disabled';
          break;
        case 'TOO_MANY_ATTEMPTS_TRY_LATER':
          mappedError.code = 'auth/too-many-requests';
          break;
        default:
          mappedError.code = 'auth/internal-error';
      }
      
      throw mappedError;
    }

    const data = await response.json();
    console.log('✅ REST API: Authentication successful!', data);
    
    // Store user data
    currentUser = {
      uid: data.localId,
      email: data.email,
      emailVerified: data.emailVerified || false,
      displayName: data.displayName || null,
      photoURL: data.photoUrl || null,
      refreshToken: data.refreshToken
    };
    
    currentToken = data.idToken;
    refreshToken = data.refreshToken;
    
    // Return format compatible with Firebase Auth SDK
    return {
      user: currentUser,
      credential: null,
      additionalUserInfo: {
        isNewUser: false,
        providerId: 'password'
      }
    };
    
  } catch (error) {
    console.error('❌ REST API: Authentication failed:', error);
    throw error;
  }
}

/**
 * Get current user
 */
export function getCurrentUser() {
  return currentUser;
}

/**
 * Get current token
 */
export function getCurrentToken() {
  return currentToken;
}

/**
 * Refresh authentication token
 */
export async function refreshAuthToken() {
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await fetch(FIREBASE_AUTH_ENDPOINTS.refreshToken, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    currentToken = data.id_token;
    
    return currentToken;
  } catch (error) {
    console.error('❌ Token refresh failed:', error);
    throw error;
  }
}

/**
 * Sign out user
 */
export function signOut() {
  currentUser = null;
  currentToken = null;
  refreshToken = null;
  console.log('✅ REST API: User signed out');
}

/**
 * Test REST API connectivity
 */
export async function testRestAPIConnectivity() {
  console.log('🧪 Testing REST API connectivity...');
  
  try {
    // Test with a simple account lookup
    const response = await fetch(FIREBASE_AUTH_ENDPOINTS.getAccountInfo, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: ['test@example.com']
      })
    });

    if (response.ok) {
      console.log('✅ REST API: Connectivity test successful');
      return true;
    } else {
      const errorData = await response.json();
      console.error('❌ REST API: Connectivity test failed:', errorData);
      return false;
    }
  } catch (error) {
    console.error('❌ REST API: Connectivity test error:', error);
    return false;
  }
}

/**
 * Create a mock Firebase user object for compatibility
 */
export function createMockFirebaseUser(userData) {
  return {
    uid: userData.localId || userData.uid,
    email: userData.email,
    emailVerified: userData.emailVerified || false,
    displayName: userData.displayName || null,
    photoURL: userData.photoUrl || null,
    phoneNumber: userData.phoneNumber || null,
    providerId: 'password',
    // Mock Firebase Auth methods
    getIdToken: async () => currentToken,
    getIdTokenResult: async () => ({
      token: currentToken,
      claims: {},
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: 'password'
    }),
    reload: async () => {
      // In a real implementation, this would refresh user data
      return Promise.resolve();
    }
  };
}

// Export all functions
export default {
  restSignInWithEmailAndPassword,
  getCurrentUser,
  getCurrentToken,
  refreshAuthToken,
  signOut,
  testRestAPIConnectivity,
  createMockFirebaseUser
};