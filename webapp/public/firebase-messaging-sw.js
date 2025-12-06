// Service Worker copied to public so Vite outputs at site root
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyAmaE2tXMBsKc8DjBd1ShJ1HnDxVYQ0yzU",
  authDomain: "tucitasegura-129cc.firebaseapp.com",
  projectId: "tucitasegura-129cc",
  storageBucket: "tucitasegura-129cc.firebasestorage.app",
  messagingSenderId: "180656060538",
  appId: "1:180656060538:web:3168487130aa126db663c3"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'TuCitaSegura';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Tienes una nueva notificación',
    icon: payload.notification?.icon || '/assets/icon-192x192.png',
    badge: '/assets/badge-72x72.png',
    tag: payload.data?.type || 'default',
    data: payload.data,
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
    }
  } else if (event.action === 'reply') {
    url = `/chat.html?conversationId=${data.conversationId}`;
  } else if (event.action === 'dismiss') {
    return;
  }
  event.waitUntil(clients.openWindow(url));
});
