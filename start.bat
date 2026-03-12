@echo off
setlocal enabledelayedexpansion

REM Always run from the folder where this script lives
cd /d "%~dp0"

REM Check if running as Administrator — if not, re-launch with UAC elevation
net session >nul 2>&1
if errorlevel 1 (
    echo Membutuhkan hak Administrator untuk membuka port firewall...
    echo Klik "Yes" pada dialog UAC yang muncul.
    timeout /t 2 /nobreak >nul
    powershell -Command "Start-Process -FilePath '%~f0' -WorkingDirectory '%~dp0' -Verb RunAs"
    exit /b
)

echo ====================================
echo Starting POS Application
echo ====================================
echo.

REM Check if we're in the right directory
if not exist "backend" (
    echo Error: backend folder not found!
    echo Please run this script from the pos-app directory.
    pause
    exit /b 1
)

if not exist "frontend" (
    echo Error: frontend folder not found!
    echo Please run this script from the pos-app directory.
    pause
    exit /b 1
)

REM Set PHP path (XAMPP)
set PHP_PATH=C:\xampp\php\php.exe

REM Check if PHP exists
if not exist "%PHP_PATH%" (
    echo Error: PHP not found at %PHP_PATH%
    echo.
    echo Please install XAMPP or configure PHP path.
    echo If you have Laragon, update PHP_PATH to:
    echo   C:\laragon\bin\php\php-8.x\php.exe
    echo.
    pause
    exit /b 1
)

REM Check .env.local
if not exist "frontend\.env.local" (
    echo Warning: .env.local not found, creating from .env.example...
    copy "frontend\.env.example" "frontend\.env.local"
)

REM Allow ports through Windows Firewall (silently, requires admin)
netsh advfirewall firewall show rule name="POS App Port 3000" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="POS App Port 3000" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
)
netsh advfirewall firewall show rule name="POS App Port 8000" >nul 2>&1
if errorlevel 1 (
    netsh advfirewall firewall add rule name="POS App Port 8000" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1
)

REM Start Backend (Laravel)
echo [1/2] Starting Backend Server (Laravel)...
echo        PHP: %PHP_PATH%
echo        Host: 0.0.0.0
echo        Port: 8000
echo.
start "POS Backend" cmd /k "cd /d "%~dp0backend" && "%PHP_PATH%" artisan serve --host=0.0.0.0 --port=8000"

REM Wait for backend to initialize
echo Waiting for backend to start...
timeout /t 5 /nobreak >nul

REM Get all local IPv4 addresses (exclude loopback & APIPA) via PowerShell
powershell -NoProfile -Command ^
  "Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } | Select-Object -ExpandProperty IPAddress" ^
  > "%TEMP%\pos_local_ips.txt" 2>nul

REM Start Frontend (Next.js) — bind ke 0.0.0.0 agar semua device bisa akses
echo.
echo [2/2] Starting Frontend Server (Next.js)...
echo        Port: 3000 (or next available)
echo.
start "POS Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ====================================
echo  Servers are starting...
echo ====================================
echo.
echo  [Backend]
echo    Local   : http://localhost:8000/api/health
for /f "tokens=*" %%a in (%TEMP%\pos_local_ips.txt) do (
    echo    Network : http://%%a:8000/api/health
)
echo.
echo  [Frontend]
echo    Local   : http://localhost:3000
for /f "tokens=*" %%a in (%TEMP%\pos_local_ips.txt) do (
    echo    Network : http://%%a:3000
)
echo   (Jika port 3000 sibuk, cek console untuk port aktual)
echo.
echo  [Credentials]
echo    Admin : admin@pos.com / password
echo    Kasir : kasir@pos.com / password
echo.
echo  Untuk menghentikan server, jalankan stop.bat
echo.
del "%TEMP%\pos_local_ips.txt" 2>nul
pause
