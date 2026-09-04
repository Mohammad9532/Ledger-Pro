<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            // Stored as HH:MM (24-hour), e.g. "08:00". Null means use default (08:00).
            $table->string('cheque_reminder_time', 5)->nullable()->after('decimal_places');
        });
    }

    public function down(): void
    {
        Schema::table('company_profiles', function (Blueprint $table) {
            $table->dropColumn('cheque_reminder_time');
        });
    }
};
