<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add 'equity' to account type enum
        DB::statement("ALTER TABLE accounts MODIFY COLUMN `type` ENUM('cash', 'bank', 'credit_card', 'person', 'expense', 'income', 'asset', 'liability', 'business', 'equity') NOT NULL");

        // Create the "Opening Balance Equity" account — the contra account
        // used for the other side of opening balance ledger entries.
        // This is standard accounting practice.
        DB::table('accounts')->insert([
            'name' => 'Opening Balance Equity',
            'type' => 'equity',
            'opening_balance' => 0,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    public function down(): void
    {
        DB::table('accounts')->where('name', 'Opening Balance Equity')->where('type', 'equity')->delete();
        DB::statement("ALTER TABLE accounts MODIFY COLUMN `type` ENUM('cash', 'bank', 'credit_card', 'person', 'expense', 'income', 'asset', 'liability', 'business') NOT NULL");
    }
};
