/**
 * Pengguna Manager Module
 * Fungsi untuk mengelola pengguna (users)
 */

const PenggunaManager = {
  users: [],
  currentUser: null,

  /**
   * Load all users from Firebase
   */
  async loadUsers() {
    try {
      Utils.showLoading('Memuat pengguna...');
      
      const snapshot = await database.ref('users').once('value');
      const data = snapshot.val() || {};
      
      this.users = Object.entries(data).map(([id, userData]) => ({
        uid: id,
        ...userData
      }));
      
      Utils.hideLoading();
      return this.users;
    } catch (error) {
      console.error('Error loading users:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memuat pengguna', 'error');
      return [];
    }
  },

  /**
   * Get user by UID
   */
  getUser(uid) {
    return this.users.find(u => u.uid === uid);
  },

  /**
   * Get users by status
   */
  getUsersByStatus(status) {
    return this.users.filter(u => u.status === status);
  },

  /**
   * Get users by role
   */
  getUsersByRole(role) {
    return this.users.filter(u => u.role === role);
  },

  /**
   * Approve user
   */
  async approveUser(uid, approverUid) {
    try {
      Utils.showLoading('Menyetujui pengguna...');
      
      await database.ref(`users/${uid}`).update({
        status: 'active',
        approvedAt: firebase.database.ServerValue.TIMESTAMP,
        approvedBy: approverUid
      });
      
      const user = this.getUser(uid);
      if (user) {
        user.status = 'active';
      }
      
      Utils.hideLoading();
      Utils.showToast('Pengguna berhasil disetujui', 'success');
      return true;
    } catch (error) {
      console.error('Error approving user:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menyetujui pengguna', 'error');
      return false;
    }
  },

  /**
   * Reject user
   */
  async rejectUser(uid, reason = '') {
    try {
      Utils.showLoading('Menolak pengguna...');
      
      await database.ref(`users/${uid}`).update({
        status: 'rejected',
        rejectedAt: firebase.database.ServerValue.TIMESTAMP,
        rejectionReason: reason
      });
      
      const user = this.getUser(uid);
      if (user) {
        user.status = 'rejected';
      }
      
      Utils.hideLoading();
      Utils.showToast('Pengguna berhasil ditolak', 'success');
      return true;
    } catch (error) {
      console.error('Error rejecting user:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menolak pengguna', 'error');
      return false;
    }
  },

  /**
   * Suspend user
   */
  async suspendUser(uid, reason = '') {
    try {
      Utils.showLoading('Menangguhkan pengguna...');
      
      await database.ref(`users/${uid}`).update({
        status: 'suspended',
        suspendedAt: firebase.database.ServerValue.TIMESTAMP,
        suspensionReason: reason
      });
      
      const user = this.getUser(uid);
      if (user) {
        user.status = 'suspended';
      }
      
      Utils.hideLoading();
      Utils.showToast('Pengguna berhasil ditangguhkan', 'success');
      return true;
    } catch (error) {
      console.error('Error suspending user:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menangguhkan pengguna', 'error');
      return false;
    }
  },

  /**
   * Update user role
   */
  async updateRole(uid, newRole) {
    try {
      Utils.showLoading('Mengubah role...');
      
      await database.ref(`users/${uid}`).update({
        role: newRole,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      });
      
      const user = this.getUser(uid);
      if (user) {
        user.role = newRole;
      }
      
      Utils.hideLoading();
      Utils.showToast('Role berhasil diubah', 'success');
      return true;
    } catch (error) {
      console.error('Error updating role:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal mengubah role', 'error');
      return false;
    }
  },

  /**
   * Delete user
   */
  async deleteUser(uid) {
    try {
      Utils.showLoading('Menghapus pengguna...');
      
      await database.ref(`users/${uid}`).remove();
      
      this.users = this.users.filter(u => u.uid !== uid);
      
      Utils.hideLoading();
      Utils.showToast('Pengguna berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus pengguna', 'error');
      return false;
    }
  },

  /**
   * Get pending users count
   */
  getPendingCount() {
    return this.users.filter(u => u.status === 'pending').length;
  },

  /**
   * Get user statistics
   */
  getStatistics() {
    return {
      total: this.users.length,
      active: this.users.filter(u => u.status === 'active').length,
      pending: this.users.filter(u => u.status === 'pending').length,
      suspended: this.users.filter(u => u.status === 'suspended').length,
      rejected: this.users.filter(u => u.status === 'rejected').length,
      byRole: {
        owner: this.users.filter(u => u.role === 'owner').length,
        admin: this.users.filter(u => u.role === 'admin').length,
        kasir: this.users.filter(u => u.role === 'kasir').length
      }
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PenggunaManager;
}
