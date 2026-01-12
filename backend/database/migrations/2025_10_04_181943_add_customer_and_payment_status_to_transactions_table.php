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
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignId('customer_id')->nullable()->after('user_id')->constrained()->onDelete('set null');
            $table->enum('payment_status', ['paid', 'unpaid', 'partial'])->default('paid')->after('status');
            $table->decimal('paid_total', 15, 2)->default(0)->after('paid_amount'); // Total yang sudah dibayar (untuk cicilan)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['customer_id']);
            $table->dropColumn(['customer_id', 'payment_status', 'paid_total']);
        });
    }
};
