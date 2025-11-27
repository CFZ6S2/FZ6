/**
 * Push Notifications with Firebase Cloud Messaging
 * TuCitaSegura - Real-time notifications for matches, messages, and appointments
 */

import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { app, VAPID_PUBLIC_KEY } from "./firebase-config.js";
import { getFirestore, doc, updateDoc, getDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const messaging = getMessaging(app);
const db = getFirestore(app);

/**
 * Request notification permission and get FCM token
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} FCM token
 */
export async function requestNotificationPermission(userId) {
  try {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('✅ Notification permission granted');

      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: VAPID_PUBLIC_KEY
      });

      if (token) {
        console.log('📱 FCM Token obtained');

        // Save token to Firestore
        await saveTokenToFirestore(userId, token);

        return token;
      } else {
        console.log('⚠️ No registration token available');
        return null;
      }
    } else {
      console.log('❌ Notification permission denied');
      return null;
    }

  } catch (error) {
    console.error('Error getting notification permission:', error);
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
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const currentTokens = userDoc.data().fcmTokens || [];

      if (!currentTokens.includes(token)) {
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token),
          updatedAt: new Date()
        });

        console.log('✅ FCM token saved');
      }
    }
  } catch (error) {
    console.error('Error saving token:', error);
  }
}

/**
 * Setup foreground message listener
 * @param {Function} callback - Callback for received messages
 */
export function setupMessageListener(callback) {
  onMessage(messaging, (payload) => {
    console.log('📬 Message received:', payload);

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
    const { getFunctions, httpsCallable } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-functions.js");
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
