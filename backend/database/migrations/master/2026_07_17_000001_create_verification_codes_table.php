<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verification_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('purpose'); // EMAIL_VERIFICATION, PASSWORD_RESET, TWO_FACTOR
            $table->string('code_hash');
            $table->timestamp('expires_at');
            $table->integer('attempts')->default(0);
            $table->timestamp('last_sent_at')->nullable();
            $table->timestamp('verified_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'purpose']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verification_codes');
    }
};
