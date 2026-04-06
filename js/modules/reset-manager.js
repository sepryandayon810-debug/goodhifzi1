/**
 * Reset Manager Module
 * Fungsi untuk reset data aplikasi
 */

const ResetManager = {
  /**
   * Reset all transactions
   */
  async resetTransactions() {
    try {
      Utils.showLoading('Menghapus transaksi...');
      
      await database.ref('transactions').remove();
      
      Utils.hideLoading();
      Utils.showToast('Semua transaksi berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error resetting transactions:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus transaksi', 'error');
      return false;
    }
  },

  /**
   * Reset all products
   */
  async resetProducts() {
    try {
      Utils.showLoading('Menghapus produk...');
      
      await database.ref('products').remove();
      
      Utils.hideLoading();
      Utils.showToast('Semua produk berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error resetting products:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus produk', 'error');
      return false;
    }
  },

  /**
   * Reset all categories
   */
  async resetCategories() {
    try {
      Utils.showLoading('Menghapus kategori...');
      
      await database.ref('categories').remove();
      
      Utils.hideLoading();
      Utils.showToast('Semua kategori berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error resetting categories:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus kategori', 'error');
      return false;
    }
  },

  /**
   * Reset all customers
   */
  async resetCustomers() {
    try {
      Utils.showLoading('Menghapus pelanggan...');
      
      await database.ref('customers').remove();
      
      Utils.hideLoading();
      Utils.showToast('Semua pelanggan berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error resetting customers:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus pelanggan', 'error');
      return false;
    }
  },

  /**
   * Reset hutang/piutang
   */
  async resetHutangPiutang() {
    try {
      Utils.showLoading('Menghapus hutang/piutang...');
      
      await database.ref('hutang').remove();
      await database.ref('piutang').remove();
      
      Utils.hideLoading();
      Utils.showToast('Semua hutang/piutang berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error resetting hutang/piutang:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus hutang/piutang', 'error');
      return false;
    }
  },

  /**
   * Reset all data except users
   */
  async resetAllData() {
    try {
      Utils.showLoading('Menghapus semua data...');
      
      await Promise.all([
        database.ref('transactions').remove(),
        database.ref('products').remove(),
        database.ref('categories').remove(),
        database.ref('customers').remove(),
        database.ref('hutang').remove(),
        database.ref('piutang').remove(),
        database.ref('shifts').remove(),
        database.ref('cashIn').remove(),
        database.ref('cashOut').remove(),
        database.ref('modal').remove()
      ]);
      
      Utils.hideLoading();
      Utils.showToast('Semua data berhasil direset', 'success');
      return true;
    } catch (error) {
      console.error('Error resetting all data:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal mereset data', 'error');
      return false;
    }
  },

  /**
   * Factory reset (everything including users)
   */
  async factoryReset() {
    try {
      Utils.showLoading('Factory reset...');
      
      await database.ref().remove();
      
      // Clear localStorage
      localStorage.clear();
      
      Utils.hideLoading();
      Utils.showToast('Factory reset berhasil', 'success');
      return true;
    } catch (error) {
      console.error('Error factory reset:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal factory reset', 'error');
      return false;
    }
  },

  /**
   * Show reset confirmation modal
   */
  showResetModal(type) {
    const messages = {
      transactions: 'Semua transaksi akan dihapus secara permanen.',
      products: 'Semua produk akan dihapus secara permanen.',
      categories: 'Semua kategori akan dihapus secara permanen.',
      customers: 'Semua pelanggan akan dihapus secara permanen.',
      hutang: 'Semua hutang/piutang akan dihapus secara permanen.',
      all: 'SEMUA DATA akan dihapus secara permanen kecuali pengguna.',
      factory: 'SEMUA DATA termasuk pengguna akan dihapus. Aplikasi akan seperti baru.'
    };

    Utils.confirm(
      `${messages[type]}\n\nTindakan ini tidak dapat dibatalkan. Lanjutkan?`,
      async () => {
        switch (type) {
          case 'transactions':
            await this.resetTransactions();
            break;
          case 'products':
            await this.resetProducts();
            break;
          case 'categories':
            await this.resetCategories();
            break;
          case 'customers':
            await this.resetCustomers();
            break;
          case 'hutang':
            await this.resetHutangPiutang();
            break;
          case 'all':
            await this.resetAllData();
            break;
          case 'factory':
            await this.factoryReset();
            break;
        }
      }
    );
  },

  /**
   * Get data statistics
   */
  async getStatistics() {
    try {
      const [
        transactionsSnap,
        productsSnap,
        categoriesSnap,
        customersSnap,
        hutangSnap,
        piutangSnap
      ] = await Promise.all([
        database.ref('transactions').once('value'),
        database.ref('products').once('value'),
        database.ref('categories').once('value'),
        database.ref('customers').once('value'),
        database.ref('hutang').once('value'),
        database.ref('piutang').once('value')
      ]);

      return {
        transactions: Object.keys(transactionsSnap.val() || {}).length,
        products: Object.keys(productsSnap.val() || {}).length,
        categories: Object.keys(categoriesSnap.val() || {}).length,
        customers: Object.keys(customersSnap.val() || {}).length,
        hutang: Object.keys(hutangSnap.val() || {}).length,
        piutang: Object.keys(piutangSnap.val() || {}).length
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return {
        transactions: 0,
        products: 0,
        categories: 0,
        customers: 0,
        hutang: 0,
        piutang: 0
      };
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ResetManager;
}
