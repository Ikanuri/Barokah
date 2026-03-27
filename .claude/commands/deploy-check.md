Jalankan checklist pre-deployment untuk proyek POS ini sebelum push ke production.

Periksa semua item berikut:

**Backend:**
- [ ] `APP_ENV=production` dan `APP_DEBUG=false` di .env production
- [ ] Tidak ada `Log::info` / `dump()` / `dd()` debug yang tertinggal
- [ ] `php artisan config:cache` dan `php artisan route:cache` siap dijalankan
- [ ] Semua migration sudah ter-commit
- [ ] File `.env` tidak ter-commit ke git

**Frontend:**
- [ ] Tidak ada `console.log` / `console.warn` / `console.error` di kode
- [ ] `NEXT_PUBLIC_API_URL` sudah di-set untuk production
- [ ] Build berhasil: `npm run build` tanpa error

**Security:**
- [ ] Semua endpoint sensitif sudah punya role middleware
- [ ] Auth guard aktif di Layout.tsx
- [ ] Login redirect aktif

**Dokumentasi:**
- [ ] CHANGELOG.md sudah di-update
- [ ] Versi di package.json sudah di-bump jika perlu

Untuk setiap item, cek file yang relevan dan tandai ✅ atau ❌.
Jika ada ❌, jelaskan cara memperbaikinya.
