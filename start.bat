@echo off
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

REM Get Local IP Address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCAL_IP=%%a
    goto :ip_found
)
:ip_found
REM Remove leading space
set LOCAL_IP=%LOCAL_IP:~1%

REM Start Frontend (Next.js)
echo.
echo [2/2] Starting Frontend Server (Next.js)...
echo        Port: 3000 (or next available)
echo.
start "POS Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ====================================
echo Servers are starting...
echo ====================================
echo.
echo Backend:
echo   - Local:   http://localhost:8000/api/health
echo   - Network: http://%LOCAL_IP%:8000/api/health
echo.
echo Frontend:
echo   - Local:   http://localhost:3000
echo   - Network: http://%LOCAL_IP%:3000
echo   (If port 3000 is busy, check console for actual port)
echo.
echo Credentials:
echo   - Admin: admin@pos.com / password
echo   - Kasir: kasir@pos.com / password
echo.
echo To stop servers, run stop.bat
echo.
pause
