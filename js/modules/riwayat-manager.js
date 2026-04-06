/**
 * Riwayat Transaksi Manager Module
 * Fungsi untuk mengelola riwayat transaksi
 */

const RiwayatManager = {
  transactions: [],
  currentPage: 1,
  itemsPerPage: 20,

  /**
   * Load transactions with pagination
   */
  async loadTransactions(date = null, page = 1) {
    try {
      Utils.showLoading('Memuat transaksi...');
      
      const targetDate = date || Utils.getTodayString();
      const snapshot = await database.ref(`transactions/${targetDate}`).once('value');
      const data = snapshot.val() || {};
      
      this.transactions = Object.entries(data)
        .map(([id, t]) => ({ id, ...t }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      this.currentPage = page;
      
      Utils.hideLoading();
      return this.getPaginatedTransactions();
    } catch (error) {
      console.error('Error loading transactions:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memuat transaksi', 'error');
      return [];
    }
  },

  /**
   * Get paginated transactions
   */
  getPaginatedTransactions() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.transactions.slice(start, end);
  },

  /**
   * Get total pages
   */
  getTotalPages() {
    return Math.ceil(this.transactions.length / this.itemsPerPage);
  },

  /**
   * Go to page
   */
  goToPage(page) {
    const totalPages = this.getTotalPages();
    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    
    this.currentPage = page;
    return this.getPaginatedTransactions();
  },

  /**
   * Next page
   */
  nextPage() {
    return this.goToPage(this.currentPage + 1);
  },

  /**
   * Previous page
   */
  previousPage() {
    return this.goToPage(this.currentPage - 1);
  },

  /**
   * Get transaction by ID
   */
  getTransaction(id) {
    return this.transactions.find(t => t.id === id);
  },

  /**
   * Search transactions
   */
  searchTransactions(query) {
    const lowerQuery = query.toLowerCase();
    return this.transactions.filter(t =>
      t.id.toLowerCase().includes(lowerQuery) ||
      (t.cashierName && t.cashierName.toLowerCase().includes(lowerQuery))
    );
  },

  /**
   * Filter by payment method
   */
  filterByPaymentMethod(method) {
    return this.transactions.filter(t => t.paymentMethod === method);
  },

  /**
   * Get transaction details
   */
  async getTransactionDetails(date, transactionId) {
    try {
      const snapshot = await database.ref(`transactions/${date}/${transactionId}`).once('value');
      return snapshot.val();
    } catch (error) {
      console.error('Error getting transaction details:', error);
      return null;
    }
  },

  /**
   * Void transaction
   */
  async voidTransaction(date, transactionId, reason) {
    try {
      Utils.showLoading('Membatalkan transaksi...');
      
      await database.ref(`transactions/${date}/${transactionId}`).update({
        status: 'voided',
        voidReason: reason,
        voidedAt: firebase.database.ServerValue.TIMESTAMP,
        voidedBy: Auth.getCurrentUser()?.uid
      });
      
      // Update local data
      const transaction = this.transactions.find(t => t.id === transactionId);
      if (transaction) {
        transaction.status = 'voided';
        transaction.voidReason = reason;
      }
      
      Utils.hideLoading();
      Utils.showToast('Transaksi berhasil dibatalkan', 'success');
      return true;
    } catch (error) {
      console.error('Error voiding transaction:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal membatalkan transaksi', 'error');
      return false;
    }
  },

  /**
   * Refund transaction
   */
  async refundTransaction(date, transactionId, items, reason) {
    try {
      Utils.showLoading('Memproses refund...');
      
      const refundId = Utils.generateId('RFD');
      
      await database.ref(`transactions/${date}/${transactionId}/refunds/${refundId}`).set({
        id: refundId,
        items,
        reason,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        processedBy: Auth.getCurrentUser()?.uid
      });
      
      await database.ref(`transactions/${date}/${transactionId}`).update({
        status: 'refunded',
        refundAmount: items.reduce((sum, item) => sum + item.total, 0)
      });
      
      Utils.hideLoading();
      Utils.showToast('Refund berhasil diproses', 'success');
      return refundId;
    } catch (error) {
      console.error('Error processing refund:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memproses refund', 'error');
      return null;
    }
  },

  /**
   * Print receipt
   */
  printReceipt(transaction) {
    if (typeof PrinterManager !== 'undefined') {
      PrinterManager.printReceipt(transaction);
    } else {
      Utils.showToast('Printer tidak tersedia', 'error');
    }
  },

  /**
   * Get daily summary
   */
  getDailySummary() {
    const total = this.transactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const cash = this.transactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + (t.total || 0), 0);
    const transfer = this.transactions
      .filter(t => t.paymentMethod === 'transfer')
      .reduce((sum, t) => sum + (t.total || 0), 0);
    
    return {
      count: this.transactions.length,
      total,
      cash,
      transfer,
      average: this.transactions.length > 0 ? total / this.transactions.length : 0
    };
  },

  /**
   * Export to CSV
   */
  exportToCSV() {
    if (this.transactions.length === 0) {
      Utils.showToast('Tidak ada data untuk diexport', 'warning');
      return;
    }
    
    const headers = ['ID', 'Tanggal', 'Kasir', 'Items', 'Subtotal', 'Diskon', 'PPN', 'Total', 'Metode', 'Status'];
    const data = this.transactions.map(t => [
      t.id,
      new Date(t.timestamp).toLocaleString('id-ID'),
      t.cashierName,
      t.items ? t.items.length : 0,
      t.subtotal,
      t.discount,
      t.tax,
      t.total,
      t.paymentMethod,
      t.status || 'completed'
    ]);
    
    const csv = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transaksi_${Utils.getTodayString()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    Utils.showToast('Data berhasil diexport', 'success');
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = RiwayatManager;
}
