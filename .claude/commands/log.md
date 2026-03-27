Explore git history secara interaktif dan informatif.

Argumen opsional: $ARGUMENTS (contoh: "produk", "login", "v1.0.0..HEAD", atau nama file)

Langkah:
1. Tentukan scope berdasarkan argumen:
   - Kosong → tampilkan 20 commit terakhir
   - Kata kunci → cari commit yang mengandung kata tersebut
   - File → tampilkan history file tersebut
   - Range → tampilkan commit di range tersebut

2. Jalankan perintah yang relevan:
```bash
# History umum
git log --oneline --graph --decorate -20

# Cari commit berdasarkan pesan
git log --oneline --grep="$ARGUMENTS"

# History file tertentu
git log --oneline --follow -- path/to/file

# Siapa mengubah apa di file ini
git log --oneline -p -- path/to/file | head -100

# Perubahan di range
git log --oneline v1.0.0..HEAD

# Siapa yang paling banyak commit
git shortlog -sn --no-merges
```

3. Tampilkan hasil dengan format yang mudah dibaca
4. Jika menemukan commit yang menarik, tawarkan untuk:
   - Lihat detail: `git show <hash>`
   - Lihat diff: `git diff <hash>~1 <hash>`
   - Checkout ke commit itu: `git checkout <hash>` (tanya konfirmasi dulu)

Jangan jalankan perintah destruktif (reset, rebase) tanpa konfirmasi eksplisit.
