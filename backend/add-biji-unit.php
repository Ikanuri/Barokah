#!/usr/bin/env php
<?php

// Script untuk menambahkan unit "biji" ke produk Surya 12

require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make(\Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\Product;
use App\Models\ProductUnit;

// Cari produk Surya 12
$product = Product::where('name', 'LIKE', '%Surya 12%')->first();

if (!$product) {
    echo "❌ Produk 'Surya 12' tidak ditemukan!\n";
    exit(1);
}

echo "✅ Produk ditemukan: {$product->name}\n";
echo "   Base unit: {$product->base_unit}\n";
echo "   Selling price: Rp " . number_format($product->selling_price, 0, ',', '.') . "\n\n";

// Cek unit yang sudah ada
echo "📦 Unit yang sudah ada:\n";
foreach ($product->units as $unit) {
    echo "   - {$unit->unit_name}: Rp " . number_format($unit->selling_price, 0, ',', '.') 
         . " (konversi: {$unit->conversion_value} {$product->base_unit})\n";
}

// Cek apakah unit "biji" sudah ada
$bijiUnit = $product->units()->where('unit_name', 'biji')->first();

if ($bijiUnit) {
    echo "\n⚠️  Unit 'biji' sudah ada!\n";
    echo "   Harga: Rp " . number_format($bijiUnit->selling_price, 0, ',', '.') . "\n";
} else {
    echo "\n➕ Menambahkan unit 'biji'...\n";
    
    // Asumsi: 1 slop = 10 biji (sesuaikan jika berbeda)
    // Jika harga slop = 350.000, maka harga biji = 35.000
    $slopUnit = $product->units()->where('unit_name', 'slop')->first();
    
    if ($slopUnit) {
        $bijiPrice = $slopUnit->selling_price / 10; // 1 slop = 10 biji
        $bijiConversion = 0.1; // 1 biji = 0.1 slop
    } else {
        // Fallback ke base price
        $bijiPrice = $product->selling_price;
        $bijiConversion = 1;
    }
    
    $newUnit = $product->units()->create([
        'unit_name' => 'biji',
        'unit_type' => 'smaller',
        'conversion_value' => $bijiConversion,
        'selling_price' => $bijiPrice,
        'order' => 2
    ]);
    
    echo "✅ Unit 'biji' berhasil ditambahkan!\n";
    echo "   Harga: Rp " . number_format($newUnit->selling_price, 0, ',', '.') . "\n";
    echo "   Konversi: {$newUnit->conversion_value} slop\n";
}

echo "\n📊 Unit sekarang:\n";
$product->load('units');
foreach ($product->units as $unit) {
    echo "   - {$unit->unit_name}: Rp " . number_format($unit->selling_price, 0, ',', '.') . "\n";
}

echo "\n✅ Selesai!\n";
