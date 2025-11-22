/**
 * Push Notifications System for TuCitaSegura
 * Firebase Cloud Messaging (FCM) integration
 */

import { getMessaging, getToken, onMessage } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// Notification types
export const NOTIFICATION_TYPES = {
  NEW_MATCH: 'new_match',
  NEW_MESSAGE: 'new_message',
  DATE_REQUEST: 'date_request',
  DATE_CONFIRMED: 'date_confirmed',
  DATE_REMINDER: 'date_reminder',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PROFILE_VERIFIED: 'profile_verified',
  NEW_BADGE: 'new_badge',
  REFERRAL_COMPLETED: 'referral_completed',
  VIP_EVENT: 'vip_event',
  ADMIN_MESSAGE: 'admin_message'
};

// Notification icons based on type
const NOTIFICATION_ICONS = {
  new_match: '💕',
  new_message: '💬',
  date_request: '📅',
  date_confirmed: '✅',
  date_reminder: '⏰',
  payment_success: '💳',
  payment_failed: '❌',
  profile_verified: '✓',
  new_badge: '🏆',
  referral_completed: '🎁',
  vip_event: '🎉',
  admin_message: '📢'
};

let messaging = null;
let currentToken = null;

/**
 * Initialize Firebase Cloud Messaging
 * @param {Object} app - Firebase app instance
 * @returns {Object} Messaging instance
 */
export function initializeMessaging(app) {
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch (error) {
    console.error('Error initializing messaging:', error);
    return null;
  }
}

/**
 * Request notification permission and get FCM token
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @returns {Object} Result with token or error
 */
export async function requestNotificationPermission(db, userId) {
  try {
    // Check if browser supports notifications
    if (!('Notification' in window)) {
      return {
        success: false,
        error: 'Este navegador no soporta notificaciones'
      };
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Permisos de notificación denegados'
      };
    }

    // Get FCM token
    // VAPID key from firebase-config.js
    const { VAPID_PUBLIC_KEY } = await import('./firebase-config.js');

    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY.includes('xxx')) {
      console.error('VAPID key not configured in firebase-config.js');
      return {
        success: false,
        error: 'VAPID key no configurada. Contacta al administrador.'
      };
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_PUBLIC_KEY
    });

    if (!token) {
      return {
        success: false,
        error: 'No se pudo obtener el token de notificaciones'
      };
    }

    // Save token to Firestore
    await saveTokenToFirestore(db, userId, token);

    currentToken = token;

    return {
      success: true,
      token: token
    };

  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Save FCM token to Firestore
 * @param {Object} db - Firestore instance
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
async function saveTokenToFirestore(db, userId, token) {
  try {
    const tokenRef = doc(db, 'push_tokens', token);
    await setDoc(tokenRef, {
      userId: userId,
      token: token,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      platform: 'web',
      userAgent: navigator.userAgent
    }, { merge: true });

    console.log('FCM token saved to Firestore');
  } catch (error) {
    console.error('Error saving token to Firestore:', error);
  }
}

/**
 * Delete FCM token from Firestore
 * @param {Object} db - Firestore instance
 * @param {string} token - FCM token
 */
export async function deleteTokenFromFirestore(db, token) {
  try {
    const tokenRef = doc(db, 'push_tokens', token);
    await deleteDoc(tokenRef);
    console.log('FCM token deleted from Firestore');
  } catch (error) {
    console.error('Error deleting token from Firestore:', error);
  }
}

/**
 * Setup foreground message listener
 * @param {Function} callback - Callback function for received messages
 */
export function setupForegroundMessageListener(callback) {
  if (!messaging) {
    console.error('Messaging not initialized');
    return;
  }

  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);

    const { notification, data } = payload;

    // Show browser notification
    if (notification) {
      showBrowserNotification(notification.title, notification.body, notification.icon, data);
    }

    // Call custom callback
    if (callback && typeof callback === 'function') {
      callback(payload);
    }
  });
}

/**
 * Show browser notification
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {string} icon - Notification icon URL
 * @param {Object} data - Additional data
 */
function showBrowserNotification(title, body, icon, data = {}) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const options = {
    body: body,
    icon: icon || '/assets/icon.png',
    badge: '/assets/badge.png',
    vibrate: [200, 100, 200],
    data: data,
    requireInteraction: false,
    tag: data.type || 'general'
  };

  const notification = new Notification(title, options);

  notification.onclick = function(event) {
    event.preventDefault();

    // Handle notification click based on type
    handleNotificationClick(data);

    notification.close();
  };
}

/**
 * Handle notification click
 * @param {Object} data - Notification data
 */
function handleNotificationClick(data) {
  const type = data.type;
  const targetUrl = data.url;

  if (targetUrl) {
    window.location.href = targetUrl;
    return;
  }

  // Default navigation based on type
  switch (type) {
    case NOTIFICATION_TYPES.NEW_MATCH:
      window.location.href = '/webapp/conversaciones.html';
      break;

    case NOTIFICATION_TYPES.NEW_MESSAGE:
      if (data.conversationId) {
        window.location.href = `/webapp/chat.html?id=${data.conversationId}`;
      }
      break;

    case NOTIFICATION_TYPES.DATE_REQUEST:
    case NOTIFICATION_TYPES.DATE_CONFIRMED:
    case NOTIFICATION_TYPES.DATE_REMINDER:
      if (data.appointmentId) {
        window.location.href = `/webapp/cita-detalle.html?id=${data.appointmentId}`;
      }
      break;

    case NOTIFICATION_TYPES.NEW_BADGE:
      window.location.href = '/webapp/logros.html';
      break;

    case NOTIFICATION_TYPES.VIP_EVENT:
      window.location.href = '/webapp/eventos-vip.html';
      break;

    default:
      window.location.href = '/webapp/perfil.html';
  }
}

/**
 * Get notification icon for type
 * @param {string} type - Notification type
 * @returns {string} Icon emoji
 */
export function getNotificationIcon(type) {
  return NOTIFICATION_ICONS[type] || '🔔';
}

/**
 * Check if notifications are supported
 * @returns {boolean} Whether notifications are supported
 */
export function areNotificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

/**
 * Get current notification permission status
 * @returns {string} Permission status
 */
export function getNotificationPermission() {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

/**
 * Check if user has granted notification permission
 * @returns {boolean} Whether permission is granted
 */
export function hasNotificationPermission() {
  return getNotificationPermission() === 'granted';
}
