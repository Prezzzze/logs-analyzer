const CACHE_NAME = 'claimcenter-log-analyzer-v1.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json'
];

// Installation - version simplifiée
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('✅ Service Worker: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('❌ Service Worker: Erreur cache:', error);
      })
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker: Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Suppression cache obsolète:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch - version simplifiée
self.addEventListener('fetch', (event) => {
  // Ignorer les requêtes externes
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // Fallback vers la page d'accueil
        if (event.request.destination === 'document') {
          return caches.match('./');
        }
      })
  );
});
