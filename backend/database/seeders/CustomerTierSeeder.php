<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CustomerTierSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tiers = [
            [
                'name' => 'Bronze',
                'slug' => 'bronze',
                'discount_percentage' => 0,
                'minimum_purchase' => 0,
                'color' => '#CD7F32',
                'icon' => '🥉',
                'description' => 'Tier dasar untuk pelanggan baru',
                'order' => 1,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Silver',
                'slug' => 'silver',
                'discount_percentage' => 5,
                'minimum_purchase' => 1000000, // 1 juta
                'color' => '#C0C0C0',
                'icon' => '🥈',
                'description' => 'Tier silver dengan diskon 5%',
                'order' => 2,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Gold',
                'slug' => 'gold',
                'discount_percentage' => 10,
                'minimum_purchase' => 5000000, // 5 juta
                'color' => '#FFD700',
                'icon' => '🥇',
                'description' => 'Tier gold dengan diskon 10%',
                'order' => 3,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Platinum',
                'slug' => 'platinum',
                'discount_percentage' => 15,
                'minimum_purchase' => 10000000, // 10 juta
                'color' => '#E5E4E2',
                'icon' => '💎',
                'description' => 'Tier platinum dengan diskon 15%',
                'order' => 4,
                'is_active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('customer_tiers')->insert($tiers);
    }
}
