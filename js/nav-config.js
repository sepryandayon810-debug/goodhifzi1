/**
 * WebPOS Navigation Configuration
 * Tambah/ubah menu cukup edit file ini saja
 * Semua halaman otomatis terupdate
 */

export const MENU_CONFIG = {
  version: "1.0",
  appName: "WebPOS",
  
  // Struktur menu sesuai file dashboard.html
  menu: [
    // Section: UTAMA
    { type: "divider", label: "UTAMA" },
    
    {
      id: "dashboard",
      label: "Dashboard",
      icon: "home", // fas fa-home
      href: "../pages/index.html",
      roles: ["admin", "kasir", "gudang"]
    },
    {
      id: "kasir",
      label: "Kasir",
      icon: "cash-register", // fas fa-cash-register
      href: "../pages/page-kasir.html",
      roles: ["admin", "kasir"]
    },
    {
      id: "produk",
      label: "Produk",
      icon: "box", // fas fa-box
      href: "../pages/page-produk.html",
      roles: ["admin", "gudang"]
    },
    
    // Section: TRANSAKSI
    { type: "divider", label: "TRANSAKSI" },
    
    {
      id: "riwayat-transaksi",
      label: "Riwayat Transaksi",
      icon: "history", // fas fa-history
      href: "../pages/page-riwayat.html",
      roles: ["admin", "kasir"]
    },
    {
      id: "kas-management",
      label: "Kas Management",
      icon: "wallet", // fas fa-wallet
      href: "#",
      roles: ["admin", "kasir"],
      submenu: [
        { id: "ringkasan-kas", label: "Ringkasan Kas", href: "../pages/page-kas.html" },
        { id: "modal-harian", label: "Modal Harian", href: "../pages/page-modal-harian.html" },
        { id: "kas-masuk", label: "Kas Masuk", href: "../pages/page-kas-masuk.html" },
        { id: "kas-keluar", label: "Kas Keluar", href: "../pages/page-kas-keluar.html" },
        { id: "kas-shift", label: "Kas & Shift", href: "../pages/page-kas-shift.html" },
        { id: "topup", label: "Top Up", href: "../pages/page-kas-topup.html" },
        { id: "tarik-tunai", label: "Tarik Tunai", href: "../pages/page-kas-tarik.html" }
      ]
    },
    {
      id: "pembelian-restock",
      label: "Pembelian / Restock",
      icon: "shopping-cart", // fas fa-shopping-cart
      href: "../pages/page-pembelian.html",
      roles: ["admin", "gudang"]
    },
    {
      id: "hutang-piutang",
      label: "Hutang & Piutang",
      icon: "hand-holding-usd", // fas fa-hand-holding-usd
      href: "../pages/page-hutang.html",
      roles: ["admin"]
    },
    
    // Section: LAPORAN
    { type: "divider", label: "LAPORAN" },
    
    {
      id: "laporan-penjualan",
      label: "Laporan Penjualan",
      icon: "chart-bar", // fas fa-chart-bar
      href: "../pages/page-laporan.html",
      roles: ["admin"]
    },

    {
      id: "laporan-stok",
      label: "Laporan Stok",
      icon: "boxes", // fas fa-boxes (atau "box-open", "warehouse")
      href: "../pages/page-laporan-stok.html",
      roles: ["admin", "gudang"] // kasir juga bisa akses untuk cek stok
    },
    
    // Section: INTEGRASI
    { type: "divider", label: "INTEGRASI" },
    
    {
      id: "saldo-telegram",
      label: "Saldo Telegram",
      icon: "telegram", // fab fa-telegram
      href: "../pages/page-saldo-telegram.html",
      roles: ["admin"]
    },
    {
      id: "data-pelanggan",
      label: "Data Pelanggan",
      icon: "users", // fas fa-users
      href: "../pages/page-data-pelanggan.html",
      roles: ["admin", "kasir"]
    },
    
    // Section: SISTEM
    { type: "divider", label: "SISTEM" },
    
    {
      id: "pengguna",
      label: "Pengguna",
      icon: "user-cog", // fas fa-user-cog
      href: "../pages/page-pengguna.html",
      roles: ["admin"]
    },
    {
      id: "pengaturan",
      label: "Pengaturan",
      icon: "cog", // fas fa-cog
      href: "../pages/page-setting.html",
      roles: ["admin"]
    },
    {
      id: "backup-sync",
      label: "Backup & Sync",
      icon: "cloud-upload-alt", // fas fa-cloud-upload-alt
      href: "../pages/page-backup.html",
      roles: ["admin"]
    },
    {
      id: "printer-struk",
      label: "Printer & Struk",
      icon: "print", // fas fa-print
      href: "../pages/page-printer.html",
      roles: ["admin"]
    },
    {
      id: "reset-data",
      label: "Reset Data",
      icon: "trash-alt", // fas fa-trash-alt
      href: "../pages/page-reset.html",
      roles: ["admin"],
      danger: true // Styling merah/warning
    }
  ]
};

// Helper untuk generate flat list of all menu IDs (untuk validasi)
export const getAllMenuIds = () => {
  const ids = [];
  MENU_CONFIG.menu.forEach(item => {
    if (item.id) ids.push(item.id);
    if (item.submenu) {
      item.submenu.forEach(sub => ids.push(sub.id));
    }
  });
  return ids;
};

// Helper untuk cek apakah menu punya submenu
export const hasSubmenu = (menuId) => {
  const item = MENU_CONFIG.menu.find(m => m.id === menuId);
  return item && item.submenu && item.submenu.length > 0;
};

// Helper untuk cari menu by ID
export const getMenuById = (menuId) => {
  // Cari di menu utama
  let item = MENU_CONFIG.menu.find(m => m.id === menuId);
  if (item) return item;
  
  // Cari di submenu
  for (const menu of MENU_CONFIG.menu) {
    if (menu.submenu) {
      const subItem = menu.submenu.find(s => s.id === menuId);
      if (subItem) return { ...subItem, parentId: menu.id };
    }
  }
  return null;
};

// Helper untuk dapatkan parent menu dari submenu
export const getParentMenu = (submenuId) => {
  for (const menu of MENU_CONFIG.menu) {
    if (menu.submenu && menu.submenu.some(s => s.id === submenuId)) {
      return menu;
    }
  }
  return null;
};
