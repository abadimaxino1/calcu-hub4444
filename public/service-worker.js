/* Minimal service worker stub - extend for caching strategies as needed */

self.addEventListener('install', (event) => {
  // Activate immediately in dev/testing
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Claim clients for immediate control
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Basic network-first pass-through - placeholder
  // In production you can add caching strategies here.
  // For now, just let the request pass through.
});
