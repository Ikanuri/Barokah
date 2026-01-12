<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku')->unique();
            $table->string('barcode')->unique()->nullable();
            $table->foreignId('category_id')->constrained()->onDelete('cascade');
            $table->text('description')->nullable();
            $table->decimal('base_price', 12, 2); // Harga per unit terkecil (biji)
            $table->decimal('selling_price', 12, 2); // Harga jual per unit terkecil
            $table->string('base_unit')->default('biji'); // Unit terkecil
            $table->integer('stock_quantity')->default(0); // Stok dalam unit terkecil
            $table->integer('minimum_stock')->default(0); // Minimum stock alert
            $table->string('image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
