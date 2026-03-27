Bantu investigasi dan perbaiki bug: $ARGUMENTS

Langkah:
1. Pahami deskripsi bug dari argumen
2. Identifikasi area yang kemungkinan bermasalah:
   - Baca file yang relevan
   - Cari pola error di controller / komponen terkait
3. Jelaskan root cause yang ditemukan
4. Buat fix minimal — jangan ubah kode yang tidak terkait bug ini
5. Setelah fix, cek apakah ada side effect ke fitur lain
6. Update dokumentasi:
   - BUGLOG.md — tambahkan entry bug baru atau update status yang ada
   - CHANGELOG.md — tambahkan di [Unreleased]: `fix: deskripsi singkat`
   - PROGRESS.md dan TODO.md jika relevan

Konvensi branch: `fix/bug-XXX-nama-singkat`
Format commit: `fix: deskripsi singkat`

Prinsip: perbaiki root cause, bukan symptom.
