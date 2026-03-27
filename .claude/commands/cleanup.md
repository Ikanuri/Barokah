Hapus dead code, file sampah, dan debug artifacts dari proyek.

Argumen opsional: $ARGUMENTS (contoh: "backend", "frontend", atau nama file spesifik)

Langkah:
1. Scan area yang disebutkan (atau seluruh proyek jika kosong)

**A. Debug artifacts:**
```bash
# Cari console.log di frontend
grep -r "console\.log\|console\.warn\|console\.error\|console\.time" frontend/src/ --include="*.ts" --include="*.tsx"

# Cari Log::info / dump / dd di backend
grep -r "Log::info\|dump(\|dd(\|var_dump(" backend/app/
```

**B. Dead code:**
- Variabel yang dideklarasi tapi tidak pernah dipakai
- Fungsi yang tidak pernah dipanggil
- Import yang tidak digunakan
- State React yang tidak dipakai di render
- Route yang mengarah ke controller yang tidak ada

**C. File sampah:**
- File `.bak`, `.old`, `.tmp`
- Halaman debug atau test yang tertinggal
- `console.log` di file konfigurasi

**D. Commented-out code:**
- Kode yang di-comment lebih dari 2 minggu → hapus (git history menyimpannya)

Laporan sebelum menghapus:
- Tampilkan semua temuan
- Minta konfirmasi untuk setiap kategori
- Jangan hapus komentar yang bersifat dokumentasi atau `TODO:`
- Setelah cleanup, jalankan `git diff --stat` untuk konfirmasi
