Smart commit dengan Conventional Commits format.

Argumen opsional: $ARGUMENTS (contoh: pesan commit manual, atau "all" untuk stage semua)

Langkah:
1. Jalankan `git status` dan `git diff --staged` (jika ada staged), atau `git diff` (jika belum ada)
2. Analisis semua perubahan secara menyeluruh
3. Tentukan tipe commit yang tepat:
   - `feat:` — fitur baru
   - `fix:` — perbaikan bug
   - `security:` — perubahan keamanan
   - `refactor:` — refactor tanpa perubahan perilaku
   - `chore:` — task teknis (dependency, config)
   - `docs:` — dokumentasi saja
   - `perf:` — optimasi performa
   - `test:` — menambah/mengubah test
4. Tulis commit message format:
   ```
   <tipe>: <deskripsi singkat imperatif, maks 72 karakter>

   <body opsional: jelaskan "kenapa", bukan "apa">
   ```
5. Update file dokumentasi sesuai CLAUDE.md:
   - PROGRESS.md — pindahkan item ke ✅ Selesai dengan tanggal hari ini
   - TODO.md — centang item yang selesai
   - BUGLOG.md — update status jadi "✅ Selesai — [tanggal]"
   - CHANGELOG.md — tambahkan entry di [Unreleased]
6. Stage semua file (termasuk docs) lalu commit
7. Konfirmasi dengan `git log --oneline -3`

Jangan push kecuali diminta. Jangan skip update dokumentasi.
