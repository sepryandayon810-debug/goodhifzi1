/**
 * sidebar-filter.js — WebPOS
 *
 * Filter sidebar menu berdasarkan permissions user.
 * MANDIRI: tidak butuh auth.js atau utils.js.
 *
 * Cara pasang: tambah 1 baris ini setelah script Firebase di setiap halaman:
 *   <script src="js/sidebar-filter.js"></script>
 */
(function () {
  'use strict';

  var SESSION_KEY = 'webpos_session';

  function getSession() {
    try {
      var raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveToSession(userData, uid) {
    try {
      var existing = getSession() || {};
      existing.user = {
        uid: uid,
        name: userData.name || '',
        username: userData.username || '',
        email: userData.email || '',
        role: userData.role || 'kasir',
        permissions: userData.permissions || {},
        status: userData.status || 'active'
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(existing));
    } catch (e) {}
  }

  function applyFilter(permissions, role) {
    if (role === 'owner') return;

    var sidebar = document.getElementById('sidebar') ||
                  document.querySelector('.sidebar') ||
                  document.querySelector('aside');
    if (!sidebar) {
      setTimeout(function () { applyFilter(permissions, role); }, 200);
      return;
    }

    console.log('[SidebarFilter] Role:', role, '| Permissions:', JSON.stringify(permissions));

    var menuElements = sidebar.querySelectorAll('[data-menu]');
    menuElements.forEach(function (el) {
      var menuKey = el.getAttribute('data-menu');
      var hasAccess = permissions[menuKey] === true;
      var navItem = el.closest('li.nav-item') ||
                    el.closest('li') ||
                    el.closest('.nav-item') ||
                    el.parentElement;
      if (navItem) {
        navItem.style.display = hasAccess ? '' : 'none';
      }
    });

    sidebar.querySelectorAll('.nav-section').forEach(function (section) {
      var controlled = section.querySelectorAll('[data-menu]');
      if (controlled.length === 0) return;
      var allHidden = Array.from(controlled).every(function (el) {
        var navItem = el.closest('li.nav-item') ||
                      el.closest('li') ||
                      el.closest('.nav-item') ||
                      el.parentElement;
        return navItem ? navItem.style.display === 'none' : true;
      });
      section.style.display = allHidden ? 'none' : '';
    });

    console.log('[SidebarFilter] Selesai.');
  }

  function tryFromSession() {
    var session = getSession();
    if (!session || !session.user) return false;
    var user = session.user;
    if (user.role === 'owner') return true;
    var permissions = user.permissions;
    if (!permissions || Object.keys(permissions).length === 0) return false;
    applyFilter(permissions, user.role);
    return true;
  }

  function tryFromFirebase() {
    if (typeof firebase === 'undefined') return;
    var authInst;
    try { authInst = firebase.auth(); } catch (e) { return; }
    if (!authInst) return;

    authInst.onAuthStateChanged(function (firebaseUser) {
      if (!firebaseUser) return;
      if (tryFromSession()) return;

      var dbInst;
      try { dbInst = firebase.database(); } catch (e) { return; }

      dbInst.ref('users/' + firebaseUser.uid).once('value').then(function (snap) {
        var userData = snap.val();
        if (!userData) return;
        if (userData.role === 'owner') return;
        if (!userData.permissions) return;
        applyFilter(userData.permissions, userData.role);
        saveToSession(userData, firebaseUser.uid);
      }).catch(function (err) {
        console.warn('[SidebarFilter] Gagal ambil data user:', err);
      });
    });
  }

  function run() {
    tryFromSession();
    tryFromFirebase();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

})();
