<?php

require __DIR__ . '/vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Bootstrap Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "====================================\n";
echo "Set All Products Category to NULL\n";
echo "====================================\n\n";

echo "This script will set all products category_id = NULL\n";
echo "Making category optional for all products.\n\n";

echo "Press CTRL+C to cancel, or ENTER to continue...\n";
$handle = fopen("php://stdin", "r");
$line = fgets($handle);
fclose($handle);

try {
    echo "\nProcessing...\n\n";
    
    // Update all products
    $updated = DB::table('products')
        ->update([
            'category_id' => null,
            'updated_at' => now()
        ]);
    
    echo "✅ Updated {$updated} products:\n";
    echo "   - category_id = NULL\n\n";
    
    echo "====================================\n";
    echo "Summary:\n";
    echo "====================================\n";
    echo "✅ All products now have optional category\n";
    echo "   You can assign categories later as needed\n\n";
    
    echo "💡 Next steps:\n";
    echo "   1. Refresh cache di POS (klik tombol 🔄 Refresh)\n";
    echo "   2. Assign categories via product form as needed\n";
    echo "   3. Use quick-add category feature in product dropdown\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n✅ Script completed successfully!\n";
