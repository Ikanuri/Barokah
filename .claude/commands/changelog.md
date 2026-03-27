Generate atau update CHANGELOG.md dari git history.

Argumen opsional: $ARGUMENTS (contoh: "v1.2.0" untuk tag versi tertentu, atau "since v1.0.0")

Langkah:
1. Baca CHANGELOG.md yang ada untuk pahami format dan versi terakhir
2. Jalankan `git log --oneline --no-merges` untuk lihat semua commit
3. Jika ada argumen versi, jalankan `git log <versi>..HEAD --oneline --no-merges`
4. Kelompokkan commit berdasarkan tipe:
   - **Security** — commit dengan prefix `security:`
   - **Added** — commit dengan prefix `feat:`
   - **Fixed** — commit dengan prefix `fix:`
   - **Changed** — commit dengan prefix `refactor:` atau `perf:`
   - **Chore** — commit dengan prefix `chore:` atau `docs:`
5. Tulis entry baru di bagian `[Unreleased]` dengan format Keep a Changelog:
   ```markdown
   ## [Unreleased]
   ### Security
   ### Added
   ### Fixed
   ### Changed
   ```
6. Jika argumen berupa versi baru (contoh: "v1.2.0"), ubah `[Unreleased]` jadi `[1.2.0] - YYYY-MM-DD`
7. Simpan ke CHANGELOG.md

Format tanggal: YYYY-MM-DD. Tulis dalam Bahasa Indonesia.
