<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Store;

class StoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $stores = [
            [
                'code' => 'TK001',
                'name' => 'Toko Pusat',
                'address' => 'Jl. Raya Utama No. 123, Jakarta',
                'phone' => '021-1234567',
                'is_active' => true,
                'settings' => [
                    'receipt_footer' => 'Terima kasih atas kunjungan Anda!',
                    'tax_rate' => 0,
                    'currency' => 'IDR',
                ],
            ],
            [
                'code' => 'TK002',
                'name' => 'Cabang Selatan',
                'address' => 'Jl. Sudirman No. 456, Jakarta Selatan',
                'phone' => '021-7654321',
                'is_active' => true,
                'settings' => [
                    'receipt_footer' => 'Terima kasih sudah berbelanja!',
                    'tax_rate' => 0,
                    'currency' => 'IDR',
                ],
            ],
        ];

        foreach ($stores as $storeData) {
            Store::create($storeData);
        }
    }
}
