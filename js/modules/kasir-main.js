/**
 * Kasir Main Module
 * Modul utama yang menginisialisasi semua komponen kasir
 */

const KasirMain = {
  initialized: false,

  /**
   * Initialize all kasir modules
   */
  async init() {
    if (this.initialized) return;

    console.log('Initializing Kasir...');

    // Initialize UI first
    if (typeof KasirUI !== 'undefined') {
      KasirUI.init();
    }

    // Initialize payment module
    if (typeof KasirPayment !== 'undefined') {
      KasirPayment.init();
    }

    // Initialize numpad
    if (typeof KasirNumpad !== 'undefined') {
      KasirNumpad.init();
    }

    // Initialize quick actions
    if (typeof KasirQuickActions !== 'undefined') {
      KasirQuickActions.init();
    }

    // Initialize keyboard shortcuts
    if (typeof KasirKeyboard !== 'undefined') {
      KasirKeyboard.init();
    }

    // Load saved data
    if (typeof KasirSummary !== 'undefined') {
      KasirSummary.loadDiscount();
      KasirSummary.updateSummary();
    }

    if (typeof KasirCart !== 'undefined') {
      KasirCart.loadCart();
    }

    // Load data from Firebase
    try {
      if (typeof KasirCategories !== 'undefined') {
        await KasirCategories.loadCategories();
      }
      
      if (typeof KasirProducts !== 'undefined') {
        await KasirProducts.loadProducts();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }

    // Setup bayar button
    const btnBayar = document.getElementById('btnBayar');
    if (btnBayar && typeof KasirPayment !== 'undefined') {
      btnBayar.addEventListener('click', () => {
        KasirPayment.openModal();
      });
    }

    // Setup clear cart button
    const btnClearCart = document.getElementById('btnClearCart');
    if (btnClearCart && typeof KasirCart !== 'undefined') {
      btnClearCart.addEventListener('click', () => {
        KasirCart.clearCart();
      });
    }

    // Setup search
    const productSearch = document.getElementById('productSearch');
    if (productSearch && typeof KasirProducts !== 'undefined') {
      productSearch.addEventListener('input', 
        Utils.debounce((e) => {
          KasirProducts.searchProducts(e.target.value);
        }, 300)
      );
    }

    // Setup logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        Utils.confirm('Yakin ingin logout?', () => Auth.logout());
      });
    }

    this.initialized = true;
    console.log('Kasir initialized successfully');
  },

  /**
   * Refresh all data
   */
  async refresh() {
    if (typeof KasirProducts !== 'undefined') {
      await KasirProducts.refresh();
    }
    if (typeof KasirCategories !== 'undefined') {
      await KasirCategories.loadCategories();
    }
    Utils.showToast('Data diperbarui', 'success');
  },

  /**
   * Reset all state
   */
  reset() {
    if (typeof KasirCart !== 'undefined') {
      KasirCart.cart = [];
      KasirCart.saveCart();
      KasirCart.renderCart();
    }
    
    if (typeof KasirSummary !== 'undefined') {
      KasirSummary.resetDiscount();
      KasirSummary.updateSummary();
    }
    
    Utils.setStorage('kasir_note', '');
  }
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for Firebase auth
  if (typeof auth !== 'undefined') {
    auth.onAuthStateChanged((user) => {
      if (!user && !Utils.getStorage('webpos_session')) {
        window.location.href = 'login.html';
        return;
      }
      
      if (user && typeof Auth !== 'undefined') {
        Auth.loadUserData(user.uid);
      }
      
      KasirMain.init();
    });
  } else {
    KasirMain.init();
  }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirMain;
}
