<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('logo_path')->nullable();
            $table->string('country_code', 2)->nullable(); // ISO 3166-1 alpha-2
            $table->string('currency_code', 3)->nullable(); // ISO 4217
            $table->string('timezone')->nullable();
            $table->string('financial_year_start', 5)->nullable(); // MM-DD
            $table->string('financial_year_end', 5)->nullable(); // MM-DD
            $table->boolean('tax_enabled')->default(false);
            $table->decimal('tax_rate', 5, 2)->default(0);
            $table->string('date_format')->default('Y-m-d');
            $table->integer('decimal_places')->default(2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_profiles');
    }
};
