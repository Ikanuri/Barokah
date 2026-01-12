# 🏪 POS System - Multi-Store with PWA# POS Application# POS Kasir Toko - Aplikasi Point of Sale



Point of Sale (POS) system dengan support **multi-store** dan **Progressive Web App (PWA)**.



## ✨ Key FeaturesPoint of Sale (POS) system dengan fitur lengkap untuk manajemen kasir, inventori, dan laporan.Aplikasi web POS (Point of Sale) modern dengan fitur lengkap untuk manajemen toko retail/grosir. Dibangun dengan Laravel sebagai backend API dan Next.js sebagai frontend.



### 🏪 Multi-Store Management

- ✅ Support multiple stores/cabang

- ✅ Isolated data per store (products, transactions, users)## Tech Stack## 📱 QUICK START - Akses dari HP

- ✅ **Price synchronization** between stores  

- ✅ Store switching for admin users

- ✅ Per-store reporting and statistics

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS, Zustand**IP Laptop:** `10.29.57.28`

### 💰 Point of Sale (POS)

- ✅ Fast barcode scanning- **Backend**: Laravel 11, PHP 8.2, MySQL

- ✅ Multiple payment methods

- ✅ Customer management with tier system- **Features**: Voice input, fuzzy matching, real-time updates, dark mode### ⚡ Cara Tercepat (All-in-One):

- ✅ Real-time stock updates

- ✅ Receipt printing**Double-click:** `QUICK-START.bat` → Tunggu 15 detik → Browser otomatis terbuka!



### 📦 Product Management## Quick Start

- ✅ Multi-unit products (dus, karton, biji)

- ✅ Product variants### 🌐 Akses dari Internet (Ngrok):

- ✅ Alternative pricing (grosir, ecer)

- ✅ Low stock alerts### Prerequisites**Double-click:** `START-WITH-NGROK.bat` → **AUTO-START SEMUA + AUTO-DETECT URL + AUTO-CONFIG!** ⚡

- ✅ Category management

- PHP 8.2+

### 📊 Reporting & Analytics

- ✅ Sales statistics- Composer📖 **Panduan lengkap:** `START-WITH-NGROK-GUIDE.md` - Complete automation guide

- ✅ Cashier performance tracking

- ✅ Stock reports- Node.js 18+📖 **Setup manual:** `NGROK-SETUP.md` - Manual ngrok setup

- ✅ Revenue charts

- ✅ Per-store analytics- MySQL📖 **Visual guide:** Double-click `NGROK-GUIDE.html` - Interactive tutorial



### 💾 Backup & Export/Import- Git

- ✅ Full backup (JSON format)

- ✅ Export to CSV (products, transactions, users)### 🚨 Browser Tidak Tampil Apa-Apa?

- ✅ Import from CSV with merge/overwrite modes

- ✅ Telegram integration for backup delivery### Installation**Halaman blank/putih?** Double-click: `EMERGENCY-FIX.bat` → Tunggu proses selesai → Hard refresh browser (Ctrl+Shift+R)

- ✅ CSV templates for each entity



### 📱 Progressive Web App (PWA)

- ✅ Install on mobile/desktop1. **Clone repository**📖 **Panduan lengkap:** Buka `FIX-BROWSER-BLANK.html` untuk solusi detail

- ✅ Offline support

- ✅ App-like experience```bash

- ✅ Auto-update service worker

git clone <repository-url>### 🌐 Panduan Visual (Recommended):

---

cd pos-app**Double-click file:** `index.html` atau `PANDUAN-HP.html` untuk panduan interaktif

## 🚀 Quick Start

```

### Prerequisites

### 📝 Langkah Manual:

- PHP 8.1+

- Composer2. **Setup Backend**1. **Setup Firewall (1x saja):** Right-click `setup-firewall.bat` → Run as Administrator

- Node.js 18+

- MySQL 8.0+```bash2. **Start Backend:** Double-click `start-backend-network.bat`



### Installationcd backend3. **Start Frontend:** Double-click `start-frontend-network.bat`



#### 1. Backend Setup (Laravel)composer install4. **Buka di HP:** http://10.29.57.28:3000



```bashcp .env.example .env

cd backend

