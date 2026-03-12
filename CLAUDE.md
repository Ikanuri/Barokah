# POS App - Context for Claude

## Tech Stack
- **Backend:** Laravel 11, PHP 8.2, MySQL — `backend/`
- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS — `frontend/`
- **State Management:** Zustand (cart, auth, theme stores)
- **Offline:** IndexedDB (Dexie.js), Service Worker (Workbox)
- **Auth:** Laravel Sanctum
- **Database:** MySQL, nama DB: `pos_kasir`

## Struktur Folder Penting
```
backend/
  app/Http/Controllers/Api/   ← Semua API controller
  routes/api.php              ← Definisi semua route API
  app/Models/                 ← Eloquent models

frontend/
  src/app/*/page.tsx          ← Halaman Next.js (App Router)
  src/lib/api.ts              ← Axios instance & API calls
  src/store/                  ← Zustand stores (cart, auth, theme)
  src/components/             ← Komponen React
  public/sw.js                ← Service Worker
```

## Akun Default
- Admin: admin@pos.com / password
- Kasir: kasir@pos.com / password

## Aturan Coding Wajib
- Jangan tambahkan console.log/debug ke production code
- Gunakan try-catch di semua method controller Laravel
- Semua API response gunakan format: `{ message, data, error }`
- Frontend: gunakan Tailwind class, dukung dark mode (`dark:` prefix)
- Jangan commit file `.env`
- Hapus debug endpoint sebelum deploy production

## Aturan Wajib Setelah Selesai Task
Setiap kali berhasil menyelesaikan satu bug atau task:
1. Update PROGRESS.md — pindahkan item ke ✅ Selesai dengan tanggal hari ini
2. Centang item yang selesai di TODO.md
3. Update status item di BUGLOG.md menjadi "✅ Selesai — [tanggal]"
4. Tambahkan entry ke CHANGELOG.md di bagian [Unreleased]
   dengan format Conventional Commits
5. Jangan lanjut ke task berikutnya sebelum semua file diupdate
6. Laporkan ringkasan singkat: file apa saja yang diubah dan kenapa

## Konvensi Git
Branch naming:
- fix/bug-001-nama-singkat
- feat/nama-fitur
- chore/nama-task
- refactor/nama-komponen

Commit message (Conventional Commits):
- fix: deskripsi singkat
- feat: deskripsi singkat
- chore: deskripsi singkat
- refactor: deskripsi singkat
- docs: deskripsi singkat
