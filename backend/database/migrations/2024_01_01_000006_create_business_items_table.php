<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('business_items', function (Blueprint $table) {
            $table->id();
            $table->string('description');
            $table->decimal('purchase_cost', 19, 4);
            $table->decimal('sale_amount', 19, 4)->nullable();
            $table->decimal('profit', 19, 4)->nullable();
            $table->enum('status', ['purchased', 'sold', 'partial'])->default('purchased');
            $table->unsignedBigInteger('buyer_contact_id')->nullable();
            $table->unsignedBigInteger('purchase_transaction_id')->nullable();
            $table->unsignedBigInteger('sale_transaction_id')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('business_items');
    }
};
