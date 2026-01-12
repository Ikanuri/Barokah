@echo off
echo ====================================
echo Clear Frontend Cache
echo ====================================
echo.
echo Script ini akan membuka browser dan menjalankan clear cache.
echo.
echo INSTRUKSI:
echo 1. Browser akan terbuka ke halaman POS
echo 2. Tekan F12 untuk buka Developer Tools
echo 3. Pergi ke tab Console
echo 4. Paste command berikut dan tekan Enter:
echo.
echo    sessionStorage.removeItem('pos_products_cache');
echo    location.reload();
echo.
echo 5. Halaman akan reload dengan data terbaru
echo.
pause
echo.
echo Opening browser...
start http://localhost:3000/pos
echo.
echo ✅ Browser opened!
echo.
echo Jangan lupa jalankan command di console:
echo   sessionStorage.removeItem('pos_products_cache'); location.reload();
echo.
pause
