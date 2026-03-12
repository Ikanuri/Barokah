# Bug Log POS App

## [BUG-013] — Edit Transaksi: Status Tidak Update Saat Produk Dikurangi + Duplicate Item Paid ✅ Selesai — 2026-03-12
- **File:** `backend/app/Http/Controllers/Api/TransactionController.php`, `frontend/src/components/EditTransactionModal.tsx`
- **Masalah:**
  1. Jika produk dikurangi dari transaksi lunas/kredit, status tidak menampilkan kembalian yang benar (frontend hanya menghitung `change = paymentAmountNum - remaining`, tidak memperhitungkan `paidTotalBase > total`).
  2. Jika produk dikurangi dari transaksi lunas, kembalian tidak muncul sama sekali (`canEditPayment` false karena status 'paid').
  3. Edit transaksi lunas → kurangi produk → klik Bayar: produk baru muncul setelah simpan. Root cause: backend `$isPaid` path menggunakan ADD semantics — frontend kirim full list [A=2], backend menambah [A=2] di atas existing [A=2, B=1] sehingga jadi [A=2, B=1, A=2(baru)].
- **Solusi:**
  1. Backend: hapus bifurkasi `$isPaid` — selalu gunakan REPLACE semantics (delete + recreate dengan stock adjustment differential). Status payment dihitung dari `paid_total` vs `new_total`.
  2. Frontend: ganti `change = paymentAmountNum - remaining` → `effectiveChange = paidTotalBase + paymentAmountNum - total`. Tambah `overpaid = paidTotalBase - total`. Ganti `canEditPayment = remaining > 0`. Tampilkan kembalian/lunas saat `!canEditPayment`.
- **Status:** ✅ Selesai — 2026-03-12

## [BUG-012] — Kolom Ubah Harga di Kasir Tampil Angka Berlebih ✅ Selesai — 2026-03-12
- **File:** `frontend/src/components/pos/helpers.ts`, `frontend/src/store/cart.ts`
- **Masalah:** Input "ubah harga" di CartBottomSheet menampilkan angka yang jauh lebih besar dari harga asli (misal Rp 14.000 muncul sebagai 14.000.000). Root cause: Laravel `decimal:2` cast mengembalikan `selling_price` sebagai string `"14000.00"`. `formatNumberInput` menggunakan `/\D/g` regex yang menghapus titik desimal, sehingga `"14000.00"` menjadi `"1400000"` sebelum diformat. Setelah di-edit, harga tersimpan dengan nilai yang salah (jauh lebih besar).
- **Solusi:** (1) Ganti `formatNumberInput` menggunakan `parseFloat` + regex (bukan `/\D/g` + `toLocaleString`). (2) Cast `basePrice` dan `unit.selling_price` ke `Number()` di cart store saat `addItem` agar string dari API selalu tersimpan sebagai angka di state.
- **Status:** ✅ Selesai — 2026-03-12

## [BUG-010] — Catatan Produk Tidak Tersimpan ke Nota & Transaksi ✅ Selesai — 2026-03-12
- **File:** `backend/app/Models/TransactionItem.php`, `backend/app/Http/Controllers/Api/TransactionController.php`, `frontend/src/components/EditTransactionModal.tsx`
- **Masalah:** Item notes yang diinput di tab kasir tidak muncul di nota maupun tab transaksi. Root cause: kolom `notes` ada di migration (DB), tapi tidak ada di `$fillable` TransactionItem, sehingga Laravel mass assignment silently drop nilai tersebut. TransactionController::update() juga tidak menyertakan `notes` di validasi, array building, dan TransactionItem::create(). Frontend EditTransactionModal tidak menyertakan `notes` di payload save.
- **Solusi:** Tambah `'notes'` ke `$fillable`, fix semua titik di update() controller, fix payload frontend.
- **Status:** ✅ Selesai — 2026-03-12

## [BUG-011] — Thousand Separator Tidak Muncul di Bluetooth Thermal Print ✅ Selesai — 2026-03-12
- **File:** `frontend/src/lib/bluetoothPrinter.ts`
- **Masalah:** `amount.toLocaleString('id-ID')` tidak reliable di semua perangkat (Android browser dengan ICU terbatas bisa return format berbeda atau tanpa separator).
- **Solusi:** Ganti ke regex `Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')` yang 100% konsisten.
- **Status:** ✅ Selesai — 2026-03-12

