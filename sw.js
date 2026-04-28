const CACHE_NAME = 'webpos-v2';
const STATIC_CACHE = 'webpos-static-v2';
const IMAGE_CACHE = 'webpos-images-v2';

// 🔴 DAFTAR SEMUA PAGE & FILE PENTING WEBPOS
const PRECACHE_URLS = [
  // HTML Pages - Utama
  './',
  './index.html',
  './page-kasir.html',
  './page-produk.html',
  './page-pembelian.html',
  './page-riwayat.html',
  './page-hutang.html',
  './page-laporan.html',
  './page-telegram.html',
  './page-pelanggan.html',
  './page-user.html',
  './page-setting.html',
  './page-printer.html',
  './page-reset.html',
  './page-backup.html',
  './page-login.html',
  './page-register.html',
  
  // Kas Management Pages
  './page-kas.html',
  './page-kas-masuk.html',
  './page-kas-keluar.html',
  './page-top-up.html',
  './page-tarik-tunai.html',
  './page-modal.html',
  
  // CSS & Assets
  './css/style.css',
  './css/darkmode.css',
  './css/mint-theme.css',
  './manifest.json',
  
  // JS Core (Wajib Ada)
  './js/firebase-config.js',
  './js/utils.js',
  './js/auth.js',
  './js/session-manager.js',
  
  // JS Kasir Module
  './js/kasir-main.js',
  './js/keranjang.js',
  './js/produk-grid.js',
  './js/produk-list.js',
  './js/pencarian-produk.js',
  './js/transaksi-manual.js',
  './js/edit-harga.js',
  './js/uang-pas.js',
  
  // JS Kas Management
  './js/topup.js',
  './js/tarik-tunai.js',
  
  // JS Lainnya
  './js/laporan.js',
  './js/riwayat.js',
  './js/hutang.js',
  './js/backup.js',
  './js/setting.js',
  './js/printer.js',
  
  // Icons (buat PWA icon)
  './icon-192.png',
  './icon-512.png'
];

// ============================================
// INSTALL - Cache semua file penting saat pertama install
// ============================================
self.addEventListener('install', event => {
  console.log('[SW] Install WebPOS...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets...');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => {
        console.log('[SW] Skip waiting...');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Pre-cache failed:', err);
      })
  );
});

// ============================================
// ACTIVATE - Hapus cache lama saat update
// ============================================
self.addEventListener('activate', event => {
  console.log('[SW] Activate WebPOS...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (![STATIC_CACHE, IMAGE_CACHE].includes(cache)) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ============================================
// FETCH - Strategi cache pintar
// ============================================
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // 🔴 JANGAN CACHE: Firebase API, Google Sheets, Telegram API, n8n webhook
  // (Supaya data selalu real-time)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('sheets.googleapis.com') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('api.telegram.org') ||
    url.hostname.includes('n8n') ||
    url.pathname.includes('firestore') ||
    url.pathname.includes('auth')
  ) {
    return; // Biarkan lewat network biasa, tidak di-cache
  }
  
  // 🟢 HTML Pages: Stale-While-Revalidate
  // (Tampilkan cache dulu supaya cepat, tapi update di belakang)
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE).then(cache => {
                cache.put(request, clone);
              });
            }
            return networkResponse;
          })
          .catch(() => cached); // Kalau offline, pakai cache
        
        return cached || fetchPromise;
      })
    );
    return;
  }
  
  // 🟡 JS & CSS: Cache First (karena jarang berubah)
  if (
    request.destination === 'script' || 
    request.destination === 'style' ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css')
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
  
  // 🔵 Images: Cache terpisah, limit size
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        
        return fetch(request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(IMAGE_CACHE).then(cache => cache.put(request, clone));
          return response;
        });
      })
    );
    return;
  }
  
  // 🟣 Default: Network first, fallback cache
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ============================================
// BACKGROUND SYNC - Untuk transaksi offline
// ============================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transaksi') {
    console.log('[SW] Background sync: transaksi');
    event.waitUntil(syncTransaksiPending());
  }
});

async function syncTransaksiPending() {
  // Baca transaksi pending dari IndexedDB / localStorage
  // (Ini butuh handler di utils.js kamu untuk queue transaksi)
  console.log('[SW] Syncing pending transactions...');
  // Kirim ke Firebase / Sheets saat online lagi
}

// ============================================
// PUSH NOTIFICATION - Untuk notifikasi stok menipis
// ============================================
self.addEventListener('push', event => {
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Stok produk hampir habis!',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'stok-alert',
    requireInteraction: true,
    actions: [
      {
        action: 'buka',
        title: 'Buka WebPOS'
      },
      {
        action: 'tutup',
        title: 'Tutup'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'WebPOS Alert', options)
  );
});

// Klik notifikasi
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'buka' || !event.action) {
    event.waitUntil(
      clients.openWindow('./page-produk.html')
    );
  }
});
