<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "=== MASTER COMPANY LIST ===\n";
$companies = DB::connection('master')->table('companies')->select('id','company_name','database_name','created_at')->get();
foreach ($companies as $c) {
    echo "ID: {$c->id} | Name: {$c->company_name} | DB: {$c->database_name} | Created: {$c->created_at}\n";
}

echo "\n=== DATABASE EXISTENCE CHECK ===\n";
foreach ($companies as $c) {
    try {
        Config::set('database.connections.tenant.database', $c->database_name);
        DB::purge('tenant');
        DB::reconnect('tenant');
        $tables = DB::connection('tenant')->select('SHOW TABLES');
        $tableNames = array_map('current', array_map('get_object_vars', $tables));
        $hasProfiles = in_array('company_profiles', $tableNames);
        echo "{$c->database_name}: " . count($tableNames) . " tables | company_profiles: " . ($hasProfiles ? 'YES' : 'NO') . "\n";
    } catch (Exception $e) {
        echo "{$c->database_name}: ERROR - " . $e->getMessage() . "\n";
    }
}

echo "\n=== CHECKING accounting_ledger DATABASE ===\n";
try {
    Config::set('database.connections.tenant.database', 'accounting_ledger');
    DB::purge('tenant');
    DB::reconnect('tenant');
    $tables = DB::connection('tenant')->select('SHOW TABLES');
    $tableNames = array_map('current', array_map('get_object_vars', $tables));
    echo "Tables in accounting_ledger: " . implode(', ', $tableNames) . "\n";
    
    // Check if migrations table exists and what's recorded
    if (in_array('migrations', $tableNames)) {
        $migrations = DB::connection('tenant')->table('migrations')->pluck('migration')->toArray();
        echo "\nRecorded migrations: " . implode(', ', $migrations) . "\n";
    }
} catch (Exception $e) {
    echo "accounting_ledger: ERROR - " . $e->getMessage() . "\n";
}
