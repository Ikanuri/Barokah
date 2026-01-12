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
        Schema::create('customers', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->text('address')->nullable();
            $table->foreignId('tier_id')->nullable()->constrained('customer_tiers')->nullOnDelete();
            $table->decimal('total_purchases', 15, 2)->default(0); // Total belanja sepanjang masa
            $table->integer('transaction_count')->default(0); // Jumlah transaksi
            $table->decimal('outstanding_balance', 15, 2)->default(0); // Hutang yang belum lunas
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            $table->index(['tier_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('customers');
    }
};
