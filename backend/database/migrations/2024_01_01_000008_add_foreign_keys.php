<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            $table->foreign('contact_id')->references('id')->on('contacts')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->foreign('expense_category_id')->references('id')->on('expense_categories')->onDelete('set null');
            $table->foreign('business_item_id')->references('id')->on('business_items')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->foreign('account_id')->references('id')->on('accounts')->onDelete('set null');
        });

        Schema::table('business_items', function (Blueprint $table) {
            $table->foreign('buyer_contact_id')->references('id')->on('contacts')->onDelete('set null');
            $table->foreign('purchase_transaction_id')->references('id')->on('transactions')->onDelete('set null');
            $table->foreign('sale_transaction_id')->references('id')->on('transactions')->onDelete('set null');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('updated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('business_items', function (Blueprint $table) {
            $table->dropForeign(['buyer_contact_id']);
            $table->dropForeign(['purchase_transaction_id']);
            $table->dropForeign(['sale_transaction_id']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
        });

        Schema::table('transactions', function (Blueprint $table) {
            $table->dropForeign(['expense_category_id']);
            $table->dropForeign(['business_item_id']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
        });

        Schema::table('expense_categories', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
        });

        Schema::table('contacts', function (Blueprint $table) {
            $table->dropForeign(['account_id']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
        });

        Schema::table('accounts', function (Blueprint $table) {
            $table->dropForeign(['contact_id']);
            $table->dropForeign(['created_by']);
            $table->dropForeign(['updated_by']);
        });
    }
};
