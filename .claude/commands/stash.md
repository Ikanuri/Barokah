Kelola git stash — simpan, lihat, dan terapkan perubahan sementara.

Argumen opsional: $ARGUMENTS (contoh: "save", "list", "pop", "apply 0", "drop 1", atau deskripsi stash)

**Perintah yang tersedia:**

```bash
# Simpan semua perubahan ke stash
git stash push -m "deskripsi perubahan"

# Lihat semua stash yang tersimpan
git stash list

# Terapkan stash terbaru (dan hapus dari list)
git stash pop

# Terapkan stash tertentu tanpa hapus
git stash apply stash@{0}

# Lihat isi stash sebelum diterapkan
git stash show -p stash@{0}

# Hapus stash tertentu
git stash drop stash@{0}

# Hapus semua stash (konfirmasi dulu!)
git stash clear
```

Langkah:
1. Jika argumen kosong → tampilkan `git stash list` dan tanya apa yang ingin dilakukan
2. Jika argumen berisi deskripsi → simpan stash dengan pesan tersebut
3. Sebelum `pop` atau `apply` → tampilkan preview isi stash dengan `git stash show -p`
4. Jangan jalankan `git stash clear` tanpa konfirmasi eksplisit dari user
5. Setelah operasi, tampilkan `git status` untuk konfirmasi kondisi working directory

Tips: stash berguna untuk berpindah branch sementara tanpa commit perubahan yang belum selesai.
