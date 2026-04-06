/**
 * Kasir Categories Module
 * Fungsi untuk memuat dan mengelola kategori produk
 */

const KasirCategories = {
  categories: [],
  currentCategory: 'all',

  /**
   * Load categories from Firebase
   */
  async loadCategories() {
    try {
      const snapshot = await database.ref('categories').once('value');
      const cats = snapshot.val() || {};
      
      this.categories = Object.entries(cats).map(([id, data]) => ({ id, ...data }));
      
      this.renderCategoryPills();
      return this.categories;
    } catch (error) {
      console.error('Error loading categories:', error);
      Utils.showToast('Gagal memuat kategori', 'error');
      return [];
    }
  },

  /**
   * Render category pills
   */
  renderCategoryPills() {
    const container = document.getElementById('categoryPills');
    if (!container) return;
    
    const pills = this.categories.map(cat => 
      `<button class="category-pill" data-category="${cat.id}">${cat.name}</button>`
    ).join('');
    
    container.innerHTML = `<button class="category-pill active" data-category="all">Semua</button>${pills}`;
    
    // Add click handlers
    container.querySelectorAll('.category-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentCategory = pill.dataset.category;
        
        // Trigger event for products module
        window.dispatchEvent(new CustomEvent('categoryChanged', { 
          detail: { category: this.currentCategory } 
        }));
      });
    });
  },

  /**
   * Get current category
   */
  getCurrentCategory() {
    return this.currentCategory;
  },

  /**
   * Set category
   */
  setCategory(categoryId) {
    this.currentCategory = categoryId;
    const container = document.getElementById('categoryPills');
    if (container) {
      container.querySelectorAll('.category-pill').forEach(p => {
        p.classList.toggle('active', p.dataset.category === categoryId);
      });
    }
  },

  /**
   * Get category name by ID
   */
  getCategoryName(categoryId) {
    const cat = this.categories.find(c => c.id === categoryId);
    return cat ? cat.name : 'Semua';
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirCategories;
}
