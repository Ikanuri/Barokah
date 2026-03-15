# Changelog

Semua perubahan penting pada proyek ini akan didokumentasikan di file ini.
Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Security
- security: tambah role-based middleware di api.php — 3 tier: all-auth (read produk/pelanggan, buat transaksi, shift-recap), role:admin|manager (CRUD produk/kategori/pelanggan, manajemen transaksi, laporan, export), role:admin (users, import massal, backup/restore, stores CRUD)
- security: tambah auth guard proaktif di Layout.tsx — redirect ke /login jika !isAuthenticated setelah Zustand hydrate, tampilkan spinner saat hydrating untuk cegah flash konten

### Fixed
- fix: login page tidak redirect jika user sudah login — tambah useEffect redirect ke /dashboard ketika isAuthenticated=true
- fix: theme toggle di halaman login mengganggu layout mobile (fixed position) — pindah ke absolute top-right di dalam card

## [1.1.0] - 2026-03-13

### Fixed
- fix: print preview kembalian tidak tampil ketika change_returned=true — paid_amount direkonstruksi dari total+change_amount agar computedChange benar di visual preview, Bluetooth print, plain text, dan chat text
- fix: angka "00" muncul di bawah subtotal di print preview — perbaiki JSX zero rendering bug (discount dan tax menggunakan `> 0` check bukan truthy check)
- fix: transaksi belum bayar tampil "LUNAS ✓" saat buka modal edit transaksi — paymentAmount tidak lagi di-prefill, selalu kosong saat modal dibuka
- fix: kembalian tidak tampil di modal edit saat transaksi bayar lebih dari status belum bayar — overpaid sekarang dibaca dari transaction.change_amount, bukan paid_total - total (yang selalu 0 karena backend caps paid_total at total)
- fix: transaksi kredit/partial tampil "LUNAS" dan tidak menampilkan jumlah kekurangan — paymentAmount selalu kosong saat init, effectiveChange = paidTotalBase - total (negatif = kekurangan)
- fix: indikator kembalian di halaman transaksi — hapus teks "Dikembalikan", sisakan simbol ↩ saja dengan tooltip

### Added
- feat: undo "kembalian dikembalikan" — tombol Batalkan di modal edit, POST /undo-return-change restore paid_total dari change_amount
- feat: indikator "↩ Dikembalikan" di kolom kembalian halaman transaksi (desktop + mobile)
- feat: tombol "Kembalian sudah dikembalikan" di edit transaksi — POST /transactions/{id}/return-change, paid_total disesuaikan ke exact total, DB konsisten tanpa baris transaksi baru
- feat: share struk sebagai gambar JPEG via WhatsApp/Telegram (html2canvas + Web Share API, fallback download)
- feat: settings panel nota — ukuran kertas 58mm/80mm, nama toko/alamat/telepon/footer, toggle logo & barcode, simpan ke localStorage
- feat: tombol Download JPG struk
- feat: Arus Kas — CRUD pengeluaran operasional, ringkasan harian pemasukan vs pengeluaran, saldo bersih
- feat: Laporan Laba Rugi — omzet, HPP, laba kotor, margin, top produk menguntungkan, rekap harian per periode
- feat: Rekap Shift — ringkasan penjualan harian per kasir dengan print support
- feat: Tombol Batalkan Transaksi (restore stok otomatis)
- feat: Menu sidebar baru: Rekap Shift, Arus Kas, Laba Rugi

### Fixed
- fix: edit transaksi lunas — produk dikurangi duplikat item (hapus $isPaid ADD-mode di backend, selalu pakai REPLACE semantics)
- fix: kembalian tidak muncul saat produk dikurangi dari transaksi lunas/kredit (ganti formula ke effectiveChange = paidTotalBase + payment - total)
- fix: status tidak berubah saat produk dikurangi membuat total di bawah paid_total (tambah overpaid display saat canEditPayment=false)
- fix: kolom ubah harga kasir tampil angka berlebih — ganti formatNumberInput pakai parseFloat+regex, cast selling_price ke Number() di cart store
- fix: catatan produk (item notes) tidak tersimpan ke DB — tambah `notes` ke TransactionItem::$fillable, fix TransactionController::update() validation + array building + create, fix EditTransactionModal save payload
- fix: thousand separator angka di Bluetooth thermal print — ganti toLocaleString('id-ID') dengan regex `/\B(?=(\d{3})+(?!\d))/g` yang reliable di semua device
- fix: dark mode tidak reset saat berpindah halaman — ganti useEffect dep `[]` ke `[isDark]` di Layout.tsx
- fix: import/export transactions error 404 — tambah route POST /import/transactions & GET /export/template/transactions
- fix: hapus sisa \Log::info/\Log::error dari ExportImportController.importProducts
- Hapus semua debug console.log/warn/time dari frontend
- Hapus debug Log::info dari ProductController
- Ganti Cache::flush() dengan clearProductCache() yang selektif
- Hapus dead cached code path di ProductController.index()
- Hapus debug API routes (/test-transactions, /test-transaction-detail)
- Hapus refreshProductsCache() yang tidak terpakai dari POS page
- Bersihkan broadcast.ts dari debug logs
- Fix ProductController update: exclude units/prices/variants dari product data

### Changed
- Refactor DashboardController: ekstrak helper getTopGainers() (sebelumnya duplikasi 3x)
- refactor: ekstrak ProductFormModal sebagai komponen terpisah dari products/page.tsx
- refactor: hapus semua console.log/error/warn dari seluruh frontend (16 file)
- refactor: bersihkan dead state, redundant comments, dan inline komentar di transactions/page.tsx, products/page.tsx, sync.ts, db.ts

### Removed
- Debug pages: /debug dan /debug-transactions dihapus
- Unnecessary test files dan one-time scripts

## [1.0.0] - 2025-12-02

### Added
- Initial release: POS App dengan Laravel backend dan Next.js frontend
- Sistem autentikasi dengan Laravel Sanctum
- CRUD Produk dengan satuan, varian, dan harga alternatif
- Sistem kasir (POS) dengan dukungan offline
- Dashboard statistik penjualan
- Manajemen transaksi dan riwayat
- Manajemen pelanggan dan tier (Bronze/Silver/Gold/Platinum)
- Multi-store management (backend ready)
- Export/Import CSV
- Backup JSON
- Dark/Light mode dengan Zustand
- Offline support via IndexedDB (Dexie.js) dan Service Worker
