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
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE transactions MODIFY COLUMN type ENUM('give_money', 'receive_money', 'expense', 'income', 'transfer', 'purchase', 'sale', 'credit_card_payment', 'opening_balance', 'settlement', 'journal') NOT NULL");
    }

    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE transactions MODIFY COLUMN type ENUM('give_money', 'receive_money', 'expense', 'income', 'transfer', 'purchase', 'sale', 'credit_card_payment', 'opening_balance', 'settlement') NOT NULL");
    }
};
