/**
 * Kasir Quick Actions Module
 * Fungsi untuk quick actions (topup, tarik, manual, hold)
 */

const KasirQuickActions = {
  /**
   * Initialize quick actions
   */
  init() {
    this.setupEventListeners();
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Top Up button
    const btnTopup = document.getElementById('btnTopup');
    if (btnTopup) {
      btnTopup.addEventListener('click', () => this.goToTopup());
    }

    // Tarik button
    const btnTarik = document.getElementById('btnTarik');
    if (btnTarik) {
      btnTarik.addEventListener('click', () => this.goToTarik());
    }

    // Manual button
    const btnManual = document.getElementById('btnManual');
    if (btnManual) {
      btnManual.addEventListener('click', () => this.addManualProduct());
    }

    // Hold button
    const btnHold = document.getElementById('btnHold');
    if (btnHold) {
      btnHold.addEventListener('click', () => this.holdTransaction());
    }

    // Diskon button
    const btnDiskon = document.getElementById('btnDiskon');
    if (btnDiskon) {
      btnDiskon.addEventListener('click', () => this.showDiscountDialog());
    }

    // Catatan button
    const btnCatatan = document.getElementById('btnCatatan');
    if (btnCatatan) {
      btnCatatan.addEventListener('click', () => this.addNote());
    }
  },

  /**
   * Navigate to topup page
   */
  goToTopup() {
    window.location.href = 'page-kas-topup.html';
  },

  /**
   * Navigate to tarik page
   */
  goToTarik() {
    window.location.href = 'page-kas-tarik.html';
  },

  /**
   * Add manual product
   */
  addManualProduct() {
    const name = prompt('Nama produk:');
    if (!name) return;
    
    const price = parseInt(prompt('Harga:'));
    if (!price || isNaN(price)) {
      Utils.showToast('Harga tidak valid', 'error');
      return;
    }
    
    const manualProduct = {
      id: 'manual_' + Date.now(),
      name: name,
      sellingPrice: price,
      costPrice: 0,
      stock: 9999
    };
    
    // Add to products list temporarily
    if (KasirProducts) {
      KasirProducts.products.unshift(manualProduct);
      KasirProducts.renderProducts();
    }
    
    // Add to cart
    if (KasirCart) {
      KasirCart.addToCart(manualProduct.id);
    }
  },

  /**
   * Hold transaction
   */
  holdTransaction() {
    if (KasirCart && KasirCart.isEmpty()) {
      Utils.showToast('Keranjang masih kosong', 'warning');
      return;
    }
    
    const holdData = {
      cart: KasirCart ? KasirCart.getCart() : [],
      discount: KasirSummary ? KasirSummary.getDiscount() : 0,
      timestamp: Date.now(),
      note: Utils.getStorage('kasir_note') || ''
    };
    
    const held = Utils.getStorage('held_transactions') || [];
    held.push(holdData);
    Utils.setStorage('held_transactions', held);
    
    // Clear cart
    if (KasirCart) {
      KasirCart.cart = [];
      KasirCart.saveCart();
      KasirCart.renderCart();
    }
    
    if (KasirSummary) {
      KasirSummary.resetDiscount();
      KasirSummary.updateSummary();
    }
    
    Utils.setStorage('kasir_note', '');
    Utils.showToast('Transaksi ditahan', 'success');
  },

  /**
   * Show held transactions
   */
  showHeldTransactions() {
    const held = Utils.getStorage('held_transactions') || [];
    
    if (held.length === 0) {
      Utils.showToast('Tidak ada transaksi yang ditahan', 'info');
      return;
    }
    
    // Create modal content
    const items = held.map((item, index) => `
      <div style="padding: 1rem; border-bottom: 1px solid var(--border-color); cursor: pointer;" 
           onclick="KasirQuickActions.restoreHeldTransaction(${index})">
        <div style="display: flex; justify-content: space-between;">
          <span>Transaksi #${index + 1}</span>
          <span>${new Date(item.timestamp).toLocaleTimeString()}</span>
        </div>
        <div style="font-size: 0.875rem; color: var(--text-muted);">
          ${item.cart.length} item - ${Utils.formatRupiah(item.cart.reduce((sum, i) => sum + i.total, 0))}
        </div>
      </div>
    `).join('');
    
    Utils.showModal('Transaksi Ditahan', items);
  },

  /**
   * Restore held transaction
   */
  restoreHeldTransaction(index) {
    const held = Utils.getStorage('held_transactions') || [];
    const transaction = held[index];
    
    if (!transaction) return;
    
    // Restore cart
    if (KasirCart) {
      KasirCart.cart = transaction.cart;
      KasirCart.saveCart();
      KasirCart.renderCart();
    }
    
    // Restore discount
    if (KasirSummary) {
      KasirSummary.setDiscount(transaction.discount);
    }
    
    // Restore note
    if (transaction.note) {
      Utils.setStorage('kasir_note', transaction.note);
    }
    
    // Remove from held
    held.splice(index, 1);
    Utils.setStorage('held_transactions', held);
    
    Utils.closeModal();
    Utils.showToast('Transaksi dipulihkan', 'success');
  },

  /**
   * Show discount dialog
   */
  showDiscountDialog() {
    if (KasirSummary) {
      KasirSummary.showDiscountDialog();
    }
  },

  /**
   * Add note to transaction
   */
  addNote() {
    const currentNote = Utils.getStorage('kasir_note') || '';
    const note = prompt('Catatan untuk transaksi:', currentNote);
    if (note !== null) {
      Utils.setStorage('kasir_note', note);
      if (note) {
        Utils.showToast('Catatan disimpan', 'success');
      }
    }
  },

  /**
   * Get note
   */
  getNote() {
    return Utils.getStorage('kasir_note') || '';
  },

  /**
   * Clear note
   */
  clearNote() {
    Utils.setStorage('kasir_note', '');
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirQuickActions;
}
