<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

\config(['database.connections.tenant.database' => 'accounting_ledger']);
\DB::purge('tenant');

$user = \App\Models\User::first();
\Illuminate\Support\Facades\Auth::login($user);

$exportService = app(\App\Services\ReportExportService::class);
try {
    $account = \DB::connection('tenant')->table('accounts')->first();
    $data = app(\App\Services\BalanceService::class)->getAccountStatement($account->id);
    
    // Check if ArrayAccess works
    echo "Account name via array access: " . (isset($data['account']['name']) ? $data['account']['name'] : 'NOT SET') . "\n";
    echo "Account name via property: " . (isset($data['account']->name) ? $data['account']->name : 'NOT SET') . "\n";
} catch (\Throwable $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