## [BUG-008] — Dark Mode Reset Saat Berpindah Halaman ✅ Selesai — 2026-03-12
- **File:** `frontend/src/components/Layout.tsx`
- **Masalah:** `useEffect(() => { setTheme(isDark); }, [])` hanya jalan sekali saat mount. Saat Zustand belum selesai hydrate dari localStorage, `isDark` masih `false` sehingga dark class di-remove. Setelah hydrate, effect tidak jalan lagi.
- **Solusi:** Ganti dep array ke `[isDark]` dan manipulasi DOM class langsung (tanpa `setTheme`) — effect re-run setiap kali `isDark` berubah, termasuk sesudah hydration.
- **Status:** ✅ Selesai — 2026-03-12

## [BUG-009] — Import/Export Transactions Error 404 ✅ Selesai — 2026-03-12
- **File:** `backend/routes/api.php`, `backend/app/Http/Controllers/Api/ExportImportController.php`
- **Masalah:** Route `POST /import/transactions` dan `GET /export/template/transactions` tidak ada di backend. Frontend (ExportImportButtons) memanggil kedua endpoint ini sehingga selalu error 404.
- **Solusi:** Tambah kedua route + implementasi method `importTransactions()` dan `getTransactionTemplate()` di ExportImportController.
- **Status:** ✅ Selesai — 2026-03-12

## [BUG-001] — Settings Page Tidak Menyimpan ke API 🔴
- **File:** `frontend/src/app/settings/page.tsx`
- **Masalah:** handleSave hanya menampilkan toast sukses tanpa benar-benar menyimpan ke backend. Pengaturan toko (nama, alamat, telepon, footer struk) tidak tersimpan.
- **Solusi:** Buat API endpoint `/api/settings` di backend, hubungkan dengan form di frontend.
- **Status:** ⏳ Belum dikerjakan

## [BUG-002] — Multi-Store: X-Store-ID Header Tidak Dikirim 🔴
- **File:** `frontend/src/lib/api.ts`
- **Masalah:** Axios instance tidak mengirim header `X-Store-ID` sehingga middleware `InjectStoreId` di backend tidak berfungsi.
- **Solusi:** Tambah interceptor request yang inject `X-Store-ID` dari localStorage.
- **Status:** ⏳ Belum dikerjakan

## [BUG-003] — Tidak Ada Try-Catch di Controller Kritis 🔴
- **File:** `ProductController.php`, `TransactionController.php`, `CustomerController.php`, `CategoryController.php`, `AuthController.php`
- **Masalah:** Jika terjadi database error, server return 500 tanpa pesan yang jelas.
- **Solusi:** Tambah try-catch di semua method CRUD, return JSON error yang informatif.
- **Status:** ⏳ Belum dikerjakan

## [BUG-004] — Backup Tidak Lengkap 🟡
- **File:** `backend/app/Http/Controllers/Api/BackupController.php`
- **Masalah:** Data `customer_tiers`, `stores`, `product_prices`, `product_variants` tidak ikut di-backup.
- **Solusi:** Tambahkan tabel-tabel tersebut ke `createFullBackup()`.
- **Status:** ⏳ Belum dikerjakan

## [BUG-005] — Service Worker Menggunakan NetworkOnly 🟡
- **File:** `frontend/public/sw.js`
- **Masalah:** Strategi NetworkOnly membuat semua request gagal saat offline.
- **Solusi:** Ganti ke NetworkFirst atau StaleWhileRevalidate untuk endpoint API.
- **Status:** ⏳ Belum dikerjakan

## [BUG-006] — Validasi Format Phone Number Tidak Ada 🟡
- **File:** `frontend/src/app/settings/page.tsx`, `stores/page.tsx`, `customers/page.tsx`, `users/page.tsx`
- **Masalah:** Input phone number tidak divalidasi format Indonesia.
- **Solusi:** Tambah regex validasi `^(\+62|62|0)8[1-9][0-9]{6,10}$`.
- **Status:** ⏳ Belum dikerjakan

## [BUG-007] — POS Page Terlalu Besar (2000+ Baris) 🟢
- **File:** `frontend/src/app/pos/page.tsx`
- **Masalah:** File tunggal >2000 baris menyulitkan maintenance dan debugging.
- **Solusi:** Pecah menjadi komponen-komponen terpisah di `src/components/pos/`.
- **Status:** ⏳ Belum dikerjakan
