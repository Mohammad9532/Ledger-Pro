<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Modify the ENUM to include 'settlement'
        DB::statement("ALTER TABLE transactions MODIFY COLUMN type ENUM('give_money', 'receive_money', 'expense', 'income', 'transfer', 'purchase', 'sale', 'credit_card_payment', 'opening_balance', 'settlement') NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Removing an enum value is risky if rows exist with that value.
        // We will just leave it or revert to the old list (which will fail if 'settlement' rows exist).
        // DB::statement("ALTER TABLE transactions MODIFY COLUMN type ENUM('give_money', 'receive_money', 'expense', 'income', 'transfer', 'purchase', 'sale', 'credit_card_payment') NOT NULL");
    }
};
