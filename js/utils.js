/**
 * WebPOS Utilities - Enhanced Version
 * With Theme System, Dark Mode Sync, and Global State
 */

const Utils = {
  // Theme Management
  Theme: {
    // Available themes
    colors: ['indigo', 'blue', 'green', 'orange', 'purple', 'red', 'pink', 'teal'],
    
    // Initialize theme from localStorage
    init: () => {
      const savedTheme = localStorage.getItem('webpos_theme_color') || 'indigo';
      const savedDarkMode = localStorage.getItem('webpos_dark_mode') === 'true';
      
      Utils.Theme.setColor(savedTheme);
      Utils.Theme.setDarkMode(savedDarkMode);
      
      // Listen for storage changes (for multi-tab sync)
      window.addEventListener('storage', (e) => {
        if (e.key === 'webpos_dark_mode') {
          Utils.Theme.setDarkMode(e.newValue === 'true', false);
        }
        if (e.key === 'webpos_theme_color') {
          Utils.Theme.setColor(e.newValue, false);
        }
      });
    },
    
    // Set theme color
    setColor: (color, save = true) => {
      if (!Utils.Theme.colors.includes(color)) color = 'indigo';
      
      document.documentElement.setAttribute('data-theme-color', color);
      
      if (save) {
        localStorage.setItem('webpos_theme_color', color);
      }
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('themechange', { 
        detail: { color, darkMode: Utils.Theme.isDarkMode() } 
      }));
    },
    
    // Get current theme color
    getColor: () => {
      return document.documentElement.getAttribute('data-theme-color') || 'indigo';
    },
    
    // Toggle dark mode
    toggleDarkMode: () => {
      const isDark = !Utils.Theme.isDarkMode();
      Utils.Theme.setDarkMode(isDark);
      return isDark;
    },
    
    // Set dark mode
    setDarkMode: (isDark, save = true) => {
      document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
      
      if (save) {
        localStorage.setItem('webpos_dark_mode', isDark);
      }
      
      // Update theme toggle icon if exists
      const themeBtn = document.getElementById('btnTheme');
      if (themeBtn) {
        themeBtn.innerHTML = isDark ? 
          '<i class="fas fa-sun"></i>' : 
          '<i class="fas fa-moon"></i>';
      }
      
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('themechange', { 
        detail: { color: Utils.Theme.getColor(), darkMode: isDark } 
      }));
    },
    
    // Check if dark mode is active
    isDarkMode: () => {
      return document.documentElement.getAttribute('data-theme') === 'dark';
    },
    
    // Get all available themes with labels
    getThemes: () => [
      { id: 'indigo', name: 'Indigo', class: 'theme-indigo' },
      { id: 'blue', name: 'Biru', class: 'theme-blue' },
      { id: 'green', name: 'Hijau', class: 'theme-green' },
      { id: 'orange', name: 'Oranye', class: 'theme-orange' },
      { id: 'purple', name: 'Ungu', class: 'theme-purple' },
      { id: 'red', name: 'Merah', class: 'theme-red' },
      { id: 'pink', name: 'Pink', class: 'theme-pink' },
      { id: 'teal', name: 'Teal', class: 'theme-teal' }
    ]
  },

  // Format currency to Rupiah
  formatRupiah: (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },

  // Format number with thousand separator
  formatNumber: (num) => {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
  },

  // Format number input (for currency inputs)
  formatNumberInput: (value) => {
    if (!value) return '';
    // Remove non-numeric characters
    const numeric = value.replace(/[^0-9]/g, '');
    // Format with thousand separator
    return Utils.formatNumber(parseInt(numeric) || 0);
  },

  // Parse formatted number back to integer
  parseNumber: (formatted) => {
    if (!formatted) return 0;
    return parseInt(formatted.replace(/[^0-9]/g, '')) || 0;
  },

  // Format date to Indonesian format
  formatDate: (date, options = {}) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    
    const defaultOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      ...options
    };
    return d.toLocaleDateString('id-ID', defaultOptions);
  },

  // Format datetime
  formatDateTime: (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Format time only
  formatTime: (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // Generate unique ID
  generateId: (prefix = '') => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}${timestamp}${random}`.toUpperCase();
  },

  // Generate transaction ID
  generateTransactionId: () => {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `TRX${dateStr}${random}`;
  },

  // Debounce function
  debounce: (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  // Throttle function
  throttle: (func, limit) => {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Get current date string (YYYY-MM-DD)
  getTodayString: () => {
    return new Date().toISOString().split('T')[0];
  },

  // Get current datetime
  getNow: () => {
    return new Date().toISOString();
  },

  // Get device info
  getDeviceInfo: () => {
    const ua = navigator.userAgent;
    return {
      isMobile: /Mobile|Android|iPhone|iPad|iPod/.test(ua),
      isAndroid: /Android/.test(ua),
      isIOS: /iPhone|iPad|iPod/.test(ua),
      isTablet: /iPad|Tablet/.test(ua),
      isDesktop: !/Mobile|Android|iPhone|iPad|iPod/.test(ua)
    };
  },

  // Copy to clipboard
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      Utils.showToast('Berhasil disalin ke clipboard', 'success');
      return true;
    } catch (err) {
      Utils.showToast('Gagal menyalin', 'error');
      return false;
    }
  },

  // Download file
  downloadFile: (content, filename, type = 'text/plain') => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Show toast notification
  showToast: (message, type = 'info', duration = 3000) => {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: 'check-circle',
      error: 'times-circle',
      warning: 'exclamation-triangle',
      info: 'info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="fas fa-${icons[type]}"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  // Show loading overlay
  showLoading: (message = 'Loading...') => {
    let overlay = document.getElementById('loadingOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'loadingOverlay';
      overlay.className = 'loading-overlay';
      overlay.innerHTML = `
        <div class="spinner"></div>
        <p style="margin-top: 1rem; color: var(--text-secondary);">${message}</p>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.querySelector('p').textContent = message;
    }
    overlay.classList.add('active');
  },

  // Hide loading overlay
  hideLoading: () => {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.classList.remove('active');
  },

  // Set local storage
  setStorage: (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  },

  // Get local storage
  getStorage: (key) => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item);
    } catch {
      return item;
    }
  },

  // Remove from local storage
  removeStorage: (key) => {
    localStorage.removeItem(key);
  },

  // Confirm dialog with custom modal
  confirm: (message, onConfirm, onCancel = null) => {
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-body" style="text-align: center; padding: 2rem;">
          <div style="width: 64px; height: 64px; background: rgba(239, 68, 68, 0.1); border-radius: 50%; 
                      display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem;">
            <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; color: var(--danger);"></i>
          </div>
          <h3 style="margin-bottom: 0.5rem;">Konfirmasi</h3>
          <p style="color: var(--text-secondary);">${message}</p>
        </div>
        <div class="modal-footer" style="justify-content: center; gap: 1rem;">
          <button class="btn btn-outline" id="btnCancel">Batal</button>
          <button class="btn btn-danger" id="btnConfirm">Ya, Lanjutkan</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle buttons
    modal.querySelector('#btnCancel').addEventListener('click', () => {
      modal.remove();
      if (onCancel) onCancel();
    });
    
    modal.querySelector('#btnConfirm').addEventListener('click', () => {
      modal.remove();
      if (onConfirm) onConfirm();
    });
    
    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        if (onCancel) onCancel();
      }
    });
  },

  // Prompt dialog
  prompt: (message, defaultValue = '', onConfirm, onCancel = null) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.style.zIndex = '9999';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 400px;">
        <div class="modal-body" style="padding: 1.5rem;">
          <h3 style="margin-bottom: 1rem;">${message}</h3>
          <input type="text" class="form-input" id="promptInput" value="${defaultValue}" 
                 style="width: 100%;" autofocus>
        </div>
        <div class="modal-footer" style="gap: 1rem;">
          <button class="btn btn-outline" id="btnCancel">Batal</button>
          <button class="btn btn-primary" id="btnConfirm">OK</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const input = modal.querySelector('#promptInput');
    input.focus();
    input.select();
    
    modal.querySelector('#btnCancel').addEventListener('click', () => {
      modal.remove();
      if (onCancel) onCancel();
    });
    
    modal.querySelector('#btnConfirm').addEventListener('click', () => {
      const value = input.value;
      modal.remove();
      if (onConfirm) onConfirm(value);
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        modal.querySelector('#btnConfirm').click();
      }
    });
  },

  // Calculate profit
  calculateProfit: (sellingPrice, costPrice, quantity = 1) => {
    return (sellingPrice - costPrice) * quantity;
  },

  // Calculate profit percentage
  calculateProfitPercent: (sellingPrice, costPrice) => {
    if (costPrice === 0) return 0;
    return ((sellingPrice - costPrice) / costPrice) * 100;
  },

  // Group array by key
  groupBy: (array, key) => {
    return array.reduce((result, item) => {
      const group = item[key];
      result[group] = result[group] || [];
      result[group].push(item);
      return result;
    }, {});
  },

  // Sort array by key
  sortBy: (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (order === 'desc') {
        return bVal > aVal ? 1 : -1;
      }
      return aVal > bVal ? 1 : -1;
    });
  },

  // Filter array by search term
  filterBy: (array, searchTerm, keys) => {
    const term = searchTerm.toLowerCase();
    return array.filter(item => {
      return keys.some(key => {
        const value = item[key];
        if (value === null || value === undefined) return false;
        return String(value).toLowerCase().includes(term);
      });
    });
  },

  // Paginate array
  paginate: (array, page, perPage) => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return {
      data: array.slice(start, end),
      total: array.length,
      pages: Math.ceil(array.length / perPage),
      currentPage: page,
      perPage
    };
  },

  // Validate email
  isValidEmail: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  // Validate phone number
  isValidPhone: (phone) => {
    const re = /^[0-9]{10,15}$/;
    return re.test(phone.replace(/[^0-9]/g, ''));
  },

  // Sanitize string
  sanitize: (str) => {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Capitalize first letter
  capitalize: (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  },

  // Format username (lowercase, no spaces)
  formatUsername: (username) => {
    if (!username) return '';
    return username.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9_]/g, '');
  }
};

