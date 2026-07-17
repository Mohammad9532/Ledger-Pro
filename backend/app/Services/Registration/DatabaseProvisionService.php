<?php

namespace App\Services\Registration;

use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DatabaseProvisionService
{
    public function createDatabase(string $databaseName): void
    {
        if (!preg_match('/^tenant_[a-z0-9]{16}$/', $databaseName)) {
            throw new InvalidArgumentException("Invalid database name format: {$databaseName}");
        }

        $query = "CREATE DATABASE `{$databaseName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;";
        
        DB::statement($query);
    }

    public function dropDatabase(string $databaseName): void
    {
        if (!preg_match('/^tenant_[a-z0-9]{16}$/', $databaseName)) {
            throw new InvalidArgumentException("Invalid database name format: {$databaseName}");
        }

        $query = "DROP DATABASE IF EXISTS `{$databaseName}`;";
        
        DB::statement($query);
    }
}
