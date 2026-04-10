const CACHE_NAME = 'webpos-v1';
const urlsToCache = [
  './',
  './index.html',
  './page-kasir.html',
  './page-produk.html',
  './page-riwayat.html',
  './page-setting.html',
  './js/firebase-config.js',
  './js/utils.js',
  './js/auth.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
