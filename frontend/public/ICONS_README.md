# PWA Icons Setup

## Cara Generate Icons:

### Option 1: Online Tool (Recommended)
1. Buka https://realfavicongenerator.net/
2. Upload logo/icon Anda (minimum 512x512 px)
3. Download hasil generate
4. Extract dan copy semua file ke folder `public/`

### Option 2: Manual dengan ImageMagick
```bash
# Install ImageMagick terlebih dahulu
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# Generate semua ukuran
magick icon-placeholder.svg -resize 72x72 icon-72x72.png
magick icon-placeholder.svg -resize 96x96 icon-96x96.png
magick icon-placeholder.svg -resize 128x128 icon-128x128.png
magick icon-placeholder.svg -resize 144x144 icon-144x144.png
magick icon-placeholder.svg -resize 152x152 icon-152x152.png
magick icon-placeholder.svg -resize 192x192 icon-192x192.png
magick icon-placeholder.svg -resize 384x384 icon-384x384.png
magick icon-placeholder.svg -resize 512x512 icon-512x512.png
magick icon-placeholder.svg -resize 32x32 favicon.ico
```

### Option 3: Gunakan PWA Asset Generator
```bash
npm install -g pwa-asset-generator
pwa-asset-generator icon-placeholder.svg ./public --icon-only --favicon
```

## Sementara:
File `icon-placeholder.svg` sudah disediakan sebagai placeholder.
Aplikasi tetap bisa berjalan, tapi icon akan tampil sebagai teks "POS App".

Untuk production, replace dengan icon yang proper!
