<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Customer;
use App\Models\CustomerTier;

class CustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $tiers = CustomerTier::all()->keyBy('slug');

        $customers = [
            [
                'name' => 'Budi Santoso',
                'email' => 'budi@example.com',
                'phone' => '081234567890',
                'tier_id' => $tiers['bronze']->id,
                'total_purchases' => 500000,
                'address' => 'Jl. Merdeka No. 10, Jakarta',
                'is_active' => true,
            ],
            [
                'name' => 'Siti Aminah',
                'email' => 'siti@example.com',
                'phone' => '081234567891',
                'tier_id' => $tiers['silver']->id,
                'total_purchases' => 2500000,
                'address' => 'Jl. Sudirman No. 45, Jakarta',
                'is_active' => true,
            ],
            [
                'name' => 'Ahmad Fauzi',
                'email' => 'ahmad@example.com',
                'phone' => '081234567892',
                'tier_id' => $tiers['gold']->id,
                'total_purchases' => 7500000,
                'address' => 'Jl. Gatot Subroto No. 88, Jakarta',
                'is_active' => true,
            ],
            [
                'name' => 'Dewi Lestari',
                'email' => 'dewi@example.com',
                'phone' => '081234567893',
                'tier_id' => $tiers['platinum']->id,
                'total_purchases' => 15000000,
                'address' => 'Jl. Thamrin No. 1, Jakarta',
                'is_active' => true,
            ],
            [
                'name' => 'Rudi Hartono',
                'email' => 'rudi@example.com',
                'phone' => '081234567894',
                'tier_id' => null, // No tier
                'total_purchases' => 250000,
                'address' => 'Jl. Diponegoro No. 23, Bandung',
                'is_active' => true,
            ],
        ];

        foreach ($customers as $customer) {
            Customer::create($customer);
        }

        $this->command->info('✅ Created 5 test customers with different tiers');
        $this->command->info('   - Bronze: Budi Santoso');
        $this->command->info('   - Silver: Siti Aminah (5% discount)');
        $this->command->info('   - Gold: Ahmad Fauzi (10% discount)');
        $this->command->info('   - Platinum: Dewi Lestari (15% discount)');
        $this->command->info('   - No tier: Rudi Hartono');
    }
}
