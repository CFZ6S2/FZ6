// Service Worker para TuCitaSegura
// Versión: 1.0.0

const CACHE_NAME = 'tucitasegura-v1';
const OFFLINE_URL = '/offline.html';

// Archivos críticos para cachear durante la instalación
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/webapp/css/output.css',
  '/webapp/i18n/i18n.js',
  '/webapp/i18n/locales/es.json',
  '/webapp/i18n/locales/en.json',
  '/webapp/js/language-selector.js',
  '/manifest.json'
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching critical assets');
      // No fallar si algún recurso no se puede cachear
      return cache.addAll(CRITICAL_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some assets:', err);
      });
    })
  );

  // Activar el SW inmediatamente
  self.skipWaiting();
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    // Limpiar caches antiguos
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Tomar control inmediatamente
  self.clients.claim();
});

// Estrategia de fetch: Network First, fallback to Cache
self.addEventListener('fetch', (event) => {
  // Solo cachear requests GET
  if (event.request.method !== 'GET') return;

  // Ignorar requests no HTTP/HTTPS
  if (!event.request.url.startsWith('http')) return;

  // Ignorar requests a APIs externas (Firebase, Google, etc)
  if (
    event.request.url.includes('firebase') ||
    event.request.url.includes('googleapis') ||
    event.request.url.includes('gstatic') ||
    event.request.url.includes('railway.app')
  ) {
    return;
  }

  event.respondWith(
    // Intentar red primero
    fetch(event.request)
      .then((response) => {
        // Si la respuesta es válida, clonarla y guardar en cache
        if (response && response.status === 200) {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        // Si falla la red, intentar cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }

          // Si no hay cache, devolver página offline para navegación
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }

          // Para otros recursos, devolver respuesta vacía
          return new Response('', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Sincronización en segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-data') {
    console.log('[SW] Syncing data in background...');
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Implementar lógica de sincronización si es necesario
  console.log('[SW] Sync completed');
}

// Notificaciones Push (futuro)
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación',
    icon: '/webapp/img/icon-192.png',
    badge: '/webapp/img/icon-96.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver',
        icon: '/webapp/img/icon-check.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/webapp/img/icon-close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('TuCitaSegura', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});
