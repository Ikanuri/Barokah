// Custom Service Worker for POS App - Aggressive Offline Caching

const CACHE_VERSION = 'pos-v1';
const CACHE_NAME = `pos-cache-${CACHE_VERSION}`;

// Files to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/login',
  '/dashboard',
  '/pos',
  '/products',
  '/transactions',
  '/offline.html',
  '/manifest.json',
];

// Install event - cache critical files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Precaching app shell');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.error('[SW] Precache failed:', err);
      });
    }).then(() => {
      console.log('[SW] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean old caches and IMMEDIATELY claim clients
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName.startsWith('pos-cache-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // IMMEDIATELY claim all clients (no waiting!)
      self.clients.claim().then(() => {
        console.log('[SW] ✅ Clients claimed! SW now controlling all pages.');
        
        // Notify all clients that SW is ready
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            message: 'Service Worker is now controlling this page'
          });
        });
      })
    ])
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome extensions
  if (url.protocol === 'chrome-extension:') {
    return;
  }
  
  // Strategy: Cache First for same-origin, Network First for API
  if (url.origin === location.origin) {
    // Same-origin requests - Cache First
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('[SW] Serving from cache:', url.pathname);
          
          // Return cached response, but update cache in background
          event.waitUntil(
            fetch(request).then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse.clone());
                });
              }
            }).catch(() => {
              // Network failed, but we already have cache
            })
          );
          
          return cachedResponse;
        }
        
        // Not in cache, try network
        console.log('[SW] Fetching from network:', url.pathname);
        return fetch(request).then((networkResponse) => {
          // Cache successful responses
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch((err) => {
          console.error('[SW] Fetch failed:', url.pathname, err);
          
          // Return offline page for navigation requests
          if (request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
          
          throw err;
        });
      })
    );
  } else {
    // Cross-origin requests - Network First
    event.respondWith(
      fetch(request).then((response) => {
        return response;
      }).catch(() => {
        return caches.match(request);
      })
    );
  }
});

// Message event - for manual cache updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received SKIP_WAITING message');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[SW] Clearing cache...');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        console.log('[SW] Cache cleared');
        return self.clients.matchAll();
      }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
