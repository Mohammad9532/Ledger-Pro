<?php

namespace App\Services\Registration;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

class TenantMigrationService
{
    public function migrate(string $databaseName): void
    {
        Config::set('database.connections.tenant.database', $databaseName);
        DB::purge('tenant');
        DB::reconnect('tenant');

        Artisan::call('migrate', [
            '--database' => 'tenant',
            '--path' => 'database/migrations/tenant',
            '--force' => true,
        ]);
    }
}
