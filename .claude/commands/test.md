Generate dan jalankan test cases untuk kode yang disebutkan.

Argumen: $ARGUMENTS — nama file, fungsi, atau fitur yang ingin di-test.

Langkah:
1. Baca file yang disebutkan dan pahami logikanya
2. Identifikasi jenis test yang tepat:
   - **Unit test** — fungsi/method terisolasi
   - **Feature/Integration test** — endpoint API + DB (Laravel)
   - **Component test** — React component (jika ada Jest/Vitest setup)
3. Untuk **Laravel** (`backend/tests/`):
   - Gunakan `php artisan test` atau `./vendor/bin/pest`
   - Buat Feature test untuk endpoint API
   - Test: happy path, validation error, unauthorized (401), forbidden (403)
   - Contoh struktur: `tests/Feature/Api/ProductTest.php`
4. Untuk **Next.js** (`frontend/`):
   - Cek apakah Jest/Vitest sudah di-setup (`package.json`)
   - Jika belum ada setup, tanya apakah ingin di-setup dulu
5. Tulis test cases yang mencakup:
   - ✅ Happy path (input valid, hasil benar)
   - ❌ Input invalid / edge case
   - 🔐 Akses tanpa auth → 401
   - 🚫 Akses role salah → 403
6. Jalankan test dan tampilkan hasilnya
7. Jika ada test yang gagal, analisis dan tawarkan fix
