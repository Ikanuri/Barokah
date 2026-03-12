# Architecture Decisions - POS App

## Monorepo: Backend + Frontend dalam Satu Repo
Laravel (backend/) dan Next.js (frontend/) disimpan dalam satu repository untuk mempermudah koordinasi perubahan lintas stack. Start/stop menggunakan `start.bat` / `stop.bat`.

## Laravel Sanctum untuk Autentikasi
Dipilih karena cocok untuk SPA (Single Page Application) + API. Token disimpan di cookie/localStorage, request harus menyertakan header `Authorization: Bearer {token}`.

## Zustand untuk State Management Frontend
Dipilih atas Redux karena lebih ringan dan boilerplate-nya minimal. Stores yang ada:
- `cart.ts` — item keranjang belanja POS
- `auth.ts` — data user yang sedang login
- `theme.ts` — toggle dark/light mode, persist ke localStorage

## App Router Next.js 14
Menggunakan App Router (bukan Pages Router). Semua halaman ada di `src/app/*/page.tsx`. Layout global ada di `src/app/layout.tsx`.

## Offline-First dengan IndexedDB + Service Worker
Menggunakan Dexie.js untuk IndexedDB dan Workbox untuk Service Worker. Transaksi POS bisa dilakukan saat offline dan di-sync saat kembali online via `lib/sync.ts`.

## Multi-Store (Partially Implemented)
Backend sudah siap (model punya `store_id`, ada middleware `InjectStoreId`), tapi frontend belum mengirim `X-Store-ID` header. Keputusan: jangan hapus fitur ini, tapi selesaikan integrasi frontend.

## Cache Produk dengan Redis/Laravel Cache
ProductController menggunakan Laravel Cache untuk cache daftar produk. Cache di-invalidate secara selektif via `clearProductCache()` (bukan `Cache::flush()` yang menghapus semua cache).

## Spatie Permission untuk Role-Based Access
Menggunakan package `spatie/laravel-permission`. Role yang ada: `admin` dan `kasir`. Admin bisa akses semua, kasir hanya bisa akses POS dan transaksi sendiri.

## Fitur yang Sengaja Tidak Dihapus (Meski Over-Engineered)
Beberapa fitur dinilai over-engineered tapi tidak dihapus karena sudah ada data/relasi di DB:
- **Customer Tiers** — Bronze/Silver/Gold/Platinum
- **Product Variants** — stored as JSON
- **Dynamic Pricing** — quantity-based tiers
- **Stock Movement** — tracking history tanpa UI
- **Bluetooth Printer** — via Web Bluetooth API
