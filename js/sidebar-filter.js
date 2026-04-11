/**
 * sidebar-filter.js
 * 
 * Script mandiri untuk menyembunyikan menu sidebar berdasarkan permissions.
 * TIDAK bergantung pada auth.js atau utils.js - bisa dipakai di halaman mana saja.
 * 
 * Cara pakai: Tambahkan SATU baris ini di setiap halaman (setelah Firebase diinit):
 *   <script src="js/sidebar-filter.js"></script>
 * 
 * PENTING: Letakkan SETELAH script Firebase config, tapi SEBELUM atau SESUDAH
 *          script halaman lainnya - tetap akan bekerja.
 */

(function () {
  'use strict';

  var SESSION_KEY = 'webpos_session';

  // Mapping halaman ke permission key
  var PAGE_PERMISSIONS = {
    'index.html': 'dashboard',
    'page-kasir.html': 'kasir',
    'page-produk.html': 'produk',
    'page-riwayat.html': 'riwayat',
    'page-kas.html': 'kas',
    'page-modal-harian.html': 'kas',
    'page-kas-masuk.html': 'kas',
    'page-kas-keluar.html': 'kas',
    'page-kas-shift.html': 'kas',
    'page-kas-topup.html': 'kas',
    'page-kas-tarik.html': 'kas',
    'page-hutang.html': 'hutang',
    'page-laporan.html': 'laporan',
    'page-saldo-telegram.html': 'telegram',
    'page-data-pelanggan.html': 'pelanggan',
    'page-pengguna.html': 'pengguna',
    'page-setting.html': 'pengaturan',
    'page-backup.html': 'backup',
    'page-printer.html': 'printer',
    'page-reset.html': 'reset'
  };

  // Baca session dari localStorage
  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  // Terapkan filter pada sidebar - MENYEMBUNYIKAN, bukan menghapus
  function applyFilter(permissions, role) {
    if (role === 'owner') return;

    var sidebar = document.getElementById('sidebar') ||
                  document.querySelector('.sidebar') ||
                  document.querySelector('aside');
    if (!sidebar) return;

    console.log('[SidebarFilter] Menerapkan filter untuk role:', role, '| permissions:', permissions);

    // === Strategi 1: Link dengan atribut data-menu ===
    // Contoh: <a href="page-kasir.html" data-menu="kasir">
    var linksWithMenu = sidebar.querySelectorAll('a[data-menu]');
    linksWithMenu.forEach(function (link) {
      var menuKey = link.getAttribute('data-menu');
      var hasAccess = permissions[menuKey] === true;
      var navItem = link.closest('li') || link.closest('.nav-item') || link.parentElement;
      if (navItem) {
        navItem.style.display = hasAccess ? '' : 'none';
      }
    });

    // === Strategi 2: Elemen non-link dengan data-menu (dropdown toggle) ===
    // Contoh: <div class="nav-dropdown-toggle" data-menu="kas">
    var elemsWithMenu = sidebar.querySelectorAll('[data-menu]:not(a)');
    elemsWithMenu.forEach(function (el) {
      var menuKey = el.getAttribute('data-menu');
      var hasAccess = permissions[menuKey] === true;
      var navItem = el.closest('li') || el.closest('.nav-item') || el.parentElement;
      if (navItem) {
        navItem.style.display = hasAccess ? '' : 'none';
      }
    });

    // === Strategi 3: Link tanpa data-menu - fallback pakai href ===
    var linksNoMenu = sidebar.querySelectorAll('a[href]:not([data-menu])');
    linksNoMenu.forEach(function (link) {
      var href = link.getAttribute('href') || '';
      var cleanHref = href.split('?')[0].split('#')[0].split('/').pop();
      var menuKey = PAGE_PERMISSIONS[cleanHref];
      if (!menuKey) return;

      var hasAccess = permissions[menuKey] === true;
      var navItem = link.closest('li') || link.closest('.nav-item') || link.parentElement;
      if (navItem) {
        navItem.style.display = hasAccess ? '' : 'none';
      }
    });

    // === Sembunyikan nav-section yang semua item-nya tersembunyi ===
    sidebar.querySelectorAll('.nav-section').forEach(function (section) {
      var items = section.querySelectorAll('li, .nav-item');
      if (items.length === 0) return;
      var allHidden = Array.from(items).every(function (item) {
        return item.style.display === 'none';
      });
      section.style.display = allHidden ? 'none' : '';
    });

    console.log('[SidebarFilter] Selesai.');
  }

  // Coba filter pakai data dari session (cepat, tanpa request Firebase)
  function tryFilterFromSession() {
    var session = getSession();
    if (!session || !session.user) return false;

    var user = session.user;
    if (user.role === 'owner') return true; // Owner tidak perlu filter

    // Harus ada permissions di session
    if (!user.permissions || Object.keys(user.permissions).length === 0) return false;

    applyFilter(user.permissions, user.role);
    return true;
  }

  // Filter pakai Firebase (backup jika session tidak lengkap)
  function tryFilterFromFirebase() {
    if (typeof firebase === 'undefined') return;

    var authInstance = null;
    try {
      authInstance = firebase.auth();
    } catch (e) {
      return;
    }
    if (!authInstance) return;

    authInstance.onAuthStateChanged(function (firebaseUser) {
      if (!firebaseUser) return;

      // Coba session dulu sebelum ke database
      if (tryFilterFromSession()) return;

      // Load dari database jika session tidak ada permissions
      var dbInstance;
      try {
        dbInstance = firebase.database();
      } catch (e) {
        return;
      }

      dbInstance.ref('users/' + firebaseUser.uid).once('value').then(function (snap) {
        var userData = snap.val();
        if (!userData) return;
        if (userData.role === 'owner') return;
        if (!userData.permissions) return;

        applyFilter(userData.permissions, userData.role);

        // Simpan ke session supaya halaman berikutnya bisa pakai
        try {
          var existingSession = getSession() || {};
          existingSession.user = {
            uid: firebaseUser.uid,
            role: userData.role,
            name: userData.name,
            username: userData.username,
            email: userData.email,
            permissions: userData.permissions,
            status: userData.status
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(existingSession));
        } catch (e) {}
      });
    });
  }

  // Jalankan filter
  function run() {
    // Langkah 1: Coba dari session dulu (instan, tidak perlu tunggu Firebase)
    var filteredFromSession = tryFilterFromSession();

    // Langkah 2: Tetap setup Firebase listener untuk update permissions terbaru
    // (juga berfungsi sebagai fallback jika session tidak punya permissions)
    tryFilterFromFirebase();
  }

  // Jalankan setelah DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    // DOM sudah siap
    run();
  }

})();
