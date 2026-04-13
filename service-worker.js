/**
 * IES Arcelacis — service-worker.js
 * Strategy: Stale-While-Revalidate (SWR)
 * - Serves cached assets instantly for perceived performance
 * - Background-fetches fresh versions without blocking paint
 * - Offline fallback for core shell
 */

const CACHE_NAME = 'ies-arcelacis-v2';
const OFFLINE_URL = '/offline.html';

// Assets to precache on install (app shell)
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap',
];

/* ── Install: precache shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: prune old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: Stale-While-Revalidate ── */
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests that aren't fonts/images
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isCDN = url.hostname.includes('googleapis.com')
             || url.hostname.includes('gstatic.com')
             || url.hostname.includes('juntadeandalucia.es');

  if (!isSameOrigin && !isCDN) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request).then(cached => {
        // Kick off network fetch in background (revalidate)
        const networkFetch = fetch(request)
          .then(response => {
            // Cache valid responses
            if (response && response.status === 200 && response.type !== 'opaque') {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => cached || caches.match(OFFLINE_URL));

        // Return cached immediately (stale), network updates cache
        return cached || networkFetch;
      })
    )
  );
});