php artisan key:generate📖 **Troubleshooting:** Buka `TROUBLESHOOT-CSS.html` jika CSS tidak load

# Install dependencies

composer install```



# Copy environment file---

cp .env.example .env

3. **Setup Database**

# Configure database in .env

DB_DATABASE=pos_db- Create database: `pos_kasir`## 🚀 Fitur UtamaAplikasi Point of Sale

DB_USERNAME=root

DB_PASSWORD=- Update `.env` with database credentials



# Generate app key```bashAplikasi web POS (Point of Sale) modern dengan fitur lengkap untuk manajemen toko retail/grosir. Dibangun dengan Laravel sebagai backend API dan Next.js sebagai frontend.

php artisan key:generate

php artisan migrate

# Run migrations

php artisan migratephp artisan db:seed## � QUICK START - Akses dari HP



# Seed database (includes default stores)```

php artisan db:seed

**IP Laptop:** `10.29.57.28`

# Start server

php artisan serve4. **Setup Frontend**

# API running at http://localhost:8000

``````bash### Langkah Cepat:



#### 2. Frontend Setup (Next.js)cd ../frontend1. **Setup Firewall (1x saja):** Right-click `setup-firewall.bat` → Run as Administrator



```bashnpm install2. **Start Backend:** Double-click `start-backend-network.bat`

cd frontend

cp .env.example .env.local3. **Start Frontend:** Double-click `start-frontend-network.bat`

# Install dependencies

npm install```4. **Buka di HP:** http://10.29.57.28:3000



# Copy environment file

cp .env.local.example .env.local

5. **Update Environment Variables**📖 **Panduan lengkap:** Lihat file `CARA-AKSES-DARI-HP.md`

# Configure API URL in .env.local

NEXT_PUBLIC_API_URL=http://localhost:8000/api



# Run development serverBackend `.env`:---

npm run dev

# App running at http://localhost:3000```env



# Build for productionAPP_URL=http://10.29.57.28:8000## �🚀 Fitur Utama

npm run build

npm startFRONTEND_URL=http://10.29.57.28:3000

```

DB_DATABASE=pos_kasir### 1. **Stok Berjenjang (Multi-Level Stock)**

---

```- Manajemen stok dengan konversi otomatis (misal: 1 dus = 40 biji)

## 🔑 Default Credentials

- Support multiple unit per produk (biji, dus, karton, dll)

```

Admin:Frontend `.env.local`:- Tracking stok otomatis dalam unit terkecil

- Email: admin@pos.com

- Password: password```env- Alert stok minimum



Kasir:NEXT_PUBLIC_API_URL=http://10.29.57.28:8000/api- Riwayat pergerakan stok

- Email: kasir@pos.com

- Password: password```

```

### 2. **CRUD & Manajemen**

---

### Running the Application- ✅ Manajemen Produk (Create, Read, Update, Delete)

## 🏪 Multi-Store Features

- ✅ Manajemen Kategori

### Price Synchronization

**Backend** (Terminal 1):- ✅ Transaksi Penjualan

Update harga di 1 toko → sync ke toko lain dengan 1 API call:

```bash- ✅ Dashboard dengan statistik & chart

```bash

POST /api/stores/sync-pricescd backend- ✅ Role & Permission (Admin, Kasir, Manager)

