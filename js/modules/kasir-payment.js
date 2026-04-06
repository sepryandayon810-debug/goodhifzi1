/**
 * Kasir Payment Module
 * Fungsi untuk memproses pembayaran
 */

const KasirPayment = {
  paymentMethod: 'cash',
  paymentAmount: 0,
  modal: null,

  /**
   * Initialize payment module
   */
  init() {
    this.modal = document.getElementById('paymentModal');
    this.setupEventListeners();
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Payment methods
    document.querySelectorAll('.payment-method').forEach(method => {
      method.addEventListener('click', () => {
        document.querySelectorAll('.payment-method').forEach(m => m.classList.remove('active'));
        method.classList.add('active');
        this.paymentMethod = method.dataset.method;
      });
    });

    // Close modal
    const closeBtn = document.getElementById('closePaymentModal');
    const cancelBtn = document.getElementById('btnCancelPayment');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeModal());
    }
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.closeModal());
    }

    // Confirm payment
    const confirmBtn = document.getElementById('btnConfirmPayment');
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.processPayment());
    }

    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
      }
    });
  },

  /**
   * Open payment modal
   */
  openModal() {
    if (KasirCart && KasirCart.isEmpty()) {
      Utils.showToast('Keranjang masih kosong', 'warning');
      return;
    }

    const total = KasirSummary ? KasirSummary.calculateTotal() : 0;
    const paymentTotalEl = document.getElementById('paymentTotal');
    
    if (paymentTotalEl) {
      paymentTotalEl.textContent = Utils.formatRupiah(total);
    }
    
    this.paymentAmount = 0;
    this.updateChangeDisplay();
    
    if (this.modal) {
      this.modal.classList.add('active');
    }
  },

  /**
   * Close payment modal
   */
  closeModal() {
    if (this.modal) {
      this.modal.classList.remove('active');
    }
  },

  /**
   * Set payment amount
   */
  setPaymentAmount(amount) {
    this.paymentAmount = amount;
    this.updateChangeDisplay();
  },

  /**
   * Add digit to payment amount
   */
  addDigit(digit) {
    this.paymentAmount = this.paymentAmount * 10 + digit;
    this.updateChangeDisplay();
  },

  /**
   * Clear payment amount
   */
  clearAmount() {
    this.paymentAmount = 0;
    this.updateChangeDisplay();
  },

  /**
   * Backspace payment amount
   */
  backspace() {
    this.paymentAmount = Math.floor(this.paymentAmount / 10);
    this.updateChangeDisplay();
  },

  /**
   * Update change display
   */
  updateChangeDisplay() {
    const total = KasirSummary ? KasirSummary.calculateTotal() : 0;
    const change = this.paymentAmount - total;
    const changeEl = document.getElementById('paymentChange');
    
    if (changeEl) {
      changeEl.textContent = Utils.formatRupiah(change > 0 ? change : 0);
    }
  },

  /**
   * Get change amount
   */
  getChange() {
    const total = KasirSummary ? KasirSummary.calculateTotal() : 0;
    return Math.max(0, this.paymentAmount - total);
  },

  /**
   * Process payment
   */
  async processPayment() {
    const total = KasirSummary ? KasirSummary.calculateTotal() : 0;
    
    if (this.paymentAmount < total) {
      Utils.showToast('Jumlah bayar kurang dari total', 'error');
      return;
    }

    try {
      Utils.showLoading('Memproses transaksi...');
      
      const user = Auth.getCurrentUser();
      const transactionId = Utils.generateId('TRX');
      const summary = KasirSummary ? KasirSummary.getTransactionData() : {};
      
      const today = Utils.getTodayString();
      
      const transaction = {
        id: transactionId,
        type: 'penjualan',
        items: summary.items || [],
        subtotal: summary.subtotal || 0,
        tax: summary.tax || 0,
        discount: summary.discount || 0,
        total: summary.total || 0,
        profit: summary.profit || 0,
        paymentMethod: this.paymentMethod,
        paymentAmount: this.paymentAmount,
        change: this.getChange(),
        cashierId: user ? user.uid : 'unknown',
        cashierName: user ? user.name : 'Unknown',
        timestamp: Date.now(),
        status: 'completed',
        date: today
      };
      
      // Save transaction
      await database.ref(`transactions/${today}/${transactionId}`).set(transaction);
      
      // Update product stocks
      const cart = KasirCart ? KasirCart.getCart() : [];
      for (const item of cart) {
        if (KasirProducts) {
          await KasirProducts.updateStock(item.productId, item.quantity);
        }
      }
      
      // Clear cart
      if (KasirCart) {
        KasirCart.cart = [];
        KasirCart.saveCart();
        KasirCart.renderCart();
      }
      
      // Reset discount
      if (KasirSummary) {
        KasirSummary.resetDiscount();
        KasirSummary.updateSummary();
      }
      
      this.closeModal();
      Utils.hideLoading();
      
      Utils.showToast('Transaksi berhasil!', 'success');
      
      // Reload products to update stock display
      if (KasirProducts) {
        KasirProducts.refresh();
      }
      
      return transaction;
      
    } catch (error) {
      console.error('Payment error:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memproses transaksi', 'error');
      throw error;
    }
  },

  /**
   * Get payment method
   */
  getPaymentMethod() {
    return this.paymentMethod;
  },

  /**
   * Get payment amount
   */
  getPaymentAmount() {
    return this.paymentAmount;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirPayment;
}
