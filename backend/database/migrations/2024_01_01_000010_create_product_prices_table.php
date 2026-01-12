<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->string('price_type'); // 'normal', 'wholesale', 'member', 'tier_bronze', 'tier_silver', etc
            $table->string('price_name'); // Display name: "Harga Normal", "Harga Grosir", etc
            $table->decimal('price', 15, 2);
            $table->integer('min_quantity')->default(1); // Minimum quantity untuk harga ini
            $table->boolean('is_active')->default(true);
            $table->integer('priority')->default(0); // Priority saat pilih otomatis (higher = lebih prioritas)
            $table->text('description')->nullable();
            $table->timestamps();

            // Index untuk performa
            $table->index(['product_id', 'price_type']);
            $table->index(['product_id', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_prices');
    }
};
