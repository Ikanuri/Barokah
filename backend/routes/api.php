<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\TransactionController;
use App\Http\Controllers\Api\ExportImportController;
use App\Http\Controllers\Api\BackupController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\CustomerTierController;
use App\Http\Controllers\Api\ProductPriceController;
use App\Http\Controllers\Api\ExpenseController;

// ─── Public routes ────────────────────────────────────────────────────────────
Route::get('/health', function () {
    return response()->json([
        'status'    => 'ok',
        'message'   => 'Backend is running',
        'timestamp' => now()->toISOString()
    ]);
});

Route::post('/login',    [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// ─── Protected routes (semua user yang sudah login) ───────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me',      [AuthController::class, 'me']);

    // ── Produk: READ untuk semua (kasir butuh ini untuk POS) ──────────────────
    Route::get('/products',                [ProductController::class, 'index']);
    Route::get('/products/search/smart',   [ProductController::class, 'smartSearch']);
    Route::get('/products/search/barcode', [ProductController::class, 'searchByBarcode']);
    Route::get('/products/{product}',      [ProductController::class, 'show']);

    // ── Pelanggan: READ untuk semua (kasir butuh pilih pelanggan di POS) ──────
    Route::get('/customers',              [CustomerController::class, 'index']);
    Route::get('/customers/{customer}',   [CustomerController::class, 'show']);

    // ── Customer Tiers: READ untuk semua ──────────────────────────────────────
    Route::get('/customer-tiers',      [CustomerTierController::class, 'index']);
    Route::get('/customer-tiers/{id}', [CustomerTierController::class, 'show']);

    // ── Transaksi: CREATE + SHOW untuk semua (kasir buat transaksi) ───────────
    Route::post('/transactions',              [TransactionController::class, 'store']);
    Route::get('/transactions/{transaction}', [TransactionController::class, 'show']);

    // ── Rekap Shift: kasir & admin bisa lihat ─────────────────────────────────
    Route::get('/dashboard/shift-recap', [DashboardController::class, 'shiftRecap']);


    // ── Admin + Manager: manajemen & laporan ──────────────────────────────────
    Route::middleware('role:admin|manager')->group(function () {

        // Dashboard & Laporan
        Route::get('/dashboard/stats',       [DashboardController::class, 'stats']);
        Route::get('/dashboard/profit-loss', [DashboardController::class, 'profitLoss']);
        Route::get('/statistics',            [TransactionController::class, 'statistics']);
        Route::get('/statistics/cashiers',   [TransactionController::class, 'cashierStatistics']);

        // Produk: WRITE
        Route::post('/products',             [ProductController::class, 'store']);
        Route::put('/products/{product}',    [ProductController::class, 'update']);
        Route::delete('/products/{product}', [ProductController::class, 'destroy']);

        // Harga Produk
        Route::get('/products/{productId}/prices',             [ProductPriceController::class, 'index']);
        Route::post('/products/{productId}/prices',            [ProductPriceController::class, 'store']);
        Route::put('/products/{productId}/prices/{priceId}',   [ProductPriceController::class, 'update']);
        Route::delete('/products/{productId}/prices/{priceId}',[ProductPriceController::class, 'destroy']);
        Route::get('/products/{productId}/prices/best',        [ProductPriceController::class, 'getBestPrice']);

        // Kategori: full CRUD
        Route::apiResource('categories', CategoryController::class);

        // Pelanggan: WRITE
        Route::post('/customers',              [CustomerController::class, 'store']);
        Route::put('/customers/{customer}',    [CustomerController::class, 'update']);
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);

        // Customer Tiers: WRITE + statistik
        Route::get('/customer-tiers/statistics', [CustomerTierController::class, 'statistics']);
        Route::post('/customer-tiers',           [CustomerTierController::class, 'store']);
        Route::put('/customer-tiers/{id}',       [CustomerTierController::class, 'update']);
        Route::delete('/customer-tiers/{id}',    [CustomerTierController::class, 'destroy']);

        // Transaksi: full management
        Route::get('/transactions',                          [TransactionController::class, 'index']);
        Route::put('/transactions/{transaction}',            [TransactionController::class, 'update']);
        Route::delete('/transactions/{transaction}',         [TransactionController::class, 'destroy']);
        Route::post('/transactions/{id}/cancel',             [TransactionController::class, 'cancel']);
        Route::post('/transactions/{id}/payment',            [TransactionController::class, 'makePayment']);
        Route::post('/transactions/{id}/return-change',      [TransactionController::class, 'returnChange']);
        Route::post('/transactions/{id}/undo-return-change', [TransactionController::class, 'undoReturnChange']);
        Route::patch('/transactions/{id}/payment-method',    [TransactionController::class, 'updatePaymentMethod']);

        // Arus Kas
        Route::get('/expenses/summary', [ExpenseController::class, 'summary']);
        Route::get('/expenses',         [ExpenseController::class, 'index']);
        Route::post('/expenses',        [ExpenseController::class, 'store']);
        Route::put('/expenses/{id}',    [ExpenseController::class, 'update']);
        Route::delete('/expenses/{id}', [ExpenseController::class, 'destroy']);

        // Export (read-only — aman untuk manager)
        Route::get('/export/products',              [ExportImportController::class, 'exportProducts']);
        Route::get('/export/transactions',          [ExportImportController::class, 'exportTransactions']);
        Route::get('/export/template/transactions', [ExportImportController::class, 'getTransactionTemplate']);
        Route::get('/export/template/products',     [ExportImportController::class, 'getProductTemplate']);
        Route::get('/export/categories',            [ExportImportController::class, 'exportCategories']);
        Route::get('/export/template/categories',   [ExportImportController::class, 'getCategoryTemplate']);
        Route::get('/export/customers',             [ExportImportController::class, 'exportCustomers']);
        Route::get('/export/template/customers',    [ExportImportController::class, 'getCustomerTemplate']);

        // Toko: READ (manager bisa lihat daftar toko)
        Route::get('/stores',            [StoreController::class, 'index']);
        Route::get('/stores/active',     [StoreController::class, 'active']);
        Route::get('/stores/current',    [StoreController::class, 'current']);
        Route::get('/stores/{id}/stats', [StoreController::class, 'stats']);
    });


    // ── Admin Only: operasi destruktif / konfigurasi sistem ───────────────────
    Route::middleware('role:admin')->group(function () {

        // User Management
        Route::apiResource('users', UserController::class);
        Route::get('/roles', [UserController::class, 'getRoles']);

        // Import (berbahaya — bisa overwrite data massal)
        Route::post('/import/products',             [ExportImportController::class, 'importProducts']);
        Route::post('/import/transactions',         [ExportImportController::class, 'importTransactions']);
        Route::post('/import/categories',           [ExportImportController::class, 'importCategories']);
        Route::post('/import/customers',            [ExportImportController::class, 'importCustomers']);
        Route::get('/export/users',                 [ExportImportController::class, 'exportUsers']);
        Route::post('/import/users',                [ExportImportController::class, 'importUsers']);
        Route::get('/export/template/users',        [ExportImportController::class, 'getUserTemplate']);

        // Backup & Restore
        Route::get('/backup/full',      [BackupController::class, 'createFullBackup']);
        Route::post('/backup/restore',  [BackupController::class, 'restoreFromBackup']);
        Route::post('/backup/telegram', [BackupController::class, 'sendBackupToTelegram']);

        // Manajemen Toko: WRITE hanya admin
        Route::post('/stores',             [StoreController::class, 'store']);
        Route::put('/stores/{id}',         [StoreController::class, 'update']);
        Route::delete('/stores/{id}',      [StoreController::class, 'destroy']);
        Route::post('/stores/sync-prices', [StoreController::class, 'syncPrices']);
    });
});
