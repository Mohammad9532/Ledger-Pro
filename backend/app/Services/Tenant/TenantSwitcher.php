<?php

namespace App\Services\Tenant;

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;

class TenantSwitcher
{
    /**
     * Switch the 'tenant' database connection to the given database name.
     *
     * @param  string  $databaseName
     * @return void
     */
    public function switch(string $databaseName): void
    {
        Config::set('database.connections.tenant.database', $databaseName);

        DB::purge('tenant');
        DB::reconnect('tenant');
    }
}
