/**
 * Kasir Summary Module
 * Fungsi untuk menghitung dan menampilkan ringkasan transaksi
 */

const KasirSummary = {
  discount: 0,
  tax: 0.11, // 11% PPN

  /**
   * Set discount amount
   */
  setDiscount(amount) {
    this.discount = parseInt(amount) || 0;
    Utils.setStorage('kasir_discount', this.discount);
    this.updateSummary();
  },

  /**
   * Get discount amount
   */
  getDiscount() {
    return this.discount;
  },

  /**
   * Set tax rate
   */
  setTax(rate) {
    this.tax = parseFloat(rate) || 0;
    this.updateSummary();
  },

  /**
   * Get tax rate
   */
  getTax() {
    return this.tax;
  },

  /**
   * Calculate subtotal
   */
  calculateSubtotal() {
    const cart = KasirCart ? KasirCart.getCart() : [];
    return cart.reduce((sum, item) => sum + item.total, 0);
  },

  /**
   * Calculate tax amount
   */
  calculateTax() {
    return this.calculateSubtotal() * this.tax;
  },

  /**
   * Calculate total
   */
  calculateTotal() {
    const subtotal = this.calculateSubtotal();
    const taxAmount = this.calculateTax();
    return subtotal + taxAmount - this.discount;
  },

  /**
   * Calculate profit
   */
  calculateProfit() {
    const cart = KasirCart ? KasirCart.getCart() : [];
    return cart.reduce((sum, item) => 
      sum + ((item.price - item.cost) * item.quantity), 0
    );
  },

  /**
   * Update summary display
   */
  updateSummary() {
    const subtotal = this.calculateSubtotal();
    const taxAmount = this.calculateTax();
    const total = this.calculateTotal();
    
    const subtotalEl = document.getElementById('subtotal');
    const discountEl = document.getElementById('discount');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');
    
    if (subtotalEl) subtotalEl.textContent = Utils.formatRupiah(subtotal);
    if (discountEl) discountEl.textContent = Utils.formatRupiah(this.discount);
    if (taxEl) taxEl.textContent = Utils.formatRupiah(taxAmount);
    if (totalEl) totalEl.textContent = Utils.formatRupiah(total);
  },

  /**
   * Load saved discount
   */
  loadDiscount() {
    const savedDiscount = Utils.getStorage('kasir_discount');
    if (savedDiscount !== null) {
      this.discount = parseInt(savedDiscount) || 0;
    }
  },

  /**
   * Show discount input dialog
   */
  showDiscountDialog() {
    const input = prompt('Masukkan jumlah diskon (Rp):', this.discount);
    if (input !== null) {
      this.setDiscount(input);
    }
  },

  /**
   * Reset discount
   */
  resetDiscount() {
    this.discount = 0;
    Utils.setStorage('kasir_discount', 0);
    this.updateSummary();
  },

  /**
   * Get transaction data
   */
  getTransactionData() {
    const cart = KasirCart ? KasirCart.getCart() : [];
    return {
      items: cart,
      subtotal: this.calculateSubtotal(),
      tax: this.calculateTax(),
      discount: this.discount,
      total: this.calculateTotal(),
      profit: this.calculateProfit()
    };
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirSummary;
}
