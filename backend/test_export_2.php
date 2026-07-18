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
    
    // Attempt the exact export
    $response = $exportService->export('account-ledger', 'pdf', ['account_id' => $account->id]);
    echo "Success! Type: " . get_class($response) . "\n";
} catch (\Throwable $e) {
    echo "Throwable Caught:\n";
    echo "Error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . " on line " . $e->getLine() . "\n";
    echo $e->getTraceAsString() . "\n";
}
