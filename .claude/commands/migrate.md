Buat, review, dan jalankan database migration Laravel.

Argumen: $ARGUMENTS (contoh: "fresh --seed", "rollback", "status", atau "buat tabel stock_movements")

**Mode 1 — Jalankan migration:**
Jika argumen adalah perintah artisan:
```bash
cd backend
php artisan migrate                    # default
php artisan migrate:fresh --seed       # reset + seed ulang
php artisan migrate:rollback           # rollback 1 batch
php artisan migrate:status             # lihat status semua migration
```

**Mode 2 — Buat migration baru:**
Jika argumen berisi "buat" atau deskripsi tabel:
1. Generate migration: `php artisan make:migration create_xxx_table`
2. Buka file migration yang dibuat
3. Analisis kebutuhan dari argumen dan isi kolom yang tepat:
   - Tipe data yang sesuai (string, decimal, unsignedBigInteger, dll)
   - Index untuk kolom yang sering di-query
   - Foreign key dengan `constrained()` dan `cascadeOnDelete()` jika perlu
   - `softDeletes()` jika data tidak boleh dihapus permanen
4. Tunjukkan hasil migration untuk review sebelum dijalankan
5. Jalankan migration setelah konfirmasi

**Review checklist migration:**
- [ ] Kolom sudah memiliki tipe data yang tepat?
- [ ] Index pada foreign key dan kolom yang sering di-filter?
- [ ] `nullable()` hanya untuk kolom yang memang opsional?
- [ ] Down method bisa rollback dengan aman?
