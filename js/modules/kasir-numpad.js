/**
 * Kasir Numpad Module
 * Fungsi untuk mengelola numpad pembayaran
 */

const KasirNumpad = {
  /**
   * Initialize numpad
   */
  init() {
    this.setupNumpadButtons();
    this.setupQuickAmounts();
  },

  /**
   * Setup numpad buttons
   */
  setupNumpadButtons() {
    document.querySelectorAll('.numpad-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const num = btn.dataset.num;
        const action = btn.dataset.action;
        
        if (num !== undefined) {
          KasirPayment.addDigit(parseInt(num));
        } else if (action === 'clear') {
          KasirPayment.clearAmount();
        } else if (action === 'backspace') {
          KasirPayment.backspace();
        }
      });
    });
  },

  /**
   * Setup quick amount buttons
   */
  setupQuickAmounts() {
    document.querySelectorAll('.quick-amount').forEach(btn => {
      btn.addEventListener('click', () => {
        const amount = btn.dataset.amount;
        if (amount === 'exact') {
          const total = KasirSummary ? KasirSummary.calculateTotal() : 0;
          KasirPayment.setPaymentAmount(total);
        } else {
          KasirPayment.setPaymentAmount(parseInt(amount));
        }
      });
    });
  },

  /**
   * Add custom quick amount
   */
  addQuickAmount(amount, label) {
    const container = document.querySelector('.quick-amounts');
    if (!container) return;
    
    const btn = document.createElement('button');
    btn.className = 'quick-amount';
    btn.dataset.amount = amount;
    btn.textContent = label || Utils.formatRupiah(amount);
    
    btn.addEventListener('click', () => {
      KasirPayment.setPaymentAmount(parseInt(amount));
    });
    
    container.appendChild(btn);
  },

  /**
   * Clear all quick amounts
   */
  clearQuickAmounts() {
    const container = document.querySelector('.quick-amounts');
    if (container) {
      container.innerHTML = '';
    }
  },

  /**
   * Set default quick amounts
   */
  setDefaultQuickAmounts() {
    const container = document.querySelector('.quick-amounts');
    if (!container) return;
    
    container.innerHTML = `
      <button class="quick-amount" data-amount="exact">Uang Pas</button>
      <button class="quick-amount" data-amount="50000">50.000</button>
      <button class="quick-amount" data-amount="100000">100.000</button>
    `;
    
    this.setupQuickAmounts();
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirNumpad;
}
