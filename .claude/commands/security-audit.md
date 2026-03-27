Lakukan audit keamanan lengkap pada proyek POS ini.

Periksa area berikut secara sistematis:

**1. Backend — Laravel API**
- Baca `backend/routes/api.php` → apakah semua route sensitif sudah punya middleware `role:admin` atau `role:admin|manager`?
- Cek semua controller di `backend/app/Http/Controllers/Api/` → apakah semua method punya try-catch?
- Cari pola `Log::info` atau `dump(` atau `dd(` → debug code yang tertinggal
- Cek apakah ada mass assignment yang tidak di-protect di Models
- Validasi input: apakah store/update method punya `$request->validate()`?

**2. Frontend — Next.js**
- Baca `frontend/src/components/Layout.tsx` → apakah ada auth guard (redirect jika !isAuthenticated)?
- Baca `frontend/src/app/login/page.tsx` → apakah ada redirect jika sudah login?
- Baca `frontend/src/lib/api.ts` → apakah 401 response sudah di-handle?
- Cari pola `console.log` atau `console.warn` yang tertinggal di src/
- Apakah token tersimpan aman? (localStorage vs cookie?)

**3. Konfigurasi**
- Apakah file `.env` ada di `.gitignore`?
- Apakah ada credential yang ter-commit ke git? (`git log --all --full-history -- "*.env"`)

Buat laporan dengan format:
- 🔴 KRITIS — harus diperbaiki sekarang
- 🟡 SEDANG — perlu diperhatikan
- 🟢 AMAN — sudah baik

Tawarkan untuk memperbaiki item 🔴 langsung.
