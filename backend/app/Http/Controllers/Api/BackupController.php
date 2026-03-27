<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BackupController extends Controller
{
    // Tables to backup/restore, in dependency order (parent tables first)
    private array $tables = [
        'categories',
        'stores',
        'customer_tiers',
        'users',
        'customers',
        'products',
        'product_units',
        'product_prices',
        'transactions',
        'transaction_items',
        'expenses',
    ];

    /**
     * Download full backup as a single JSON file
     */
    public function createFullBackup()
    {
        try {
            $data = [];

            foreach ($this->tables as $table) {
                try {
                    $data[$table] = DB::table($table)->get()->map(fn($row) => (array) $row)->toArray();
                } catch (\Exception) {
                    $data[$table] = []; // Table may not exist yet
                }
            }

            $backup = [
                'meta' => [
                    'app'        => 'POS Kasir',
                    'version'    => '2.0',
                    'created_at' => now()->toISOString(),
                    'tables'     => array_keys($data),
                ],
                'data' => $data,
            ];

            $filename = 'pos_backup_' . now()->format('Y-m-d_His') . '.json';
            $json = json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            return response($json, 200)
                ->header('Content-Type', 'application/json')
                ->header('Content-Disposition', "attachment; filename=\"{$filename}\"");

        } catch (\Exception $e) {
            return response()->json(['message' => 'Backup gagal', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * Restore from backup JSON file
     * mode=overwrite: hapus semua data lama, ganti dengan backup
     * mode=merge: upsert — update jika id ada, insert jika belum ada
     */
    public function restoreFromBackup(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:json,txt',
            'mode' => 'required|in:merge,overwrite',
        ]);

        try {
            $content = file_get_contents($request->file('file')->path());
            $backup  = json_decode($content, true);

            if (!$backup || !isset($backup['data'])) {
                return response()->json(['message' => 'Format file backup tidak valid'], 400);
            }

            $data  = $backup['data'];
            $mode  = $request->input('mode');
            $stats = [];

            DB::statement('SET FOREIGN_KEY_CHECKS=0');
            DB::beginTransaction();

            if ($mode === 'overwrite') {
                // DELETE (bukan TRUNCATE) — TRUNCATE menyebabkan implicit commit di MySQL
                foreach (array_reverse($this->tables) as $table) {
                    try {
                        DB::table($table)->delete();
                    } catch (\Exception) {
                        // Skip tables that don't exist
                    }
                }
            }

            // Restore each table
            foreach ($this->tables as $table) {
                $rows  = $data[$table] ?? [];
                $count = 0;

                foreach ($rows as $row) {
                    $row = (array) $row;

                    try {
                        if ($mode === 'overwrite') {
                            DB::table($table)->insert($row);
                        } else {
                            // Merge: upsert by id
                            if (isset($row['id']) && DB::table($table)->where('id', $row['id'])->exists()) {
                                DB::table($table)->where('id', $row['id'])->update($row);
                            } else {
                                DB::table($table)->insert($row);
                            }
                        }
                        $count++;
                    } catch (\Exception) {
                        // Skip rows that fail
                    }
                }

                $stats[$table] = $count;
            }

            DB::commit();
            DB::statement('SET FOREIGN_KEY_CHECKS=1');

            // Reset auto-increment after restore
            foreach ($this->tables as $table) {
                try {
                    $maxId = DB::table($table)->max('id');
                    if ($maxId) {
                        DB::statement("ALTER TABLE `{$table}` AUTO_INCREMENT = " . ($maxId + 1));
                    }
                } catch (\Exception) {
                    // Skip
                }
            }

            $total = array_sum($stats);

            return response()->json([
                'message' => "Restore berhasil — {$total} baris dipulihkan",
                'stats'   => $stats,
            ]);

        } catch (\Exception $e) {
            if (DB::transactionLevel() > 0) {
                DB::rollBack();
            }
            DB::statement('SET FOREIGN_KEY_CHECKS=1');

            return response()->json(['message' => 'Restore gagal: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Send backup to Telegram
     */
    public function sendBackupToTelegram(Request $request)
    {
        $request->validate([
            'bot_token' => 'required|string',
            'chat_id'   => 'required|string',
        ]);

        try {
            $data = [];
            foreach ($this->tables as $table) {
                try {
                    $data[$table] = DB::table($table)->get()->map(fn($row) => (array) $row)->toArray();
                } catch (\Exception) {
                    $data[$table] = [];
                }
            }

            $backup = [
                'meta' => [
                    'app'        => 'POS Kasir',
                    'version'    => '2.0',
                    'created_at' => now()->toISOString(),
                ],
                'data' => $data,
            ];

            $filename = 'pos_backup_' . now()->format('Y-m-d_His') . '.json';
            $json     = json_encode($backup, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

            $tempPath = storage_path('app/temp/' . $filename);
            if (!file_exists(dirname($tempPath))) {
                mkdir(dirname($tempPath), 0755, true);
            }
            file_put_contents($tempPath, $json);

            $botToken = $request->input('bot_token');
            $chatId   = $request->input('chat_id');

            $response = \Illuminate\Support\Facades\Http::attach(
                'document',
                file_get_contents($tempPath),
                $filename
            )->post("https://api.telegram.org/bot{$botToken}/sendDocument", [
                'chat_id' => $chatId,
                'caption' => '📦 POS Backup — ' . now()->format('d M Y H:i:s'),
            ]);

            unlink($tempPath);

            if ($response->successful()) {
                return response()->json(['message' => 'Backup terkirim ke Telegram', 'filename' => $filename]);
            }

            return response()->json(['message' => 'Gagal kirim ke Telegram', 'error' => $response->json()], 500);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Gagal: ' . $e->getMessage()], 500);
        }
    }
}
