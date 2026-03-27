Analisis dan optimasi performa kode.

Argumen: $ARGUMENTS — file, endpoint, atau halaman yang ingin dianalisis.

**A. Backend Laravel:**
1. Baca controller yang disebutkan
2. Cari N+1 query problem:
   - Ada `->get()` di dalam loop?
   - Relasi diakses tanpa `with()` (eager loading)?
3. Cari query yang tidak perlu:
   - `SELECT *` padahal hanya butuh beberapa kolom?
   - Query dijalankan berulang untuk data yang sama?
4. Cek apakah bisa pakai cache:
   - Data yang jarang berubah (produk, kategori) → `Cache::remember()`
   - Response yang sering diminta dengan parameter sama
5. Cek pagination — apakah data besar dikembalikan tanpa limit?

**B. Frontend Next.js:**
1. Baca komponen/halaman yang disebutkan
2. Cari unnecessary re-render:
   - State yang berubah tapi tidak dipakai di render?
   - Object/array dibuat baru di setiap render (seharusnya `useMemo`)?
   - Fungsi dibuat ulang tiap render (seharusnya `useCallback`)?
3. Cari API call berlebihan:
   - Sama request dipanggil berkali-kali?
   - Tidak ada debounce untuk search/input?
4. Cek ukuran bundle:
   - Import seluruh library padahal hanya butuh satu fungsi?
   - Komponen besar yang bisa di-lazy load?

**C. Rekomendasi:**
Urutkan berdasarkan impact vs effort:
- 🚀 Quick win — dampak besar, effort kecil
- 🔧 Worth doing — dampak sedang, effort sedang
- 📌 Nice to have — dampak kecil

Implementasi hanya setelah konfirmasi.
