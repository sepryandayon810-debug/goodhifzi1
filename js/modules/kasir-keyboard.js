/**
 * Kasir Keyboard Shortcuts Module
 * Fungsi untuk keyboard shortcuts
 */

const KasirKeyboard = {
  shortcuts: {},

  /**
   * Initialize keyboard shortcuts
   */
  init() {
    this.setupDefaultShortcuts();
    this.setupEventListeners();
  },

  /**
   * Setup default shortcuts
   */
  setupDefaultShortcuts() {
    this.shortcuts = {
      'ctrl+k': () => this.focusSearch(),
      'f2': () => this.openPayment(),
      'f3': () => this.clearCart(),
      'f4': () => this.addDiscount(),
      'f5': () => this.refreshProducts(),
      'escape': () => this.closeModals(),
      'ctrl+enter': () => this.processPayment(),
      'ctrl+h': () => this.holdTransaction(),
      'ctrl+m': () => this.addManualProduct(),
      'ctrl+d': () => this.focusSearch()
    };
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts when typing in input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        if (e.key !== 'Escape') return;
      }

      const key = this.getKeyCombo(e);
      
      if (this.shortcuts[key]) {
        e.preventDefault();
        this.shortcuts[key]();
      }
    });
  },

  /**
   * Get key combination string
   */
  getKeyCombo(e) {
    const parts = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.altKey) parts.push('alt');
    if (e.shiftKey) parts.push('shift');
    if (e.metaKey) parts.push('meta');
    parts.push(e.key.toLowerCase());
    return parts.join('+');
  },

  /**
   * Register custom shortcut
   */
  register(key, callback) {
    this.shortcuts[key.toLowerCase()] = callback;
  },

  /**
   * Unregister shortcut
   */
  unregister(key) {
    delete this.shortcuts[key.toLowerCase()];
  },

  /**
   * Focus search input
   */
  focusSearch() {
    const searchInput = document.getElementById('productSearch');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  },

  /**
   * Open payment modal
   */
  openPayment() {
    if (KasirCart && !KasirCart.isEmpty()) {
      if (KasirPayment) {
        KasirPayment.openModal();
      }
    } else {
      Utils.showToast('Keranjang masih kosong', 'warning');
    }
  },

  /**
   * Clear cart
   */
  clearCart() {
    if (KasirCart) {
      KasirCart.clearCart();
    }
  },

  /**
   * Add discount
   */
  addDiscount() {
    if (KasirSummary) {
      KasirSummary.showDiscountDialog();
    }
  },

  /**
   * Refresh products
   */
  refreshProducts() {
    if (KasirProducts) {
      KasirProducts.refresh();
      Utils.showToast('Produk diperbarui', 'success');
    }
  },

  /**
   * Close all modals
   */
  closeModals() {
    if (KasirPayment) {
      KasirPayment.closeModal();
    }
    Utils.closeModal();
  },

  /**
   * Process payment
   */
  processPayment() {
    if (KasirPayment) {
      KasirPayment.processPayment();
    }
  },

  /**
   * Hold transaction
   */
  holdTransaction() {
    if (KasirQuickActions) {
      KasirQuickActions.holdTransaction();
    }
  },

  /**
   * Add manual product
   */
  addManualProduct() {
    if (KasirQuickActions) {
      KasirQuickActions.addManualProduct();
    }
  },

  /**
   * Show shortcuts help
   */
  showHelp() {
    const helpContent = `
      <div style="padding: 1rem;">
        <h4 style="margin-bottom: 1rem;">Keyboard Shortcuts</h4>
        <table style="width: 100%; font-size: 0.875rem;">
          <tr><td><kbd>Ctrl+K</kbd></td><td>Fokus pencarian</td></tr>
          <tr><td><kbd>F2</kbd></td><td>Buka pembayaran</td></tr>
          <tr><td><kbd>F3</kbd></td><td>Kosongkan keranjang</td></tr>
          <tr><td><kbd>F4</kbd></td><td>Tambah diskon</td></tr>
          <tr><td><kbd>F5</kbd></td><td>Refresh produk</td></tr>
          <tr><td><kbd>Ctrl+H</kbd></td><td>Tahan transaksi</td></tr>
          <tr><td><kbd>Ctrl+M</kbd></td><td>Tambah produk manual</td></tr>
          <tr><td><kbd>Ctrl+Enter</kbd></td><td>Proses pembayaran</td></tr>
          <tr><td><kbd>Escape</kbd></td><td>Tutup modal</td></tr>
        </table>
      </div>
    `;
    Utils.showModal('Bantuan Shortcut', helpContent);
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirKeyboard;
}
