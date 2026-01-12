@echo off
echo ====================================
echo POS Application - Quick Start
echo ====================================
echo.
echo What would you like to do?
echo.
echo   1. Start Backend + Frontend
echo   2. Start Backend Only
echo   3. Start Frontend Only
echo   4. Stop All Servers
echo   5. Exit
echo.
set /p choice="Enter your choice (1-5): "

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto start_backend
if "%choice%"=="3" goto start_frontend
if "%choice%"=="4" goto stop_all
if "%choice%"=="5" goto exit
goto invalid

:start_all
echo.
echo Starting Backend + Frontend...
call start.bat
goto end

:start_backend
echo.
echo Starting Backend Only...
set PHP_PATH=C:\xampp\php\php.exe
start "POS Backend" cmd /k "cd /d %~dp0backend && "%PHP_PATH%" artisan serve --host=0.0.0.0 --port=8000"
echo Backend started at http://0.0.0.0:8000
goto end

:start_frontend
echo.
echo Starting Frontend Only...
start "POS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Frontend started at http://localhost:3000
goto end

:stop_all
echo.
echo Stopping all servers...
call stop.bat
goto end

:invalid
echo.
echo Invalid choice. Please try again.
timeout /t 2 >nul
cls
goto :eof

:exit
echo.
echo Goodbye!
timeout /t 1 >nul
exit

:end
echo.
pause
