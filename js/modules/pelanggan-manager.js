/**
 * Pelanggan Manager Module
 * Fungsi untuk mengelola data pelanggan
 */

const PelangganManager = {
  customers: [],

  /**
   * Load all customers from Firebase
   */
  async loadCustomers() {
    try {
      Utils.showLoading('Memuat data pelanggan...');
      
      const snapshot = await database.ref('customers').once('value');
      const data = snapshot.val() || {};
      
      this.customers = Object.entries(data).map(([id, customerData]) => ({
        id,
        ...customerData
      }));
      
      Utils.hideLoading();
      return this.customers;
    } catch (error) {
      console.error('Error loading customers:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memuat data pelanggan', 'error');
      return [];
    }
  },

  /**
   * Add new customer
   */
  async addCustomer(data) {
    try {
      Utils.showLoading('Menyimpan...');
      
      const id = Utils.generateId('CUS');
      const customerData = {
        id,
        name: data.name,
        phone: data.phone || '',
        email: data.email || '',
        address: data.address || '',
        notes: data.notes || '',
        telegramId: data.telegramId || '',
        totalTransactions: 0,
        totalSpent: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      await database.ref(`customers/${id}`).set(customerData);
      this.customers.push(customerData);
      
      Utils.hideLoading();
      Utils.showToast('Pelanggan berhasil ditambahkan', 'success');
      return customerData;
    } catch (error) {
      console.error('Error adding customer:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menambahkan pelanggan', 'error');
      return null;
    }
  },

  /**
   * Update customer
   */
  async updateCustomer(id, data) {
    try {
      Utils.showLoading('Menyimpan...');
      
      const updateData = {
        ...data,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      await database.ref(`customers/${id}`).update(updateData);
      
      const index = this.customers.findIndex(c => c.id === id);
      if (index > -1) {
        this.customers[index] = { ...this.customers[index], ...updateData };
      }
      
      Utils.hideLoading();
      Utils.showToast('Pelanggan berhasil diupdate', 'success');
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal mengupdate pelanggan', 'error');
      return false;
    }
  },

  /**
   * Delete customer
   */
  async deleteCustomer(id) {
    try {
      Utils.showLoading('Menghapus...');
      
      await database.ref(`customers/${id}`).remove();
      
      const index = this.customers.findIndex(c => c.id === id);
      if (index > -1) {
        this.customers.splice(index, 1);
      }
      
      Utils.hideLoading();
      Utils.showToast('Pelanggan berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus pelanggan', 'error');
      return false;
    }
  },

  /**
   * Get customer by ID
   */
  getCustomer(id) {
    return this.customers.find(c => c.id === id);
  },

  /**
   * Search customers
   */
  searchCustomers(query) {
    const lowerQuery = query.toLowerCase();
    return this.customers.filter(c => 
      c.name.toLowerCase().includes(lowerQuery) ||
      (c.phone && c.phone.includes(lowerQuery)) ||
      (c.email && c.email.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Update customer transaction stats
   */
  async updateTransactionStats(customerId, amount) {
    try {
      const customer = this.getCustomer(customerId);
      if (!customer) return;
      
      const newTotal = (customer.totalTransactions || 0) + 1;
      const newSpent = (customer.totalSpent || 0) + amount;
      
      await database.ref(`customers/${customerId}`).update({
        totalTransactions: newTotal,
        totalSpent: newSpent,
        lastTransaction: firebase.database.ServerValue.TIMESTAMP
      });
      
      customer.totalTransactions = newTotal;
      customer.totalSpent = newSpent;
    } catch (error) {
      console.error('Error updating stats:', error);
    }
  },

  /**
   * Get top customers
   */
  getTopCustomers(limit = 10) {
    return [...this.customers]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, limit);
  },

  /**
   * Export to CSV
   */
  exportToCSV() {
    const headers = ['ID', 'Nama', 'Telepon', 'Email', 'Alamat', 'Total Transaksi', 'Total Belanja'];
    const data = this.customers.map(c => [
      c.id,
      c.name,
      c.phone || '',
      c.email || '',
      c.address || '',
      c.totalTransactions || 0,
      c.totalSpent || 0
    ]);
    
    const csv = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pelanggan_${Utils.getTodayString()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    Utils.showToast('Data berhasil diexport', 'success');
  },

  /**
   * Import from CSV
   */
  async importFromCSV(rows) {
    const results = { success: 0, failed: 0 };
    
    for (const row of rows) {
      try {
        if (!row.Nama) continue;
        
        await this.addCustomer({
          name: row.Nama,
          phone: row.Telepon || '',
          email: row.Email || '',
          address: row.Alamat || ''
        });
        
        results.success++;
      } catch (error) {
        results.failed++;
      }
    }
    
    return results;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PelangganManager;
}