{

  "source_store_id": 1,php artisan serve --host=0.0.0.0 --port=8000- ✅ Manajemen User

  "target_store_ids": [2, 3],

  "sync_type": "all",```

  "fields": ["selling_price", "base_price"]

}### 3. **Import/Export Data**

```

**Frontend** (Terminal 2):- Export produk ke CSV

### Store Filter

```bash- Export transaksi ke CSV

All API requests support `X-Store-ID` header:

cd frontend- Import produk dari CSV

```bash

# Get products from store 1npm run dev- Template CSV tersedia

curl -H "X-Store-ID: 1" http://localhost:8000/api/products

```

# Create product in store 2

curl -X POST http://localhost:8000/api/products \### 4. **Barcode & Printing**

  -H "X-Store-ID: 2" \

  -d '{"name": "Product", ...}'Access:- Scan barcode untuk input produk cepat

```

- **Frontend**: http://10.29.57.28:3000- Support barcode per unit (dus, karton, dll)

---

- **Backend API**: http://10.29.57.28:8000/api- Integrasi thermal printer untuk cetak struk

## 📦 Backup & Export/Import

- **Health Check**: http://10.29.57.28:8000/api/health- Print preview untuk struk transaksi

### Full Backup



```bash

# Download full backup (JSON)### Default Login### 5. **Smart Query & Voice Command**

GET /api/backup/full

- **Admin**: admin@pos.com / admin123- Pencarian adaptive: "sedap goreng 5 biji" → otomatis input

# Restore from backup

POST /api/backup/restore- **Kasir**: kasir@pos.com / kasir123- Voice search support (Web Speech API)



# Send backup to Telegram- Auto-complete produk

POST /api/backup/telegram

```## Features- Search by name, SKU, atau barcode



### Export/Import CSV



Supported entities:### Core### 6. **Multi-User Real-Time**

- Products

- Transactions  - ✅ Multi-role authentication (Admin, Kasir, Manager)- Akses simultan dari beberapa user

- Users

- Categories- ✅ Product management (CRUD, variants, units, pricing tiers)- Real-time update (Pusher/WebSocket ready)

- Customers

- ✅ Category management- Session management yang aman

```bash

# Export- ✅ Transaction processing- Role-based access control

GET /api/export/products

- ✅ Stock management & history

# Import (with mode: add/overwrite)

POST /api/import/products- ✅ Customer tiers (Member, Silver, Gold, Platinum)### 7. **UI/UX Modern**



# Download template- Design inspired by Telegram

GET /api/export/template/products

```### Advanced- Responsive untuk desktop & mobile



---- ✅ Voice input for quick product search- Dark mode ready



## 📱 PWA Installation- ✅ Fuzzy matching (typo-tolerant search)- Smooth animations & transitions



### Mobile (Android/iOS):- ✅ Export/Import (Excel, PDF)



1. Open app in browser- ✅ Transaction filtering by date & cashier---

2. Tap **"Add to Home Screen"**

3. App icon appears on home screen- ✅ Cashier performance stats



### Desktop (Chrome/Edge):- ✅ Dark mode support## 📋 Requirements



1. Open app in browser  - ✅ Responsive design (mobile-ready)

2. Click **Install icon** in address bar

3. App opens in standalone window### Backend (Laravel)



---## Project Structure- PHP >= 8.1



## 📚 Documentation- Composer



- **[MULTI_STORE_SUMMARY.md](MULTI_STORE_SUMMARY.md)** - Complete multi-store overview```- MySQL/MariaDB

- **[MULTI_STORE_IMPLEMENTATION.md](MULTI_STORE_IMPLEMENTATION.md)** - Implementation guide

- **[CONTROLLER_UPDATE_GUIDE.md](CONTROLLER_UPDATE_GUIDE.md)** - Controller update patternspos-app/- Extensions: OpenSSL, PDO, Mbstring, Tokenizer, XML, Ctype, JSON

- **[BACKUP_EXPORT_IMPORT_GUIDE.md](BACKUP_EXPORT_IMPORT_GUIDE.md)** - Backup & export guide

├── backend/          # Laravel API

---

│   ├── app/### Frontend (Next.js)

## 🎯 Features Roadmap

│   ├── database/- Node.js >= 18

### ✅ Completed

- Multi-store management│   ├── routes/- NPM atau Yarn

- Price synchronization

- Backup & restore system│   └── ...

- Export/Import CSV

- Telegram integration├── frontend/         # Next.js App---

- PWA support

- Dark mode│   ├── src/

- Customer tier system

│   │   ├── app/     # Pages## 🛠️ Instalasi

### 🚧 In Progress

- Frontend multi-store UI (store selector, management page)│   │   ├── components/

- Controller updates for store filtering

│   │   ├── lib/### 1. Clone Repository

### 📋 Planned

- Stock transfer between stores│   │   └── store/

- Inter-store reporting

- Automated sync scheduling│   └── ...```bash

- Store clusters/regions

- Receipt customization per store└── README.mdcd pos-app



---``````



## 📄 License



This project is licensed under the MIT License.## Development### 2. Setup Backend (Laravel)



---



**Built with ❤️ using Laravel & Next.js**### Adding New Features```bash


1. Backend: Add routes in `routes/api.php`cd backend

2. Backend: Create controller in `app/Http/Controllers/Api/`

3. Frontend: Add API call in `src/lib/api.ts`# Install dependencies

4. Frontend: Create page in `src/app/`composer install



### Database Changes# Copy .env file

```bashcopy .env.example .env

php artisan make:migration create_table_name

php artisan migrate# Generate application key

```php artisan key:generate



## Network Access# Configure database di .env

# DB_DATABASE=pos_kasir

To access from phone/other devices on same network:# DB_USERNAME=root

# DB_PASSWORD=

1. **Check IP address**: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)

