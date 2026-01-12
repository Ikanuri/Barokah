<?php

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "====================================\n";
echo "Add Default Unit to All Products\n";
echo "====================================\n\n";

try {
    // Get all active products
    $products = DB::table('products')
        ->where('is_active', 1)
        ->get();
    
    echo "Found " . $products->count() . " active products\n\n";
    
    $added = 0;
    $skipped = 0;
    
    foreach ($products as $product) {
        echo "Processing: {$product->name}\n";
        
        // Check if product already has any unit
        $existingUnits = DB::table('product_units')
            ->where('product_id', $product->id)
            ->count();
        
        if ($existingUnits > 0) {
            echo "  ⏭️  Already has {$existingUnits} unit(s) - skipping\n\n";
            $skipped++;
            continue;
        }
        
        // Determine unit name from base_unit or use default
        $unitName = $product->base_unit ?? 'pcs';
        
        // Use selling_price, if not available use base_price, if not available use 0
        $price = $product->selling_price ?? $product->base_price ?? 0;
        
        if ($price <= 0) {
            echo "  ⚠️  No valid price (selling_price: {$product->selling_price}, base_price: {$product->base_price}) - using Rp 1,000\n";
            $price = 1000;
        }
        
        // Insert default unit
        DB::table('product_units')->insert([
            'product_id' => $product->id,
            'unit_name' => $unitName,
            'unit_type' => 'base', // base unit (unit dasar)
            'conversion_value' => 1.0, // 1:1 conversion (ini adalah unit dasar)
            'selling_price' => $price,
            'order' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        echo "  ✅ Added default unit '{$unitName}' @ Rp " . number_format($price, 0, ',', '.') . "\n\n";
        
        $added++;
        
        // Optional: Update product's base_unit if it was null
        if ($product->base_unit === null) {
            DB::table('products')
                ->where('id', $product->id)
                ->update(['base_unit' => $unitName]);
        }
    }
    
    echo "====================================\n";
    echo "Summary:\n";
    echo "  ✅ Added: $added products\n";
    echo "  ⏭️  Skipped: $skipped products (already have units)\n";
    echo "====================================\n\n";
    
    if ($added > 0) {
        echo "⚠️  IMPORTANT: Jangan lupa refresh cache di frontend!\n";
        echo "   Klik tombol '🔄 Refresh' di halaman POS\n";
        echo "   atau jalankan: sessionStorage.removeItem('pos_products_cache'); location.reload();\n\n";
        
        echo "💡 NEXT STEP: Setelah ini, Anda bisa:\n";
        echo "   1. Jalankan script add-biji-to-all-products.php untuk tambah unit 'biji'\n";
        echo "   2. Atau tambah unit lain sesuai kebutuhan (dus, box, karton, dll)\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n✅ Script completed successfully!\n";
