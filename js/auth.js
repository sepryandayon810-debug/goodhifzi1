/**
 * WebPOS Authentication Module - Enhanced
 * With Username Login, User Approval System, and Permission Management
 */

// ==========================================
// ⭐ CSS PROTECTION (Inject pertama kali)
// ==========================================
const style = document.createElement('style');
style.textContent = `
  #sidebar .perm-hidden, 
  #sidebar .nav-item[hidden],
  #sidebar li[hidden] { 
    display: none !important; 
    visibility: hidden !important;
    height: 0 !important; 
    overflow: hidden !important;
    opacity: 0 !important;
  }
  #sidebar .nav-section[hidden] { 
    display: none !important; 
  }
`;

if (document.head) {
  document.head.appendChild(style);
} else {
  document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
}
const Auth = {
  currentUser: null,
  pendingApproval: null,
  // Initialize authentication
  init: () => {
    const session = Utils.getStorage('webpos_session');
    if (session && session.user) {
      Auth.currentUser = session.user;
    }

    if (typeof auth !== 'undefined') {
      auth.onAuthStateChanged((user) => {
        if (user) {
          Auth.loadUserData(user.uid);
        } else {
          Auth.currentUser = null;
          Utils.removeStorage('webpos_session');
        }
      });
    }
  },

  // Load user data from database
  loadUserData: async (uid) => {
    try {
      const snapshot = await database.ref(`users/${uid}`).once('value');
      const userData = snapshot.val();
      
      if (userData) {
        if (userData.status === 'pending') {
          Auth.pendingApproval = { uid, ...userData };
          await auth.signOut();
          return { error: 'pending_approval', message: 'Akun Anda masih menunggu persetujuan owner' };
        }
        
        if (userData.status === 'rejected') {
          await auth.signOut();
          return { error: 'rejected', message: 'Akun Anda ditolak' };
        }
        
        if (userData.status === 'suspended') {
          await auth.signOut();
          return { error: 'suspended', message: 'Akun Anda ditangguhkan' };
        }

        let userPermissions = userData.permissions;
        if (!userPermissions) {
          // Default berdasarkan role untuk user lama
          if (userData.role === 'kasir') {
            userPermissions = {
              kasir: true, produk: true, riwayat: false, kas: false, hutang: false,
              laporan: false, telegram: false, pelanggan: false,
              pengguna: false, pengaturan: false, backup: false, printer: false, reset: false
            };
          } else if (userData.role === 'admin') {
            userPermissions = {
              kasir: true, produk: true, riwayat: true, kas: true, hutang: true,
              laporan: true, telegram: true, pelanggan: true,
              pengguna: true, pengaturan: true, backup: true, printer: true, reset: false
            };
          } else {
            userPermissions = {
              kasir: true, produk: true, riwayat: true, kas: true, hutang: true,
              laporan: true, telegram: true, pelanggan: true,
              pengguna: true, pengaturan: true, backup: true, printer: true, reset: true
            };
          }
          
          await database.ref(`users/${uid}/permissions`).set(userPermissions);
          console.log('✅ Default permissions created for', userData.username);
        }

        Auth.currentUser = {
          uid,
          username: userData.username,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          permissions: userPermissions || {},
          avatar: userData.avatar || null,
          status: userData.status,
          approvedBy: userData.approvedBy || null,
          approvedAt: userData.approvedAt || null
        };

        Utils.setStorage('webpos_session', {
          user: Auth.currentUser,
          loginTime: Date.now()
        });

        await database.ref(`users/${uid}`).update({
          lastLogin: firebase.database.ServerValue.TIMESTAMP,
          isOnline: true
        });

        return Auth.currentUser;
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    return null;
  },

  // Login with username and password
  login: async (username, password) => {
    try {
      Utils.showLoading('Logging in...');
      const formattedUsername = Utils.formatUsername(username);
      
      if (!formattedUsername) {
        Utils.hideLoading();
        Utils.showToast('Username tidak valid', 'error');
        return { success: false };
      }
      
      const usersSnapshot = await database.ref('users')
        .orderByChild('username')
        .equalTo(formattedUsername)
        .once('value');
      
      const users = usersSnapshot.val();
      if (!users) {
        Utils.hideLoading();
        Utils.showToast('Username tidak ditemukan', 'error');
        return { success: false };
      }
      
      const userId = Object.keys(users)[0];
      const userData = users[userId];
      
      if (['pending', 'rejected', 'suspended'].includes(userData.status)) {
        Utils.hideLoading();
        Utils.showToast(`Akun ${userData.status}`, 'error');
        return { success: false };
      }
      
      const result = await auth.signInWithEmailAndPassword(userData.email, password);
      const user = await Auth.loadUserData(result.user.uid);
      
      Utils.hideLoading();
      
      if (user && !user.error) {
        Utils.showToast(`Selamat datang, ${user.name || user.username}!`, 'success');
        setTimeout(() => Auth.filterSidebarMenu(), 100);
        return { success: true, user };
      }
      return { success: false };
    } catch (error) {
      Utils.hideLoading();
      console.error('Login error:', error);
      Utils.showToast('Login gagal', 'error');
      return { success: false };
    }
  },

  // Register new user
  register: async (username, password, name, email, role = 'kasir', permissions = null) => {
    try {
      Utils.showLoading('Mendaftarkan akun...');
      const formattedUsername = Utils.formatUsername(username);
      
      if (!formattedUsername || formattedUsername.length < 3) {
        Utils.hideLoading();
        Utils.showToast('Username minimal 3 karakter', 'error');
        return { success: false };
      }
      
      const usernameCheck = await database.ref('users')
        .orderByChild('username')
        .equalTo(formattedUsername)
        .once('value');
      
      if (usernameCheck.val()) {
        Utils.hideLoading();
        Utils.showToast('Username sudah digunakan', 'error');
        return { success: false };
      }
      
      const userEmail = email || `${formattedUsername}@webpos.local`;
      const result = await auth.createUserWithEmailAndPassword(userEmail, password);
      const uid = result.user.uid;
      
      const isOwner = role === 'owner';
      const defaultPermissions = permissions || {
        kasir: true, produk: true, riwayat: false, kas: false, hutang: false,
        laporan: false, telegram: false, pelanggan: false,
        pengguna: false, pengaturan: false, backup: false, printer: false, reset: false
      };
      
      await database.ref(`users/${uid}`).set({
        uid,
        username: formattedUsername,
        email: userEmail,
        name: name || formattedUsername,
        role,
        permissions: defaultPermissions,
        status: isOwner ? 'active' : 'pending',
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastLogin: firebase.database.ServerValue.TIMESTAMP,
        isOnline: true,
        approvedBy: isOwner ? 'system' : null,
        approvedAt: isOwner ? firebase.database.ServerValue.TIMESTAMP : null
      });

      Utils.hideLoading();
      
      if (!isOwner) {
        await auth.signOut();
        Utils.showToast('Pendaftaran berhasil! Menunggu persetujuan owner.', 'success');
      } else {
        Utils.showToast('Akun berhasil dibuat!', 'success');
      }
      return { success: true, uid };
    } catch (error) {
      Utils.hideLoading();
      console.error('Registration error:', error);
      Utils.showToast('Pendaftaran gagal', 'error');
      return { success: false };
    }
  },

  // Approve user
  approveUser: async (uid, approverUid) => {
    try {
      Utils.showLoading('Menyetujui pengguna...');
      const approverData = (await database.ref(`users/${approverUid}`).once('value')).val();
      
      if (!approverData || !['owner', 'admin'].includes(approverData.role)) {
        Utils.hideLoading();
        Utils.showToast('Anda tidak memiliki izin', 'error');
        return { success: false };
      }
      
      await database.ref(`users/${uid}`).update({
        status: 'active',
        approvedBy: approverUid,
        approvedAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      Utils.hideLoading();
      Utils.showToast('Pengguna berhasil disetujui', 'success');
      return { success: true };
    } catch (error) {
      Utils.hideLoading();
      console.error('Approve error:', error);
      return { success: false };
    }
  },

  // Reject user
  rejectUser: async (uid, approverUid, reason = '') => {
    try {
      Utils.showLoading('Menolak pengguna...');
      const approverData = (await database.ref(`users/${approverUid}`).once('value')).val();
      
      if (!approverData || !['owner', 'admin'].includes(approverData.role)) {
        Utils.hideLoading();
        Utils.showToast('Anda tidak memiliki izin', 'error');
        return { success: false };
      }
      
      await database.ref(`users/${uid}`).update({
        status: 'rejected',
        rejectedBy: approverUid,
        rejectedAt: firebase.database.ServerValue.TIMESTAMP,
        rejectionReason: reason
      });
      
      Utils.hideLoading();
      Utils.showToast('Pengguna ditolak', 'success');
      return { success: true };
    } catch (error) {
      Utils.hideLoading();
      console.error('Reject error:', error);
      return { success: false };
    }
  },

  // Logout
  logout: async () => {
    try {
      if (Auth.currentUser) {
        await database.ref(`users/${Auth.currentUser.uid}`).update({
          isOnline: false,
          lastLogout: firebase.database.ServerValue.TIMESTAMP
        });
      }
      await auth.signOut();
      Auth.currentUser = null;
      Utils.removeStorage('webpos_session');
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Logout error:', error);
    }
  },

  // Utility methods
  getCurrentUser: () => Auth.currentUser,
  isAuthenticated: () => !!Auth.currentUser || !!Utils.getStorage('webpos_session'),
  
  hasRole: (requiredRoles) => {
    if (!Auth.currentUser) return false;
    if (typeof requiredRoles === 'string') {
      return Auth.currentUser.role === requiredRoles;
    }
    return requiredRoles.includes(Auth.currentUser.role);
  },

  // Permission System
  PAGE_PERMISSIONS: {
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
  },

    // Filter sidebar menu - DEBUG VERSION
  filterSidebarMenu: function() {
    const currentUser = Auth.getCurrentUser();
    console.log('🔍 DEBUG - Current user:', currentUser);
    
    if (!currentUser) {
      console.log('❌ No user logged in');
      return;
    }
    
    if (currentUser.role === 'owner') {
      console.log('👑 Owner detected - skipping filter');
      return;
    }
    
    const perms = currentUser.permissions || {};
    console.log('🔑 Permissions:', perms);
    
    // Cek struktur sidebar
    const sidebar = document.getElementById('sidebar');
    console.log('📁 Sidebar found by ID:', !!sidebar);
    
    const sidebarClass = document.querySelector('.sidebar');
    console.log('📁 Sidebar found by class:', !!sidebarClass);
    
    const navLinks = document.querySelectorAll('a[href]');
    console.log('🔗 Total links found:', navLinks.length);
    
    // Coba berbagai selector
    const selectors = [
      '#sidebar a[href]',
      '.sidebar a[href]',
      '.nav-link[href]',
      'aside a[href]',
      'nav a[href]',
      '.menu a[href]'
    ];
    
    let allLinks = [];
    selectors.forEach(sel => {
      const found = document.querySelectorAll(sel);
      console.log(`Selector "${sel}":`, found.length, 'items');
      if (found.length > 0) {
        allLinks = [...allLinks, ...found];
      }
    });
    
    // Remove duplicates
    allLinks = [...new Set(allLinks)];
    console.log('🔍 Total unique links to check:', allLinks.length);
    
    let hiddenCount = 0;
    
    allLinks.forEach(link => {
      const href = link.getAttribute('href') || '';
      const cleanHref = href.split('?')[0].split('#')[0].split('/').pop();
      
      // Cek juga text content untuk matching
      const text = link.textContent.trim().toLowerCase();
      
      // Mapping manual berdasarkan text sebagai fallback
      let permKey = Auth.PAGE_PERMISSIONS[cleanHref];
      
      // Fallback mapping berdasarkan text
      if (!permKey) {
        if (text.includes('kasir')) permKey = 'kasir';
        else if (text.includes('produk')) permKey = 'produk';
        else if (text.includes('riwayat')) permKey = 'riwayat';
        else if (text.includes('kas')) permKey = 'kas';
        else if (text.includes('hutang')) permKey = 'hutang';
        else if (text.includes('laporan')) permKey = 'laporan';
        else if (text.includes('telegram')) permKey = 'telegram';
        else if (text.includes('pelanggan')) permKey = 'pelanggan';
        else if (text.includes('pengguna')) permKey = 'pengguna';
        else if (text.includes('pengaturan') || text.includes('setting')) permKey = 'pengaturan';
        else if (text.includes('backup')) permKey = 'backup';
        else if (text.includes('printer')) permKey = 'printer';
        else if (text.includes('reset')) permKey = 'reset';
      }
      
      if (permKey) {
        const hasPerm = perms[permKey] === true;
        console.log(`Checking: "${text}" (${cleanHref}) -> ${permKey}: ${hasPerm}`);
        
        if (!hasPerm) {
          // Coba semua parent container yang mungkin
          const item = link.closest('.nav-item, li, .menu-item, a');
          if (item) {
            console.log(`  ❌ HIDING: ${text}`);
            item.setAttribute('hidden', '');
            item.style.cssText = 'display: none !important; visibility: hidden !important; height: 0 !important; opacity: 0 !important;';
            item.classList.add('perm-hidden');
            hiddenCount++;
          }
        }
      }
    });
    
    // Hide sections
    document.querySelectorAll('.nav-section, .sidebar-section, [class*="section"]').forEach(sec => {
      const visible = sec.querySelectorAll(':scope > *:not([hidden]):not(.perm-hidden)');
      if (visible.length === 0 || visible.length <= 1) { // 1 untuk header
        sec.setAttribute('hidden', '');
        sec.style.display = 'none';
      }
    });
    
    console.log(`✅ Done! Hidden ${hiddenCount} items`);
  },

  hasPermission: function(key) {
    const user = Auth.getCurrentUser();
    if (!user) return false;
    if (user.role === 'owner') return true;
    return user.permissions?.[key] === true;
  }
};

// ==========================================
// ⭐ GLOBAL INIT & PROTECTION
// ==========================================
const aggressiveFilter = () => {
  const user = Auth.getCurrentUser();
  if (!user || user.role === 'owner') return;
  
  // Run multiple times
  let attempts = 0;
  const interval = setInterval(() => {
    Auth.filterSidebarMenu();
    if (++attempts >= 5) clearInterval(interval);
  }, 500);
  
  // Run on every click (catches dropdowns)
  document.addEventListener('click', () => {
    setTimeout(() => Auth.filterSidebarMenu(), 150);
  });
};

// Override init
const originalInit = Auth.init;
Auth.init = () => {
  originalInit();
  
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        setTimeout(() => {
          const currentUser = Auth.getCurrentUser();
          if (currentUser && currentUser.role !== 'owner') {
            console.log('🔐 Auto-filter for:', currentUser.username);
            Auth.filterSidebarMenu();
            aggressiveFilter();
          }
        }, 300);
      }
    });
  }
};

document.addEventListener('DOMContentLoaded', Auth.init);
if (typeof module !== 'undefined') module.exports = Auth;