// Auto-update store name - Panggil SEKARANG juga, tidak tunggu DOMContentLoaded
function updateStoreDisplay() {
  const storeName = localStorage.getItem('webpos_store_name');
  const storeAddress = localStorage.getItem('webpos_store_address');
  const storePhone = localStorage.getItem('webpos_store_phone');
  
  console.log('Updating store display:', { storeName, storeAddress, storePhone }); // Debug
  
  // Update logo nama toko - coba cari dengan selector berbeda
  const logoText = document.querySelector('.logo-text');
  if (logoText && storeName) {
    logoText.textContent = storeName;
    console.log('Logo updated to:', storeName);
  }
  
  // Update title
  if (storeName && document.title.includes('WebPOS')) {
    document.title = document.title.replace('WebPOS', storeName);
  }
  
  // Update alamat & telepon di header
  const addressEl = document.getElementById('headerStoreAddress');
  const phoneEl = document.getElementById('headerStorePhone');
  if (addressEl) addressEl.textContent = storeAddress || '-';
  if (phoneEl) phoneEl.textContent = storePhone || '-';
  
  // Update di sidebar
  const sidebarAddr = document.getElementById('sidebarStoreAddress');
  const sidebarPhone = document.getElementById('sidebarStorePhone');
  if (sidebarAddr) sidebarAddr.textContent = storeAddress || '';
  if (sidebarPhone) sidebarPhone.textContent = storePhone || '';
}

// Jalankan SEKARANG (immediate) dan juga saat DOM ready
updateStoreDisplay();

// Jalankan lagi saat DOM fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateStoreDisplay);
} else {
  // DOM sudah ready, jalankan lagi untuk memastikan
  updateStoreDisplay();
}

// Listen untuk perubahan localStorage (sync antar tab)
window.addEventListener('storage', (e) => {
  if (e.key === 'webpos_store_name' || e.key === 'webpos_store_address' || e.key === 'webpos_store_phone') {
    console.log('Storage changed:', e.key, e.newValue);
    updateStoreDisplay();
  }
});

// Update saat tab menjadi visible lagi
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    updateStoreDisplay();
  }
});

// Initialize theme
document.addEventListener('DOMContentLoaded', () => {
  Utils.Theme.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
