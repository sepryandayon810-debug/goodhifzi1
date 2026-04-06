/**
 * Kasir Products Module
 * Fungsi untuk memuat dan menampilkan produk
 */

const KasirProducts = {
  products: [],
  searchQuery: '',

  /**
   * Load products from Firebase
   */
  async loadProducts() {
    try {
      Utils.showLoading('Memuat produk...');
      
      const snapshot = await database.ref('products').once('value');
      const prods = snapshot.val() || {};
      
      this.products = Object.entries(prods)
        .map(([id, data]) => ({ id, ...data }))
        .filter(p => p.status !== 'inactive');
      
      Utils.hideLoading();
      this.renderProducts();
      return this.products;
    } catch (error) {
      console.error('Error loading products:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memuat produk', 'error');
      return [];
    }
  },

  /**
   * Render products grid
   */
  renderProducts() {
    const container = document.getElementById('productsGrid');
    if (!container) return;
    
    let filtered = this.products;
    const currentCategory = KasirCategories ? KasirCategories.getCurrentCategory() : 'all';
    
    // Filter by category
    if (currentCategory !== 'all') {
      filtered = filtered.filter(p => p.categoryId === currentCategory);
    }
    
    // Filter by search
    if (this.searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(this.searchQuery) ||
        (p.code && p.code.toLowerCase().includes(this.searchQuery))
      );
    }
    
    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--text-muted);">
          <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
          <p>Produk tidak ditemukan</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = filtered.map(product => {
      const stockClass = product.stock <= 0 ? 'empty' : product.stock <= 5 ? 'low' : '';
      const stockText = product.stock <= 0 ? 'Habis' : product.stock <= 5 ? `${product.stock} left` : product.stock;
      
      return `
        <div class="product-card" data-id="${product.id}" onclick="KasirCart.addToCart('${product.id}')">
          <div class="product-card-image">
            ${product.image ? 
              `<img src="${product.image}" alt="${product.name}">` : 
              '<i class="fas fa-box"></i>'
            }
            <span class="product-stock-badge ${stockClass}">${stockText}</span>
          </div>
          <div class="product-card-info">
            <div class="product-card-name">${product.name}</div>
            <div class="product-card-price">${Utils.formatRupiah(product.sellingPrice)}</div>
            ${product.code ? `<div class="product-card-code">${product.code}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Search products
   */
  searchProducts(query) {
    this.searchQuery = query.toLowerCase();
    this.renderProducts();
  },

  /**
   * Get product by ID
   */
  getProduct(productId) {
    return this.products.find(p => p.id === productId);
  },

  /**
   * Get all products
   */
  getAllProducts() {
    return this.products;
  },

  /**
   * Update product stock
   */
  async updateStock(productId, quantity) {
    const product = this.getProduct(productId);
    if (product) {
      product.stock = Math.max(0, (product.stock || 0) - quantity);
      product.soldCount = (product.soldCount || 0) + quantity;
      
      // Update in Firebase
      await database.ref(`products/${productId}`).update({
        stock: product.stock,
        soldCount: product.soldCount
      });
    }
  },

  /**
   * Refresh products
   */
  async refresh() {
    await this.loadProducts();
  }
};

// Listen for category changes
window.addEventListener('categoryChanged', () => {
  KasirProducts.renderProducts();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirProducts;
}
