<?php

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "====================================\n";
echo "Reset Stock & Fix Unit Configuration\n";
echo "====================================\n\n";

echo "This script will:\n";
echo "1. Set all products base_unit = 'biji'\n";
echo "2. Set all products stock_quantity = 100000 (initial stock)\n";
echo "3. Keep product_units as is (for manual adjustment later)\n\n";

echo "Press CTRL+C to cancel, or ENTER to continue...\n";
$handle = fopen("php://stdin", "r");
$line = fgets($handle);
fclose($handle);

try {
    echo "\nProcessing...\n\n";
    
    // Update all products
    $updated = DB::table('products')
        ->where('is_active', 1)
        ->update([
            'base_unit' => 'biji',
            'stock_quantity' => 100000,
            'updated_at' => now()
        ]);
    
    echo "✅ Updated {$updated} products:\n";
    echo "   - base_unit = 'biji'\n";
    echo "   - stock_quantity = 100,000\n\n";
    
    echo "====================================\n";
    echo "Summary:\n";
    echo "====================================\n";
    echo "✅ All products now have:\n";
    echo "   - Stock: 100,000 biji (initial stock)\n";
    echo "   - Base unit: biji\n";
    echo "   - Units: Already created (can be adjusted manually)\n\n";
    
    echo "💡 Next steps:\n";
    echo "   1. Input stok awal via halaman produk/stok\n";
    echo "   2. Untuk produk khusus (liter, kg, meter):\n";
    echo "      - Ubah base_unit manual di database/admin\n";
    echo "      - Atau tambah unit baru dengan konversi sesuai\n";
    echo "   3. Refresh cache di POS (klik tombol 🔄 Refresh)\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Script completed successfully!\n";
