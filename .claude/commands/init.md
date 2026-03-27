Inisialisasi struktur project baru (fitur, module, atau endpoint baru) di dalam proyek POS ini.

Argumen: $ARGUMENTS — deskripsikan apa yang ingin dibuat. Contoh: "endpoint API produk bundling", "halaman laporan stok", "model CustomerAddress"

Langkah:
1. Analisis argumen dan tentukan scope:
   - Hanya backend (Laravel)?
   - Hanya frontend (Next.js)?
   - Full-stack (keduanya)?
2. Buat daftar file yang perlu dibuat:

**Backend:**
- Migration: `backend/database/migrations/YYYY_MM_DD_create_xxx_table.php`
- Model: `backend/app/Models/NamaModel.php`
- Controller: `backend/app/Http/Controllers/Api/NamaController.php`
- Route tambahan di: `backend/routes/api.php`

**Frontend:**
- Halaman: `frontend/src/app/nama-halaman/page.tsx`
- Komponen: `frontend/src/components/NamaKomponen.tsx`
- API call di: `frontend/src/lib/api.ts` (jika perlu fungsi baru)

3. Tanya konfirmasi sebelum membuat file
4. Generate boilerplate sesuai konvensi proyek:
   - Controller → ada try-catch, response format `{ message, data, error }`
   - Page → pakai `<Layout>`, support dark mode
   - Model → ada `$fillable`, relasi yang relevan
5. Tambahkan route baru dengan middleware yang tepat (role sesuai fitur)
6. Laporan: file apa saja yang dibuat dan langkah selanjutnya
