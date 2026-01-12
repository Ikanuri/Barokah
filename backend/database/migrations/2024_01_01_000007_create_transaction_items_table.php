<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transaction_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_unit_id')->nullable()->constrained()->onDelete('set null'); // Unit yang dijual
            $table->integer('quantity'); // Jumlah dalam unit yang dipilih
            $table->integer('base_quantity'); // Jumlah dalam unit terkecil (untuk stock tracking)
            $table->decimal('unit_price', 12, 2); // Harga per unit yang dipilih
            $table->decimal('subtotal', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transaction_items');
    }
};
