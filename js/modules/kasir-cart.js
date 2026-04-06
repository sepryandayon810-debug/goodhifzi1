/**
 * Kasir Cart Module
 * Fungsi untuk mengelola keranjang belanja
 */

const KasirCart = {
  cart: [],

  /**
   * Add product to cart
   */
  addToCart(productId) {
    const product = KasirProducts ? KasirProducts.getProduct(productId) : null;
    if (!product) {
      Utils.showToast('Produk tidak ditemukan', 'error');
      return;
    }
    
    if (product.stock <= 0) {
      Utils.showToast('Produk habis', 'warning');
      return;
    }
    
    const existingItem = this.cart.find(item => item.productId === productId);
    
    if (existingItem) {
      if (existingItem.quantity + 1 > product.stock) {
        Utils.showToast('Stok tidak mencukupi', 'warning');
        return;
      }
      existingItem.quantity++;
      existingItem.total = existingItem.quantity * existingItem.price;
    } else {
      this.cart.push({
        productId: product.id,
        name: product.name,
        price: product.sellingPrice,
        cost: product.costPrice || 0,
        quantity: 1,
        total: product.sellingPrice,
        image: product.image || null
      });
    }
    
    this.saveCart();
    this.renderCart();
    KasirSummary.updateSummary();
    Utils.showToast(`${product.name} ditambahkan ke keranjang`, 'success');
  },

  /**
   * Update cart item quantity
   */
  updateQty(productId, delta) {
    const item = this.cart.find(i => i.productId === productId);
    if (!item) return;
    
    const product = KasirProducts ? KasirProducts.getProduct(productId) : null;
    const newQty = item.quantity + delta;
    
    if (newQty <= 0) {
      this.removeFromCart(productId);
      return;
    }
    
    if (product && newQty > product.stock) {
      Utils.showToast('Stok tidak mencukupi', 'warning');
      return;
    }
    
    item.quantity = newQty;
    item.total = item.quantity * item.price;
    
    this.saveCart();
    this.renderCart();
    KasirSummary.updateSummary();
  },

  /**
   * Remove item from cart
   */
  removeFromCart(productId) {
    this.cart = this.cart.filter(item => item.productId !== productId);
    this.saveCart();
    this.renderCart();
    KasirSummary.updateSummary();
  },

  /**
   * Clear cart
   */
  clearCart() {
    Utils.confirm('Yakin ingin mengosongkan keranjang?', () => {
      this.cart = [];
      this.saveCart();
      this.renderCart();
      KasirSummary.updateSummary();
      Utils.showToast('Keranjang dikosongkan', 'info');
    });
  },

  /**
   * Render cart items
   */
  renderCart() {
    const container = document.getElementById('cartItems');
    const countBadge = document.getElementById('cartCount');
    const cartBadge = document.getElementById('cartBadge');
    
    if (!container) return;
    
    const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);
    
    if (countBadge) countBadge.textContent = totalItems;
    if (cartBadge) cartBadge.textContent = totalItems;
    
    if (this.cart.length === 0) {
      container.innerHTML = `
        <div class="cart-empty">
          <i class="fas fa-shopping-basket"></i>
          <p>Keranjang masih kosong</p>
          <p style="font-size: 0.75rem; margin-top: 0.5rem;">Klik produk untuk menambahkan</p>
        </div>
      `;
      return;
    }
    
    container.innerHTML = this.cart.map(item => `
      <div class="cart-item">
        <div class="cart-item-image">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-md);">` : '<i class="fas fa-box"></i>'}
        </div>
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">${Utils.formatRupiah(item.price)}</div>
          <div class="cart-item-actions">
            <button class="qty-btn" onclick="KasirCart.updateQty('${item.productId}', -1)">-</button>
            <input type="text" class="qty-input" value="${item.quantity}" readonly>
            <button class="qty-btn" onclick="KasirCart.updateQty('${item.productId}', 1)">+</button>
          </div>
        </div>
        <div class="cart-item-total">${Utils.formatRupiah(item.total)}</div>
        <button class="cart-item-remove" onclick="KasirCart.removeFromCart('${item.productId}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `).join('');
  },

  /**
   * Save cart to storage
   */
  saveCart() {
    Utils.setStorage('kasir_cart', this.cart);
  },

  /**
   * Load cart from storage
   */
  loadCart() {
    const savedCart = Utils.getStorage('kasir_cart');
    if (savedCart) {
      this.cart = savedCart;
    }
    this.renderCart();
  },

  /**
   * Get cart items
   */
  getCart() {
    return this.cart;
  },

  /**
   * Get cart total items count
   */
  getTotalItems() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  },

  /**
   * Calculate subtotal
   */
  getSubtotal() {
    return this.cart.reduce((sum, item) => sum + item.total, 0);
  },

  /**
   * Check if cart is empty
   */
  isEmpty() {
    return this.cart.length === 0;
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasirCart;
}
