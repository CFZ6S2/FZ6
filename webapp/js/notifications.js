// ===========================================================================
// Firebase Cloud Messaging - Notifications Client
// ===========================================================================
// Manages push notifications for TuCitaSegura

import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { doc, setDoc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { auth, db, VAPID_PUBLIC_KEY } from './firebase-config.js';
import { showToast } from './utils.js';

let messaging = null;
let currentToken = null;

/**
 * Initialize Firebase Cloud Messaging
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

    // Register service worker
    await registerServiceWorker();

    // Initialize messaging
    messaging = getMessaging();

    // Request permission and get token
    const hasPermission = await requestNotificationPermission();
    if (hasPermission) {
      await getAndSaveFCMToken();
      listenForForegroundMessages();
    }

    return hasPermission;
  } catch (error) {
    console.error('Error initializing notifications:', error);
    return false;
  }
}

/**
 * Register Service Worker
 */
async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/webapp/firebase-messaging-sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    throw error;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted');
      return true;
    } else if (permission === 'denied') {
      console.warn('Notification permission denied');
      showToast('Has bloqueado las notificaciones. Actívalas en la configuración del navegador.', 'warning');
      return false;
    } else {
      console.log('Notification permission dismissed');
      return false;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return false;
  }
}

/**
 * Get FCM token and save to Firestore
 */
async function getAndSaveFCMToken() {
  try {
    if (!messaging) {
      throw new Error('Messaging not initialized');
    }

    const user = auth.currentUser;
    if (!user) {
      console.warn('No user logged in');
      return null;
    }

    // Get FCM token
    const token = await getToken(messaging, { vapidKey: VAPID_PUBLIC_KEY });

    if (token) {
      console.log('FCM Token obtained:', token.substring(0, 20) + '...');
      currentToken = token;

      // Save token to Firestore
      await saveFCMTokenToFirestore(user.uid, token);

      return token;
    } else {
      console.warn('No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);

    if (error.code === 'messaging/permission-blocked') {
      showToast('Las notificaciones están bloqueadas. Actívalas en la configuración del navegador.', 'warning');
    }

    return null;
  }
}

/**
 * Save FCM token to Firestore
 */
async function saveFCMTokenToFirestore(userId, token) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const existingTokens = userData.fcmTokens || [];

      // Add token if not already exists
      if (!existingTokens.includes(token)) {
        await updateDoc(userRef, {
          fcmTokens: [...existingTokens, token],
          lastTokenUpdate: new Date()
        });
        console.log('FCM token saved to Firestore');
      }
    } else {
      await setDoc(userRef, {
        fcmTokens: [token],
        lastTokenUpdate: new Date()
      }, { merge: true });
    }
  } catch (error) {
    console.error('Error saving FCM token to Firestore:', error);
  }
}

/**
 * Listen for foreground messages
 */
function listenForForegroundMessages() {
  if (!messaging) return;

  onMessage(messaging, (payload) => {
    console.log('Foreground message received:', payload);

    const { notification, data } = payload;

    // Show in-app notification
    showInAppNotification(notification, data);

    // Update UI based on notification type
    handleNotificationAction(data);
  });
}

/**
 * Show in-app notification
 */
function showInAppNotification(notification, data) {
  const title = notification?.title || data?.title || 'Nueva notificación';
  const body = notification?.body || data?.body || '';

  // Create notification element
  const notificationEl = document.createElement('div');
  notificationEl.className = 'fixed top-4 right-4 z-50 animate-slideIn';
  notificationEl.innerHTML = `
    <div class="glass rounded-xl p-4 shadow-xl max-w-sm">
      <div class="flex items-start gap-3">
        <div class="flex-shrink-0">
          ${getNotificationIcon(data?.type)}
        </div>
        <div class="flex-1">
          <h3 class="font-bold text-white mb-1">${title}</h3>
          <p class="text-sm text-gray-300">${body}</p>
        </div>
        <button onclick="this.closest('.fixed').remove()"
                class="flex-shrink-0 text-gray-400 hover:text-white">
          <i class="fas fa-times"></i>
        </button>
      </div>
      ${getNotificationActions(data)}
    </div>
  `;

  document.body.appendChild(notificationEl);

  // Auto-remove after 8 seconds
  setTimeout(() => {
    notificationEl.classList.add('animate-fadeOut');
    setTimeout(() => notificationEl.remove(), 300);
  }, 8000);

  // Play notification sound
  playNotificationSound();
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type) {
  const icons = {
    match: '<i class="fas fa-heart text-pink-500 text-2xl"></i>',
    message: '<i class="fas fa-comment text-blue-500 text-2xl"></i>',
    appointment: '<i class="fas fa-calendar text-purple-500 text-2xl"></i>',
    reminder: '<i class="fas fa-bell text-yellow-500 text-2xl"></i>',
    vip_event: '<i class="fas fa-star text-gold-500 text-2xl"></i>',
    default: '<i class="fas fa-bell text-white text-2xl"></i>'
  };
  return icons[type] || icons.default;
}

/**
 * Get notification actions
 */