2. **Update .env files** with your IP address# Run migrations

3. **Start backend with network binding**:php artisan migrate

   ```bash

   php artisan serve --host=0.0.0.0 --port=8000# Seed database (includes demo data)

   ```php artisan db:seed

4. **Ensure firewall allows port 8000 and 3000**

# Generate storage link

## Troubleshootingphp artisan storage:link



### Backend not accessible from network# Start server

- Check if running with `--host=0.0.0.0`php artisan serve

- Check firewall settings```

- Verify IP address in `.env` files

Backend akan berjalan di `http://localhost:8000`

### CORS errors

- Check `backend/config/cors.php`**Default Login:**

- Ensure `FRONTEND_URL` in backend `.env` matches frontend URL- Admin: `admin@pos.com` / `password`

- Kasir: `kasir@pos.com` / `password`

### Dark mode not working

- Clear browser cache (Ctrl+Shift+R)### 3. Setup Frontend (Next.js)

- Check localStorage for `theme` key

```bash

## Licensecd frontend



Proprietary - All rights reserved# Install dependencies

npm install
# atau
yarn install

# Configure .env.local (sudah ada default)
# NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Start development server
npm run dev
# atau
yarn dev
```

Frontend akan berjalan di `http://localhost:3000`

---

## 📚 Dokumentasi API

### Authentication

#### Login
```http
POST /api/login
Content-Type: application/json

{
  "email": "admin@pos.com",
  "password": "password"
}
```

#### Register
```http
POST /api/register
Content-Type: application/json

{
  "name": "Nama User",
  "email": "user@email.com",
  "password": "password",
  "password_confirmation": "password"
}
```

### Products

#### Get All Products
```http
GET /api/products
Authorization: Bearer {token}

# Query params:
# - search: pencarian
# - category_id: filter kategori
# - per_page: items per page
```

#### Create Product
```http
POST /api/products
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Mie Sedap Goreng",
  "sku": "MIE-001",
  "barcode": "8998866200011",
  "category_id": 1,
  "base_price": 2000,
  "selling_price": 2500,
  "base_unit": "biji",
  "stock_quantity": 400,
  "minimum_stock": 50,
  "units": [
    {
      "unit_name": "dus",
      "conversion_value": 40,
      "selling_price": 95000,
      "order": 1
    }
  ]
}
```

#### Search by Barcode
```http
GET /api/products/search/barcode?barcode=8998866200011
Authorization: Bearer {token}
```

### Transactions

#### Create Transaction
```http
POST /api/transactions
Authorization: Bearer {token}
Content-Type: application/json

{
  "items": [
    {
      "product_id": 1,
      "product_unit_id": null,
      "quantity": 5
    },
    {
      "product_id": 2,
      "product_unit_id": 3,
      "quantity": 2
    }
  ],
  "tax": 0,
  "discount": 0,
  "paid_amount": 100000,
  "payment_method": "cash"
}
```

#### Get Statistics
```http
GET /api/statistics?start_date=2024-01-01&end_date=2024-12-31
Authorization: Bearer {token}
```

### Export/Import

#### Export Products
```http
GET /api/export/products
Authorization: Bearer {token}
```

#### Import Products
```http
POST /api/import/products
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [CSV file]
```

---

## 🎯 Cara Menggunakan

### 1. Login
Akses `http://localhost:3000/login` dan masuk dengan kredensial default.

### 2. POS (Point of Sale)
- Klik menu "Kasir" di sidebar
- Ketik nama produk atau scan barcode
- Pilih unit (biji, dus, karton)
- Klik produk untuk menambah ke keranjang
- Atur jumlah item
- Pilih metode pembayaran
- Masukkan jumlah bayar
- Klik "Proses Pembayaran"

