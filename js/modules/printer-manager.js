/**
 * Printer Manager Module
 * Fungsi untuk mengelola printer dan struk
 */

const PrinterManager = {
  settings: {
    printerName: '',
    paperSize: '80mm',
    headerText: '',
    footerText: 'Terima kasih telah berbelanja',
    showLogo: true,
    showBarcode: false,
    autoPrint: false
  },

  /**
   * Load printer settings
   */
  loadSettings() {
    const saved = Utils.getStorage('printer_settings');
    if (saved) {
      this.settings = { ...this.settings, ...saved };
    }
    return this.settings;
  },

  /**
   * Save printer settings
   */
  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    Utils.setStorage('printer_settings', this.settings);
    return this.settings;
  },

  /**
   * Generate receipt HTML
   */
  generateReceipt(transaction) {
    const storeName = Utils.getStorage('store_name') || 'WebPOS';
    const storeAddress = Utils.getStorage('store_address') || '';
    const storePhone = Utils.getStorage('store_phone') || '';
    
    const items = transaction.items.map(item => `
      <tr>
        <td>${item.name}</td>
        <td style="text-align: center;">${item.quantity}</td>
        <td style="text-align: right;">${Utils.formatRupiah(item.price)}</td>
        <td style="text-align: right;">${Utils.formatRupiah(item.total)}</td>
      </tr>
    `).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: ${this.settings.paperSize === '58mm' ? '58mm' : '80mm'} auto; margin: 0; }
          body { 
            font-family: 'Courier New', monospace; 
            font-size: 12px; 
            width: ${this.settings.paperSize === '58mm' ? '58mm' : '80mm'};
            margin: 0 auto;
            padding: 5mm;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .line { border-top: 1px dashed #000; margin: 5px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 2px 0; }
          .header { margin-bottom: 10px; }
          .footer { margin-top: 10px; font-size: 10px; }
        </style>
      </head>
      <body>
        <div class="header center">
          <div class="bold" style="font-size: 14px;">${storeName}</div>
          ${storeAddress ? `<div>${storeAddress}</div>` : ''}
          ${storePhone ? `<div>Telp: ${storePhone}</div>` : ''}
        </div>
        
        <div class="line"></div>
        
        <div>
          <div>No: ${transaction.id}</div>
          <div>Tgl: ${new Date(transaction.timestamp).toLocaleString('id-ID')}</div>
          <div>Kasir: ${transaction.cashierName}</div>
        </div>
        
        <div class="line"></div>
        
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Harga</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${items}
          </tbody>
        </table>
        
        <div class="line"></div>
        
        <table>
          <tr>
            <td>Subtotal</td>
            <td class="right">${Utils.formatRupiah(transaction.subtotal)}</td>
          </tr>
          ${transaction.discount > 0 ? `
          <tr>
            <td>Diskon</td>
            <td class="right">-${Utils.formatRupiah(transaction.discount)}</td>
          </tr>
          ` : ''}
          <tr>
            <td>PPN (11%)</td>
            <td class="right">${Utils.formatRupiah(transaction.tax)}</td>
          </tr>
          <tr class="bold">
            <td>TOTAL</td>
            <td class="right">${Utils.formatRupiah(transaction.total)}</td>
          </tr>
          <tr>
            <td>Bayar (${transaction.paymentMethod})</td>
            <td class="right">${Utils.formatRupiah(transaction.paymentAmount)}</td>
          </tr>
          <tr>
            <td>Kembali</td>
            <td class="right">${Utils.formatRupiah(transaction.change)}</td>
          </tr>
        </table>
        
        <div class="line"></div>
        
        <div class="footer center">
          <div>${this.settings.footerText}</div>
        </div>
      </body>
      </html>
    `;
  },

  /**
   * Print receipt
   */
  printReceipt(transaction) {
    const receiptHTML = this.generateReceipt(transaction);
    
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Auto print after load
    printWindow.onload = () => {
      if (this.settings.autoPrint) {
        printWindow.print();
      }
    };
    
    return printWindow;
  },

  /**
   * Preview receipt
   */
  previewReceipt(transaction) {
    return this.printReceipt(transaction);
  },

  /**
   * Connect to Bluetooth printer (placeholder)
   */
  async connectBluetoothPrinter() {
    try {
      if (!navigator.bluetooth) {
        Utils.showToast('Browser tidak mendukung Bluetooth', 'error');
        return false;
      }
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
      });
      
      Utils.showToast(`Terhubung ke ${device.name}`, 'success');
      return device;
    } catch (error) {
      console.error('Bluetooth error:', error);
      Utils.showToast('Gagal terhubung ke printer', 'error');
      return false;
    }
  },

  /**
   * Test print
   */
  testPrint() {
    const testTransaction = {
      id: 'TEST001',
      timestamp: Date.now(),
      cashierName: 'Test Kasir',
      items: [
        { name: 'Produk Test 1', quantity: 2, price: 10000, total: 20000 },
        { name: 'Produk Test 2', quantity: 1, price: 15000, total: 15000 }
      ],
      subtotal: 35000,
      discount: 0,
      tax: 3850,
      total: 38850,
      paymentAmount: 40000,
      change: 1150,
      paymentMethod: 'cash'
    };
    
    this.printReceipt(testTransaction);
  },

  /**
   * Print report
   */
  printReport(title, data, summary) {
    const reportHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: Arial, sans-serif; font-size: 12px; }
          .header { text-align: center; margin-bottom: 20px; }
          .title { font-size: 18px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
          .summary { margin-top: 20px; }
          .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">${title}</div>
          <div>${new Date().toLocaleString('id-ID')}</div>
        </div>
        
        <table>
          <thead>
            <tr>
              ${Object.keys(data[0] || {}).map(k => `<th>${k}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${data.map(row => `
              <tr>
                ${Object.values(row).map(v => `<td>${v}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${summary ? `
        <div class="summary">
          <div class="summary-row"><strong>Total:</strong> <span>${summary.total}</span></div>
        </div>
        ` : ''}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.print();
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrinterManager;
}
