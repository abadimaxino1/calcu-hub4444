/* Enhanced Service Worker with offline caching support */

const CACHE_VERSION = 'v1.1';
const STATIC_CACHE = `calcu-hub-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `calcu-hub-dynamic-${CACHE_VERSION}`;

// Assets to precache for offline use
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/images/logo-icon.svg'
];

// Install event - precache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS.filter(url => {
          // Only cache assets that exist
          return true;
        })).catch(err => {
          console.warn('[SW] Precache failed for some assets:', err);
          // Continue even if some assets fail to cache
          return Promise.resolve();
        });
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return cacheName.startsWith('calcu-hub-') && 
                     cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests and API calls
  if (url.origin !== self.location.origin) {
    return;
  }

  // API calls: Network first, fall back to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache successful API responses
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // Static assets (images, icons, fonts): Cache first
  if (request.destination === 'image' || 
      url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/i) ||
      url.pathname.startsWith('/icons/') ||
      url.pathname.startsWith('/images/')) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached response and update cache in background
            fetch(request).then((response) => {
              if (response.ok) {
                caches.open(STATIC_CACHE).then((cache) => {
                  cache.put(request, response);
                });
              }
            }).catch(() => {});
            return cachedResponse;
          }
          return fetch(request).then((response) => {
            if (response.ok) {
              const clonedResponse = response.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, clonedResponse);
              });
            }
            return response;
          });
        })
    );
    return;
  }

  // CSS and JS: Stale-while-revalidate
  if (request.destination === 'script' || 
      request.destination === 'style' ||
      url.pathname.match(/\.(js|css)$/i)) {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          const fetchPromise = fetch(request)
            .then((response) => {
              if (response.ok) {
                const clonedResponse = response.clone();
                caches.open(DYNAMIC_CACHE).then((cache) => {
                  cache.put(request, clonedResponse);
                });
              }
              return response;
            })
            .catch(() => cachedResponse);
          
          return cachedResponse || fetchPromise;
        })
    );
    return;
  }

  // HTML/Navigation: Network first, fall back to cache, then offline page
  if (request.mode === 'navigate' || 
      request.destination === 'document' ||
      url.pathname === '/' ||
      !url.pathname.includes('.')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clonedResponse = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, clonedResponse);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Fall back to cached index.html for SPA routes
              return caches.match('/index.html')
                .then((indexResponse) => {
                  if (indexResponse) {
                    return indexResponse;
                  }
                  // Last resort: offline page
                  return caches.match('/offline.html');
                });
            });
        })
    );
    return;
  }

  // Default: Network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const clonedResponse = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => {
            cache.put(request, clonedResponse);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Handle skip waiting message from the app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
