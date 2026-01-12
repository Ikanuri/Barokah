<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Migration untuk sistem stok berjenjang
     * Contoh: 1 dus = 40 biji, 1 karton = 10 dus = 400 biji
     */
    public function up(): void
    {
        Schema::create('product_units', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->string('unit_name'); // dus, karton, lusin, dll
            $table->integer('conversion_value'); // 1 dus = 40 biji (conversion_value = 40)
            $table->decimal('selling_price', 12, 2)->nullable(); // Harga jual untuk unit ini (optional)
            $table->string('barcode')->unique()->nullable(); // Barcode khusus untuk unit ini
            $table->integer('order')->default(0); // Urutan hirarki (0=base, 1=level1, dst)
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_units');
    }
};
