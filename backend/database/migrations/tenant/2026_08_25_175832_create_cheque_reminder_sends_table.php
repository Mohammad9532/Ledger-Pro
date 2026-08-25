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
        Schema::create('cheque_reminder_sends', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('cheque_reminder_id');
            $table->integer('reminder_day');
            $table->string('recipient');
            $table->enum('status', ['queued', 'sent', 'failed'])->default('queued');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            
            $table->foreign('cheque_reminder_id')->references('id')->on('cheque_reminders')->onDelete('cascade');
            $table->unique(['cheque_reminder_id', 'reminder_day'], 'chk_rem_id_day_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cheque_reminder_sends');
    }
};
