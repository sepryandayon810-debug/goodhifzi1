/**
 * Telegram Integration Module
 * Fungsi untuk integrasi dengan Bot Telegram
 */

const TelegramIntegration = {
  botToken: '',
  chatId: '',
  enabled: false,

  /**
   * Load settings
   */
  loadSettings() {
    const settings = Utils.getStorage('telegram_settings');
    if (settings) {
      this.botToken = settings.botToken || '';
      this.chatId = settings.chatId || '';
      this.enabled = settings.enabled || false;
    }
    return { botToken: this.botToken, chatId: this.chatId, enabled: this.enabled };
  },

  /**
   * Save settings
   */
  saveSettings(settings) {
    this.botToken = settings.botToken || this.botToken;
    this.chatId = settings.chatId || this.chatId;
    this.enabled = settings.enabled !== undefined ? settings.enabled : this.enabled;
    
    Utils.setStorage('telegram_settings', {
      botToken: this.botToken,
      chatId: this.chatId,
      enabled: this.enabled
    });
  },

  /**
   * Test connection
   */
  async testConnection() {
    try {
      if (!this.botToken) {
        throw new Error('Bot token belum diatur');
      }
      
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getMe`);
      const data = await response.json();
      
      if (data.ok) {
        Utils.showToast(`Terhubung ke bot: ${data.result.first_name}`, 'success');
        return true;
      } else {
        throw new Error(data.description);
      }
    } catch (error) {
      Utils.showToast('Gagal terhubung: ' + error.message, 'error');
      return false;
    }
  },

  /**
   * Send message
   */
  async sendMessage(message) {
    try {
      if (!this.enabled || !this.botToken || !this.chatId) {
        return false;
      }
      
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message,
          parse_mode: 'HTML'
        })
      });
      
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return false;
    }
  },

  /**
   * Send transaction notification
   */
  async sendTransactionNotification(transaction) {
    const storeName = Utils.getStorage('store_name') || 'WebPOS';
    
    const items = transaction.items.map(item => 
      `• ${item.name} x${item.quantity} = ${Utils.formatRupiah(item.total)}`
    ).join('\n');
    
    const message = `
<b>${storeName}</b>
<code>================</code>
<b>Transaksi Baru</b>
<code>================</code>
No: <code>${transaction.id}</code>
Tgl: ${new Date(transaction.timestamp).toLocaleString('id-ID')}
Kasir: ${transaction.cashierName}

<b>Items:</b>
${items}

<code>================</code>
Subtotal: ${Utils.formatRupiah(transaction.subtotal)}
${transaction.discount > 0 ? `Diskon: -${Utils.formatRupiah(transaction.discount)}\n` : ''}
PPN: ${Utils.formatRupiah(transaction.tax)}
<b>TOTAL: ${Utils.formatRupiah(transaction.total)}</b>
Bayar: ${Utils.formatRupiah(transaction.paymentAmount)}
Kembali: ${Utils.formatRupiah(transaction.change)}
<code>================</code>
    `.trim();
    
    return this.sendMessage(message);
  },

  /**
   * Send daily summary
   */
  async sendDailySummary(summary) {
    const storeName = Utils.getStorage('store_name') || 'WebPOS';
    
    const message = `
<b>${storeName}</b>
<code>================</code>
<b>Ringkasan Harian</b>
<code>================</code>
Tanggal: ${summary.date}

Total Transaksi: ${summary.transactionCount}
Total Penjualan: ${Utils.formatRupiah(summary.totalSales)}
Total Kas Masuk: ${Utils.formatRupiah(summary.totalCashIn)}
Total Kas Keluar: ${Utils.formatRupiah(summary.totalCashOut)}
Saldo Akhir: ${Utils.formatRupiah(summary.endingBalance)}
<code>================</code>
    `.trim();
    
    return this.sendMessage(message);
  },

  /**
   * Send low stock alert
   */
  async sendLowStockAlert(product) {
    const storeName = Utils.getStorage('store_name') || 'WebPOS';
    
    const message = `
<b>${storeName}</b>
<code>================</code>
<b>⚠️ Stok Menipis!</b>
<code>================</code>

Produk: <b>${product.name}</b>
Stok Tersisa: ${product.stock}
Stok Minimum: ${product.minStock}

Segera restock produk ini!
<code>================</code>
    `.trim();
    
    return this.sendMessage(message);
  },

  /**
   * Get updates (for webhook)
   */
  async getUpdates(offset = 0) {
    try {
      if (!this.botToken) return [];
      
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${offset}`);
      const data = await response.json();
      
      return data.ok ? data.result : [];
    } catch (error) {
      console.error('Error getting updates:', error);
      return [];
    }
  },

  /**
   * Set webhook
   */
  async setWebhook(url) {
    try {
      if (!this.botToken) return false;
      
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Error setting webhook:', error);
      return false;
    }
  },

  /**
   * Delete webhook
   */
  async deleteWebhook() {
    try {
      if (!this.botToken) return false;
      
      const response = await fetch(`https://api.telegram.org/bot${this.botToken}/deleteWebhook`);
      const data = await response.json();
      return data.ok;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return false;
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TelegramIntegration;
}
