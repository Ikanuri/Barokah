<?php

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "====================================\n";
echo "Check Stock & Unit Configuration\n";
echo "====================================\n\n";

// Check a sample product
$product = DB::table('products')
    ->where('name', 'LIKE', '%Surya 12%')
    ->first();

if ($product) {
    echo "Product: {$product->name}\n";
    echo "Stock Quantity: {$product->stock_quantity}\n";
    echo "Base Unit: {$product->base_unit}\n";
    echo "Selling Price: Rp " . number_format($product->selling_price, 0, ',', '.') . "\n\n";
    
    echo "Units:\n";
    $units = DB::table('product_units')
        ->where('product_id', $product->id)
        ->orderBy('order')
        ->get();
    
    foreach ($units as $unit) {
        echo "  - {$unit->unit_name}:\n";
        echo "    Conversion: {$unit->conversion_value}\n";
        echo "    Price: Rp " . number_format($unit->selling_price, 0, ',', '.') . "\n";
        echo "    Type: {$unit->unit_type}\n\n";
    }
    
    echo "Interpretation:\n";
    echo "  Stock {$product->stock_quantity} {$product->base_unit} means:\n";
    foreach ($units as $unit) {
        if ($unit->conversion_value > 0) {
            $qty = $product->stock_quantity / $unit->conversion_value;
            echo "  - {$qty} {$unit->unit_name}\n";
        }
    }
}

echo "\n====================================\n";
echo "Sample of other products:\n";
echo "====================================\n\n";

$samples = DB::table('products')
    ->where('is_active', 1)
    ->limit(5)
    ->get();

foreach ($samples as $prod) {
    echo "{$prod->name}:\n";
    echo "  Stock: {$prod->stock_quantity} {$prod->base_unit}\n";
    
    $unitCount = DB::table('product_units')
        ->where('product_id', $prod->id)
        ->count();
    echo "  Units: {$unitCount}\n\n";
}
