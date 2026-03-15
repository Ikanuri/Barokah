# Progress POS App

## ✅ Selesai

- **2026-03-15** — Security: tambah role-based middleware di backend (admin-only & admin|manager groups), auth guard proaktif di Layout.tsx, redirect login jika sudah auth, pindah theme toggle ke dalam card login
- **2026-03-12** — Implementasi Arus Kas: migration expenses, ExpenseController CRUD, endpoint /expenses/summary, halaman /cash-flow
- **2026-03-12** — Implementasi Laporan Laba Rugi: endpoint /dashboard/profit-loss + halaman /profit-loss dengan date range picker
- **2026-03-12** — Implementasi Rekap Shift: endpoint /dashboard/shift-recap + halaman /shift-recap dengan print support
- **2026-03-12** — Tambah tombol Batalkan di halaman Transaksi (restore stok otomatis via existing cancel API)
- **2026-03-12** — Update sidebar: tambah menu Rekap Shift, Arus Kas, Laba Rugi
- **2026-03-12** — Fix dark mode reset saat berpindah tab (Layout.tsx — ganti dep `[]` → `[isDark]`)
- **2026-03-12** — Fix import/export transactions: tambah route + method importTransactions & getTransactionTemplate
- **2026-03-12** — Hapus sisa debug \Log::info/\Log::error dari ExportImportController
- **2026-03-12** — Fix catatan produk (item notes) tidak tersimpan ke DB: tambah `notes` di TransactionItem::$fillable, fix TransactionController::update() (validasi + array building + create), fix EditTransactionModal payload
- **2026-03-13** — Fix print preview kembalian: paid_amount direkonstruksi dari total+change_amount; fix JSX zero rendering (00 di bawah subtotal); fix modal edit selalu kosong paymentAmount saat init (unpaid/kredit tampil LUNAS); fix overpaid source dari change_amount bukan paid_total; simpan versi checkpoint v1.1.0
- **2026-03-12** — Improve ThermalPrintPreview: share struk via WA/TG sebagai gambar JPEG (html2canvas + Web Share API), settings panel nota (ukuran kertas 58/80mm, nama toko, alamat, footer, logo, barcode) dengan localStorage persistence, Download JPG button
- **2026-03-12** — Fix thousand separator di Bluetooth thermal print: ganti toLocaleString('id-ID') dengan regex yang konsisten di semua perangkat

- **2026-03-12** — Hapus semua debug console.log/warn/time dari frontend
- **2026-03-12** — Hapus debug Log::info dari ProductController
- **2026-03-12** — Ganti Cache::flush() dengan clearProductCache() yang selektif
- **2026-03-12** — Hapus dead cached code path di ProductController.index()
- **2026-03-12** — Hapus debug API routes (/test-transactions, /test-transaction-detail)
- **2026-03-12** — Hapus refreshProductsCache() yang tidak terpakai dari POS page
- **2026-03-12** — Refactor DashboardController: ekstrak getTopGainers() (sebelumnya copy-paste 3x)
- **2026-03-12** — Bersihkan broadcast.ts dari debug logs
- **2026-03-12** — Fix ProductController update: exclude units/prices/variants dari product data
- **2026-03-12** — Refactor frontend: ekstrak ProductFormModal, hapus semua console.log dari seluruh frontend, bersihkan dead state & komentar redundan di transactions/page.tsx dan products/page.tsx

## 🔄 Sedang Dikerjakan

(belum ada)

## ⏳ Belum Dimulai

- Implementasi Settings save ke API (settings/page.tsx)
- Tambah X-Store-ID header di frontend api.ts
- Tambah try-catch error handling di semua controller
- Lengkapi backup data (customer_tiers, stores, product_prices, product_variants)
- Update Service Worker strategy ke NetworkFirst
- Validasi format phone number di form
- Refactor pos/page.tsx (2000+ baris, terlalu besar)
