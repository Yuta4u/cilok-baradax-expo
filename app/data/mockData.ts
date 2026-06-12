// Data Produk / Stok
export const stokData = [
  { id: "1", nama: "Cilok Original", stok: 120, satuan: "pcs", status: "Aman" },
  { id: "2", nama: "Cilok Pedas", stok: 85, satuan: "pcs", status: "Aman" },
  { id: "3", nama: "Cilok Keju", stok: 40, satuan: "pcs", status: "Aman" },
  {
    id: "4",
    nama: "Cilok Mozzarella",
    stok: 15,
    satuan: "pcs",
    status: "Menipis",
  },
  {
    id: "5",
    nama: "Cilok Isi Daging",
    stok: 8,
    satuan: "pcs",
    status: "Menipis",
  },
  { id: "6", nama: "Cilok Ayam", stok: 60, satuan: "pcs", status: "Aman" },
  { id: "7", nama: "Cilok Udang", stok: 5, satuan: "pcs", status: "Menipis" },
];

// Data Bahan Baku
export const bahanBakuData = [
  {
    id: "b1",
    nama: "Tepung Tapioka",
    stok: 2,
    satuan: "kg",
    status: "Menipis",
  },
  { id: "b2", nama: "Bawang Putih", stok: 5, satuan: "kg", status: "Menipis" },
  { id: "b3", nama: "Minyak Goreng", stok: 1, satuan: "lt", status: "Menipis" },
  { id: "b4", nama: "Garam", stok: 3, satuan: "kg", status: "Aman" },
  { id: "b5", nama: "Daging Sapi", stok: 2, satuan: "kg", status: "Menipis" },
];

// Data Barang Masuk
export const barangMasukData = [
  {
    id: "INV/2024/05/001",
    tanggal: "15 Mei 2024",
    supplier: "PT. Sumber Bahan",
    total: "Rp 1.250.000",
    status: "Selesai",
    items: [
      { nama: "Tepung Tapioka", jumlah: 50, satuan: "kg" },
      { nama: "Minyak Goreng", jumlah: 10, satuan: "lt" },
    ],
  },
  {
    id: "INV/2024/05/002",
    tanggal: "12 Mei 2024",
    supplier: "Toko Bahan Abadi",
    total: "Rp 850.000",
    status: "Selesai",
    items: [
      { nama: "Bawang Putih", jumlah: 20, satuan: "kg" },
      { nama: "Garam", jumlah: 15, satuan: "kg" },
    ],
  },
  {
    id: "INV/2024/05/003",
    tanggal: "10 Mei 2024",
    supplier: "PT. Sumber Bahan",
    total: "Rp 2.100.000",
    status: "Selesai",
    items: [
      { nama: "Daging Sapi", jumlah: 30, satuan: "kg" },
      { nama: "Tepung Tapioka", jumlah: 40, satuan: "kg" },
    ],
  },
  {
    id: "INV/2024/05/004",
    tanggal: "8 Mei 2024",
    supplier: "CV. Maju Bersama",
    total: "Rp 675.000",
    status: "Proses",
    items: [{ nama: "Minyak Goreng", jumlah: 5, satuan: "lt" }],
  },
];

// Data Barang Keluar
export const barangKeluarData = [
  {
    id: "OUT/2024/05/001",
    tanggal: "15 Mei 2024",
    pelanggan: "Warung Bu Sari",
    total: "Rp 450.000",
    status: "Selesai",
    items: [
      { nama: "Cilok Original", jumlah: 100, satuan: "pcs" },
      { nama: "Cilok Pedas", jumlah: 50, satuan: "pcs" },
    ],
  },
  {
    id: "OUT/2024/05/002",
    tanggal: "13 Mei 2024",
    pelanggan: "Kantin SD Harapan",
    total: "Rp 320.000",
    status: "Selesai",
    items: [{ nama: "Cilok Keju", jumlah: 80, satuan: "pcs" }],
  },
  {
    id: "OUT/2024/05/003",
    tanggal: "11 Mei 2024",
    pelanggan: "Pak Budi",
    total: "Rp 180.000",
    status: "Selesai",
    items: [
      { nama: "Cilok Isi Daging", jumlah: 40, satuan: "pcs" },
      { nama: "Cilok Mozzarella", jumlah: 20, satuan: "pcs" },
    ],
  },
];

// Data Laporan
export const laporanBulanan = [
  { bulan: "Jan", masuk: 4200000, keluar: 3100000 },
  { bulan: "Feb", masuk: 3800000, keluar: 2900000 },
  { bulan: "Mar", masuk: 5100000, keluar: 4300000 },
  { bulan: "Apr", masuk: 4600000, keluar: 3800000 },
  { bulan: "Mei", masuk: 4200000, keluar: 950000 },
];
