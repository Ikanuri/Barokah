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
            // Add indexes untuk search yang lebih cepat
            $table->index('name'); // Index untuk search by name
            $table->index('sku');  // Index untuk search by SKU
            $table->index('barcode'); // Index untuk search by barcode
            $table->index('category_id'); // Index untuk filter by category
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['name']);
            $table->dropIndex(['sku']);
            $table->dropIndex(['barcode']);
            $table->dropIndex(['category_id']);
        });
    }
};
