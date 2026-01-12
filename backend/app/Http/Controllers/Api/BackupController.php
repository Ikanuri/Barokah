<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Response;

class BackupController extends Controller
{
    /**
     * Create full backup of all data
     */
    public function createFullBackup()
    {
        try {
            $backup = [
                'created_at' => now()->toISOString(),
                'version' => '1.0',
                'data' => [
                    'categories' => Category::all()->toArray(),
                    'products' => Product::with('units')->get()->toArray(),
                    'users' => User::select('id', 'name', 'email', 'role', 'is_active', 'created_at')->get()->toArray(),
                    'transactions' => Transaction::with('items.product')->get()->toArray(),
                ]
            ];

            $filename = 'backup_' . now()->format('Y-m-d_His') . '.json';
            $json = json_encode($backup, JSON_PRETTY_PRINT);

            return response($json, 200)
                ->header('Content-Type', 'application/json')
                ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Backup failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Restore from backup file
     */
    public function restoreFromBackup(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:json',
            'mode' => 'required|in:merge,overwrite',
        ]);

        try {
            $file = $request->file('file');
            $content = file_get_contents($file->path());
            $backup = json_decode($content, true);

            if (!$backup || !isset($backup['data'])) {
                return response()->json([
                    'message' => 'Invalid backup file format'
                ], 400);
            }

            DB::beginTransaction();

            $mode = $request->input('mode');
            $stats = [
                'categories' => 0,
                'products' => 0,
                'users' => 0,
                'transactions' => 0,
            ];

            // OVERWRITE MODE: Clear existing data
            if ($mode === 'overwrite') {
                TransactionItem::query()->delete();
                Transaction::query()->delete();
                Product::query()->delete();
                // Don't delete categories and users (keep system integrity)
            }

            // Restore Categories
            if (isset($backup['data']['categories'])) {
                foreach ($backup['data']['categories'] as $cat) {
                    $existing = Category::where('id', $cat['id'])->first();
                    if ($existing && $mode === 'merge') {
                        $existing->update([
                            'name' => $cat['name'],
                            'description' => $cat['description'] ?? null,
                        ]);
                    } elseif (!$existing) {
                        Category::create($cat);
                    }
                    $stats['categories']++;
                }
            }

            // Restore Products
            if (isset($backup['data']['products'])) {
                foreach ($backup['data']['products'] as $prod) {
                    $units = $prod['units'] ?? [];
                    unset($prod['units']);

                    $existing = Product::where('id', $prod['id'])->first();
                    if ($existing && $mode === 'merge') {
                        $existing->update($prod);
                        $product = $existing;
                    } elseif (!$existing) {
                        $product = Product::create($prod);
                    }
                    $stats['products']++;
                }
            }

            // Restore Transactions
            if (isset($backup['data']['transactions'])) {
                foreach ($backup['data']['transactions'] as $trans) {
                    $items = $trans['items'] ?? [];
                    unset($trans['items']);

                    $existing = Transaction::where('id', $trans['id'])->first();
                    if ($existing && $mode === 'merge') {
                        continue; // Skip existing transactions in merge mode
                    }

                    $transaction = Transaction::create($trans);
                    
                    foreach ($items as $item) {
                        $item['transaction_id'] = $transaction->id;
                        TransactionItem::create($item);
                    }
                    
                    $stats['transactions']++;
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Restore completed successfully',
                'stats' => $stats,
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'message' => 'Restore failed',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Send backup file to Telegram
     */
    public function sendBackupToTelegram(Request $request)
    {
        $request->validate([
            'bot_token' => 'required|string',
            'chat_id' => 'required|string',
        ]);

        try {
            // Create backup
            $backup = [
                'created_at' => now()->toISOString(),
                'version' => '1.0',
                'data' => [
                    'categories' => Category::all()->toArray(),
                    'products' => Product::with('units')->get()->toArray(),
                    'users' => User::select('id', 'name', 'email', 'role', 'is_active', 'created_at')->get()->toArray(),
                    'transactions' => Transaction::with('items.product')->get()->toArray(),
                ]
            ];

            $filename = 'backup_' . now()->format('Y-m-d_His') . '.json';
            $json = json_encode($backup, JSON_PRETTY_PRINT);

            // Save temporarily
            $tempPath = storage_path('app/temp/' . $filename);
            if (!file_exists(dirname($tempPath))) {
                mkdir(dirname($tempPath), 0755, true);
            }
            file_put_contents($tempPath, $json);

            // Send to Telegram
            $botToken = $request->input('bot_token');
            $chatId = $request->input('chat_id');
            $url = "https://api.telegram.org/bot{$botToken}/sendDocument";

            $response = Http::attach(
                'document', 
                file_get_contents($tempPath), 
                $filename
            )->post($url, [
                'chat_id' => $chatId,
                'caption' => '📦 POS Backup - ' . now()->format('d M Y H:i:s')
            ]);

            // Clean up temp file
            unlink($tempPath);

            if ($response->successful()) {
                return response()->json([
                    'message' => 'Backup sent to Telegram successfully',
                    'filename' => $filename,
                ]);
            } else {
                return response()->json([
                    'message' => 'Failed to send to Telegram',
                    'error' => $response->json()
                ], 500);
            }

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to send backup to Telegram',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export Categories to CSV
     */
    public function exportCategories()
    {
        $categories = Category::all();
        $filename = 'categories_' . now()->format('Y-m-d_His') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() use ($categories) {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['ID', 'Name', 'Description', 'Created At']);

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

    /**
     * Import Categories from CSV
     */
    public function importCategories(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:csv,txt',
            'mode' => 'nullable|string|in:add,overwrite',
        ]);

        $file = $request->file('file');
        $mode = $request->input('mode', 'add');
        
        if ($mode === 'overwrite') {
            Category::query()->delete();
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
                if (empty($name)) {
                    $errors[] = "Row {$rowNumber}: Missing category name";
                    continue;
                }

                $categoryData = [
                    'name' => $name,
                    'description' => $data[2] ?? null,
                ];

                $existing = Category::where('name', $name)->first();
                if ($existing && $mode === 'add') {
                    $existing->update($categoryData);
                } else {
                    Category::create($categoryData);
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

    /**
     * Get Category CSV Template
     */
    public function getCategoryTemplate()
    {
        $filename = 'category_template.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['ID (kosongkan untuk baru)', 'Nama Kategori*', 'Deskripsi']);
            fputcsv($file, ['', 'Makanan', 'Kategori makanan dan snack']);
            fputcsv($file, ['', 'Minuman', 'Kategori minuman']);
            fputcsv($file, ['', 'Elektronik', 'Kategori barang elektronik']);

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    /**
     * Export Customers to CSV
     */
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
            
            fputcsv($file, ['ID', 'Name', 'Phone', 'Email', 'Address', 'Created At']);

            foreach ($customers as $customer) {
                fputcsv($file, [
                    $customer->id,
                    $customer->name,
                    $customer->phone,
                    $customer->email,
                    $customer->address,
                    $customer->created_at->format('Y-m-d H:i:s'),
                ]);
            }

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }

    /**
     * Import Customers from CSV
     */
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
        fgetcsv($handle); // Skip header

        $imported = 0;
        $errors = [];
        $rowNumber = 1;

        while (($data = fgetcsv($handle)) !== false) {
            $rowNumber++;
            
            try {
                if (empty(array_filter($data))) continue;

                $name = $data[1] ?? null;
                $phone = $data[2] ?? null;

                if (empty($name)) {
                    $errors[] = "Row {$rowNumber}: Missing customer name";
                    continue;
                }

                $customerData = [
                    'name' => $name,
                    'phone' => $phone,
                    'email' => $data[3] ?? null,
                    'address' => $data[4] ?? null,
                ];

                if ($phone) {
                    $existing = \App\Models\Customer::where('phone', $phone)->first();
                    if ($existing && $mode === 'add') {
                        $existing->update($customerData);
                    } else {
                        \App\Models\Customer::create($customerData);
                    }
                } else {
                    \App\Models\Customer::create($customerData);
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

    /**
     * Get Customer CSV Template
     */
    public function getCustomerTemplate()
    {
        $filename = 'customer_template.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function() {
            $file = fopen('php://output', 'w');
            
            fputcsv($file, ['ID (kosongkan untuk baru)', 'Nama*', 'Telepon', 'Email', 'Alamat']);
            fputcsv($file, ['', 'John Doe', '081234567890', 'john@example.com', 'Jl. Example No. 123']);
            fputcsv($file, ['', 'Jane Smith', '081298765432', 'jane@example.com', 'Jl. Sample No. 456']);

            fclose($file);
        };

        return Response::stream($callback, 200, $headers);
    }
}
