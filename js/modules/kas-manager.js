/**
 * Kas Manager Module
 * Fungsi untuk mengelola kas (cash management)
 */

const KasManager = {
  currentShift: null,
  dailyModal: 0,

  /**
   * Load current shift
   */
  async loadCurrentShift() {
    try {
      const today = Utils.getTodayString();
      const snapshot = await database.ref(`shifts/${today}/current`).once('value');
      this.currentShift = snapshot.val();
      return this.currentShift;
    } catch (error) {
      console.error('Error loading shift:', error);
      return null;
    }
  },

  /**
   * Start new shift
   */
  async startShift(openingBalance, kasirId, kasirName) {
    try {
      Utils.showLoading('Memulai shift...');
      
      const today = Utils.getTodayString();
      const shiftId = Utils.generateId('SHIFT');
      
      const shiftData = {
        id: shiftId,
        openingBalance: parseInt(openingBalance) || 0,
        kasirId,
        kasirName,
        startTime: firebase.database.ServerValue.TIMESTAMP,
        status: 'active',
        transactions: 0,
        totalSales: 0,
        cashIn: 0,
        cashOut: 0
      };
      
      await database.ref(`shifts/${today}/${shiftId}`).set(shiftData);
      await database.ref(`shifts/${today}/current`).set(shiftData);
      
      this.currentShift = shiftData;
      
      Utils.hideLoading();
      Utils.showToast('Shift berhasil dimulai', 'success');
      return shiftData;
    } catch (error) {
      console.error('Error starting shift:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal memulai shift', 'error');
      return null;
    }
  },

  /**
   * End shift
   */
  async endShift(closingBalance) {
    try {
      Utils.showLoading('Menutup shift...');
      
      if (!this.currentShift) {
        Utils.hideLoading();
        Utils.showToast('Tidak ada shift aktif', 'error');
        return false;
      }
      
      const today = Utils.getTodayString();
      const shiftId = this.currentShift.id;
      
      const expectedBalance = this.currentShift.openingBalance + 
        this.currentShift.totalSales + 
        this.currentShift.cashIn - 
        this.currentShift.cashOut;
      
      const difference = parseInt(closingBalance) - expectedBalance;
      
      await database.ref(`shifts/${today}/${shiftId}`).update({
        closingBalance: parseInt(closingBalance),
        expectedBalance,
        difference,
        endTime: firebase.database.ServerValue.TIMESTAMP,
        status: 'closed'
      });
      
      await database.ref(`shifts/${today}/current`).remove();
      
      this.currentShift = null;
      
      Utils.hideLoading();
      Utils.showToast('Shift berhasil ditutup', 'success');
      return true;
    } catch (error) {
      console.error('Error ending shift:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menutup shift', 'error');
      return false;
    }
  },

  /**
   * Add cash in (topup)
   */
  async addCashIn(amount, description, type = 'topup') {
    try {
      Utils.showLoading('Memproses...');
      
      const today = Utils.getTodayString();
      const id = Utils.generateId('CASHIN');
      
      const cashInData = {
        id,
        amount: parseInt(amount),
        description,
        type,
        date: today,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        kasirId: Auth.getCurrentUser()?.uid
      };
      
      await database.ref(`cashIn/${today}/${id}`).set(cashInData);
      
      // Update shift if active
      if (this.currentShift) {
        await database.ref(`shifts/${today}/${this.currentShift.id}`).update({
          cashIn: (this.currentShift.cashIn || 0) + parseInt(amount)
        });
      }
      
      Utils.hideLoading();
      Utils.showToast('Kas masuk berhasil dicatat', 'success');
      return cashInData;
    } catch (error) {
      console.error('Error adding cash in:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal mencatat kas masuk', 'error');
      return null;
    }
  },

  /**
   * Add cash out (tarik)
   */
  async addCashOut(amount, description, type = 'tarik') {
    try {
      Utils.showLoading('Memproses...');
      
      const today = Utils.getTodayString();
      const id = Utils.generateId('CASHOUT');
      
      const cashOutData = {
        id,
        amount: parseInt(amount),
        description,
        type,
        date: today,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        kasirId: Auth.getCurrentUser()?.uid
      };
      
      await database.ref(`cashOut/${today}/${id}`).set(cashOutData);
      
      // Update shift if active
      if (this.currentShift) {
        await database.ref(`shifts/${today}/${this.currentShift.id}`).update({
          cashOut: (this.currentShift.cashOut || 0) + parseInt(amount)
        });
      }
      
      Utils.hideLoading();
      Utils.showToast('Kas keluar berhasil dicatat', 'success');
      return cashOutData;
    } catch (error) {
      console.error('Error adding cash out:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal mencatat kas keluar', 'error');
      return null;
    }
  },

  /**
   * Set daily modal
   */
  async setModal(amount, note = '') {
    try {
      Utils.showLoading('Menyimpan modal...');
      
      const today = Utils.getTodayString();
      
      await database.ref(`modal/${today}`).set({
        amount: parseInt(amount),
        note,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        kasirId: Auth.getCurrentUser()?.uid
      });
      
      this.dailyModal = parseInt(amount);
      
      Utils.hideLoading();
      Utils.showToast('Modal berhasil disimpan', 'success');
      return true;
    } catch (error) {
      console.error('Error setting modal:', error);
      Utils.hideLoading();
      Utils.showToast('Gagal menyimpan modal', 'error');
      return false;
    }
  },

  /**
   * Get daily summary
   */
  async getDailySummary(date = Utils.getTodayString()) {
    try {
      const [transactionsSnap, cashInSnap, cashOutSnap, modalSnap] = await Promise.all([
        database.ref(`transactions/${date}`).once('value'),
        database.ref(`cashIn/${date}`).once('value'),
        database.ref(`cashOut/${date}`).once('value'),
        database.ref(`modal/${date}`).once('value')
      ]);
      
      const transactions = Object.values(transactionsSnap.val() || {});
      const cashIn = Object.values(cashInSnap.val() || {});
      const cashOut = Object.values(cashOutSnap.val() || {});
      const modal = modalSnap.val();
      
      const totalSales = transactions.reduce((sum, t) => sum + (t.total || 0), 0);
      const totalCashIn = cashIn.reduce((sum, c) => sum + c.amount, 0);
      const totalCashOut = cashOut.reduce((sum, c) => sum + c.amount, 0);
      const modalAmount = modal?.amount || 0;
      
      return {
        date,
        modal: modalAmount,
        totalSales,
        totalCashIn,
        totalCashOut,
        transactionCount: transactions.length,
        cashInCount: cashIn.length,
        cashOutCount: cashOut.length,
        endingBalance: modalAmount + totalSales + totalCashIn - totalCashOut,
        transactions,
        cashIn,
        cashOut
      };
    } catch (error) {
      console.error('Error getting daily summary:', error);
      return null;
    }
  },

  /**
   * Get kas on hand (kas ditangan)
   */
  async getKasDitangan() {
    try {
      const today = Utils.getTodayString();
      const summary = await this.getDailySummary(today);
      
      if (!summary) return 0;
      
      return summary.endingBalance;
    } catch (error) {
      console.error('Error getting kas ditangan:', error);
      return 0;
    }
  },

  /**
   * Get shift history
   */
  async getShiftHistory(limit = 10) {
    try {
      const snapshot = await database.ref('shifts').orderByKey().limitToLast(limit).once('value');
      const shifts = [];
      
      snapshot.forEach(dateSnap => {
        dateSnap.forEach(shiftSnap => {
          if (shiftSnap.key !== 'current') {
            shifts.push({ date: dateSnap.key, ...shiftSnap.val() });
          }
        });
      });
      
      return shifts.sort((a, b) => b.startTime - a.startTime);
    } catch (error) {
      console.error('Error getting shift history:', error);
      return [];
    }
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = KasManager;
}
