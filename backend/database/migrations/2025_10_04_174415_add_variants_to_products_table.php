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
        Schema::table('products', function (Blueprint $table) {
            // Add variants column to store product variations (JSON)
            // Example: [{"name": "Merah", "sku_suffix": "RED", "price_adjustment": 0}, {"name": "Biru", "sku_suffix": "BLUE", "price_adjustment": 5000}]
            $table->json('variants')->nullable()->after('description');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('variants');
        });
    }
};
