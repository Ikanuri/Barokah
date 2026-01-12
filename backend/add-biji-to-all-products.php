<?php

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "====================================\n";
echo "Add Unit 'Biji' to All Products\n";
echo "====================================\n\n";

try {
    // Get all products
    $products = DB::table('products')
        ->where('is_active', 1)
        ->get();
    
    echo "Found " . $products->count() . " active products\n\n";
    
    $added = 0;
    $skipped = 0;
    
    foreach ($products as $product) {
        echo "Processing: {$product->name}\n";
        
        // Check if product already has 'biji' unit
        $existingBiji = DB::table('product_units')
            ->where('product_id', $product->id)
            ->where('unit_name', 'biji')
            ->first();
        
        if ($existingBiji) {
            echo "  ⏭️  Already has 'biji' unit - skipping\n\n";
            $skipped++;
            continue;
        }
        
        // Get the largest unit (by selling_price)
        $largestUnit = DB::table('product_units')
            ->where('product_id', $product->id)
            ->orderBy('selling_price', 'desc')
            ->first();
        
        if (!$largestUnit) {
            echo "  ⚠️  No units found - skipping\n\n";
            $skipped++;
            continue;
        }
        
        // Calculate biji price (1/10 of largest unit)
        $bijiPrice = round($largestUnit->selling_price / 10);
        
        // Get max order for this product
        $maxOrder = DB::table('product_units')
            ->where('product_id', $product->id)
            ->max('order') ?? 0;
        
        // Insert new 'biji' unit
        DB::table('product_units')->insert([
            'product_id' => $product->id,
            'unit_name' => 'biji',
            'unit_type' => 'smaller',
            'conversion_value' => 0.1, // 1 biji = 0.1 of largest unit (10 biji = 1 largest)
            'selling_price' => $bijiPrice,
            'order' => $maxOrder + 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        echo "  ✅ Added 'biji' unit: Rp " . number_format($bijiPrice, 0, ',', '.') . "\n";
        echo "     (Based on '{$largestUnit->unit_name}' @ Rp " . number_format($largestUnit->selling_price, 0, ',', '.') . ")\n\n";
        
        $added++;
    }
    
    echo "====================================\n";
    echo "Summary:\n";
    echo "  ✅ Added: $added products\n";
    echo "  ⏭️  Skipped: $skipped products\n";
    echo "====================================\n\n";
    
    if ($added > 0) {
        echo "⚠️  IMPORTANT: Jangan lupa refresh cache di frontend!\n";
        echo "   Klik tombol '🔄 Refresh' di halaman POS\n";
        echo "   atau jalankan: sessionStorage.removeItem('pos_products_cache'); location.reload();\n";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
    exit(1);
}

echo "\n✅ Script completed successfully!\n";
