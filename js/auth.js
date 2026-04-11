/**
 * WebPOS Authentication Module - Enhanced
 * With Username Login and User Approval System
 * 
 * PERBAIKAN BUG:
 * - filterSidebarMenu sekarang MENYEMBUNYIKAN (display:none) bukan menghapus elemen dari DOM
 * - MutationObserver tidak trigger re-filter saat perubahan disebabkan oleh filter itu sendiri
 * - Filter hanya dijalankan sekali saat user data tersedia, bukan diulang-ulang
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
          permissions: userData.permissions || {},
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
  register: async (username, password, name, email, role = 'kasir', permissions = {}) => {
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
      const isOwner = role === 'owner';
      const status = isOwner ? 'active' : 'pending';
      
      // Create user data in database
      await database.ref(`users/${uid}`).set({
        uid,
        username: formattedUsername,
        email: userEmail,
        name: name || formattedUsername,
        role,
        permissions: permissions || {},
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

  // Check if user can access menu - berdasarkan permissions dari database
  canAccess: (menuName) => {
    if (!Auth.currentUser) return false;
    if (Auth.currentUser.role === 'owner') return true;
    const perms = Auth.currentUser.permissions || {};
    return perms[menuName] === true;
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
// PERMISSION SYSTEM - PERBAIKAN BUG
// ==========================================

// Mapping halaman ke permission key
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

// Cek permission
Auth.hasPermission = function(key) {
  const user = Auth.getCurrentUser();
  if (!user) return false;
  if (user.role === 'owner') return true;
  return user.permissions?.[key] === true;
};

// ==========================================
// FILTER SIDEBAR - VERSI PERBAIKAN
// 
// PERUBAHAN UTAMA:
// 1. Gunakan style.display = 'none' BUKAN removeChild
//    - Elemen tetap ada di DOM, hanya disembunyikan
//    - Tidak merusak struktur DOM saat navigasi
// 2. Flag _sidebarFiltered agar filter hanya jalan sekali
// 3. MutationObserver tidak re-trigger saat filter sendiri
//    yang mengubah DOM (pakai flag _isFiltering)
// ==========================================

Auth._sidebarFiltered = false;
Auth._isFiltering = false;

Auth.filterSidebarMenu = function() {
  const currentUser = Auth.getCurrentUser();

  // Owner bisa akses semua - tidak perlu filter
  if (!currentUser || currentUser.role === 'owner') {
    return;
  }

  // Jika sudah difilter di halaman ini, skip
  if (Auth._sidebarFiltered) {
    return;
  }

  const perms = currentUser.permissions || {};
  console.log('🔒 Filtering sidebar untuk:', currentUser.username, '| role:', currentUser.role, '| permissions:', perms);

  const sidebar = document.getElementById('sidebar') ||
                  document.querySelector('.sidebar') ||
                  document.querySelector('aside');

  if (!sidebar) {
    console.log('❌ Sidebar tidak ditemukan, retry...');
    return false; // return false agar caller bisa retry
  }

  // Set flag agar MutationObserver tidak re-trigger filter
  Auth._isFiltering = true;

  let hiddenCount = 0;

  // ========================================
  // STRATEGI 1: Gunakan data-menu attribute (paling akurat)
  // HTML sidebar sudah punya: <a href="..." data-menu="kasir">
  // ========================================
  const linksWithDataMenu = sidebar.querySelectorAll('a[data-menu]');
  linksWithDataMenu.forEach(link => {
    const menuKey = link.getAttribute('data-menu');
    const hasAccess = Auth.hasPermission(menuKey);
    
    console.log(`  [data-menu="${menuKey}"] -> akses: ${hasAccess}`);
    
    // Cari parent li.nav-item untuk disembunyikan
    const navItem = link.closest('li') || link.closest('.nav-item') || link.parentElement;
    
    if (!hasAccess) {
      navItem.style.display = 'none';
      hiddenCount++;
    } else {
      navItem.style.display = ''; // Pastikan visible
    }
  });

  // ========================================
  // STRATEGI 2: Dropdown section (data-menu pada div toggle)
  // Contoh: <div class="nav-link nav-dropdown-toggle" data-menu="kas">
  // ========================================
  const dropdownsWithDataMenu = sidebar.querySelectorAll('[data-menu]:not(a)');
  dropdownsWithDataMenu.forEach(el => {
    const menuKey = el.getAttribute('data-menu');
    const hasAccess = Auth.hasPermission(menuKey);
    
    console.log(`  [dropdown data-menu="${menuKey}"] -> akses: ${hasAccess}`);
    
    // Cari parent nav-item dari dropdown ini
    const navItem = el.closest('li') || el.closest('.nav-item') || el.parentElement;
    
    if (!hasAccess) {
      navItem.style.display = 'none';
      hiddenCount++;
    } else {
      navItem.style.display = '';
    }
  });

  // ========================================
  // STRATEGI 3: Link tanpa data-menu - fallback by href
  // ========================================
  const linksWithoutDataMenu = sidebar.querySelectorAll('a[href]:not([data-menu])');
  linksWithoutDataMenu.forEach(link => {
    const href = link.getAttribute('href') || '';
    const cleanHref = href.split('?')[0].split('#')[0].split('/').pop();
    const menuKey = Auth.PAGE_PERMISSIONS[cleanHref];
    
    if (!menuKey) return; // Tidak ada mapping, biarkan tampil
    
    const hasAccess = Auth.hasPermission(menuKey);
    console.log(`  [href="${cleanHref}"] -> key: ${menuKey}, akses: ${hasAccess}`);
    
    if (!hasAccess) {
      const navItem = link.closest('li') || link.closest('.nav-item') || link.parentElement;
      navItem.style.display = 'none';
      hiddenCount++;
    }
  });

  // ========================================
  // Sembunyikan nav-section yang semua isinya hidden
  // ========================================
  sidebar.querySelectorAll('.nav-section').forEach(section => {
    const allItems = section.querySelectorAll('li, .nav-item');
    const allHidden = Array.from(allItems).every(item => item.style.display === 'none');
    
    if (allItems.length > 0 && allHidden) {
      section.style.display = 'none';
    } else {
      section.style.display = '';
    }
  });

  Auth._sidebarFiltered = true;
  Auth._isFiltering = false;
  
  console.log(`✅ Filter selesai: ${hiddenCount} menu disembunyikan`);
  return true;
};

// ==========================================
// RUNNER - Coba filter sampai sidebar siap
// Hanya jalan sekali (cek flag _sidebarFiltered)
// ==========================================
const runSidebarFilter = (attempt = 1) => {
  // Jika sudah difilter, tidak perlu jalan lagi
  if (Auth._sidebarFiltered) return;

  const user = Auth.getCurrentUser();
  
  // Jika belum ada user data, coba ambil dari session
  if (!user) {
    const session = Utils.getStorage('webpos_session');
    if (session && session.user) {
      Auth.currentUser = session.user;
    }
  }

  const currentUser = Auth.getCurrentUser();
  
  // Owner tidak perlu filter
  if (currentUser && currentUser.role === 'owner') return;

  // Jika user belum tersedia, retry
  if (!currentUser) {
    if (attempt < 15) {
      setTimeout(() => runSidebarFilter(attempt + 1), 200);
    }
    return;
  }

  // Coba jalankan filter
  const result = Auth.filterSidebarMenu();
  
  // Jika sidebar belum ada, retry
  if (result === false && attempt < 15) {
    setTimeout(() => runSidebarFilter(attempt + 1), 200);
  }
};

// ==========================================
// SETUP: Jalankan filter saat DOM siap
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Init auth (load session dari storage)
  Auth.init();

  const session = Utils.getStorage('webpos_session');
  
  // Jika ada sesi yang tersimpan, langsung filter
  if (session && session.user && session.user.role !== 'owner') {
    // Gunakan data dari session dulu (cepat, tidak perlu tunggu Firebase)
    Auth.currentUser = session.user;
    runSidebarFilter(1);
  }
  
  // Tetap listen Firebase auth untuk update data terbaru
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      if (user) {
        // Load data terbaru dari database
        Auth.loadUserData(user.uid).then(() => {
          // Reset flag agar filter bisa jalan dengan data terbaru
          Auth._sidebarFiltered = false;
          runSidebarFilter(1);
        });
      }
    });
  }
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
