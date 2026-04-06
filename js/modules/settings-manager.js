/**
 * Settings Manager Module
 * Fungsi untuk mengelola pengaturan aplikasi
 */

const SettingsManager = {
  settings: {
    storeName: 'WebPOS',
    storeAddress: '',
    storePhone: '',
    taxRate: 11,
    currency: 'IDR',
    themeColor: 'indigo',
    darkMode: false,
    autoPrint: false,
    receiptHeader: '',
    receiptFooter: 'Terima kasih telah berbelanja'
  },

  /**
   * Load settings from Firebase or localStorage
   */
  async loadSettings() {
    try {
      // Try Firebase first
      const snapshot = await database.ref('settings').once('value');
      const firebaseSettings = snapshot.val();
      
      // Merge with localStorage
      const localSettings = Utils.getStorage('webpos_settings');
      
      this.settings = {
        ...this.settings,
        ...firebaseSettings,
        ...localSettings
      };
      
      // Apply theme
      this.applyTheme();
      
      return this.settings;
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback to localStorage
      const localSettings = Utils.getStorage('webpos_settings');
      if (localSettings) {
        this.settings = { ...this.settings, ...localSettings };
      }
      return this.settings;
    }
  },

  /**
   * Save settings
   */
  async saveSettings(newSettings) {
    try {
      this.settings = { ...this.settings, ...newSettings };
      
      // Save to Firebase
      await database.ref('settings').update(newSettings);
      
      // Save to localStorage
      Utils.setStorage('webpos_settings', this.settings);
      
      // Apply theme
      this.applyTheme();
      
      Utils.showToast('Pengaturan berhasil disimpan', 'success');
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      Utils.showToast('Gagal menyimpan pengaturan', 'error');
      return false;
    }
  },

  /**
   * Apply theme settings
   */
  applyTheme() {
    // Apply theme color
    document.documentElement.setAttribute('data-theme-color', this.settings.themeColor);
    localStorage.setItem('webpos_theme_color', this.settings.themeColor);
    
    // Apply dark mode
    document.documentElement.setAttribute('data-theme', this.settings.darkMode ? 'dark' : 'light');
    localStorage.setItem('webpos_dark_mode', this.settings.darkMode);
  },

  /**
   * Set theme color
   */
  setThemeColor(color) {
    this.settings.themeColor = color;
    this.applyTheme();
    this.saveSettings({ themeColor: color });
  },

  /**
   * Toggle dark mode
   */
  toggleDarkMode() {
    this.settings.darkMode = !this.settings.darkMode;
    this.applyTheme();
    this.saveSettings({ darkMode: this.settings.darkMode });
    return this.settings.darkMode;
  },

  /**
   * Get setting value
   */
  get(key) {
    return this.settings[key];
  },

  /**
   * Set setting value
   */
  set(key, value) {
    this.settings[key] = value;
    return this.saveSettings({ [key]: value });
  },

  /**
   * Get all settings
   */
  getAll() {
    return { ...this.settings };
  },

  /**
   * Reset to defaults
   */
  async resetToDefaults() {
    this.settings = {
      storeName: 'WebPOS',
      storeAddress: '',
      storePhone: '',
      taxRate: 11,
      currency: 'IDR',
      themeColor: 'indigo',
      darkMode: false,
      autoPrint: false,
      receiptHeader: '',
      receiptFooter: 'Terima kasih telah berbelanja'
    };
    
    await this.saveSettings(this.settings);
    this.applyTheme();
    
    return this.settings;
  },

  /**
   * Export settings
   */
  exportSettings() {
    const blob = new Blob([JSON.stringify(this.settings, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'webpos_settings.json';
    link.click();
    URL.revokeObjectURL(link.href);
  },

  /**
   * Import settings
   */
  async importSettings(file) {
    try {
      const content = await file.text();
      const imported = JSON.parse(content);
      
      await this.saveSettings(imported);
      Utils.showToast('Pengaturan berhasil diimport', 'success');
      return true;
    } catch (error) {
      Utils.showToast('Gagal mengimport pengaturan', 'error');
      return false;
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsManager;
}
