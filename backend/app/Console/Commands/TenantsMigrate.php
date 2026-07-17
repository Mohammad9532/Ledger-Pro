<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Artisan;

class TenantsMigrate extends Command
{
    protected $signature = 'tenants:migrate
                            {--tenant= : Migrate a single tenant by their database name}
                            {--fresh : Drop all tables and re-run all migrations (DANGER)}
                            {--force : Force migrations in production}';

    protected $description = 'Run pending tenant migrations against all (or one) tenant database(s)';

    public function handle(): int
    {
        $tenants = $this->getTenants();

        if ($tenants->isEmpty()) {
            $this->warn('No active tenants found in master database.');
            return self::SUCCESS;
        }

        $this->info("Found {$tenants->count()} tenant(s) to migrate.");

        $failed = 0;

        foreach ($tenants as $tenant) {
            $this->line('');
            $this->line("  → <comment>{$tenant->company_name}</comment> (<fg=gray>{$tenant->database_name}</>)");

            try {
                Config::set('database.connections.tenant.database', $tenant->database_name);
                DB::purge('tenant');
                DB::reconnect('tenant');

                $command = $this->option('fresh') ? 'migrate:fresh' : 'migrate';

                Artisan::call($command, [
                    '--database' => 'tenant',
                    '--path'     => 'database/migrations/tenant',
                    '--force'    => true,
                ]);

                $output = trim(Artisan::output());

                if (str_contains($output, 'Nothing to migrate') || str_contains($output, 'INFO  Nothing')) {
                    $this->line("    <fg=green>✓</> Already up to date.");
                } else {
                    foreach (explode("\n", $output) as $line) {
                        if (trim($line)) {
                            $this->line("    " . trim($line));
                        }
                    }
                }
            } catch (\Exception $e) {
                $this->error("    ✗ Failed: {$e->getMessage()}");
                $failed++;
            }
        }

        $this->line('');

        if ($failed === 0) {
            $this->info('All tenant migrations completed successfully.');
        } else {
            $this->warn("{$failed} tenant(s) failed to migrate. See errors above.");
        }

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function getTenants()
    {
        $query = DB::connection('master')
            ->table('companies')
            ->select('company_name', 'database_name');

        if ($singleDb = $this->option('tenant')) {
            $query->where('database_name', $singleDb);
        }

        return $query->get();
    }
}
