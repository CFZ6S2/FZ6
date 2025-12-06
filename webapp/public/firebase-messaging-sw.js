<<<<<<< HEAD
// Service Worker copied to public so Vite outputs at site root
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

=======
<<<<<<<< HEAD:webapp/firebase-messaging-sw.js
// ===========================================================================
// Firebase Cloud Messaging Service Worker
// ===========================================================================
// This service worker handles background notifications when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase configuration (same as firebase-config.js)
const firebaseConfig = {
  apiKey: "AIzaSyAmaE2tXMBsKc8DjBd1ShJ1HnDxVYQ0yzU",
  authDomain: "tucitasegura-129cc.firebaseapp.com",
  projectId: "tucitasegura-129cc",
  storageBucket: "tucitasegura-129cc.firebasestorage.app",
  messagingSenderId: "180656060538",
  appId: "1:180656060538:web:3168487130aa126db663c3"
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
    icon: payload.notification?.icon || '/assets/icon-192x192.png',
    badge: '/assets/badge-72x72.png',
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
  let url = '/conversaciones.html';

  // Determine URL based on notification type
  if (event.action === 'view' || !event.action) {
    switch (data?.type) {
      case 'match':
        url = `/perfil-usuario.html?uid=${data.senderId}`;
        break;
      case 'message':
        url = `/chat.html?conversationId=${data.conversationId}`;
        break;
      case 'appointment':
        url = `/cita-detalle.html?appointmentId=${data.appointmentId}`;
        break;
      case 'vip_event':
        url = `/eventos-vip.html`;
        break;
      default:
        url = '/conversaciones.html';
    }
  } else if (event.action === 'reply') {
    url = `/chat.html?conversationId=${data.conversationId}`;
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
========
// ===========================================================================
// Firebase Cloud Messaging Service Worker
// ===========================================================================
// This service worker handles background notifications when the app is closed

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Firebase configuration (same as firebase-config.js)
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)
const firebaseConfig = {
  apiKey: "AIzaSyAmaE2tXMBsKc8DjBd1ShJ1HnDxVYQ0yzU",
  authDomain: "tucitasegura-129cc.firebaseapp.com",
  projectId: "tucitasegura-129cc",
  storageBucket: "tucitasegura-129cc.firebasestorage.app",
  messagingSenderId: "180656060538",
  appId: "1:180656060538:web:3168487130aa126db663c3"
};

<<<<<<< HEAD
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
=======
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)
  const notificationTitle = payload.notification?.title || payload.data?.title || 'TuCitaSegura';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Tienes una nueva notificación',
    icon: payload.notification?.icon || '/assets/icon-192x192.png',
    badge: '/assets/badge-72x72.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
<<<<<<< HEAD
    requireInteraction: payload.data?.priority === 'high'
  };
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data;
  let url = '/conversaciones.html';
  if (event.action === 'view' || !event.action) {
    switch (data?.type) {
      case 'match': url = `/perfil-usuario.html?uid=${data.senderId}`; break;
      case 'message': url = `/chat.html?conversationId=${data.conversationId}`; break;
      case 'appointment': url = `/cita-detalle.html?appointmentId=${data.appointmentId}`; break;
      case 'vip_event': url = `/eventos-vip.html`; break;
      default: url = '/conversaciones.html';
=======
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
  let url = '/conversaciones.html';

  // Determine URL based on notification type
  if (event.action === 'view' || !event.action) {
    switch (data?.type) {
      case 'match':
        url = `/perfil-usuario.html?uid=${data.senderId}`;
        break;
      case 'message':
        url = `/chat.html?conversationId=${data.conversationId}`;
        break;
      case 'appointment':
        url = `/cita-detalle.html?appointmentId=${data.appointmentId}`;
        break;
      case 'vip_event':
        url = `/eventos-vip.html`;
        break;
      default:
        url = '/conversaciones.html';
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)
    }
  } else if (event.action === 'reply') {
    url = `/chat.html?conversationId=${data.conversationId}`;
  } else if (event.action === 'dismiss') {
<<<<<<< HEAD
    return;
  }
  event.waitUntil(clients.openWindow(url));
});
=======
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
>>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run):webapp/public/firebase-messaging-sw.js
>>>>>>> c6ecb8b (Fix Dockerfile and opencv for Cloud Run)
