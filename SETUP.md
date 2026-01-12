# Setup Guide - POS Application

Panduan lengkap setup POS system untuk development dan production.

## 📋 Requirements

### Software
- **PHP**: 8.2 or higher
- **Composer**: Latest version
- **Node.js**: 18+ (recommended: 20 LTS)
- **npm**: 9+ (atau yarn/pnpm)
- **MySQL**: 8.0+
- **Git**: Latest version

### System
- Windows 10/11, macOS 12+, atau Linux
- Minimum 4GB RAM
- 2GB free disk space

## 🚀 Installation Steps

### 1. Clone Repository

```bash
git clone <repository-url>
cd pos-app
```

### 2. Backend Setup

#### A. Install Dependencies
```bash
cd backend
composer install
```

#### B. Environment Configuration
```bash
cp .env.example .env
```

Edit `.env`:
```env
APP_NAME="POS Kasir"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://10.29.57.28:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=pos_kasir
DB_USERNAME=root
DB_PASSWORD=

FRONTEND_URL=http://10.29.57.28:3000

CACHE_DRIVER=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync
```

> **Note**: Ganti `10.29.57.28` dengan IP address komputer Anda. Cek dengan `ipconfig` (Windows) atau `ifconfig` (Mac/Linux).

#### C. Generate App Key
```bash
php artisan key:generate
```

#### D. Database Setup

**Create Database**:
```sql
CREATE DATABASE pos_kasir CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

**Run Migrations**:
```bash
php artisan migrate
```

**Seed Data** (optional - untuk data dummy):
```bash
php artisan db:seed
```

Data default:
- Admin: `admin@pos.com` / `admin123`
- Kasir: `kasir@pos.com` / `kasir123`
- Manager: `manager@pos.com` / `manager123`

### 3. Frontend Setup

#### A. Install Dependencies
```bash
cd ../frontend
npm install
```

#### B. Environment Configuration
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://10.29.57.28:8000/api
```

> **Important**: URL harus match dengan `APP_URL` di backend `.env`

### 4. Verify Installation

#### Test Backend
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

Buka browser: `http://10.29.57.28:8000/api/health`

Expected response:
```json
{
  "status": "ok",
  "message": "Backend is running",
  "timestamp": "2025-10-06T12:00:00.000000Z"
}
```

#### Test Frontend
```bash
cd frontend
npm run dev
```

Buka browser: `http://10.29.57.28:3000`

## 🔧 Running the Application

### Development Mode

**Terminal 1 - Backend**:
```bash
cd backend
php artisan serve --host=0.0.0.0 --port=8000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

### Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://10.29.57.28:3000 | Next.js app |
| Backend API | http://10.29.57.28:8000/api | Laravel API |
| Health Check | http://10.29.57.28:8000/api/health | Backend status |

## 📱 Mobile Access (Same Network)

Untuk mengakses dari HP di network yang sama:

### 1. Check IP Address
```bash
# Windows
ipconfig

# Mac/Linux
ifconfig
```

Look for: `IPv4 Address` atau `inet` (e.g., `10.29.57.28`)

### 2. Update Environment Files

Backend `.env`:
```env
APP_URL=http://YOUR_IP:8000
FRONTEND_URL=http://YOUR_IP:3000
```

Frontend `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://YOUR_IP:8000/api
```

### 3. Start Backend with Network Binding
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

> **Critical**: Gunakan `--host=0.0.0.0` agar backend dapat diakses dari network

### 4. Configure Firewall

**Windows**:
```powershell
# Allow port 8000
netsh advfirewall firewall add rule name="Laravel Backend" dir=in action=allow protocol=TCP localport=8000

# Allow port 3000
netsh advfirewall firewall add rule name="Next.js Frontend" dir=in action=allow protocol=TCP localport=3000
```

**Mac**:
```bash
# Firewall biasanya sudah allow local network
# Atau disable di System Preferences > Security & Privacy > Firewall
```

### 5. Test from Mobile

Buka browser di HP: `http://YOUR_IP:3000`

## 🛠️ Troubleshooting

### Problem: "Could not connect to backend"

**Solution 1**: Check backend running
```bash
# Test API health
curl http://10.29.57.28:8000/api/health
```

**Solution 2**: Check environment variables
- Backend `.env`: `APP_URL=http://YOUR_IP:8000`
- Frontend `.env.local`: `NEXT_PUBLIC_API_URL=http://YOUR_IP:8000/api`

**Solution 3**: Restart backend with network binding
```bash
php artisan serve --host=0.0.0.0 --port=8000
```

### Problem: CORS errors

**Solution**: Check `backend/config/cors.php`
```php
'allowed_origins_patterns' => [
    '/^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/',
    '/^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/',
],
```

### Problem: Port already in use

**Solution**: Kill process on port
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:8000 | xargs kill -9
```

### Problem: Migration failed

**Solution 1**: Check database connection
```bash
php artisan tinker
>>> DB::connection()->getPdo();
```

**Solution 2**: Reset database
```bash
php artisan migrate:fresh --seed
```

### Problem: Dark mode not working

**Solution**:
1. Clear browser cache: `Ctrl+Shift+R`
2. Check browser localStorage: `theme` key should be `'dark'` or `'light'`
3. Re-toggle dark mode button

## 📊 Database Management

### Backup Database
```bash
mysqldump -u root -p pos_kasir > backup.sql
```

### Restore Database
```bash
mysql -u root -p pos_kasir < backup.sql
```

### Reset to Fresh State
```bash
php artisan migrate:fresh --seed
```

> **Warning**: This will delete ALL data!

## 🔐 Security Notes

### Development
- Default passwords are simple (`admin123`)
- Debug mode is ON
- CORS allows all local network IPs

### Production
1. Change all default passwords
2. Set `APP_ENV=production` and `APP_DEBUG=false`
3. Configure strict CORS rules
4. Use HTTPS with valid SSL certificate
5. Set strong `APP_KEY`
6. Disable unused endpoints

## 📚 Additional Resources

### Laravel Commands
```bash
# Clear all caches
php artisan optimize:clear

# Create new migration
php artisan make:migration create_table_name

# Create new controller
php artisan make:controller ControllerName

# List all routes
php artisan route:list
```

### Next.js Commands
```bash
# Development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run type-check
```

## 💡 Tips

1. **Gunakan 2 terminal**: Satu untuk backend, satu untuk frontend
2. **Selalu check IP**: IP address bisa berubah setelah restart WiFi
3. **Test di browser dulu**: Sebelum test di mobile, pastikan desktop browser sudah OK
4. **Network binding penting**: Gunakan `--host=0.0.0.0` untuk network access
5. **Cache issues**: Hard refresh browser dengan `Ctrl+Shift+R`

## ✅ Checklist Setup

- [ ] PHP 8.2+ installed
- [ ] Composer installed
- [ ] Node.js 18+ installed
- [ ] MySQL database created
- [ ] Backend `.env` configured
- [ ] Frontend `.env.local` configured
- [ ] IP address updated in all configs
- [ ] Backend migrations run
- [ ] Backend running on `0.0.0.0:8000`
- [ ] Frontend running on port 3000
- [ ] Firewall rules added
- [ ] Health check returns OK
- [ ] Can login with default credentials
- [ ] Mobile access tested (if needed)

---

**Last Updated**: October 6, 2025  
**Version**: 1.0.0
