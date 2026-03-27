Debug sistematis dari error message atau stack trace.

Argumen: $ARGUMENTS — tempel error message, stack trace, atau deskripsi masalah di sini.

Langkah:
1. Baca dan pahami error/stack trace yang diberikan
2. Identifikasi:
   - Tipe error (TypeError, 500, 401, CORS, dll)
   - File dan baris yang disebutkan di stack trace
   - Kondisi yang menyebabkan error (request apa, data apa)
3. Baca file yang relevan di lokasi error tersebut
4. Telusuri root cause — jangan hanya baca symptom:
   - Apakah data yang masuk tidak sesuai ekspektasi?
   - Apakah ada null/undefined yang tidak di-handle?
   - Apakah ada race condition atau timing issue?
   - Apakah ada konfigurasi yang salah?
5. Jelaskan root cause dengan jelas dalam 2-3 kalimat
6. Buat fix minimal — hanya ubah yang perlu
7. Jelaskan kenapa fix ini menyelesaikan masalah
8. Cek apakah ada potensi side effect

Untuk error Laravel: cek `backend/storage/logs/laravel.log` jika relevan.
Untuk error Next.js: cek browser console dan network tab.