function getNotificationActions(data) {
  if (!data) return '';

  let actions = '';

  switch (data.type) {
    case 'match':
      actions = `
        <div class="mt-3 flex gap-2">
          <button onclick="window.location.href='/webapp/perfil-usuario.html?uid=${data.senderId}'"
                  class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">
            Ver perfil
          </button>
        </div>
      `;
      break;
    case 'message':
      actions = `
        <div class="mt-3 flex gap-2">
          <button onclick="window.location.href='/webapp/chat.html?conversationId=${data.conversationId}'"
                  class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">
            Responder
          </button>
        </div>
      `;
      break;
    case 'appointment':
      actions = `
        <div class="mt-3 flex gap-2">
          <button onclick="window.location.href='/webapp/cita-detalle.html?appointmentId=${data.appointmentId}'"
                  class="flex-1 bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm">
            Ver cita
          </button>
        </div>
      `;
      break;
    case 'vip_event':
      actions = `
        <div class="mt-3 flex gap-2">
          <button onclick="window.location.href='/webapp/eventos-vip.html'"
                  class="flex-1 bg-gold-500 hover:bg-gold-600 text-white px-3 py-2 rounded-lg text-sm">
            Ver evento
          </button>
        </div>
      `;
      break;
  }

  return actions;
}

/**
 * Handle notification action (update UI, badges, etc.)
 */
function handleNotificationAction(data) {
  if (!data) return;

  switch (data.type) {
    case 'message':
      // Update unread count badge
      updateUnreadCount();
      break;
    case 'match':
      // Update match count badge
      updateMatchCount();
      break;
  }
}

/**
 * Update unread message count
 */
async function updateUnreadCount() {
  try {
    const badge = document.querySelector('#unread-badge');
    if (badge) {
      const count = parseInt(badge.textContent) || 0;
      badge.textContent = count + 1;
      badge.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error updating unread count:', error);
  }
}

/**
 * Update match count
 */
async function updateMatchCount() {
  try {
    const badge = document.querySelector('#match-badge');
    if (badge) {
      const count = parseInt(badge.textContent) || 0;
      badge.textContent = count + 1;
      badge.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Error updating match count:', error);
  }
}

/**
 * Play notification sound
 */
function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSl+zPDTgjMGHm7A7+OZRQ0PUZD');
    audio.volume = 0.3;
    audio.play().catch(e => console.log('Could not play notification sound:', e));
  } catch (error) {
    console.error('Error playing notification sound:', error);
  }
}

/**
 * Delete FCM token (on logout)
 */
export async function deleteFCMToken() {
  try {
    const user = auth.currentUser;
    if (!user || !currentToken) return;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      const existingTokens = userData.fcmTokens || [];

      // Remove current token
      const updatedTokens = existingTokens.filter(t => t !== currentToken);

      await updateDoc(userRef, {
        fcmTokens: updatedTokens
      });

      console.log('FCM token removed from Firestore');
    }

    currentToken = null;
  } catch (error) {
    console.error('Error deleting FCM token:', error);
  }
}

/**
 * Get current FCM token
 */
export function getCurrentFCMToken() {
  return currentToken;
}

/**
 * Check if notifications are enabled
 */
export function areNotificationsEnabled() {
  return Notification.permission === 'granted';
}

/**
 * Show notification settings prompt
 */
export function showNotificationSettingsPrompt() {
  if (Notification.permission === 'default') {
    showToast('Activa las notificaciones para recibir alertas en tiempo real', 'info');

    // Show custom modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="glass rounded-2xl p-8 max-w-md mx-4 animate-scaleIn">
        <div class="text-center mb-6">
          <div class="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <i class="fas fa-bell text-4xl text-blue-500"></i>
          </div>
          <h2 class="text-2xl font-bold text-white mb-2">Activa las Notificaciones</h2>
          <p class="text-gray-300">
            Recibe alertas instantáneas cuando tengas nuevos matches, mensajes o citas confirmadas.
          </p>
        </div>

        <div class="space-y-3 mb-6">
          <div class="flex items-start gap-3 text-sm text-gray-300">
            <i class="fas fa-check text-green-500 mt-1"></i>
            <span>Nuevas solicitudes de match</span>
          </div>
          <div class="flex items-start gap-3 text-sm text-gray-300">
            <i class="fas fa-check text-green-500 mt-1"></i>
            <span>Mensajes en tiempo real</span>
          </div>
          <div class="flex items-start gap-3 text-sm text-gray-300">
            <i class="fas fa-check text-green-500 mt-1"></i>
            <span>Recordatorios de citas</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button onclick="this.closest('.fixed').remove()"
                  class="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-3 rounded-xl">
            Ahora no
          </button>
          <button onclick="activateNotifications(this)"
                  class="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl">
            Activar
          </button>
        </div>
      </div>
    `;

    // Add activate function
    window.activateNotifications = async (btn) => {
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Activando...';

      const granted = await requestNotificationPermission();

      if (granted) {
        await getAndSaveFCMToken();
        showToast('¡Notificaciones activadas correctamente!', 'success');
        modal.remove();
      } else {
        btn.disabled = false;
        btn.textContent = 'Activar';
        showToast('No se pudieron activar las notificaciones', 'error');
      }
    };

    document.body.appendChild(modal);
  } else if (Notification.permission === 'denied') {
    showToast('Las notificaciones están bloqueadas. Actívalas en la configuración del navegador.', 'warning');
  }
}

// Export for global use
window.showNotificationSettingsPrompt = showNotificationSettingsPrompt;
