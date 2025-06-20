const CACHE_NAME = 'claimcenter-log-analyzer-v2.0';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  // Ajouter d'autres ressources si nécessaire
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installation');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache ouvert');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Erreur lors du cache:', error);
      })
  );
  // Force l'activation immédiate
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activation');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprimer les anciens caches
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression du cache obsolète:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Prendre le contrôle immédiatement
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  // Ne pas intercepter les requêtes vers Elasticsearch/Kibana
  if (event.request.url.includes('elasticsearch') || 
      event.request.url.includes('kibana') ||
      event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Retourner la réponse du cache si elle existe
        if (response) {
          return response;
        }

        // Sinon, faire la requête réseau
        return fetch(event.request).then((response) => {
          // Vérifier si la réponse est valide
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Cloner la réponse pour la mettre en cache
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
      .catch(() => {
        // En cas d'erreur réseau, retourner une page offline si disponible
        if (event.request.destination === 'document') {
          return caches.match('./');
        }
      })
  );
});

// Gestion des messages depuis l'application
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Synchronisation en arrière-plan (optionnel)
self.addEventListener('sync', (event) => {
  if (event.tag === 'log-analysis') {
    console.log('Service Worker: Synchronisation des analyses de logs');
    // Logique de synchronisation si nécessaire
  }
});

// Notifications Push (optionnel pour les alertes)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nouvelle alerte de logs détectée',
      icon: './icons/icon-192x192.png',
      badge: './icons/icon-96x96.png',
      vibrate: [200, 100, 200],
      tag: 'log-alert',
      actions: [
        {
          action: 'view',
          title: 'Voir les détails',
          icon: './icons/icon-96x96.png'
        },
        {
          action: 'dismiss',
          title: 'Ignorer'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Analyseur de Logs', options)
    );
  }
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});
