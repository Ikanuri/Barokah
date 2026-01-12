<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\ProductPrice;
use Illuminate\Database\Seeder;

class ProductPriceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get first 5 products untuk demo
        $products = Product::take(5)->get();

        foreach ($products as $product) {
            $basePrice = $product->selling_price;

            // 1. Harga Normal (base price)
            ProductPrice::create([
                'product_id' => $product->id,
                'price_type' => 'normal',
                'price_name' => 'Harga Normal',
                'price' => $basePrice,
                'min_quantity' => 1,
                'is_active' => true,
                'priority' => 1,
                'description' => 'Harga eceran standar untuk pelanggan umum',
            ]);

            // 2. Harga Bronze (0% discount - same as normal)
            ProductPrice::create([
                'product_id' => $product->id,
                'price_type' => 'bronze',
                'price_name' => 'Harga Bronze',
                'price' => $basePrice * 1.00,
                'min_quantity' => 1,
                'is_active' => true,
                'priority' => 2,
                'description' => 'Khusus pelanggan tier Bronze (0% diskon)',
            ]);

            // 3. Harga Silver (5% discount)
            ProductPrice::create([
                'product_id' => $product->id,
                'price_type' => 'silver',
                'price_name' => 'Harga Silver',
                'price' => $basePrice * 0.95,
                'min_quantity' => 1,
                'is_active' => true,
                'priority' => 3,
                'description' => 'Khusus pelanggan tier Silver (5% diskon)',
            ]);

            // 4. Harga Gold (10% discount)
            ProductPrice::create([
                'product_id' => $product->id,
                'price_type' => 'gold',
                'price_name' => 'Harga Gold',
                'price' => $basePrice * 0.90,
                'min_quantity' => 1,
                'is_active' => true,
                'priority' => 4,
                'description' => 'Khusus pelanggan tier Gold (10% diskon)',
            ]);

            // 5. Harga Platinum (15% discount)
            ProductPrice::create([
                'product_id' => $product->id,
                'price_type' => 'platinum',
                'price_name' => 'Harga Platinum',
                'price' => $basePrice * 0.85,
                'min_quantity' => 1,
                'is_active' => true,
                'priority' => 5,
                'description' => 'Khusus pelanggan tier Platinum (15% diskon)',
            ]);

            // 6. Harga Grosir (10% discount, min 10 pcs)
            ProductPrice::create([
                'product_id' => $product->id,
                'price_type' => 'wholesale',
                'price_name' => 'Harga Grosir',
                'price' => $basePrice * 0.90,
                'min_quantity' => 10,
                'is_active' => true,
                'priority' => 6,
                'description' => 'Minimum pembelian 10 pcs (10% diskon)',
            ]);

            // 7. Harga Super Grosir (20% discount, min 50 pcs)
            ProductPrice::create([
                'product_id' => $product->id,
                'price_type' => 'super_wholesale',
                'price_name' => 'Harga Super Grosir',
                'price' => $basePrice * 0.80,
                'min_quantity' => 50,
                'is_active' => true,
                'priority' => 7,
                'description' => 'Minimum pembelian 50 pcs (20% diskon)',
            ]);
        }

        $this->command->info('✅ Product prices seeded successfully!');
        $this->command->info("   - {$products->count()} products with 7 price tiers each (35 total)");
        $this->command->info('   - Customer Tiers: Bronze (0%), Silver (5%), Gold (10%), Platinum (15%)');
        $this->command->info('   - Quantity Tiers: Wholesale (10+ pcs), Super Wholesale (50+ pcs)');
    }
}
