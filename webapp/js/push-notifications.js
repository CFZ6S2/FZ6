/**
 * Push Notifications with Firebase Cloud Messaging
 * TuCitaSegura - Real-time notifications for matches, messages, and appointments
 */

import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { app, VAPID_PUBLIC_KEY } from "./firebase-config-env.js";
import { doc, updateDoc, getDoc, arrayUnion } from "firebase/firestore";
import { createLogger } from "./logger.js";

const messaging = getMessaging(app);
const logger = createLogger('push-notifications');

/**
 * Request notification permission and get FCM token
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} FCM token
 */
export async function requestNotificationPermission(userId) {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      logger.warn('Browser does not support notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      logger.info('Notification permission granted', { userId });

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_PUBLIC_KEY
      });

      if (token) {
        logger.info('FCM token obtained', { userId });

        // Save token to Firestore
        await saveTokenToFirestore(userId, token);

        return token;
      } else {
        logger.warn('No FCM registration token available', { userId });
        return null;
      }
    } else {
      logger.warn('Notification permission denied', { userId, permission });
      return null;
    }

  } catch (error) {
    logger.error('Error getting notification permission', error, { userId });
    return null;
  }
}

/**
 * Save FCM token to Firestore
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 */
async function saveTokenToFirestore(userId, token) {
  try {
    const { getDb } = await import('./firebase-config-env.js');
    const db = await getDb();
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const currentTokens = userDoc.data().fcmTokens || [];

      if (!currentTokens.includes(token)) {
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token),
          updatedAt: new Date()
        });

        logger.info('FCM token saved to Firestore', { userId });
      }
    }
  } catch (error) {
    logger.error('Error saving FCM token', error, { userId });
  }
}

/**
 * Setup foreground message listener
 * @param {Function} callback - Callback for received messages
 */
export function setupMessageListener(callback) {
  onMessage(messaging, (payload) => {
    logger.info('FCM message received', {
      title: payload.notification?.title,
      type: payload.data?.type
    });

    const { title, body, icon } = payload.notification || {};
    const data = payload.data || {};

    if (Notification.permission === 'granted' && title) {
      const notification = new Notification(title, {
        body: body,
        icon: icon || '/webapp/assets/icon-192x192.png',
        badge: '/webapp/assets/badge-72x72.png',
        data: data
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    }

    if (callback) callback(payload);
  });
}

/**
 * Send test notification
 * @returns {Promise<Object>} Result
 */
export async function sendTestNotification() {
  try {
    const { getFunctions, httpsCallable } = await import("firebase/functions");
    const functions = getFunctions(app);
    const sendTest = httpsCallable(functions, 'sendTestNotification');
    const result = await sendTest();
    return result.data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export function areNotificationsEnabled() {
  return 'Notification' in window && Notification.permission === 'granted';
}
