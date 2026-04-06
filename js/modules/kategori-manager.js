/**
 * Kategori Manager Module
 * Fungsi untuk mengelola kategori produk
 */

const KategoriManager = {
  categories: [],

  /**
   * Load all categories from Firebase
   */
  async loadCategories() {
    try {
      Utils.showLoading('Memuat kategori...');
      
      const snapshot = await database.ref('categories').once('value');
      const data = snapshot.val() || {};
      
      this.categories = Object.entries(data).map(([id, catData]) => ({
        id,
        ...catData
      })).sort((a, b) => a.name.localeCompare(b.name));
      
      Utils.hideLoading();
      return this.categories;
    } catch (error) {
      console.error('Error loading categories:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memuat kategori', 'error');
      return [];
    }
  },

  /**
   * Add new category
   */
  async addCategory(name, description = '', icon = '') {
    try {
      if (!name || name.trim() === '') {
        Utils.showToast('Nama kategori wajib diisi', 'error');
        return null;
      }
      
      Utils.showLoading('Menyimpan...');
      
      const id = Utils.generateId('CAT');
      const categoryData = {
        id,
        name: name.trim(),
        description: description.trim(),
        icon: icon || 'fa-box',
        productCount: 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      await database.ref(`categories/${id}`).set(categoryData);
      this.categories.push(categoryData);
      this.categories.sort((a, b) => a.name.localeCompare(b.name));
      
      Utils.hideLoading();
      Utils.showToast('Kategori berhasil ditambahkan', 'success');
      return categoryData;
    } catch (error) {
      console.error('Error adding category:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menambahkan kategori', 'error');
      return null;
    }
  },

  /**
   * Update category
   */
  async updateCategory(id, data) {
    try {
      Utils.showLoading('Menyimpan...');
      
      const updateData = {
        ...data,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      await database.ref(`categories/${id}`).update(updateData);
      
      const index = this.categories.findIndex(c => c.id === id);
      if (index > -1) {
        this.categories[index] = { ...this.categories[index], ...updateData };
      }
      
      Utils.hideLoading();
      Utils.showToast('Kategori berhasil diupdate', 'success');
      return true;
    } catch (error) {
      console.error('Error updating category:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal mengupdate kategori', 'error');
      return false;
    }
  },

  /**
   * Delete category
   */
  async deleteCategory(id) {
    try {
      // Check if category has products
      const productsSnap = await database.ref('products').orderByChild('categoryId').equalTo(id).once('value');
      const products = productsSnap.val() || {};
      
      if (Object.keys(products).length > 0) {
        Utils.showToast('Kategori masih memiliki produk. Pindahkan produk terlebih dahulu.', 'warning');
        return false;
      }
      
      Utils.showLoading('Menghapus...');
      
      await database.ref(`categories/${id}`).remove();
      
      const index = this.categories.findIndex(c => c.id === id);
      if (index > -1) {
        this.categories.splice(index, 1);
      }
      
      Utils.hideLoading();
      Utils.showToast('Kategori berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error deleting category:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus kategori', 'error');
      return false;
    }
  },

  /**
   * Get category by ID
   */
  getCategory(id) {
    return this.categories.find(c => c.id === id);
  },

  /**
   * Get category name by ID
   */
  getCategoryName(id) {
    const cat = this.getCategory(id);
    return cat ? cat.name : 'Tidak ada kategori';
  },

  /**
   * Update product count for category
   */
  async updateProductCount(categoryId) {
    try {
      const productsSnap = await database.ref('products').orderByChild('categoryId').equalTo(categoryId).once('value');
      const count = Object.keys(productsSnap.val() || {}).length;
      
      await database.ref(`categories/${categoryId}`).update({ productCount: count });
      
      const category = this.getCategory(categoryId);
      if (category) {
        category.productCount = count;
      }
    } catch (error) {
      console.error('Error updating product count:', error);
    }
  },

  /**
   * Get categories with product counts
   */
  getCategoriesWithCounts() {
    return this.categories.map(cat => ({
      ...cat,
      displayName: `${cat.name} (${cat.productCount || 0})`
    }));
  },

  /**
   * Render category options for select
   */
  renderSelectOptions(selectedId = '') {
    return this.categories.map(cat => 
      `<option value="${cat.id}" ${cat.id === selectedId ? 'selected' : ''}>${cat.name}</option>`
    ).join('');
  },

  /**
   * Export to CSV
   */
  exportToCSV() {
    if (this.categories.length === 0) {
      Utils.showToast('Tidak ada data untuk diexport', 'warning');
      return;
    }
    
    const headers = ['ID', 'Nama', 'Deskripsi', 'Jumlah Produk'];
    const data = this.categories.map(c => [
      c.id,
      c.name,
      c.description || '',
      c.productCount || 0
    ]);
    
    const csv = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `kategori_${Utils.getTodayString()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    
    Utils.showToast('Data berhasil diexport', 'success');
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KategoriManager;
}
