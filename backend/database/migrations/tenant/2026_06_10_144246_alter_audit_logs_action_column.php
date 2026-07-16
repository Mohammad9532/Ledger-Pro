<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Change enum to varchar to support any action string
        DB::statement("ALTER TABLE audit_logs MODIFY COLUMN `action` VARCHAR(50) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE audit_logs MODIFY COLUMN `action` ENUM('created', 'updated', 'deleted', 'restored') NOT NULL");
    }
};
