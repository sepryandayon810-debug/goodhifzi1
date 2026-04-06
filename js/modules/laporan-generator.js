/**
 * Laporan Generator Module
 * Fungsi untuk generate laporan penjualan
 */

const LaporanGenerator = {
  transactions: [],
  
  /**
   * Load transactions by date range
   */
  async loadTransactions(startDate, endDate) {
    try {
      Utils.showLoading('Memuat data transaksi...');
      
      const transactions = [];
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Generate date range
      const dates = [];
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }
      
      // Load transactions for each date
      for (const date of dates) {
        const snapshot = await database.ref(`transactions/${date}`).once('value');
        const dayTransactions = snapshot.val() || {};
        
        Object.entries(dayTransactions).forEach(([id, data]) => {
          transactions.push({ id, date, ...data });
        });
      }
      
      this.transactions = transactions;
      Utils.hideLoading();
      return transactions;
    } catch (error) {
      console.error('Error loading transactions:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memuat transaksi', 'error');
      return [];
    }
  },

  /**
   * Generate daily report
   */
  generateDailyReport(date) {
    const dayTransactions = this.transactions.filter(t => t.date === date);
    
    return {
      date,
      totalTransactions: dayTransactions.length,
      totalSales: dayTransactions.reduce((sum, t) => sum + (t.total || 0), 0),
      totalProfit: dayTransactions.reduce((sum, t) => sum + (t.profit || 0), 0),
      totalItems: dayTransactions.reduce((sum, t) => 
        sum + (t.items ? t.items.reduce((s, i) => s + i.quantity, 0) : 0), 0),
      byPaymentMethod: this.groupByPaymentMethod(dayTransactions),
      topProducts: this.getTopProducts(dayTransactions)
    };
  },

  /**
   * Generate summary report
   */
  generateSummary(startDate, endDate) {
    const filtered = this.transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= new Date(startDate) && tDate <= new Date(endDate);
    });
    
    return {
      period: { start: startDate, end: endDate },
      totalTransactions: filtered.length,
      totalSales: filtered.reduce((sum, t) => sum + (t.total || 0), 0),
      totalProfit: filtered.reduce((sum, t) => sum + (t.profit || 0), 0),
      totalDiscount: filtered.reduce((sum, t) => sum + (t.discount || 0), 0),
      totalTax: filtered.reduce((sum, t) => sum + (t.tax || 0), 0),
      averageTransaction: filtered.length > 0 
        ? filtered.reduce((sum, t) => sum + (t.total || 0), 0) / filtered.length 
        : 0,
      byPaymentMethod: this.groupByPaymentMethod(filtered),
      byDate: this.groupByDate(filtered),
      topProducts: this.getTopProducts(filtered, 10)
    };
  },

  /**
   * Group transactions by payment method
   */
  groupByPaymentMethod(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      const method = t.paymentMethod || 'cash';
      if (!grouped[method]) {
        grouped[method] = { count: 0, total: 0 };
      }
      grouped[method].count++;
      grouped[method].total += t.total || 0;
    });
    return grouped;
  },

  /**
   * Group transactions by date
   */
  groupByDate(transactions) {
    const grouped = {};
    transactions.forEach(t => {
      if (!grouped[t.date]) {
        grouped[t.date] = { count: 0, total: 0, profit: 0 };
      }
      grouped[t.date].count++;
      grouped[t.date].total += t.total || 0;
      grouped[t.date].profit += t.profit || 0;
    });
    return grouped;
  },

  /**
   * Get top selling products
   */
  getTopProducts(transactions, limit = 5) {
    const productMap = {};
    
    transactions.forEach(t => {
      if (t.items) {
        t.items.forEach(item => {
          if (!productMap[item.productId]) {
            productMap[item.productId] = {
              name: item.name,
              quantity: 0,
              total: 0
            };
          }
          productMap[item.productId].quantity += item.quantity;
          productMap[item.productId].total += item.total;
        });
      }
    });
    
    return Object.entries(productMap)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);
  },

  /**
   * Export to CSV
   */
  exportToCSV(data, filename) {
    if (!data || data.length === 0) {
      Utils.showToast('Tidak ada data untuk diexport', 'warning');
      return;
    }
    
    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => {
        const val = row[h];
        // Escape values with commas or quotes
        if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
    
    Utils.showToast('Laporan berhasil diexport', 'success');
  },

  /**
   * Export to PDF (simplified - uses print)
   */
  exportToPDF(elementId, filename) {
    const element = document.getElementById(elementId);
    if (!element) {
      Utils.showToast('Elemen tidak ditemukan', 'error');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${filename}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
          </style>
        </head>
        <body>
          ${element.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  },

  /**
   * Get chart data
   */
  getChartData(type = 'sales') {
    const byDate = this.groupByDate(this.transactions);
    const dates = Object.keys(byDate).sort();
    
    if (type === 'sales') {
      return {
        labels: dates,
        data: dates.map(d => byDate[d].total)
      };
    } else if (type === 'profit') {
      return {
        labels: dates,
        data: dates.map(d => byDate[d].profit)
      };
    } else if (type === 'transactions') {
      return {
        labels: dates,
        data: dates.map(d => byDate[d].count)
      };
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LaporanGenerator;
}
