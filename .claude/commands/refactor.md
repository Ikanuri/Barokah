Refactor kode tanpa mengubah perilaku (behavior-preserving).

Argumen: $ARGUMENTS — sebutkan file atau fungsi yang ingin di-refactor, dan tujuannya.

Prinsip wajib:
- Perilaku HARUS identik sebelum dan sesudah refactor
- Jangan tambah fitur baru
- Jangan ubah API / interface publik kecuali diminta
- Minimal perubahan — jangan over-engineer

Langkah:
1. Baca file/fungsi yang disebutkan
2. Identifikasi masalah yang ada:
   - Duplikasi kode (DRY violation)
   - Fungsi terlalu panjang (> 50 baris)
   - Nama variabel/fungsi tidak jelas
   - Nested conditional yang dalam
   - Magic number / hardcoded string
3. Jelaskan rencana refactor dan minta konfirmasi sebelum mulai
4. Lakukan refactor secara bertahap — satu perubahan per langkah
5. Setelah selesai, bandingkan before/after dan konfirmasi perilaku sama
6. Update CHANGELOG.md: `refactor: deskripsi singkat`

Untuk Laravel: pastikan tidak ada perubahan di route, request/response format, atau DB query yang hasilnya berbeda.
Untuk React: pastikan props interface dan render output sama.
