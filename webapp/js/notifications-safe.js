// ===========================================================================
// Firebase Cloud Messaging - Notifications Client
// ===========================================================================
// Manages push notifications for TuCitaSegura

import { doc, setDoc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db } from './firebase-config-env.js';
import { showToast } from './utils.js';

// VAPID key - use environment variable or hardcoded fallback
const VAPID_PUBLIC_KEY = "BJW5I1B7KSEvM1q8FuwNokyu4sgoUy0u93C2XSQ8kpDVUdw6jv1UgYo9k_lIRjs-Rpte-YUkFqM7bbOYAD32T-w";

let messaging = null;
let currentToken = null;

/**
 * Initialize Firebase Cloud Messaging with error handling
 */
export async function initializeNotifications() {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    // Check if service worker is supported
    if (!('serviceWorker' in navigator)) {
      console.warn('This browser does not support service workers');
      return false;
    }

    // Try to import Firebase Messaging dynamically
    try {
      const messagingModule = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js');
      const { getMessaging, getToken, onMessage } = messagingModule;

      await registerServiceWorker();

      // Initialize messaging
      messaging = getMessaging();

      // Request permission and get token
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) {
        await getAndSaveFCMToken(getToken);
        listenForForegroundMessages(onMessage);
      }

      return hasPermission;

    } catch (importError) {
      console.warn('Firebase Messaging not available:', importError.message);
      console.log('💡 Notifications disabled - using basic functionality');
      return false;
    }

  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
}

/**
 * Register service worker for notifications
 */
async function registerServiceWorker() {
  try {
<<<<<<< HEAD
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
=======
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)
    console.log('✅ Service Worker registered for notifications:', registration.scope);
    return registration;
  } catch (error) {
    console.warn('Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Request notification permission
 */
async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    console.log('🔔 Notification permission:', permission);
    return permission === 'granted';
  } catch (error) {
    console.warn('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get and save FCM token
 */
async function getAndSaveFCMToken(getTokenFunction) {
  if (!messaging || !auth.currentUser) {
    console.warn('Cannot get FCM token: messaging not initialized or no user');
    return;
  }

  // Check if VAPID key is configured
  if (!VAPID_PUBLIC_KEY) {
    console.warn('📵 VAPID key not configured - push notifications disabled');
    console.log('💡 Configure VAPID_PUBLIC_KEY in firebase-config.js to enable push notifications');
    return;
  }

  try {
    const token = await getTokenFunction(messaging, {
      vapidKey: VAPID_PUBLIC_KEY
    });

    if (token) {
      console.log('✅ FCM Token obtained');
      currentToken = token;

      // Save token to Firestore
      await saveTokenToFirestore(token);

      // Show success message
      if (typeof showToast === 'function') {
        showToast('Notificaciones activadas', 'success');
      }
    } else {
      console.log('📵 No FCM token available');
    }
  } catch (error) {
    console.warn('Error getting FCM token:', error);

    // Show user-friendly error
    if (error.code === 'messaging/permission-blocked') {
      if (typeof showToast === 'function') {
        showToast('Permisos de notificación bloqueados', 'warning');
      }
    }
  }
}

/**
 * Save FCM token to Firestore
 */
async function saveTokenToFirestore(token) {
  if (!auth.currentUser) return;

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const tokens = userData.fcmTokens || {};

      // Add current token with timestamp
      tokens[token] = {
        createdAt: new Date(),
        platform: navigator.platform,
        userAgent: navigator.userAgent.substring(0, 100)
      };

      await updateDoc(userRef, {
        fcmTokens: tokens,
        lastNotificationToken: token
      });

      console.log('✅ FCM token saved to Firestore');
    }
  } catch (error) {
    console.warn('Error saving FCM token:', error);
  }
}

/**
 * Listen for foreground messages
 */
function listenForForegroundMessages(onMessageFunction) {
  if (!messaging) return;

  try {
    onMessageFunction(messaging, (payload) => {
      console.log('📨 Foreground message received:', payload);

      // Show notification
      const notificationTitle = payload.notification?.title || 'TuCitaSegura';
      const notificationOptions = {
        body: payload.notification?.body || 'Tienes una nueva notificación',
        icon: payload.notification?.icon || '/webapp/img/icon-192x192.png',
        badge: '/webapp/img/icon-72x72.png',
        vibrate: [200, 100, 200],
        tag: 'tucitasegura-notification'
      };

      // Show browser notification
      if (Notification.permission === 'granted') {
        new Notification(notificationTitle, notificationOptions);
      }

      // Show in-app toast
      if (typeof showToast === 'function') {
        showToast(notificationOptions.body, 'info');
      }
    });

    console.log('✅ Foreground message listener set up');
  } catch (error) {
    console.warn('Error setting up foreground message listener:', error);
  }
}

/**
 * Get current FCM token
 */
export function getCurrentFCMToken() {
  return currentToken;
}

/**
 * Check if notifications are supported
 */
export function areNotificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Safely remove FCM token
 */
export async function removeFCMToken() {
  if (!auth.currentUser || !currentToken) return;

  try {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const tokens = userData.fcmTokens || {};

      // Remove current token
      delete tokens[currentToken];

      await updateDoc(userRef, {
        fcmTokens: tokens
      });

      console.log('✅ FCM token removed from Firestore');
    }

    currentToken = null;
  } catch (error) {
    console.warn('Error removing FCM token:', error);
  }
}

console.log('✅ Notifications module loaded with error handling');
