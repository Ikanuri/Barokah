<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Transaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Response;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\ProductsExport;
use App\Exports\TransactionsExport;
use App\Imports\ProductsImport;

class ExportImportController extends Controller
{
    // Export products to CSV
    public function exportProducts(Request $request)
    {
        $query = Product::with(['category', 'units']);

        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        $products = $query->get();

        $filename = 'products_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($products) {
            $file = fopen('php://output', 'w');
            
            // Header
            fputcsv($file, [
                'ID', 'Name', 'SKU', 'Barcode', 'Category', 'Description',
                'Base Price', 'Selling Price', 'Base Unit', 'Stock Quantity',
                'Minimum Stock', 'Status', 'Created At'
            ]);

            // Data
            foreach ($products as $product) {
                fputcsv($file, [
                    $product->id,
                    $product->name,
                    $product->sku,
                    $product->barcode,
                    $product->category?->name ?? '',
                    $product->description,
                    $product->base_price,
                    $product->selling_price,
                    $product->base_unit,
                    $product->stock_quantity,
                    $product->minimum_stock,
                    $product->is_active ? 'Active' : 'Inactive',
                    $product->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    // Import products from CSV
    public function importProducts(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'mode' => 'nullable|string|in:add,overwrite',
        ]);

        $file = $request->file('file');
        $mode = $request->input('mode', 'add'); // Default: add mode
        
        // OVERWRITE MODE: Delete ALL products first
        if ($mode === 'overwrite') {
            Product::query()->delete();
        }
        
        $handle = fopen($file->path(), 'r');
        
        // Skip header
        fgetcsv($handle);

        $imported = 0;
        $errors = [];
        $rowNumber = 1; // Start from 1 (after header)

        while (($data = fgetcsv($handle)) !== false) {
            $rowNumber++;
            
            try {
                // Skip empty rows
                if (empty(array_filter($data))) {
                    continue;
                }

                // Helper function to get non-empty value
                $getValue = function($index, $default = null) use ($data) {
                    $value = $data[$index] ?? $default;
                    // Treat empty string or null as empty
                    if ($value === '' || $value === null) {
                        return $default;
                    }
                    return $value;
                };

                // Validate required fields (name is required, SKU auto-generated if empty)
                $name = $getValue(1);
                if (empty($name)) {
                    $errors[] = "Row {$rowNumber}: Missing product name (skipped)";
                    continue;
                }

                // Check barcode FIRST to determine if this is update or insert
                $barcode = trim($getValue(3));
                $existingProductByBarcode = null;
                
                if (!empty($barcode) && $barcode !== '' && $barcode !== '0') {
                    $existingProductByBarcode = Product::where('barcode', $barcode)->first();
                }

                // Determine SKU
                $sku = $getValue(2);
                
                if ($existingProductByBarcode) {
                    // Barcode exists - this is an UPDATE
                    // Use existing SKU, ignore CSV SKU
                    $sku = $existingProductByBarcode->sku;
                    // Optional: log if CSV SKU differs
                    if (!empty($getValue(2)) && $getValue(2) !== $sku) {
                        $errors[] = "Row {$rowNumber}: Using existing SKU '{$sku}' (CSV SKU '{$getValue(2)}' ignored)";
                    }
                } elseif (empty($sku)) {
                    // No barcode match and no SKU - generate new SKU
                    $sku = strtoupper(substr(preg_replace('/[^A-Z0-9]/', '', strtoupper($name)), 0, 3)) 
                           . '-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
                }

                // Prepare product data
                $productData = [
                    'name' => $name,
                    'sku' => $sku,
                    'description' => $getValue(5),
                    'is_active' => ($getValue(11, 'Active') === 'Active'),
                ];

                // Set barcode if exists
                if (!empty($barcode) && $barcode !== '' && $barcode !== '0') {
                    $productData['barcode'] = $barcode;
                }

                // Category - support both ID (numeric) and Name (string)
                $categoryInput = $getValue(4, 1);
                $categoryId = 1; // Default
                
                if (!empty($categoryInput)) {
                    // Check if it's numeric (ID) or string (Name)
                    if (is_numeric($categoryInput)) {
                        // It's an ID
                        $categoryId = intval($categoryInput);
                        $categoryExists = \App\Models\Category::where('id', $categoryId)->exists();
                        if (!$categoryExists) {
                            $errors[] = "Row {$rowNumber}: Category ID {$categoryId} not found, using default (1)";
                            $categoryId = 1;
                        }
                    } else {
                        // It's a name - find by name (case insensitive)
                        $category = \App\Models\Category::whereRaw('LOWER(name) = ?', [strtolower($categoryInput)])->first();
                        if ($category) {
                            $categoryId = $category->id;
                        } else {
                            $errors[] = "Row {$rowNumber}: Category '{$categoryInput}' not found, using default (1)";
                            $categoryId = 1;
                        }
                    }
                }
                
                $productData['category_id'] = $categoryId;

                // Get Base Price and Selling Price first
                $basePrice = $getValue(6);
                $sellingPrice = $getValue(7);

                // Normalize: treat 0 as empty
                if ($basePrice == 0 || $basePrice === '0') {
                    $basePrice = null;
                }
                if ($sellingPrice == 0 || $sellingPrice === '0') {
                    $sellingPrice = null;
                }

                // Logic: 
                // 1. If both empty, skip (will cause error - handled by catch)
                // 2. If base_price empty but selling_price ada, set base_price = selling_price
                // 3. If selling_price empty but base_price ada, set selling_price = base_price
                // 4. If both ada, use both

                if (empty($basePrice) && empty($sellingPrice)) {
                    $errors[] = "Row {$rowNumber}: Skipped - Both base_price and selling_price are empty";
                    continue;
                }

                if (!empty($basePrice)) {
                    $productData['base_price'] = floatval($basePrice);
                }
                
                if (!empty($sellingPrice)) {
                    $productData['selling_price'] = floatval($sellingPrice);
                } else {
                    // Selling price empty, use base_price
                    $productData['selling_price'] = floatval($basePrice);
                }

                // If base_price is still empty, set it to selling_price
                if (empty($productData['base_price']) && !empty($productData['selling_price'])) {
                    $productData['base_price'] = $productData['selling_price'];
                }

                // Base Unit - default to 'biji' if empty
                $baseUnit = $getValue(8, 'biji');
                $productData['base_unit'] = $baseUnit;

                // Stock Quantity - default to 0 if empty
                $stockQty = $getValue(9, 0);
                $productData['stock_quantity'] = intval($stockQty);

                // Minimum Stock - default to 0 if empty
                $minStock = $getValue(10, 0);
                $productData['minimum_stock'] = intval($minStock);

                // Handle import mode
                if ($mode === 'overwrite') {
                    // OVERWRITE MODE: Just create (already deleted all above)
                    Product::create($productData);
                } else {
                    // ADD MODE: Find existing by barcode OR SKU to avoid duplicates
                    $existingProduct = null;
                    
                    // Priority 1: Match by barcode (if exists and not empty)
                    if (!empty($barcode) && $barcode !== '' && $barcode !== '0') {
                        $existingProduct = Product::where('barcode', $barcode)->first();
                    }
                    
                    // Priority 2: Match by SKU (if barcode not found)
                    if (!$existingProduct && !empty($sku)) {
                        $existingProduct = Product::where('sku', $sku)->first();
                    }
                    
                    if ($existingProduct) {
                        // Update existing product
                        $existingProduct->update($productData);
                    } else {
                        // Create new product
                        Product::create($productData);
                    }
                }

                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row {$rowNumber}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'message' => 'Import completed',
            'imported' => $imported,
            'errors' => $errors,
        ]);
    }

    // Export transactions to CSV
    public function exportTransactions(Request $request)
    {
        $query = Transaction::with(['user', 'items.product']);

        if ($request->filled('start_date')) {
            $query->whereDate('created_at', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->whereDate('created_at', '<=', $request->end_date);
        }

        $transactions = $query->get();

        $filename = 'transactions_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($transactions) {
            $file = fopen('php://output', 'w');
            
            // Header
            fputcsv($file, [
                'Transaction Code', 'Kasir', 'Date', 'Subtotal', 'Tax', 'Discount',
                'Total', 'Paid Amount', 'Change', 'Payment Method', 'Status', 'Items Count'
            ]);

            // Data
            foreach ($transactions as $transaction) {
                fputcsv($file, [
                    $transaction->transaction_code,
                    $transaction->user?->name ?? '',
                    $transaction->created_at?->format('Y-m-d H:i:s') ?? '',
                    $transaction->subtotal,
                    $transaction->tax,
                    $transaction->discount,
                    $transaction->total,
                    $transaction->paid_amount,
                    $transaction->change_amount,
                    $transaction->payment_method,
                    $transaction->status,
                    $transaction->items->count(),
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    // Get transaction CSV template
    public function getTransactionTemplate()
    {
        $filename = 'transaction_template.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () {
            $file = fopen('php://output', 'w');

            fputcsv($file, [
                'Kode Transaksi*', 'Kasir (Email)*', 'Subtotal*', 'Pajak', 'Diskon',
                'Total*', 'Jumlah Bayar*', 'Kembalian', 'Metode Pembayaran (cash/qris/transfer)', 'Status (paid/pending/cancelled)'
            ]);

            fputcsv($file, [
                'TRX-20240101-001', 'kasir@pos.com', '50000', '0', '0',
                '50000', '50000', '0', 'cash', 'paid'
            ]);

            fputcsv($file, [
                'TRX-20240101-002', 'kasir@pos.com', '75000', '0', '5000',
                '70000', '100000', '30000', 'qris', 'paid'
            ]);

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    // Import transactions from CSV
    public function importTransactions(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'mode' => 'nullable|string|in:add,overwrite',
        ]);

        $file = $request->file('file');
        $mode = $request->input('mode', 'add');

        if ($mode === 'overwrite') {
            Transaction::query()->delete();
        }

        $handle = fopen($file->path(), 'r');
        fgetcsv($handle); // Skip header

        $imported = 0;
        $errors = [];
        $rowNumber = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $rowNumber++;

            try {
                if (empty(array_filter($data))) continue;

                $transactionCode = trim($data[0] ?? '');
                $kasirEmail      = trim($data[1] ?? '');
                $subtotal        = floatval($data[2] ?? 0);
                $tax             = floatval($data[3] ?? 0);
                $discount        = floatval($data[4] ?? 0);
                $total           = floatval($data[5] ?? 0);
                $paidAmount      = floatval($data[6] ?? 0);
                $changeAmount    = floatval($data[7] ?? 0);
                $paymentMethod   = trim($data[8] ?? 'cash');
                $status          = trim($data[9] ?? 'paid');

                if (empty($transactionCode) || empty($kasirEmail)) {
                    $errors[] = "Row {$rowNumber}: Kode transaksi dan email kasir wajib diisi";
                    continue;
                }

                $kasir = \App\Models\User::where('email', $kasirEmail)->first();
                if (!$kasir) {
                    $errors[] = "Row {$rowNumber}: Kasir dengan email '{$kasirEmail}' tidak ditemukan";
                    continue;
                }

                $transactionData = [
                    'transaction_code' => $transactionCode,
                    'user_id'          => $kasir->id,
                    'subtotal'         => $subtotal,
                    'tax'              => $tax,
                    'discount'         => $discount,
                    'total'            => $total,
                    'paid_amount'      => $paidAmount,
                    'paid_total'       => $paidAmount,
                    'change_amount'    => $changeAmount,
                    'payment_method'   => $paymentMethod,
                    'payment_status'   => $status === 'paid' ? 'paid' : 'pending',
                    'status'           => in_array($status, ['paid', 'pending', 'cancelled']) ? $status : 'paid',
                ];

                $existing = Transaction::where('transaction_code', $transactionCode)->first();

                if ($existing) {
                    $existing->update($transactionData);
                } else {
                    Transaction::create($transactionData);
                }

                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row {$rowNumber}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'message' => 'Import completed',
            'imported' => $imported,
            'errors' => $errors,
        ]);
    }

    // Get CSV template
    public function getProductTemplate()
    {
        $filename = 'product_template.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            // Header
            fputcsv($file, [
                'ID (kosongkan untuk baru)', 'Nama Produk*', 'SKU (auto jika kosong)', 'Barcode',
                'Kategori (Nama atau ID)', 'Deskripsi', 'Harga Pokok (HPP)', 'Harga Jual*',
                'Satuan Dasar', 'Stok Awal', 'Stok Minimum', 'Status (Active/Inactive)'
            ]);

            // Sample data row 1 - using category name
            fputcsv($file, [
                '', 'Mie Sedap Goreng', 'MIE-001', '8998866200011', 'Makanan',
                'Mie instant goreng rasa original', '2000', '2500', 'biji',
                '400', '50', 'Active'
            ]);

            // Sample data row 2 - using category name
            fputcsv($file, [
                '', 'Aqua 600ml', '', '8992753601000', 'Minuman',
                'Air mineral 600ml', '2200', '3000', 'biji',
                '200', '30', 'Active'
            ]);

            // Sample data row 3 - using category ID (numeric)
            fputcsv($file, [
                '', 'Gula Pasir 1kg', '', '', '1',
                '', '', '15000', 'kg',
                '50', '10', 'Active'
            ]);

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    // ===========================
    // USERS EXPORT/IMPORT
    // ===========================

    /**
     * Export users to CSV
     */
    public function exportUsers()
    {
        $users = \App\Models\User::all();
        $filename = 'users_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($users) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['ID', 'Name', 'Email', 'Role', 'Status', 'Created At']);

            foreach ($users as $user) {
                fputcsv($file, [
                    $user->id,
                    $user->name,
                    $user->email,
                    $user->role,
                    $user->is_active ? 'Active' : 'Inactive',
                    $user->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    /**
     * Get User CSV Template
     */
    public function getUserTemplate()
    {
        $filename = 'user_template.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, [
                'ID (kosongkan untuk baru)', 
                'Nama*', 
                'Email*', 
                'Password (kosongkan jika update)', 
                'Role (admin/kasir)*', 
                'Status (Active/Inactive)'
            ]);
            
            fputcsv($file, ['', 'John Doe', 'john@example.com', 'password123', 'kasir', 'Active']);
            fputcsv($file, ['', 'Jane Smith', 'jane@example.com', 'password123', 'admin', 'Active']);

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    // ===========================
    // CATEGORIES EXPORT/IMPORT
    // ===========================

    public function exportCategories()
    {
        $categories = \App\Models\Category::all();
        $filename = 'categories_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($categories) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Nama Kategori', 'Deskripsi', 'Dibuat']);
            foreach ($categories as $cat) {
                fputcsv($file, [
                    $cat->id,
                    $cat->name,
                    $cat->description,
                    $cat->created_at->format('Y-m-d H:i:s'),
                ]);
            }
            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    public function getCategoryTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="category_template.csv"',
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID (kosongkan untuk baru)', 'Nama Kategori*', 'Deskripsi']);
            fputcsv($file, ['', 'Makanan', 'Produk makanan dan snack']);
            fputcsv($file, ['', 'Minuman', 'Produk minuman']);
            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    public function importCategories(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'mode' => 'nullable|string|in:add,overwrite',
        ]);

        $file = $request->file('file');
        $mode = $request->input('mode', 'add');

        if ($mode === 'overwrite') {
            \App\Models\Category::query()->delete();
        }

        $handle = fopen($file->path(), 'r');
        fgetcsv($handle);

        $imported = 0;
        $errors = [];
        $rowNumber = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $rowNumber++;
            try {
                if (empty(array_filter($data))) continue;

                $name = trim($data[1] ?? '');
                if (empty($name)) {
                    $errors[] = "Row {$rowNumber}: Nama kategori wajib diisi";
                    continue;
                }

                $catData = [
                    'name'        => $name,
                    'description' => $data[2] ?? null,
                ];

                $existing = \App\Models\Category::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();

                if ($existing) {
                    $existing->update($catData);
                } else {
                    \App\Models\Category::create($catData);
                }

                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row {$rowNumber}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'message'  => 'Import completed',
            'imported' => $imported,
            'errors'   => $errors,
        ]);
    }

    // ===========================
    // CUSTOMERS EXPORT/IMPORT
    // ===========================

    public function exportCustomers()
    {
        $customers = \App\Models\Customer::all();
        $filename = 'customers_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($customers) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Nama', 'No. HP', 'Email', 'Alamat', 'Total Pembelian', 'Catatan', 'Dibuat']);
            foreach ($customers as $cust) {
                fputcsv($file, [
                    $cust->id,
                    $cust->name,
                    $cust->phone,
                    $cust->email,
                    $cust->address,
                    $cust->total_purchases,
                    $cust->notes,
                    $cust->created_at->format('Y-m-d H:i:s'),
                ]);
            }
            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    public function getCustomerTemplate()
    {
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="customer_template.csv"',
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID (kosongkan untuk baru)', 'Nama*', 'No. HP', 'Email', 'Alamat', 'Total Pembelian', 'Catatan']);
            fputcsv($file, ['', 'Budi Santoso', '08123456789', 'budi@email.com', 'Jl. Merdeka No. 1', '0', '']);
            fputcsv($file, ['', 'Siti Rahayu', '08987654321', '', 'Jl. Sudirman No. 5', '0', 'Pelanggan tetap']);
            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    public function importCustomers(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'mode' => 'nullable|string|in:add,overwrite',
        ]);

        $file = $request->file('file');
        $mode = $request->input('mode', 'add');

        if ($mode === 'overwrite') {
            \App\Models\Customer::query()->delete();
        }

        $handle = fopen($file->path(), 'r');
        fgetcsv($handle);

        $imported = 0;
        $errors = [];
        $rowNumber = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $rowNumber++;
            try {
                if (empty(array_filter($data))) continue;

                $name = trim($data[1] ?? '');
                if (empty($name)) {
                    $errors[] = "Row {$rowNumber}: Nama pelanggan wajib diisi";
                    continue;
                }

                $custData = [
                    'name'            => $name,
                    'phone'           => $data[2] ?? null,
                    'email'           => $data[3] ?? null,
                    'address'         => $data[4] ?? null,
                    'total_purchases' => floatval($data[5] ?? 0),
                    'notes'           => $data[6] ?? null,
                ];

                $phone = trim($data[2] ?? '');
                $existing = !empty($phone)
                    ? \App\Models\Customer::where('phone', $phone)->first()
                    : null;

                if ($existing) {
                    $existing->update($custData);
                } else {
                    \App\Models\Customer::create($custData);
                }

                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row {$rowNumber}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'message'  => 'Import completed',
            'imported' => $imported,
            'errors'   => $errors,
        ]);
    }

    /**
     * Import users from CSV
     */
    public function importUsers(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'mode' => 'nullable|string|in:add,overwrite',
        ]);

        $file = $request->file('file');
        $mode = $request->input('mode', 'add');
        
        if ($mode === 'overwrite') {
            // Don't delete admin users, only kasir
            \App\Models\User::where('role', '!=', 'admin')->delete();
        }
        
        $handle = fopen($file->path(), 'r');
        fgetcsv($handle); // Skip header

        $imported = 0;
        $errors = [];
        $rowNumber = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $rowNumber++;
            
            try {
                if (empty(array_filter($data))) continue;

                $name = $data[1] ?? null;
                $email = $data[2] ?? null;
                $password = $data[3] ?? null;
                $role = $data[4] ?? 'kasir';
                $status = ($data[5] ?? 'Active') === 'Active';

                if (empty($name) || empty($email)) {
                    $errors[] = "Row {$rowNumber}: Missing name or email";
                    continue;
                }

                $userData = [
                    'name' => $name,
                    'email' => $email,
                    'role' => $role,
                    'is_active' => $status,
                ];

                $existing = \App\Models\User::where('email', $email)->first();
                
                if ($existing) {
                    // Update existing
                    $existing->update($userData);
                    if (!empty($password)) {
                        $existing->update(['password' => bcrypt($password)]);
                    }
                } else {
                    // Create new - password required
                    if (empty($password)) {
                        $errors[] = "Row {$rowNumber}: Password required for new user";
                        continue;
                    }
                    $userData['password'] = bcrypt($password);
                    \App\Models\User::create($userData);
                }

                $imported++;
            } catch (\Exception $e) {
                $errors[] = "Row {$rowNumber}: " . $e->getMessage();
            }
        }

        fclose($handle);

        return response()->json([
            'message' => 'Import completed',
            'imported' => $imported,
            'errors' => $errors,
        ]);
    }
}
