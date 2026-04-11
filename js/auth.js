/**
 * WebPOS Authentication Module - Enhanced
 * With Username Login and User Approval System
 */

const Auth = {
  currentUser: null,
  pendingApproval: null,

  // Initialize authentication
  init: () => {
    // Check for existing session
    const session = Utils.getStorage('webpos_session');
    if (session && session.user) {
      Auth.currentUser = session.user;
    }

    // Listen for auth state changes
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
        // Check if user is approved
        if (userData.status === 'pending') {
          Auth.pendingApproval = { uid, ...userData };
          await auth.signOut();
          return { error: 'pending_approval', message: 'Akun Anda masih menunggu persetujuan owner' };
        }
        
        if (userData.status === 'rejected') {
          await auth.signOut();
          return { error: 'rejected', message: 'Akun Anda ditolak. Silakan hubungi owner.' };
        }
        
        if (userData.status === 'suspended') {
          await auth.signOut();
          return { error: 'suspended', message: 'Akun Anda ditangguhkan. Silakan hubungi owner.' };
        }

                Auth.currentUser = {
          uid,
          username: userData.username,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          permissions: userData.permissions || {},  // ⭐ TAMBAH BARIS INI
          avatar: userData.avatar || null,
          status: userData.status,
          approvedBy: userData.approvedBy || null,
          approvedAt: userData.approvedAt || null
        };

        // Save session
        Utils.setStorage('webpos_session', {
          user: Auth.currentUser,
          loginTime: Date.now()
        });

        // Update last login
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
      
      // Format username
      const formattedUsername = Utils.formatUsername(username);
      
      if (!formattedUsername) {
        Utils.hideLoading();
        Utils.showToast('Username tidak valid', 'error');
        return { success: false, error: 'Username tidak valid' };
      }
      
      // Find user by username
      const usersSnapshot = await database.ref('users')
        .orderByChild('username')
        .equalTo(formattedUsername)
        .once('value');
      
      const users = usersSnapshot.val();
      
      if (!users) {
        Utils.hideLoading();
        Utils.showToast('Username tidak ditemukan', 'error');
        return { success: false, error: 'Username tidak ditemukan' };
      }
      
      // Get the first user (username should be unique)
      const userId = Object.keys(users)[0];
      const userData = users[userId];
      
      // Check status
      if (userData.status === 'pending') {
        Utils.hideLoading();
        Utils.showToast('Akun Anda masih menunggu persetujuan owner', 'warning');
        return { success: false, error: 'pending_approval', message: 'Akun Anda masih menunggu persetujuan owner' };
      }
      
      if (userData.status === 'rejected') {
        Utils.hideLoading();
        Utils.showToast('Akun Anda ditolak', 'error');
        return { success: false, error: 'rejected', message: 'Akun Anda ditolak' };
      }
      
      if (userData.status === 'suspended') {
        Utils.hideLoading();
        Utils.showToast('Akun Anda ditangguhkan', 'error');
        return { success: false, error: 'suspended', message: 'Akun Anda ditangguhkan' };
      }
      
      // Sign in with email
      const result = await auth.signInWithEmailAndPassword(userData.email, password);
      const user = await Auth.loadUserData(result.user.uid);
      
      Utils.hideLoading();
      
      if (user && !user.error) {
        Utils.showToast(`Selamat datang, ${user.name || user.username}!`, 'success');
        return { success: true, user };
      }
      
      if (user && user.error) {
        return { success: false, error: user.error, message: user.message };
      }
      
      return { success: false, error: 'User data not found' };
    } catch (error) {
      Utils.hideLoading();
      console.error('Login error:', error);
      
      let message = 'Login gagal';
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'Username tidak terdaftar';
          break;
        case 'auth/wrong-password':
          message = 'Password salah';
          break;
        case 'auth/invalid-email':
          message = 'Data user tidak valid';
          break;
        case 'auth/user-disabled':
          message = 'Akun telah dinonaktifkan';
          break;
        case 'auth/too-many-requests':
          message = 'Terlalu banyak percobaan. Silakan coba lagi nanti';
          break;
      }
      
      Utils.showToast(message, 'error');
      return { success: false, error: message };
    }
  },

  // Register new user
  register: async (username, password, name, email, role = 'kasir') => {
    try {
      Utils.showLoading('Mendaftarkan akun...');
      
      // Format and validate username
      const formattedUsername = Utils.formatUsername(username);
      
      if (!formattedUsername || formattedUsername.length < 3) {
        Utils.hideLoading();
        Utils.showToast('Username minimal 3 karakter (huruf, angka, underscore)', 'error');
        return { success: false, error: 'Username tidak valid' };
      }
      
      // Check if username exists
      const usernameCheck = await database.ref('users')
        .orderByChild('username')
        .equalTo(formattedUsername)
        .once('value');
      
      if (usernameCheck.val()) {
        Utils.hideLoading();
        Utils.showToast('Username sudah digunakan', 'error');
        return { success: false, error: 'Username sudah digunakan' };
      }
      
      // Check if email exists
      if (email) {
        const emailCheck = await database.ref('users')
          .orderByChild('email')
          .equalTo(email)
          .once('value');
        
        if (emailCheck.val()) {
          Utils.hideLoading();
          Utils.showToast('Email sudah terdaftar', 'error');
          return { success: false, error: 'Email sudah terdaftar' };
        }
      }
      
      // Create user with email
      const userEmail = email || `${formattedUsername}@webpos.local`;
      const result = await auth.createUserWithEmailAndPassword(userEmail, password);
      const uid = result.user.uid;
      
      // Determine status based on role
      // Owner auto-approved, others need approval
      const isOwner = role === 'owner';
      const status = isOwner ? 'active' : 'pending';
      
      // Create user data in database
      await database.ref(`users/${uid}`).set({
        uid,
        username: formattedUsername,
        email: userEmail,
        name: name || formattedUsername,
        role,
        status,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        lastLogin: firebase.database.ServerValue.TIMESTAMP,
        isOnline: true,
        approvedBy: isOwner ? 'system' : null,
        approvedAt: isOwner ? firebase.database.ServerValue.TIMESTAMP : null
      });

      Utils.hideLoading();
      
      if (status === 'pending') {
        await auth.signOut();
        Utils.showToast('Pendaftaran berhasil! Menunggu persetujuan owner.', 'success');
        return { 
          success: true, 
          uid, 
          pendingApproval: true,
          message: 'Akun berhasil dibuat dan menunggu persetujuan owner'
        };
      }
      
      Utils.showToast('Akun berhasil dibuat!', 'success');
      return { success: true, uid };
    } catch (error) {
      Utils.hideLoading();
      console.error('Registration error:', error);
      
      let message = 'Pendaftaran gagal';
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Email sudah terdaftar';
          break;
        case 'auth/invalid-email':
          message = 'Email tidak valid';
          break;
        case 'auth/weak-password':
          message = 'Password terlalu lemah (min 6 karakter)';
          break;
      }
      
      Utils.showToast(message, 'error');
      return { success: false, error: message };
    }
  },

  // Approve user (Owner/Admin only)
  approveUser: async (uid, approverUid) => {
    try {
      Utils.showLoading('Menyetujui pengguna...');
      
      // Check if approver is owner/admin
      const approverSnapshot = await database.ref(`users/${approverUid}`).once('value');
      const approverData = approverSnapshot.val();
      
      if (!approverData || (approverData.role !== 'owner' && approverData.role !== 'admin')) {
        Utils.hideLoading();
        Utils.showToast('Anda tidak memiliki izin untuk menyetujui pengguna', 'error');
        return { success: false, error: 'Unauthorized' };
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
      Utils.showToast('Gagal menyetujui pengguna', 'error');
      return { success: false, error: error.message };
    }
  },

  // Reject user (Owner/Admin only)
  rejectUser: async (uid, approverUid, reason = '') => {
    try {
      Utils.showLoading('Menolak pengguna...');
      
      // Check if approver is owner/admin
      const approverSnapshot = await database.ref(`users/${approverUid}`).once('value');
      const approverData = approverSnapshot.val();
      
      if (!approverData || (approverData.role !== 'owner' && approverData.role !== 'admin')) {
        Utils.hideLoading();
        Utils.showToast('Anda tidak memiliki izin', 'error');
        return { success: false, error: 'Unauthorized' };
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
      Utils.showToast('Gagal menolak pengguna', 'error');
      return { success: false, error: error.message };
    }
  },

  // Get pending users
  getPendingUsers: async () => {
    try {
      const snapshot = await database.ref('users')
        .orderByChild('status')
        .equalTo('pending')
        .once('value');
      
      const users = snapshot.val();
      if (!users) return [];
      
      return Object.entries(users).map(([uid, data]) => ({
        uid,
        ...data
      }));
    } catch (error) {
      console.error('Error getting pending users:', error);
      return [];
    }
  },

  // Logout user
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
      
      Utils.showToast('Logout berhasil', 'info');
      window.location.href = 'login.html';
    } catch (error) {
      console.error('Logout error:', error);
      Utils.showToast('Error saat logout', 'error');
    }
  },

  // Check if user has required role
  hasRole: (requiredRoles) => {
    if (!Auth.currentUser) return false;
    if (typeof requiredRoles === 'string') {
      return Auth.currentUser.role === requiredRoles;
    }
    return requiredRoles.includes(Auth.currentUser.role);
  },

  // Check if user can access menu
  canAccess: (menuName) => {
    if (!Auth.currentUser) return false;
    
    const permissions = {
      owner: ['*'], // Owner can access everything
      admin: ['kasir', 'produk', 'riwayat', 'modal', 'kas', 'hutang', 
              'laporan', 'pelanggan', 'pengguna', 'setting', 'backup', 'printer', 'reset'],
      kasir: ['kasir', 'produk', 'riwayat', 'modal', 'hutang', 'pelanggan']
    };

    const userPermissions = permissions[Auth.currentUser.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(menuName);
  },

  // Get current user
  getCurrentUser: () => {
    return Auth.currentUser;
  },

  // Check if authenticated
  isAuthenticated: () => {
    const session = Utils.getStorage('webpos_session');
    return !!Auth.currentUser || !!session;
  },

  // Require authentication (redirect if not logged in)
  requireAuth: () => {
    if (!Auth.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },

  // Require specific role
  requireRole: (roles) => {
    if (!Auth.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    
    if (!Auth.hasRole(roles)) {
      Utils.showToast('Anda tidak memiliki izin untuk mengakses halaman ini', 'error');
      window.location.href = 'index.html';
      return false;
    }
    return true;
  },

  // Update user profile
  updateProfile: async (uid, updates) => {
    try {
      Utils.showLoading('Memperbarui profil...');
      
      await database.ref(`users/${uid}`).update({
        ...updates,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      // Update session if current user
      if (Auth.currentUser && Auth.currentUser.uid === uid) {
        Auth.currentUser = { ...Auth.currentUser, ...updates };
        Utils.setStorage('webpos_session', {
          user: Auth.currentUser,
          loginTime: Date.now()
        });
      }
      
      Utils.hideLoading();
      Utils.showToast('Profil berhasil diperbarui', 'success');
      return { success: true };
    } catch (error) {
      Utils.hideLoading();
      console.error('Update profile error:', error);
      Utils.showToast('Gagal memperbarui profil', 'error');
      return { success: false, error: error.message };
    }
  },

  // Change password
  changePassword: async (newPassword) => {
    try {
      Utils.showLoading('Mengubah password...');
      
      const user = auth.currentUser;
      if (!user) {
        Utils.hideLoading();
        return { success: false, error: 'User not logged in' };
      }
      
      await user.updatePassword(newPassword);
      
      Utils.hideLoading();
      Utils.showToast('Password berhasil diubah', 'success');
      return { success: true };
    } catch (error) {
      Utils.hideLoading();
      console.error('Change password error:', error);
      
      let message = 'Gagal mengubah password';
      if (error.code === 'auth/requires-recent-login') {
        message = 'Silakan login ulang untuk mengubah password';
      } else if (error.code === 'auth/weak-password') {
        message = 'Password terlalu lemah';
      }
      
      Utils.showToast(message, 'error');
      return { success: false, error: message };
    }
  },

  // Reset password (send email)
  sendPasswordReset: async (email) => {
    try {
      Utils.showLoading('Mengirim email reset password...');
      
      await auth.sendPasswordResetEmail(email);
      
      Utils.hideLoading();
      Utils.showToast('Email reset password telah dikirim', 'success');
      return { success: true };
    } catch (error) {
      Utils.hideLoading();
      console.error('Reset password error:', error);
      
      let message = 'Gagal mengirim email reset';
      if (error.code === 'auth/user-not-found') {
        message = 'Email tidak terdaftar';
      }
      
      Utils.showToast(message, 'error');
      return { success: false, error: message };
    }
  }
};

// ==========================================
// ⭐ CSS SUPER AGRESSIVE - PASTI WORK
// ==========================================
const sidebarStyle = document.createElement('style');
sidebarStyle.textContent = `
  /* Semua kemungkinan selector sidebar */
  #sidebar .perm-hidden, 
  #sidebar [hidden],
  .sidebar .perm-hidden,
  .sidebar [hidden],
  aside .perm-hidden,
  aside [hidden],
  .nav-item.perm-hidden,
  .nav-item[hidden],
  li.perm-hidden,
  li[hidden],
  .menu-item.perm-hidden,
  .menu-item[hidden] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    max-height: 0 !important;
    min-height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
    position: absolute !important;
    left: -9999px !important;
    width: 0 !important;
  }
  
  /* Section yang kosong juga dihide */
  .nav-section:has(.perm-hidden:only-child),
  .nav-section:has(.perm-hidden:last-child),
  .nav-section[hidden] {
    display: none !important;
  }
  
  /* Force hide untuk semua child yang terhidden */
  .perm-hidden * {
    display: none !important;
  }
`;
document.head.appendChild(sidebarStyle);
// ==========================================
// ⭐ TAMBAHAN: PERMISSION SYSTEM
// ==========================================

Auth.PAGE_PERMISSIONS = {
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

// Override hasPermission
Auth.hasPermission = function(key) {
  const user = Auth.getCurrentUser();
  if (!user) return false;
  if (user.role === 'owner') return true;
  return user.permissions?.[key] === true;
};

// Filter function - FINAL FIXED VERSION
Auth.filterSidebarMenu = function() {
  const currentUser = Auth.getCurrentUser();
  if (!currentUser || currentUser.role === 'owner') {
    console.log('Skip filter: owner or no user');
    return;
  }
  
  const perms = currentUser.permissions || {};
  console.log('🔒 Filtering for:', currentUser.username, perms);
  
  // Cari sidebar dengan berbagai kemungkinan selector
  const sidebar = document.getElementById('sidebar') || 
                  document.querySelector('.sidebar') || 
                  document.querySelector('aside') ||
                  document.querySelector('[class*="sidebar"]');
  
  if (!sidebar) {
    console.log('❌ Sidebar not found!');
    return;
  }
  
  console.log('📁 Sidebar found:', sidebar.className || sidebar.id);
  
  // Cari SEMUA link di sidebar (tanpa filter selector keras)
  const allLinks = sidebar.querySelectorAll('a[href]');
  console.log('🔗 Total links in sidebar:', allLinks.length);
  
  let removedCount = 0;
  
  allLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    const cleanHref = href.split('?')[0].split('#')[0].split('/').pop();
    const text = link.textContent.trim();
    
    // Cek permission
    let permKey = Auth.PAGE_PERMISSIONS[cleanHref];
    
    // Fallback berdasarkan text
    if (!permKey) {
      const lower = text.toLowerCase();
      if (lower.includes('dashboard')) permKey = 'dashboard';
      else if (lower.includes('kasir')) permKey = 'kasir';
      else if (lower.includes('produk')) permKey = 'produk';
      else if (lower.includes('riwayat')) permKey = 'riwayat';
      else if (lower.includes('kas') || lower.includes('modal')) permKey = 'kas';
      else if (lower.includes('hutang')) permKey = 'hutang';
      else if (lower.includes('laporan')) permKey = 'laporan';
      else if (lower.includes('telegram')) permKey = 'telegram';
      else if (lower.includes('pelanggan')) permKey = 'pelanggan';
      else if (lower.includes('pengguna')) permKey = 'pengguna';
      else if (lower.includes('pengaturan') || lower.includes('setting')) permKey = 'pengaturan';
      else if (lower.includes('backup')) permKey = 'backup';
      else if (lower.includes('printer')) permKey = 'printer';
      else if (lower.includes('reset')) permKey = 'reset';
    }
    
    console.log(`Checking: "${text}" (${cleanHref}) -> ${permKey}: ${perms[permKey]}`);
    
    if (permKey && !perms[permKey]) {
      console.log(`❌ REMOVING: ${text}`);
      
      // Hapus parent element (li, div, atau a itu sendiri jika tidak ada parent)
      let parent = link.closest('li') || link.closest('.nav-item') || link.closest('div[class*="item"]') || link;
      
      if (parent && parent.parentNode) {
        parent.parentNode.removeChild(parent);
        removedCount++;
      }
    }
  });
  
  // Hapus section headers yang sudah kosong
  sidebar.querySelectorAll('li, .nav-item, div[class*="section"]').forEach(el => {
    // Jika tidak punya link anak lagi, hapus
    if (el.querySelectorAll('a[href]').length === 0 && el.textContent.trim().length > 0) {
      // Cek apakah ini section header (hanya teks, tidak ada link)
      const hasLink = el.querySelector('a');
      if (!hasLink) {
        el.parentNode.removeChild(el);
      }
    }
  });
  
  console.log('✅ REMOVED:', removedCount, 'items from DOM');
};

// ==========================================
// ⭐ OBSERVER & AUTO-FILTER SYSTEM (FIXED)
// ==========================================

// Filter dengan retry sampai sidebar benar-benar stabil
const runFilter = (attempt = 1, force = false) => {
  console.log(`🚀 Running sidebar filter... (attempt ${attempt})`);
  
  if (typeof Auth === 'undefined' || !Auth.getCurrentUser) {
    if (attempt < 10) setTimeout(() => runFilter(attempt + 1), 300);
    return;
  }
  
  const user = Auth.getCurrentUser();
  if (!user || user.role === 'owner') return;
  
  const sidebar = document.getElementById('sidebar') || 
                  document.querySelector('.sidebar') || 
                  document.querySelector('aside');
  
  if (!sidebar) {
    if (attempt < 10) setTimeout(() => runFilter(attempt + 1), 300);
    return;
  }
  
  // Hitung link sebelum filter
  const linksBefore = sidebar.querySelectorAll('a[href]').length;
  
  Auth.filterSidebarMenu();
  
  // Cek apakah masih ada link yang harusnya dihapus tapi masih ada
  setTimeout(() => {
    const linksAfter = sidebar.querySelectorAll('a[href]').length;
    
    console.log(`📊 Links: ${linksBefore} → ${linksAfter}`);
    
    // Jika masih ada banyak link, re-run
    if (linksAfter > 2 && attempt < 3) {
      console.log('🔄 Re-running filter...');
      Auth.filterSidebarMenu();
    }
  }, 500);
};

// MutationObserver untuk tangkap perubahan dinamis (dropdown expand, dll)
const setupSidebarObserver = () => {
  const sidebar = document.getElementById('sidebar') || 
                  document.querySelector('.sidebar');
  
  if (!sidebar) {
    setTimeout(setupSidebarObserver, 500);
    return;
  }
  
  const observer = new MutationObserver((mutations) => {
    let shouldFilter = false;
    
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) { // Element node
            if (node.querySelector && node.querySelector('a[href]')) {
              shouldFilter = true;
            }
            if (node.tagName === 'A' && node.getAttribute('href')) {
              shouldFilter = true;
            }
          }
        });
      }
    });
    
    if (shouldFilter) {
      setTimeout(() => runFilter(1, true), 100);
    }
  });
  
  observer.observe(sidebar, {
    childList: true,
    subtree: true
  });
  
  console.log('👁️ Sidebar observer active');
};

// Trigger 1: Auth state change
const originalInit = Auth.init;
Auth.init = function() {
  originalInit();
  
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      if (user) {
        setTimeout(() => runFilter(1, true), 500);
        setTimeout(setupSidebarObserver, 600);
      }
    });
  }
};

// Trigger 2: DOM Ready (hanya 1 kali!)
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM Ready, initializing...');
  Auth.init();
  
  const session = Utils.getStorage('webpos_session');
  if (session && session.user && session.user.role !== 'owner') {
    setTimeout(() => runFilter(1, true), 800);
    setTimeout(setupSidebarObserver, 1000);
  }
});

// Trigger 3: Window Load (double check)
window.addEventListener('load', () => {
  setTimeout(() => runFilter(1, true), 1000);
  setTimeout(() => runFilter(1, true), 2500); // Re-check setelah 2.5 detik
});
// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
