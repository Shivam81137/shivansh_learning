/* ============================================================
   SHIVANSH PRO — Service Worker v1.0
   ============================================================ */

const CACHE_NAME = 'shivansh-pro-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './img/logo_v2.png',
  './img/icon-192.png',
  './img/icon-512.png',
  './img/apple-touch-icon.png',
  './img/favicon.ico'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Network first fallback to cache for speed
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
