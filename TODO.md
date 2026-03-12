# TODO POS App

## 🔴 Kritis

- [ ] [BUG-001] Implementasi Settings save ke API — `settings/page.tsx` + buat endpoint `/api/settings`
- [ ] [BUG-002] Tambah X-Store-ID header di Axios instance — `frontend/src/lib/api.ts`
- [ ] [BUG-003] Tambah try-catch error handling di ProductController
- [ ] [BUG-003] Tambah try-catch error handling di TransactionController
- [ ] [BUG-003] Tambah try-catch error handling di CustomerController
- [ ] [BUG-003] Tambah try-catch error handling di CategoryController
- [ ] [BUG-003] Tambah try-catch error handling di AuthController

## 🟡 Sedang

- [ ] [BUG-004] Lengkapi backup: tambah customer_tiers, stores, product_prices, product_variants
- [x] [BUG-005] Update Service Worker ke strategi NetworkFirst
- [ ] [BUG-006] Validasi phone number di settings/page.tsx
- [ ] [BUG-006] Validasi phone number di stores/page.tsx
- [ ] [BUG-006] Validasi phone number di customers/page.tsx
- [ ] [BUG-006] Validasi email di users/page.tsx
- [ ] Tambah store selector di Dashboard, POS, Products, Transactions page

## ✅ Selesai

- [x] [BUG-013] Fix edit transaksi: produk dikurangi dari lunas → duplikat item + kembalian tidak muncul
- [x] Fix catatan produk (item notes) tidak tersimpan ke nota & tab transaksi — TransactionItem::$fillable, TransactionController::update(), EditTransactionModal
- [x] Share struk via WA/TG sebagai gambar JPEG (html2canvas + Web Share API)
- [x] Settings panel nota di ThermalPrintPreview: ukuran kertas 58/80mm, nama toko, alamat, footer, logo, barcode (localStorage)
- [x] Fix thousand separator Bluetooth thermal print (regex, bukan toLocaleString)

## ✅ Fitur Prioritas Tinggi (Selesai 2026-03-12)

- [x] Arus Kas: expenses CRUD + ringkasan harian + halaman /cash-flow
- [x] Laporan Laba Rugi: endpoint profit-loss + halaman /profit-loss dengan date picker
- [x] Rekap Shift: endpoint shift-recap + halaman /shift-recap + print
- [x] Tombol Batalkan Transaksi (restore stok via cancel API)
- [x] Menu sidebar: Rekap Shift, Arus Kas, Laba Rugi

## 🟢 Rendah

- [ ] [BUG-007] Refactor pos/page.tsx menjadi komponen-komponen terpisah
- [ ] Implementasi cache tagging di ProductController
- [ ] Security audit: CORS, CSRF, SQL Injection
- [ ] Performance optimization frontend
- [ ] Jalankan migration: `php artisan migrate` untuk tabel expenses
