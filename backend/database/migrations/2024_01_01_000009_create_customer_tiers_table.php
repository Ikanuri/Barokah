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
        Schema::create('customer_tiers', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // Bronze, Silver, Gold, Platinum
            $table->string('slug')->unique(); // bronze, silver, gold, platinum
            $table->decimal('discount_percentage', 5, 2)->default(0); // 0-100
            $table->decimal('minimum_purchase', 15, 2)->default(0); // Minimum pembelian untuk naik tier
            $table->string('color')->nullable(); // Hex color untuk UI
            $table->string('icon')->nullable(); // Icon identifier
            $table->text('description')->nullable();
            $table->integer('order')->default(0); // Urutan tier (1=lowest, 4=highest)
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customer_tiers');
    }
};
