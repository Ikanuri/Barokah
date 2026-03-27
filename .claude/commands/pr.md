Buat Pull Request ke GitHub menggunakan `gh` CLI.

Argumen opsional: $ARGUMENTS (contoh: judul PR, atau base branch tujuan)

Langkah:
1. Jalankan `git status` — pastikan tidak ada perubahan yang belum di-commit
2. Jalankan `git log main..HEAD --oneline` untuk lihat semua commit yang akan masuk PR
3. Jalankan `git diff main...HEAD --stat` untuk ringkasan file yang berubah
4. Analisis semua perubahan dan buat:
   - **Judul PR**: singkat, format Conventional Commits (maks 70 karakter)
   - **Body PR** dengan format:
     ```
     ## Summary
     - <bullet point perubahan utama>

     ## Type of Change
     - [ ] Bug fix
     - [ ] New feature
     - [ ] Security improvement
     - [ ] Refactoring
     - [ ] Documentation

     ## Test Plan
     - [ ] <langkah test manual>

     ## Notes
     <catatan tambahan jika ada>
     ```
5. Cek apakah branch sudah di-push: `git status -sb`
6. Jika belum, push dulu: `git push -u origin <branch>`
7. Buat PR: `gh pr create --title "..." --body "..."`
8. Tampilkan URL PR yang berhasil dibuat

Jika `gh` belum login, instruksikan: `gh auth login`