### 3. Manajemen Produk
- Klik menu "Produk"
- Tambah produk baru dengan klik tombol "+ Produk Baru"
- Set up unit berjenjang (misal: 1 dus = 40 biji)
- Upload gambar produk (optional)
- Set barcode per produk dan per unit

### 4. Laporan & Statistik
- Dashboard menampilkan:
  - Total transaksi hari ini
  - Revenue hari ini
  - Produk terlaris
  - Chart penjualan
  - Produk stok menipis

### 5. Import/Export
- **Export:** Klik tombol export di halaman produk/transaksi
- **Import:** Download template CSV, isi data, upload file

---

## 🔧 Konfigurasi Tambahan

### Barcode Scanner
Gunakan USB/Bluetooth barcode scanner. Scanner akan input otomatis ke field search.

### Thermal Printer
1. Install driver printer thermal
2. Configure printer di system
3. Printer akan otomatis terdeteksi saat print struk

### Real-time Updates (Pusher)
```env
# .env (Laravel)
BROADCAST_DRIVER=pusher
PUSHER_APP_ID=your_app_id
PUSHER_APP_KEY=your_key
PUSHER_APP_SECRET=your_secret
PUSHER_APP_CLUSTER=mt1

# .env.local (Next.js)
NEXT_PUBLIC_PUSHER_KEY=your_key
NEXT_PUBLIC_PUSHER_CLUSTER=mt1
```

### Voice Search
Voice search menggunakan Web Speech API. Browser support:
- ✅ Chrome/Edge
- ✅ Safari
- ❌ Firefox (belum support)

---

## 🎨 Struktur Database

### Tables
- `users` - User accounts
- `roles` - User roles (admin, kasir, manager)
- `permissions` - Permission system
- `categories` - Product categories
- `products` - Master products
- `product_units` - Multi-level units (dus, karton, dll)
- `transactions` - Sales transactions
- `transaction_items` - Transaction details
- `stock_movements` - Stock history

### Relationship
```
Category → hasMany → Product
Product → hasMany → ProductUnit
Product → hasMany → TransactionItem
Transaction → hasMany → TransactionItem
User → hasMany → Transaction
```

---

## 🧪 Testing

### Backend
```bash
cd backend
php artisan test
```

### Frontend
```bash
cd frontend
npm run test
```

---

## 🚀 Deployment

### Backend (Laravel)
1. Set `APP_ENV=production` di `.env`
2. Run `php artisan config:cache`
3. Run `php artisan route:cache`
4. Run `php artisan view:cache`
5. Setup web server (Apache/Nginx)

### Frontend (Next.js)
```bash
cd frontend
npm run build
npm run start
```

Atau deploy to Vercel:
```bash
vercel deploy
```

---

## 📝 Catatan Penting

### Stok Berjenjang
Contoh: Mie Sedap
- **Base unit:** biji (1 biji)
- **Unit 1:** dus (1 dus = 40 biji)
- **Unit 2:** karton (1 karton = 400 biji)

Ketika beli 1 dus, stok otomatis berkurang 40 biji.

### Permission System
- **Admin:** Full access
- **Manager:** Manage products, view reports, export/import
- **Kasir:** Create transactions, view products

### Adaptive Search
Search mendukung natural language:
- "sedap goreng 5" → cari "Mie Sedap Goreng" qty 5
- "coca cola dus" → cari "Coca Cola" dalam unit dus

---

## 🤝 Kontribusi

Contributions are welcome! 

1. Fork repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

---

## 📄 License

This project is open-sourced software licensed under the [MIT license](LICENSE).

---

## 👨‍💻 Support

Untuk bantuan dan pertanyaan:
- Email: support@pos-kasir.com
- Issues: [GitHub Issues](https://github.com/yourrepo/pos-kasir/issues)

---

## 🙏 Credits

Built with:
- [Laravel](https://laravel.com) - Backend Framework
- [Next.js](https://nextjs.org) - Frontend Framework
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [Spatie Permission](https://spatie.be/docs/laravel-permission) - Role & Permission
- [Pusher](https://pusher.com) - Real-time

---

**Happy Selling! 🎉**
