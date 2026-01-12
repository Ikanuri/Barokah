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
            // Drop existing foreign key constraint first
            $table->dropForeign(['category_id']);
            
            // Make category_id nullable
            $table->foreignId('category_id')->nullable()->change();
            
            // Re-add foreign key constraint with nullable and SET NULL on delete
            $table->foreign('category_id')
                  ->references('id')
                  ->on('categories')
                  ->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Drop the nullable foreign key
            $table->dropForeign(['category_id']);
            
            // Make category_id not nullable again
            $table->foreignId('category_id')->nullable(false)->change();
            
            // Re-add foreign key with cascade on delete
            $table->foreign('category_id')
                  ->references('id')
                  ->on('categories')
                  ->onDelete('cascade');
        });
    }
};
