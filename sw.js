/* ============================================================
   SHIVANSH PRO — Service Worker v1.0
   ============================================================ */

const CACHE_NAME = 'shivansh-pro-v3';
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
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Frame sequence never changes: serve it from cache and fill the cache
  // in the background. Network-first here meant re-downloading several
  // megabytes of frames on every single visit.
  if (url.origin === self.location.origin && url.pathname.indexOf('/frames/') !== -1) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(req).then((hit) => {
          if (hit) return hit;
          return fetch(req).then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          });
        })
      )
    );
    return;
  }

  // Network first fallback to cache for everything else
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
