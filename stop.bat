@echo off
echo ====================================
echo Stopping POS Application
echo ====================================
echo.

REM Kill PHP processes (Backend)
echo [1/2] Stopping Backend Server...
taskkill /FI "WindowTitle eq POS Backend*" /T /F >nul 2>&1
if %errorlevel% equ 0 (
    echo Backend stopped successfully.
) else (
    echo No backend process found.
)

REM Kill Node processes (Frontend)
echo [2/2] Stopping Frontend Server...
taskkill /FI "WindowTitle eq POS Frontend*" /T /F >nul 2>&1
if %errorlevel% equ 0 (
    echo Frontend stopped successfully.
) else (
    echo No frontend process found.
)

echo.
echo ====================================
echo All servers stopped.
echo ====================================
echo.
pause
