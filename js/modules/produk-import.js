/**
 * Produk Import Module
 * Fungsi untuk import produk dari CSV/Excel
 */

const ProdukImport = {
  /**
   * Parse CSV file
   */
  parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const headers = this.parseCSVLine(lines[0]);
    
    const results = [];
    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);
      const row = {};
      headers.forEach((header, index) => {
        row[header.trim()] = values[index] ? values[index].trim() : '';
      });
      results.push(row);
    }
    
    return results;
  },

  /**
   * Parse single CSV line (handle quoted values)
   */
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  },

  /**
   * Parse Excel file (simple XLSX parser)
   */
  async parseExcel(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const jsonData = XLSX.utils.sheet_to_json(firstSheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  },

  /**
   * Validate product data
   */
  validateProduct(row, index) {
    const errors = [];
    
    // Check required fields
    const nama = row.Nama || row.nama || row.Name || row.name || row['Nama Produk'];
    const hargaModal = row['Harga Modal'] || row.hargaModal || row.costPrice || row['Harga Beli'];
    const hargaJual = row['Harga Jual'] || row.hargaJual || row.sellingPrice || row['Harga Jual'];
    
    if (!nama || nama.trim() === '') {
      errors.push(`Baris ${index + 1}: Nama produk wajib diisi`);
    }
    
    if (!hargaModal || isNaN(parseFloat(hargaModal))) {
      errors.push(`Baris ${index + 1}: Harga modal tidak valid`);
    }
    
    if (!hargaJual || isNaN(parseFloat(hargaJual))) {
      errors.push(`Baris ${index + 1}: Harga jual tidak valid`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      data: {
        name: nama ? nama.trim() : '',
        costPrice: parseInt(hargaModal) || 0,
        sellingPrice: parseInt(hargaJual) || 0,
        code: row.Kode || row.kode || row.Code || row.code || '',
        categoryId: row.Kategori || row.kategori || row.Category || row.category || '',
        stock: parseInt(row.Stok || row.stok || row.Stock || row.stock) || 0,
        unit: row.Satuan || row.satuan || row.Unit || row.unit || 'pcs',
        description: row.Deskripsi || row.deskripsi || row.Description || row.description || '',
        minStock: parseInt(row['Stok Minimum'] || row.minStock || row['Min Stock']) || 5,
        status: (row.Status || row.status || 'active').toLowerCase()
      }
    };
  },

  /**
   * Process import file
   */
  async processFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    let data = [];
    
    if (extension === 'csv') {
      const content = await file.text();
      data = this.parseCSV(content);
    } else if (extension === 'xlsx' || extension === 'xls') {
      // Check if SheetJS is loaded
      if (typeof XLSX === 'undefined') {
        throw new Error('Library XLSX tidak tersedia. Silakan muat SheetJS library.');
      }
      data = await this.parseExcel(file);
    } else {
      throw new Error('Format file tidak didukung. Gunakan CSV atau Excel (.xlsx)');
    }
    
    return data;
  },

  /**
   * Preview import data
   */
  async preview(file) {
    try {
      const data = await this.processFile(file);
      const validated = data.map((row, index) => this.validateProduct(row, index));
      
      const valid = validated.filter(v => v.valid);
      const invalid = validated.filter(v => !v.valid);
      
      return {
        total: data.length,
        valid: valid.length,
        invalid: invalid.length,
        errors: invalid.flatMap(v => v.errors),
        data: valid.map(v => v.data)
      };
    } catch (error) {
      throw error;
    }
  },

  /**
   * Import products to Firebase
   */
  async import(products, onProgress = null) {
    const results = {
      success: 0,
      failed: 0,
      errors: []
    };
    
    for (let i = 0; i < products.length; i++) {
      try {
        const product = products[i];
        const productId = Utils.generateId('PRD');
        
        const productData = {
          id: productId,
          name: product.name,
          code: product.code || productId,
          categoryId: product.categoryId || '',
          unit: product.unit || 'pcs',
          costPrice: product.costPrice,
          sellingPrice: product.sellingPrice,
          stock: product.stock || 0,
          minStock: product.minStock || 5,
          description: product.description || '',
          status: product.status || 'active',
          createdAt: firebase.database.ServerValue.TIMESTAMP,
          updatedAt: firebase.database.ServerValue.TIMESTAMP,
          soldCount: 0
        };
        
        await database.ref(`products/${productId}`).set(productData);
        results.success++;
        
        if (onProgress) {
          onProgress(i + 1, products.length);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`Baris ${i + 1}: ${error.message}`);
      }
    }
    
    return results;
  },

  /**
   * Generate template CSV
   */
  generateTemplate() {
    const headers = ['Nama', 'Kode', 'Kategori', 'Harga Modal', 'Harga Jual', 'Stok', 'Satuan', 'Stok Minimum', 'Deskripsi', 'Status'];
    const example = [
      'Laptop ASUS VivoBook',
      'LP001',
      'Elektronik',
      '5000000',
      '6500000',
      '10',
      'pcs',
      '2',
      'Laptop gaming dengan spesifikasi tinggi',
      'active'
    ];
    
    return [headers.join(','), example.join(',')].join('\n');
  },

  /**
   * Download template
   */
  downloadTemplate() {
    const csv = this.generateTemplate();
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_import_produk.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  },

  /**
   * Show import modal
   */
  showImportModal() {
    const modalContent = `
      <div style="padding: 1rem;">
        <div class="form-group">
          <label class="form-label">Pilih File (CSV atau Excel)</label>
          <div class="image-upload" id="importFileUpload" style="padding: 2rem;">
            <i class="fas fa-file-upload" style="font-size: 2rem; color: var(--text-muted);"></i>
            <p>Klik atau drag file ke sini</p>
            <p style="font-size: 0.75rem; color: var(--text-muted);">Format: CSV, XLSX (Max 5MB)</p>
            <input type="file" id="importFileInput" accept=".csv,.xlsx,.xls" style="display: none;">
          </div>
        </div>
        
        <div id="importPreview" style="display: none; margin-top: 1rem;">
          <h4 style="margin-bottom: 0.5rem;">Preview Import</h4>
          <div id="importStats" style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-lg); margin-bottom: 1rem;"></div>
          <div id="importErrors" style="display: none; padding: 1rem; background: rgba(239, 68, 68, 0.1); border-radius: var(--radius-lg); color: var(--danger); margin-bottom: 1rem;"></div>
        </div>
        
        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
          <button class="btn btn-secondary" onclick="ProdukImport.downloadTemplate()">
            <i class="fas fa-download"></i> Download Template
          </button>
          <button class="btn btn-primary" id="btnProcessImport" disabled>
            <i class="fas fa-upload"></i> Import Produk
          </button>
        </div>
      </div>
    `;
    
    Utils.showModal('Import Produk', modalContent);
    
    // Setup file upload
    const fileUpload = document.getElementById('importFileUpload');
    const fileInput = document.getElementById('importFileInput');
    const btnProcess = document.getElementById('btnProcessImport');
    
    let previewData = null;
    
    fileUpload.addEventListener('click', () => fileInput.click());
    
    fileUpload.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileUpload.style.borderColor = 'var(--primary)';
    });
    
    fileUpload.addEventListener('dragleave', () => {
      fileUpload.style.borderColor = 'var(--border-color)';
    });
    
    fileUpload.addEventListener('drop', (e) => {
      e.preventDefault();
      fileUpload.style.borderColor = 'var(--border-color)';
      if (e.dataTransfer.files.length) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
    
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        handleFile(e.target.files[0]);
      }
    });
    
    const handleFile = async (file) => {
      try {
        Utils.showLoading('Membaca file...');
        
        previewData = await this.preview(file);
        
        document.getElementById('importPreview').style.display = 'block';
        document.getElementById('importStats').innerHTML = `
          <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <div><strong>Total:</strong> ${previewData.total} produk</div>
            <div style="color: var(--success);"><strong>Valid:</strong> ${previewData.valid} produk</div>
            ${previewData.invalid > 0 ? `<div style="color: var(--danger);"><strong>Tidak Valid:</strong> ${previewData.invalid} produk</div>` : ''}
          </div>
        `;
        
        if (previewData.errors.length > 0) {
          const errorsDiv = document.getElementById('importErrors');
          errorsDiv.style.display = 'block';
          errorsDiv.innerHTML = `
            <strong>Error:</strong>
            <ul style="margin-top: 0.5rem; padding-left: 1.5rem;">
              ${previewData.errors.slice(0, 5).map(e => `<li>${e}</li>`).join('')}
              ${previewData.errors.length > 5 ? `<li>... dan ${previewData.errors.length - 5} error lainnya</li>` : ''}
            </ul>
          `;
        }
        
        btnProcess.disabled = previewData.valid === 0;
        Utils.hideLoading();
      } catch (error) {
        Utils.hideLoading();
        Utils.showToast(error.message, 'error');
      }
    };
    
    btnProcess.addEventListener('click', async () => {
      if (!previewData || previewData.valid === 0) return;
      
      try {
        Utils.showLoading('Mengimport produk...');
        
        const results = await this.import(previewData.data, (current, total) => {
          Utils.showLoading(`Mengimport produk... ${current}/${total}`);
        });
        
        Utils.closeModal();
        Utils.hideLoading();
        
        if (results.failed > 0) {
          Utils.showToast(`${results.success} produk berhasil, ${results.failed} gagal`, 'warning');
        } else {
          Utils.showToast(`${results.success} produk berhasil diimport`, 'success');
        }
        
        // Reload products if function exists
        if (typeof loadProducts === 'function') {
          loadProducts();
        }
        
      } catch (error) {
        Utils.hideLoading();
        Utils.showToast('Gagal mengimport produk', 'error');
      }
    });
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProdukImport;
}
