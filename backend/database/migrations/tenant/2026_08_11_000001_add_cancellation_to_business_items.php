<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add 'cancellation' type to transactions
        \Illuminate\Support\Facades\DB::statement(
            "ALTER TABLE transactions MODIFY COLUMN type ENUM(
                'give_money','receive_money','expense','income','transfer',
                'purchase','sale','credit_card_payment','opening_balance',
                'settlement','journal','cancellation'
            ) NOT NULL"
        );

        // 2. Add cancellation columns to business_items
        Schema::table('business_items', function (Blueprint $table) {
            // Status: add 'cancelled'
            $table->enum('status', ['purchased', 'sold', 'partial', 'cancelled'])
                  ->default('purchased')
                  ->change();

            // Supplier refund info
            $table->decimal('supplier_refund_amount', 19, 4)->nullable()->after('profit');
            $table->decimal('supplier_cancellation_fee', 19, 4)->nullable()->after('supplier_refund_amount');

            // Customer refund info
            $table->decimal('customer_refund_amount', 19, 4)->nullable()->after('supplier_cancellation_fee');
            $table->decimal('your_cancellation_charge', 19, 4)->nullable()->after('customer_refund_amount');

            // Links & meta
            $table->date('cancellation_date')->nullable()->after('your_cancellation_charge');
            $table->string('cancellation_notes', 500)->nullable()->after('cancellation_date');
            $table->unsignedBigInteger('cancellation_transaction_id')->nullable()->after('cancellation_notes');
        });
    }

    public function down(): void
    {
        Schema::table('business_items', function (Blueprint $table) {
            $table->dropColumn([
                'supplier_refund_amount',
                'supplier_cancellation_fee',
                'customer_refund_amount',
                'your_cancellation_charge',
                'cancellation_date',
                'cancellation_notes',
                'cancellation_transaction_id',
            ]);
            $table->enum('status', ['purchased', 'sold', 'partial'])->default('purchased')->change();
        });

        \Illuminate\Support\Facades\DB::statement(
            "ALTER TABLE transactions MODIFY COLUMN type ENUM(
                'give_money','receive_money','expense','income','transfer',
                'purchase','sale','credit_card_payment','opening_balance',
                'settlement','journal'
            ) NOT NULL"
        );
    }
};
