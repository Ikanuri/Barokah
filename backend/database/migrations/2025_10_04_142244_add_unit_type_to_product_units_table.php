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
        Schema::table('product_units', function (Blueprint $table) {
            $table->string('unit_type')->default('countable')->after('unit_name'); // countable or weight
            $table->decimal('conversion_value', 10, 3)->change(); // Allow decimal for weight (0.1, 0.5, etc)
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_units', function (Blueprint $table) {
            $table->dropColumn('unit_type');
            $table->integer('conversion_value')->change();
        });
    }
};
