<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Seed roles and permissions first
        $this->call(RolePermissionSeeder::class);

        // Seed stores first
        $this->call(StoreSeeder::class);

        // Get first store as default
        $defaultStore = \App\Models\Store::first();

        // Seed customer tiers
        $this->call(CustomerTierSeeder::class);

        // Create admin user
        $admin = User::create([
            'store_id' => $defaultStore->id,
            'name' => 'Administrator',
            'email' => 'admin@pos.com',
            'password' => Hash::make('password'),
            'phone' => '081234567890',
            'is_active' => true,
        ]);
        $admin->assignRole('admin');

        // Create kasir user
        $kasir = User::create([
            'store_id' => $defaultStore->id,
            'name' => 'Kasir 1',
            'email' => 'kasir@pos.com',
            'password' => Hash::make('password'),
            'phone' => '081234567891',
            'is_active' => true,
        ]);
        $kasir->assignRole('kasir');

        // Create categories
        $categories = [
            ['name' => 'Mie Instant', 'description' => 'Produk mie instant berbagai merk'],
            ['name' => 'Minuman', 'description' => 'Minuman kemasan dan soft drink'],
            ['name' => 'Snack', 'description' => 'Makanan ringan dan cemilan'],
            ['name' => 'Bumbu Dapur', 'description' => 'Bumbu masak dan penyedap'],
        ];

        foreach ($categories as $category) {
            Category::create($category);
        }

        // Create sample products
        $products = [
            [
                'store_id' => $defaultStore->id,
                'name' => 'Mie Sedap Goreng',
                'sku' => 'MIE-001',
                'barcode' => '8998866200011',
                'category_id' => 1,
                'description' => 'Mie instant goreng rasa original',
                'base_price' => 2000,
                'selling_price' => 2500,
                'base_unit' => 'biji',
                'stock_quantity' => 400,
                'minimum_stock' => 50,
                'is_active' => true,
            ],
            [
                'store_id' => $defaultStore->id,
                'name' => 'Indomie Goreng',
                'sku' => 'MIE-002',
                'barcode' => '8992753902011',
                'category_id' => 1,
                'description' => 'Mie instant goreng rasa special',
                'base_price' => 2200,
                'selling_price' => 2800,
                'base_unit' => 'biji',
                'stock_quantity' => 320,
                'minimum_stock' => 40,
                'is_active' => true,
            ],
            [
                'store_id' => $defaultStore->id,
                'name' => 'Coca Cola 330ml',
                'sku' => 'MIN-001',
                'barcode' => '8993742100121',
                'category_id' => 2,
                'description' => 'Minuman bersoda rasa cola',
                'base_price' => 4000,
                'selling_price' => 5000,
                'base_unit' => 'kaleng',
                'stock_quantity' => 144,
                'minimum_stock' => 24,
                'is_active' => true,
            ],
        ];

        foreach ($products as $productData) {
            $product = Product::create($productData);

            // Add product units for Mie products
            if ($product->category_id == 1) {
                $product->units()->create([
                    'unit_name' => 'dus',
                    'conversion_value' => 40,
                    'selling_price' => $product->selling_price * 40 * 0.95, // 5% discount for wholesale
                    'barcode' => $product->barcode . 'D',
                    'order' => 1,
                ]);

                $product->units()->create([
                    'unit_name' => 'karton',
                    'conversion_value' => 400,
                    'selling_price' => $product->selling_price * 400 * 0.90, // 10% discount for carton
                    'barcode' => $product->barcode . 'K',
                    'order' => 2,
                ]);
            }

            // Add product units for drinks
            if ($product->category_id == 2) {
                $product->units()->create([
                    'unit_name' => 'pak',
                    'conversion_value' => 12,
                    'selling_price' => $product->selling_price * 12 * 0.97,
                    'barcode' => $product->barcode . 'P',
                    'order' => 1,
                ]);
            }
        }

        // Seed product prices (alternative pricing)
        $this->call(ProductPriceSeeder::class);

        // Seed test customers
        $this->call(CustomerSeeder::class);
    }
}
