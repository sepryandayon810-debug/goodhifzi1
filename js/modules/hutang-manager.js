/**
 * Hutang & Piutang Manager Module
 * Fungsi untuk mengelola hutang dan piutang
 */

const HutangManager = {
  hutang: [],
  piutang: [],

  /**
   * Load all hutang/piutang from Firebase
   */
  async loadAll() {
    try {
      Utils.showLoading('Memuat data...');
      
      const [hutangSnap, piutangSnap] = await Promise.all([
        database.ref('hutang').once('value'),
        database.ref('piutang').once('value')
      ]);
      
      const hutangData = hutangSnap.val() || {};
      const piutangData = piutangSnap.val() || {};
      
      this.hutang = Object.entries(hutangData).map(([id, data]) => ({ id, ...data }));
      this.piutang = Object.entries(piutangData).map(([id, data]) => ({ id, ...data }));
      
      Utils.hideLoading();
      return { hutang: this.hutang, piutang: this.piutang };
    } catch (error) {
      console.error('Error loading hutang/piutang:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memuat data', 'error');
      return { hutang: [], piutang: [] };
    }
  },

  /**
   * Add hutang (utang kita ke orang lain)
   */
  async addHutang(data) {
    try {
      Utils.showLoading('Menyimpan...');
      
      const id = Utils.generateId('HTG');
      const hutangData = {
        id,
        type: 'hutang',
        personName: data.personName,
        amount: parseInt(data.amount) || 0,
        description: data.description || '',
        date: data.date || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || '',
        status: 'unpaid',
        paidAmount: 0,
        remaining: parseInt(data.amount) || 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      await database.ref(`hutang/${id}`).set(hutangData);
      this.hutang.push(hutangData);
      
      Utils.hideLoading();
      Utils.showToast('Hutang berhasil ditambahkan', 'success');
      return hutangData;
    } catch (error) {
      console.error('Error adding hutang:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menambahkan hutang', 'error');
      return null;
    }
  },

  /**
   * Add piutang (orang lain utang ke kita)
   */
  async addPiutang(data) {
    try {
      Utils.showLoading('Menyimpan...');
      
      const id = Utils.generateId('PTG');
      const piutangData = {
        id,
        type: 'piutang',
        personName: data.personName,
        amount: parseInt(data.amount) || 0,
        description: data.description || '',
        date: data.date || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || '',
        status: 'unpaid',
        paidAmount: 0,
        remaining: parseInt(data.amount) || 0,
        createdAt: firebase.database.ServerValue.TIMESTAMP
      };
      
      await database.ref(`piutang/${id}`).set(piutangData);
      this.piutang.push(piutangData);
      
      Utils.hideLoading();
      Utils.showToast('Piutang berhasil ditambahkan', 'success');
      return piutangData;
    } catch (error) {
      console.error('Error adding piutang:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menambahkan piutang', 'error');
      return null;
    }
  },

  /**
   * Make payment
   */
  async makePayment(id, type, amount, note = '') {
    try {
      Utils.showLoading('Memproses pembayaran...');
      
      const ref = database.ref(`${type}/${id}`);
      const snapshot = await ref.once('value');
      const data = snapshot.val();
      
      if (!data) {
        Utils.hideLoading();
        Utils.showToast('Data tidak ditemukan', 'error');
        return false;
      }
      
      const newPaidAmount = (data.paidAmount || 0) + parseInt(amount);
      const remaining = data.amount - newPaidAmount;
      const status = remaining <= 0 ? 'paid' : 'partial';
      
      // Add payment history
      const paymentId = Utils.generateId('PAY');
      const paymentData = {
        id: paymentId,
        amount: parseInt(amount),
        note,
        date: new Date().toISOString().split('T')[0],
        timestamp: firebase.database.ServerValue.TIMESTAMP
      };
      
      await ref.update({
        paidAmount: newPaidAmount,
        remaining: Math.max(0, remaining),
        status,
        updatedAt: firebase.database.ServerValue.TIMESTAMP,
        [`payments/${paymentId}`]: paymentData
      });
      
      // Update local data
      const list = type === 'hutang' ? this.hutang : this.piutang;
      const item = list.find(i => i.id === id);
      if (item) {
        item.paidAmount = newPaidAmount;
        item.remaining = Math.max(0, remaining);
        item.status = status;
      }
      
      Utils.hideLoading();
      Utils.showToast('Pembayaran berhasil', 'success');
      return true;
    } catch (error) {
      console.error('Error making payment:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memproses pembayaran', 'error');
      return false;
    }
  },

  /**
   * Get summary statistics
   */
  getSummary() {
    const hutangTotal = this.hutang.reduce((sum, h) => sum + h.amount, 0);
    const hutangPaid = this.hutang.reduce((sum, h) => sum + (h.paidAmount || 0), 0);
    const hutangRemaining = this.hutang.reduce((sum, h) => sum + (h.remaining || 0), 0);
    
    const piutangTotal = this.piutang.reduce((sum, p) => sum + p.amount, 0);
    const piutangPaid = this.piutang.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
    const piutangRemaining = this.piutang.reduce((sum, p) => sum + (p.remaining || 0), 0);
    
    return {
      hutang: {
        total: hutangTotal,
        paid: hutangPaid,
        remaining: hutangRemaining,
        count: this.hutang.length,
        unpaid: this.hutang.filter(h => h.status !== 'paid').length
      },
      piutang: {
        total: piutangTotal,
        paid: piutangPaid,
        remaining: piutangRemaining,
        count: this.piutang.length,
        unpaid: this.piutang.filter(p => p.status !== 'paid').length
      },
      net: piutangRemaining - hutangRemaining
    };
  },

  /**
   * Get overdue items
   */
  getOverdue() {
    const today = new Date().toISOString().split('T')[0];
    
    const overdueHutang = this.hutang.filter(h => 
      h.status !== 'paid' && h.dueDate && h.dueDate < today
    );
    
    const overduePiutang = this.piutang.filter(p => 
      p.status !== 'paid' && p.dueDate && p.dueDate < today
    );
    
    return { hutang: overdueHutang, piutang: overduePiutang };
  },

  /**
   * Delete item
   */
  async delete(id, type) {
    try {
      Utils.showLoading('Menghapus...');
      
      await database.ref(`${type}/${id}`).remove();
      
      const list = type === 'hutang' ? this.hutang : this.piutang;
      const index = list.findIndex(i => i.id === id);
      if (index > -1) {
        list.splice(index, 1);
      }
      
      Utils.hideLoading();
      Utils.showToast('Berhasil dihapus', 'success');
      return true;
    } catch (error) {
      console.error('Error deleting:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menghapus', 'error');
      return false;
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = HutangManager;
}
