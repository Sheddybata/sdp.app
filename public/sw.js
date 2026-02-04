// Service Worker for SDP Member Portal PWA
// Provides offline caching and improved performance

const CACHE_NAME = 'sdp-portal-v3';
const RUNTIME_CACHE = 'sdp-runtime-v3';

// Assets to cache immediately on install
// Do NOT cache "/" or any HTML - they reference chunk filenames that change per deploy
const STATIC_ASSETS = [
  '/icon-192.png',
  '/icon-512.png',
  '/sdplogo.jpg',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.log('Cache install error:', err);
        // Don't fail installation if some assets fail to cache
      });
    })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  // Take control of all pages immediately
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip Supabase API calls - always use network
  if (event.request.url.includes('supabase.co')) {
    return;
  }

  // Skip external resources
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  
  // Skip admin routes - they require authentication and redirects
  // Service workers can't properly handle redirects, so always use network
  if (url.pathname.startsWith('/admin')) {
    return; // Let browser handle it normally
  }

  // Skip Next.js chunks and build files - always use network to prevent stale chunks
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/_next/webpack')) {
    return; // Always fetch fresh chunks from network
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // For navigation (HTML document): always use network, never cache
      // Cached HTML would reference old chunk filenames and cause ChunkLoadError after deploy
      if (event.request.mode === 'navigate') {
        return fetch(event.request, { redirect: 'follow' })
          .then((response) => {
            return response;
          })
          .catch(() => {
            return cachedResponse || caches.match('/icon-192.png').then(() => new Response(
              '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline</title></head><body><p>You are offline. Try again when connected.</p><button onclick="location.reload()">Retry</button></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            ));
          });
      }

      // For other requests, use cache first
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request, { redirect: 'follow' })
        .then((response) => {
          // Don't cache redirects or non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic' || response.redirected) {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Cache successful responses
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // If fetch fails and it's a navigation request, return offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
    })
  );
});
