@echo off
echo ====================================
echo Testing Backend Connection
echo ====================================
echo.

echo Checking if backend is running on port 8000...
echo.

curl -s http://localhost:8000/api/health

if %errorlevel% equ 0 (
    echo.
    echo ✓ Backend is running and healthy!
    echo.
) else (
    echo.
    echo ✗ Backend is not responding
    echo.
    echo Please make sure backend is running with start.bat
    echo.
)

pause
