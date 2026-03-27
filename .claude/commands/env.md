Setup environment development dari nol untuk proyek POS ini.

Argumen opsional: $ARGUMENTS (contoh: "backend", "frontend", "full", atau "fresh")

**A. Backend Laravel Setup:**
```bash
cd backend
cp .env.example .env          # buat file .env
composer install               # install dependencies
php artisan key:generate       # generate APP_KEY
php artisan migrate            # buat struktur tabel
php artisan db:seed            # isi data awal (admin, kasir, produk demo)
php artisan serve              # jalankan di port 8000
```

Cek .env minimal:
- `DB_DATABASE=pos_kasir`
- `DB_USERNAME=root`
- `DB_PASSWORD=` (sesuai setup lokal)
- `APP_URL=http://localhost:8000`

**B. Frontend Next.js Setup:**
```bash
cd frontend
npm install                    # install dependencies
cp .env.local.example .env.local  # jika ada
npm run dev                    # jalankan di port 3000
```

**C. Verifikasi:**
1. Backend: buka `http://localhost:8000/api/health` → harus return `{"status":"ok"}`
2. Frontend: buka `http://localhost:3000` → harus tampil halaman login
3. Login dengan: `admin@pos.com` / `password`

**D. Troubleshooting umum:**
- Port 8000 bentrok → `php artisan serve --port=8001`
- DB connection error → cek MySQL service berjalan
- CORS error → cek `APP_URL` di `.env` backend sudah benar
