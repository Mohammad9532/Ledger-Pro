<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE transactions MODIFY COLUMN `type` ENUM(
            'give_money',
            'receive_money',
            'expense',
            'income',
            'transfer',
            'purchase',
            'sale',
            'credit_card_payment',
            'opening_balance'
        ) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE transactions MODIFY COLUMN `type` ENUM(
            'give_money',
            'receive_money',
            'expense',
            'income',
            'transfer',
            'purchase',
            'sale',
            'credit_card_payment'
        ) NOT NULL");
    }
};
