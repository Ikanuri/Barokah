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

// Public routes
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'message' => 'Backend is running',
        'timestamp' => now()->toISOString()
    ]);
});

// Test endpoint (debug only - remove in production)
Route::get('/test-transactions', function () {
    $transactions = \App\Models\Transaction::with(['user', 'items'])
        ->latest()
        ->limit(5)
        ->get()
        ->map(function ($transaction) {
            return [
                'id' => $transaction->id,
                'invoice_number' => $transaction->transaction_code,
                'date' => $transaction->created_at->toISOString(),
                'total' => (float) $transaction->total,
                'cashier' => $transaction->user->name ?? 'Unknown',
                'items_count' => $transaction->items->count(),
            ];
        });
    
    return response()->json([
        'message' => 'Test successful - SQL fixed!',
        'count' => $transactions->count(),
        'data' => $transactions
    ]);
});

Route::get('/test-transaction-detail/{id}', function ($id) {
    $transaction = \App\Models\Transaction::with(['user', 'items.product', 'items.productUnit'])
        ->findOrFail($id);
    
    return response()->json([
        'data' => [
            'id' => $transaction->id,
            'invoice_number' => $transaction->transaction_code,
            'items' => $transaction->items->map(function ($item) {
                return [
                    'id' => $item->id,
                    'product_name' => $item->product ? $item->product->name : 'Unknown',
                    'unit_name' => $item->productUnit ? $item->productUnit->name : null,
                    'quantity' => (int) $item->quantity,
                    'price' => (float) $item->unit_price,
                    'subtotal' => (float) $item->subtotal,
                ];
            })->values()->all(),
        ]
    ]);
});

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Dashboard
    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    // Categories
    Route::apiResource('categories', CategoryController::class);

    // Products
    Route::apiResource('products', ProductController::class);
    Route::get('/products/search/smart', [ProductController::class, 'smartSearch']);
    Route::get('/products/search/barcode', [ProductController::class, 'searchByBarcode']);

    // Product Prices
    Route::get('/products/{productId}/prices', [ProductPriceController::class, 'index']);
    Route::post('/products/{productId}/prices', [ProductPriceController::class, 'store']);
    Route::put('/products/{productId}/prices/{priceId}', [ProductPriceController::class, 'update']);
    Route::delete('/products/{productId}/prices/{priceId}', [ProductPriceController::class, 'destroy']);
    Route::get('/products/{productId}/prices/best', [ProductPriceController::class, 'getBestPrice']);

    // Customers
    Route::apiResource('customers', CustomerController::class);

    // Customer Tiers
    Route::get('/customer-tiers', [CustomerTierController::class, 'index']);
    Route::get('/customer-tiers/statistics', [CustomerTierController::class, 'statistics']);
    Route::post('/customer-tiers', [CustomerTierController::class, 'store']);
    Route::get('/customer-tiers/{id}', [CustomerTierController::class, 'show']);
    Route::put('/customer-tiers/{id}', [CustomerTierController::class, 'update']);
    Route::delete('/customer-tiers/{id}', [CustomerTierController::class, 'destroy']);

    // Transactions
    Route::apiResource('transactions', TransactionController::class);
    Route::post('/transactions/{id}/cancel', [TransactionController::class, 'cancel']);
    Route::post('/transactions/{id}/payment', [TransactionController::class, 'makePayment']);
    Route::patch('/transactions/{id}/payment-method', [TransactionController::class, 'updatePaymentMethod']);
    Route::get('/statistics', [TransactionController::class, 'statistics']);
    Route::get('/statistics/cashiers', [TransactionController::class, 'cashierStatistics']);

    // Export / Import
    Route::get('/export/products', [ExportImportController::class, 'exportProducts']);
    Route::post('/import/products', [ExportImportController::class, 'importProducts']);
    Route::get('/export/transactions', [ExportImportController::class, 'exportTransactions']);
    Route::get('/export/template/products', [ExportImportController::class, 'getProductTemplate']);
    
    // Export/Import Users (Admin only)
    Route::get('/export/users', [ExportImportController::class, 'exportUsers']);
    Route::post('/import/users', [ExportImportController::class, 'importUsers']);
    Route::get('/export/template/users', [ExportImportController::class, 'getUserTemplate']);
    
    // Backup & Restore
    Route::get('/backup/full', [BackupController::class, 'createFullBackup']);
    Route::post('/backup/restore', [BackupController::class, 'restoreFromBackup']);
    Route::post('/backup/telegram', [BackupController::class, 'sendBackupToTelegram']);
    
    // Export/Import Categories
    Route::get('/export/categories', [BackupController::class, 'exportCategories']);
    Route::post('/import/categories', [BackupController::class, 'importCategories']);
    Route::get('/export/template/categories', [BackupController::class, 'getCategoryTemplate']);
    
    // Export/Import Customers
    Route::get('/export/customers', [BackupController::class, 'exportCustomers']);
    Route::post('/import/customers', [BackupController::class, 'importCustomers']);
    Route::get('/export/template/customers', [BackupController::class, 'getCustomerTemplate']);

    // Stores Management
    Route::get('/stores', [StoreController::class, 'index']);
    Route::get('/stores/active', [StoreController::class, 'active']);
    Route::get('/stores/current', [StoreController::class, 'current']);
    Route::post('/stores', [StoreController::class, 'store']);
    Route::put('/stores/{id}', [StoreController::class, 'update']);
    Route::delete('/stores/{id}', [StoreController::class, 'destroy']);
    Route::get('/stores/{id}/stats', [StoreController::class, 'stats']);
    Route::post('/stores/sync-prices', [StoreController::class, 'syncPrices']);

    // Users (Admin only)
    Route::middleware('role:admin')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::get('/roles', [UserController::class, 'getRoles']);
    });
});
