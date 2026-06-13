<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->enum('type', [
                'cash', 'bank', 'credit_card', 'person',
                'expense', 'income', 'asset', 'liability', 'business'
            ]);
            $table->decimal('opening_balance', 19, 4)->default(0);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('contact_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('type');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
