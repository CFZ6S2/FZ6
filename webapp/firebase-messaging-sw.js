// ===========================================================================
// Firebase Cloud Messaging Service Worker
// ===========================================================================
// This service worker handles background notifications when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration (same as firebase-config.js)
const firebaseConfig = {
  apiKey: "AIzaSyBU0Q8RYHSOVS9ugm8IOwxJSTNWHOG48OA",
  authDomain: "tuscitasseguras-2d1a6.firebaseapp.com",
  projectId: "tuscitasseguras-2d1a6",
  storageBucket: "tuscitasseguras-2d1a6.firebasestorage.app",
  messagingSenderId: "924208562587",
  appId: "1:924208562587:web:5291359426fe390b36213e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || payload.data?.title || 'TuCitaSegura';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Tienes una nueva notificación',
    icon: payload.notification?.icon || '/webapp/assets/icon-192x192.png',
    badge: '/webapp/assets/badge-72x72.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
    requireInteraction: payload.data?.priority === 'high',
    actions: []
  };

  // Add custom actions based on notification type
  if (payload.data?.type === 'match') {
    notificationOptions.actions = [
      { action: 'view', title: 'Ver perfil' },
      { action: 'dismiss', title: 'Cerrar' }
    ];
  } else if (payload.data?.type === 'message') {
    notificationOptions.actions = [
      { action: 'reply', title: 'Responder' },
      { action: 'view', title: 'Ver chat' }
    ];
  } else if (payload.data?.type === 'appointment') {
    notificationOptions.actions = [
      { action: 'view', title: 'Ver detalles' },
      { action: 'dismiss', title: 'Cerrar' }
    ];
  }

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received:', event);

  event.notification.close();

  const data = event.notification.data;
  let url = '/webapp/conversaciones.html';

  // Determine URL based on notification type
  if (event.action === 'view' || !event.action) {
    switch (data?.type) {
      case 'match':
        url = `/webapp/perfil-usuario.html?uid=${data.senderId}`;
        break;
      case 'message':
        url = `/webapp/chat.html?conversationId=${data.conversationId}`;
        break;
      case 'appointment':
        url = `/webapp/cita-detalle.html?appointmentId=${data.appointmentId}`;
        break;
      case 'vip_event':
        url = `/webapp/eventos-vip.html`;
        break;
      default:
        url = '/webapp/conversaciones.html';
    }
  } else if (event.action === 'reply') {
    url = `/webapp/chat.html?conversationId=${data.conversationId}`;
  } else if (event.action === 'dismiss') {
    return; // Just close the notification
  }

  // Open the URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
