<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reconciliations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('account_id');
            $table->date('reconciliation_date');
            $table->decimal('system_balance', 19, 4)->comment('Balance computed from ledger at time of reconciliation');
            $table->decimal('actual_balance', 19, 4)->comment('Physical count / bank statement balance');
            $table->decimal('difference', 19, 4)->comment('actual - system');
            $table->enum('status', ['matched', 'unmatched', 'adjusted'])->default('unmatched');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('adjustment_transaction_id')->nullable()->comment('If adjusted, the correcting transaction');
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->index('account_id');
            $table->index('reconciliation_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reconciliations');
    }
};
