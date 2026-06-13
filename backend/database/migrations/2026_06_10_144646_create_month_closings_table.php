<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('month_closings', function (Blueprint $table) {
            $table->id();
            $table->integer('year');
            $table->integer('month');
            $table->enum('status', ['open', 'closed'])->default('open');
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('closed_by')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->unsignedBigInteger('reopened_by')->nullable();
            $table->timestamp('reopened_at')->nullable();
            $table->timestamps();

            $table->unique(['year', 'month']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('month_closings');
    }
};
