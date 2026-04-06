/**
 * Kasir UI Module
 * Fungsi untuk mengelola UI elements
 */

const KasirUI = {
  sidebar: null,
  cartSection: null,

  /**
   * Initialize UI
   */
  init() {
    this.sidebar = document.getElementById('sidebar');
    this.cartSection = document.getElementById('cartSection');
    
    this.setupSidebar();
    this.setupCartToggle();
    this.setupThemeToggle();
    this.setupViewToggle();
  },

  /**
   * Setup sidebar
   */
  setupSidebar() {
    const menuToggle = document.getElementById('menuToggle');
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        this.sidebar.classList.toggle('collapsed');
      });
    }
    
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener('click', () => {
        this.sidebar.classList.toggle('mobile-open');
      });
    }

    // Close sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 1024) {
        if (this.sidebar && !this.sidebar.contains(e.target) && 
            mobileMenuToggle && !mobileMenuToggle.contains(e.target)) {
          this.sidebar.classList.remove('mobile-open');
        }
      }
    });

    // Setup dropdown menus
    document.querySelectorAll('[data-dropdown]').forEach(dropdown => {
      const toggle = dropdown.querySelector('.nav-dropdown-toggle');
      if (toggle) {
        toggle.addEventListener('click', (e) => {
          e.preventDefault();
          dropdown.classList.toggle('open');
        });
      }
    });
  },

  /**
   * Setup cart toggle for mobile
   */
  setupCartToggle() {
    const cartToggle = document.getElementById('cartToggle');
    
    if (cartToggle && this.cartSection) {
      cartToggle.addEventListener('click', () => {
        this.cartSection.classList.toggle('open');
      });
    }
  },

  /**
   * Setup theme toggle
   */
  setupThemeToggle() {
    const btnTheme = document.getElementById('btnTheme');
    
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('webpos_dark_mode', !isDark);
        
        // Update icon
        const icon = btnTheme.querySelector('i');
        if (icon) {
          icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        }
      });
    }
  },

  /**
   * Setup view toggle (grid/list)
   */
  setupViewToggle() {
    const viewButtons = document.querySelectorAll('.view-btn');
    
    viewButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        viewButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const viewMode = btn.dataset.view;
        this.setViewMode(viewMode);
      });
    });
  },

  /**
   * Set view mode
   */
  setViewMode(mode) {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    
    if (mode === 'list') {
      container.style.gridTemplateColumns = '1fr';
    } else {
      container.style.gridTemplateColumns = '';
    }
  },

  /**
   * Show loading
   */
  showLoading(message = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.querySelector('p').textContent = message;
      overlay.classList.add('active');
    }
  },

  /**
   * Hide loading
   */
  hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  },

  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebar() {
    if (this.sidebar) {
      this.sidebar.classList.toggle('collapsed');
    }
  },

  /**
   * Open cart (mobile)
   */
  openCart() {
    if (this.cartSection) {
      this.cartSection.classList.add('open');
    }
  },

  /**
   * Close cart (mobile)
   */
  closeCart() {
    if (this.cartSection) {
      this.cartSection.classList.remove('open');
    }
  },

  /**
   * Update cart badge
   */
  updateCartBadge(count) {
    const badges = document.querySelectorAll('#cartCount, #cartBadge');
    badges.forEach(badge => {
      if (badge) badge.textContent = count;
    });
  },

  /**
   * Scroll to top
   */
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  /**
   * Show skeleton loading
   */
  showSkeleton(count = 8) {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    
    container.innerHTML = Array(count).fill('
      <div class="product-card skeleton"></div>
    ').join('');
  },

  /**
   * Set active menu
   */
  setActiveMenu(menuId) {
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.dataset.menu === menuId) {
        link.classList.add('active');
      }
    });
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirUI;
}
