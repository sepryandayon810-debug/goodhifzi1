/**
 * Backup Manager Module
 * Fungsi untuk backup dan restore data
 */

const BackupManager = {
  /**
   * Export all data to JSON
   */
  async exportAllData() {
    try {
      Utils.showLoading('Mengekspor data...');
      
      const [products, categories, customers, users] = await Promise.all([
        database.ref('products').once('value'),
        database.ref('categories').once('value'),
        database.ref('customers').once('value'),
        database.ref('users').once('value')
      ]);
      
      const backupData = {
        version: '1.0',
        timestamp: Date.now(),
        date: new Date().toISOString(),
        products: products.val() || {},
        categories: categories.val() || {},
        customers: customers.val() || {},
        users: users.val() || {}
      };
      
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `backup_webpos_${Utils.getTodayString()}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
      
      Utils.hideLoading();
      Utils.showToast('Backup berhasil diunduh', 'success');
      return true;
    } catch (error) {
      console.error('Error exporting data:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal mengekspor data', 'error');
      return false;
    }
  },

  /**
   * Import data from JSON
   */
  async importFromJSON(file) {
    try {
      const content = await file.text();
      const data = JSON.parse(content);
      
      if (!data.version) {
        throw new Error('File backup tidak valid');
      }
      
      return data;
    } catch (error) {
      throw new Error('Gagal membaca file: ' + error.message);
    }
  },

  /**
   * Restore data to Firebase
   */
  async restoreData(data, options = {}) {
    try {
      Utils.showLoading('Merestore data...');
      
      const results = { success: 0, failed: 0 };
      
      if (options.products && data.products) {
        await database.ref('products').set(data.products);
        results.success++;
      }
      
      if (options.categories && data.categories) {
        await database.ref('categories').set(data.categories);
        results.success++;
      }
      
      if (options.customers && data.customers) {
        await database.ref('customers').set(data.customers);
        results.success++;
      }
      
      Utils.hideLoading();
      Utils.showToast('Restore berhasil', 'success');
      return results;
    } catch (error) {
      console.error('Error restoring data:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal merestore data', 'error');
      return { success: 0, failed: 1 };
    }
  },

  /**
   * Sync to Google Drive (placeholder)
   */
  async syncToGoogleDrive() {
    Utils.showToast('Fitur sinkronisasi Google Drive akan segera tersedia', 'info');
  },

  /**
   * Sync to Dropbox (placeholder)
   */
  async syncToDropbox() {
    Utils.showToast('Fitur sinkronisasi Dropbox akan segera tersedia', 'info');
  },

  /**
   * Auto backup to Firebase
   */
  async autoBackupToFirebase() {
    try {
      const backupData = {
        timestamp: Date.now(),
        date: new Date().toISOString()
      };
      
      // Backup key data
      const [products, categories] = await Promise.all([
        database.ref('products').once('value'),
        database.ref('categories').once('value')
      ]);
      
      backupData.products = products.val();
      backupData.categories = categories.val();
      
      const backupId = `backup_${Date.now()}`;
      await database.ref(`backups/${backupId}`).set(backupData);
      
      // Keep only last 10 backups
      const backupsSnap = await database.ref('backups').orderByKey().once('value');
      const backups = backupsSnap.val() || {};
      const backupIds = Object.keys(backups).sort().reverse();
      
      if (backupIds.length > 10) {
        const toDelete = backupIds.slice(10);
        for (const id of toDelete) {
          await database.ref(`backups/${id}`).remove();
        }
      }
      
      return true;
    } catch (error) {
      console.error('Auto backup error:', error);
      return false;
    }
  },

  /**
   * Get backup list from Firebase
   */
  async getBackupList() {
    try {
      const snapshot = await database.ref('backups').orderByKey().once('value');
      const backups = snapshot.val() || {};
      
      return Object.entries(backups).map(([id, data]) => ({
        id,
        ...data
      })).sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error getting backups:', error);
      return [];
    }
  },

  /**
   * Show import modal
   */
  showImportModal() {
    const modalContent = `
      <div style="padding: 1rem;">
        <div class="form-group">
          <label class="form-label">Pilih File Backup (JSON)</label>
          <div class="image-upload" id="backupFileUpload" style="padding: 2rem;">
            <i class="fas fa-file-upload" style="font-size: 2rem; color: var(--text-muted);"></i>
            <p>Klik atau drag file ke sini</p>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Format: JSON</p>
            <input type="file" id="backupFileInput" accept=".json" style="display: none;">
          </div>
        </div>
        
        <div id="backupPreview" style="display: none; margin-top: 1rem;">
          <h4 style="margin-bottom: 0.5rem;">Preview Backup</h4>
          <div id="backupStats" style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); margin-bottom: 1rem;"></div>
          
          <div class="form-group">
            <label class="form-label">Pilih Data yang akan Direstore</label>
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="restoreProducts" checked> Produk
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="restoreCategories" checked> Kategori
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem;">
                <input type="checkbox" id="restoreCustomers" checked> Pelanggan
              </label>
            </div>
          </div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button class="btn btn-secondary" onclick="Utils.closeModal()">Batal</button>
          <button class="btn btn-primary" id="btnProcessRestore" disabled>
            <i class="fas fa-upload"></i> Restore Data
          </button>
        </div>
      </div>
    `;
    
    Utils.showModal('Restore Data', modalContent);
    
    const fileUpload = document.getElementById('backupFileUpload');
    const fileInput = document.getElementById('backupFileInput');
    const btnProcess = document.getElementById('btnProcessRestore');
    
    let backupData = null;
    
    fileUpload.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
      if (e.target.files.length) {
        try {
          backupData = await this.importFromJSON(e.target.files[0]);
          
          document.getElementById('backupPreview').style.display = 'block';
          document.getElementById('backupStats').innerHTML = `
            <div><strong>Versi:</strong> ${backupData.version || 'Unknown'}</div>
            <div><strong>Tanggal:</strong> ${backupData.date || 'Unknown'}</div>
            <div><strong>Produk:</strong> ${Object.keys(backupData.products || {}).length} item</div>
            <div><strong>Kategori:</strong> ${Object.keys(backupData.categories || {}).length} item</div>
            <div><strong>Pelanggan:</strong> ${Object.keys(backupData.customers || {}).length} item</div>
          `;
          
          btnProcess.disabled = false;
        } catch (error) {
          Utils.showToast(error.message, 'error');
        }
      }
    });
    
    btnProcess.addEventListener('click', async () => {
      if (!backupData) return;
      
      const options = {
        products: document.getElementById('restoreProducts').checked,
        categories: document.getElementById('restoreCategories').checked,
        customers: document.getElementById('restoreCustomers').checked
      };
      
      Utils.confirm('Yakin ingin merestore data? Data yang ada akan ditimpa.', async () => {
        await this.restoreData(backupData, options);
        Utils.closeModal();
      });
    });
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = BackupManager;
}
