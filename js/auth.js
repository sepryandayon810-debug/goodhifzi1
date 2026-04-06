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

// Initialize on load
document.addEventListener('DOMContentLoaded', Auth.init);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Auth;
}
