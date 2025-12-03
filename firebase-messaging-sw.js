// ============================================================================
// FIREBASE CLOUD MESSAGING SERVICE WORKER
// ============================================================================
// Este service worker maneja las notificaciones push en background
// cuando la app no está abierta
// ============================================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Configuración de Firebase
// IMPORTANTE: Debe coincidir con webapp/js/firebase-config.js
const firebaseConfig = {
  apiKey: "AIzaSyAmaE2tXMBsKc8DjBd1ShJ1HnDxVYQ0yzU",
  authDomain: "tucitasegura-129cc.firebaseapp.com",
  projectId: "tucitasegura-129cc",
  storageBucket: "tucitasegura-129cc.firebasestorage.app",
  messagingSenderId: "180656060538",
  appId: "1:180656060538:web:3168487130aa126db663c3"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Messaging
const messaging = firebase.messaging();

// ============================================================================
// BACKGROUND MESSAGE HANDLER
// ============================================================================

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  // Extraer información del payload
  const notificationTitle = payload.notification?.title || payload.data?.title || 'TuCitaSegura';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Tienes una nueva notificación',
    icon: payload.notification?.icon || payload.data?.icon || '/webapp/img/icon-192x192.png',
    badge: '/webapp/img/badge-72x72.png',
    tag: payload.data?.type || 'default',
    requireInteraction: false,
    vibrate: [200, 100, 200],
    data: payload.data || {}
  };

  // Agregar imagen si existe
  if (payload.notification?.image || payload.data?.image) {
    notificationOptions.image = payload.notification.image || payload.data.image;
  }

  // Agregar actions según el tipo de notificación
  if (payload.data?.type) {
    switch (payload.data.type) {
      case 'new_message':
        notificationOptions.actions = [
          { action: 'reply', title: 'Responder' },
          { action: 'view', title: 'Ver' }
        ];
        break;

      case 'date_request':
        notificationOptions.actions = [
          { action: 'accept', title: 'Aceptar' },
          { action: 'decline', title: 'Rechazar' }
        ];
        break;

      case 'new_match':
        notificationOptions.actions = [
          { action: 'view', title: 'Ver Perfil' },
          { action: 'chat', title: 'Enviar Mensaje' }
        ];
        break;

      default:
        notificationOptions.actions = [
          { action: 'view', title: 'Ver' }
        ];
    }
  }

  // Mostrar notificación
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// ============================================================================
// NOTIFICATION CLICK HANDLER
// ============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  const data = event.notification.data;
  let urlToOpen = '/webapp/index.html';

  // Determinar URL según el tipo de notificación
  if (data.type) {
    switch (data.type) {
      case 'new_message':
        if (data.conversationId) {
          urlToOpen = `/webapp/chat.html?conversationId=${data.conversationId}`;
        } else {
          urlToOpen = '/webapp/conversaciones.html';
        }
        break;

      case 'new_match':
        if (data.userId) {
          urlToOpen = `/webapp/perfil.html?userId=${data.userId}`;
        } else {
          urlToOpen = '/webapp/buscar-usuarios.html';
        }
        break;

      case 'date_request':
      case 'date_confirmed':
      case 'date_reminder':
        if (data.appointmentId) {
          urlToOpen = `/webapp/cita-detalle.html?id=${data.appointmentId}`;
        } else {
          urlToOpen = '/webapp/conversaciones.html';
        }
        break;

      case 'payment_success':
      case 'payment_failed':
        urlToOpen = '/webapp/cuenta-pagos.html';
        break;

      case 'profile_verified':
      case 'new_badge':
        urlToOpen = '/webapp/perfil.html';
        break;

      case 'referral_completed':
        urlToOpen = '/webapp/referidos.html';
        break;

      case 'vip_event':
        if (data.eventId) {
          urlToOpen = `/webapp/evento-detalle.html?id=${data.eventId}`;
        } else {
          urlToOpen = '/webapp/eventos-vip.html';
        }
        break;

      case 'admin_message':
        urlToOpen = '/webapp/ayuda.html';
        break;

      default:
        urlToOpen = '/webapp/index.html';
    }
  }

  // Manejar acciones personalizadas
  if (event.action) {
    switch (event.action) {
      case 'reply':
        if (data.conversationId) {
          urlToOpen = `/webapp/chat.html?conversationId=${data.conversationId}&autoFocus=true`;
        }
        break;

      case 'view':
        // Ya se maneja arriba según el tipo
        break;

      case 'accept':
        if (data.appointmentId) {
          urlToOpen = `/webapp/cita-detalle.html?id=${data.appointmentId}&action=accept`;
        }
        break;

      case 'decline':
        if (data.appointmentId) {
          urlToOpen = `/webapp/cita-detalle.html?id=${data.appointmentId}&action=decline`;
        }
        break;

      case 'chat':
        if (data.conversationId) {
          urlToOpen = `/webapp/chat.html?conversationId=${data.conversationId}`;
        }
        break;

      default:
        break;
    }
  }

  // Abrir o enfocar la ventana
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una ventana abierta, enfocarla
        for (const client of clientList) {
          if (client.url.includes('webapp') && 'focus' in client) {
            return client.focus().then(client => {
              // Navegar a la URL
              if (client.navigate) {
                return client.navigate(urlToOpen);
              }
            });
          }
        }

        // Si no hay ventana abierta, abrir una nueva
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// ============================================================================
// PUSH EVENT HANDLER (Fallback)
// ============================================================================

self.addEventListener('push', (event) => {
  if (event.data) {
    console.log('[firebase-messaging-sw.js] Push received:', event.data.text());
  }
});

// ============================================================================
// SERVICE WORKER LIFECYCLE
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installing');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activating');
  event.waitUntil(clients.claim());
});

console.log('[firebase-messaging-sw.js] Service Worker loaded');
