const CACHE_NAME = 'webpos-v5';
const STATIC_CACHE = 'webpos-static-v5';
const IMAGE_CACHE = 'webpos-images-v5';

// ============================================
// DAFTAR FILE LENGKAP SESUAI STRUKTUR REPO
// ============================================
const PRECACHE_URLS = [
  // ═══════════════════════════════════════════
  // HTML PAGES - ROOT
  // ═══════════════════════════════════════════
  './',
  './index.html',

  // Auth
  './login.html',
  './register.html',

  // ═══════════════════════════════════════════
  // UTAMA
  // ═══════════════════════════════════════════
  './page-kasir.html',
  './page-produk.html',
  './page-pembelian.html',

  // ═══════════════════════════════════════════
  // TRANSAKSI
  // ═══════════════════════════════════════════
  './page-riwayat.html',
  './page-hutang.html',

  // Kas Management + Submenu
  './page-kas.html',
  './page-kas-masuk.html',
  './page-kas-keluar.html',
  './page-kas-shift.html',
  './page-kas-topup.html',
  './page-kas-tarik.html',
  './page-modal.html',
  './page-modal-harian.html',
  './page-closing.html',

  // ═══════════════════════════════════════════
  // LAPORAN
  // ═══════════════════════════════════════════
  './page-laporan.html',
  './page-laporan-stok.html',
  './page-laporan-terlaris.html',
  './page-laporan-owner.html',  // ⭐ MENU TERSEMBUNYI - OWNER KEUANGAN
  './page-log-aktivitas.html',

  // ═══════════════════════════════════════════
  // INTEGRASI
  // ═══════════════════════════════════════════
  './page-saldo-telegram.html',
  './page-data-pelanggan.html',

  // ═══════════════════════════════════════════
  // SISTEM
  // ═══════════════════════════════════════════
  './page-pengguna.html',
  './page-setting.html',
  './page-printer.html',
  './page-backup.html',
  './page-reset.html',

  // ═══════════════════════════════════════════
  // MANIFEST & CONFIG
  // ═══════════════════════════════════════════
  './manifest.json',

  // ═══════════════════════════════════════════
  // JS CORE - ROOT FOLDER js/
  // ═══════════════════════════════════════════
  './js/firebase-config.js',
  './js/utils.js',
  './js/auth.js',
  './js/nav-config.js',
  './js/sidebar-filter.js',

  // ═══════════════════════════════════════════
  // JS MODULES - FOLDER js/modules/
  // ═══════════════════════════════════════════
  './js/modules/kasir-main.js',
  './js/modules/kasir-cart.js',
  './js/modules/kasir-categories.js',
  './js/modules/kasir-keyboard.js',
  './js/modules/kasir-numpad.js',
  './js/modules/kasir-payment.js',
  './js/modules/kasir-products.js',
  './js/modules/kasir-quick-actions.js',
  './js/modules/kasir-summary.js',
  './js/modules/kasir-ui.js',

  './js/modules/kategori-manager.js',
  './js/modules/laporan-generator.js',
  './js/modules/pelanggan-manager.js',
  './js/modules/pengguna-manager.js',
  './js/modules/printer-manager.js',
  './js/modules/produk-import.js',
  './js/modules/reset-manager.js',
  './js/modules/riwayat-manager.js',
  './js/modules/settings-manager.js',
  './js/modules/telegram-integration.js',
  './js/modules/backup-manager.js',
  './js/modules/hutang-manager.js',
  './js/modules/kas-manager.js',

  // ═══════════════════════════════════════════
  // ICONS PWA (aktifkan kalau sudah ada)
  // ═══════════════════════════════════════════
  // './icon-192.png',
  // './icon-512.png'
];

// ============================================
// INSTALL - Cache per file, skip kalau 404
// ============================================
self.addEventListener('install', event => {
  console.log('[SW] Install WebPOS v5...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets one by one...');
        return Promise.all(
          PRECACHE_URLS.map(url => {
            return fetch(url, { cache: 'no-cache' })
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
                console.warn('[SW] SKIP (not found):', url);
                return Promise.resolve();
              })
              .catch(err => {
                console.warn('[SW] SKIP (error):', url, err.message);
                return Promise.resolve();
              });
          })
        );
      })
      .then(() => {
        console.log('[SW] Pre-cache complete!');
        return self.skipWaiting();
      })
      .catch(err => {
        console.error('[SW] Install error:', err);
      })
  );
});

// ============================================
// ACTIVATE - Hapus cache lama
// ============================================
self.addEventListener('activate', event => {
  console.log('[SW] Activate WebPOS v5...');

  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (![STATIC_CACHE, IMAGE_CACHE].includes(cache)) {
            console.log('[SW] Delete old cache:', cache);
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

  // 🔴 JANGAN CACHE: Firebase, Google API, Telegram, n8n
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
    return;
  }

  // 🟢 HTML Pages: Stale-While-Revalidate
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      caches.match(request).then(cached => {
        const fetchPromise = fetch(request)
          .then(networkResponse => {
            if (networkResponse && networkResponse.ok) {
              const clone = networkResponse.clone();
              caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
            }
            return networkResponse;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      })
    );
    return;
  }

  // 🟡 JS & CSS: Cache First
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

  // 🔵 Images: Cache terpisah
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
// BACKGROUND SYNC - Transaksi offline
// ============================================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transaksi') {
    console.log('[SW] Background sync: transaksi');
    event.waitUntil(syncTransaksiPending());
  }
});

async function syncTransaksiPending() {
  console.log('[SW] Syncing pending transactions...');
  // Handler transaksi pending dari IndexedDB/localStorage
  // akan diproses oleh utils.js saat online kembali
}

// ============================================
// PUSH NOTIFICATION - Stok menipis & alert
// ============================================
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data.json();
  } catch(e) {
    data = { title: 'WebPOS Alert', body: 'Ada notifikasi baru' };
  }

  const options = {
    body: data.body || 'Stok produk hampir habis!',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: data.tag || 'stok-alert',
    requireInteraction: true,
    actions: [
      { action: 'buka', title: 'Buka WebPOS' },
      { action: 'tutup', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'WebPOS Alert', options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'buka' || !event.action) {
    event.waitUntil(clients.openWindow('./index.html'));
  }
});
