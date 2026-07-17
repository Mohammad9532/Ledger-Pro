<?php

namespace App\Services\Registration;

use Database\Seeders\ChartOfAccountsSeeder;

class TenantSeederService
{
    public function seed(string $databaseName): void
    {
        (new ChartOfAccountsSeeder())->run();
    }
}
