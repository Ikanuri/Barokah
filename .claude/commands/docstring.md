Generate docstring, JSDoc, atau komentar untuk kode yang disebutkan.

Argumen: $ARGUMENTS — nama file atau fungsi yang ingin didokumentasikan.

Langkah:
1. Baca file yang disebutkan
2. Tentukan format dokumentasi yang tepat:
   - **PHP (Laravel)** → PHPDoc `/** */`
   - **TypeScript/JavaScript** → JSDoc `/** */`
   - **Inline comment** → untuk logika yang tidak obvious saja
3. Untuk setiap fungsi/method, generate:
   ```php
   /**
    * Deskripsi singkat apa yang dilakukan fungsi ini.
    *
    * @param  Type  $nama  Penjelasan parameter
    * @return Type         Penjelasan return value
    * @throws ExceptionType  Kapan exception ini dilempar
    */
   ```
   atau untuk TypeScript:
   ```typescript
   /**
    * Deskripsi singkat.
    * @param nama - Penjelasan
    * @returns Penjelasan return value
    */
   ```
4. Prinsip penulisan:
   - Jelaskan "kenapa" bukan "apa" (kode sudah menjelaskan "apa")
   - Dokumentasi untuk fungsi publik / API — wajib
   - Fungsi privat sederhana — skip jika sudah jelas dari nama
   - Jangan tulis komentar yang hanya mengulang kode
5. Tambahkan komentar inline hanya untuk logika yang benar-benar tidak obvious

Jangan tambah docstring ke kode yang tidak diminta.
