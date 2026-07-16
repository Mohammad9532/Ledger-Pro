<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->enum('type', [
                'give_money', 'receive_money', 'expense', 'income',
                'transfer', 'purchase', 'sale', 'credit_card_payment'
            ]);
            $table->date('date');
            $table->decimal('amount', 19, 4);
            $table->text('description')->nullable();
            $table->string('reference_number', 100)->nullable();
            $table->unsignedBigInteger('expense_category_id')->nullable();
            $table->unsignedBigInteger('business_item_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['date', 'type']);
            $table->index('reference_number');
            $table->index('expense_category_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
