<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Master\Company;
use App\Services\Tenant\TenantSwitcher;
use App\Http\Controllers\Api\ReportController;

$tenant = Company::first();
app(TenantSwitcher::class)->switch($tenant->database_name);

$request = Illuminate\Http\Request::create('/api/reports/trial-balance', 'GET');
$controller = app(ReportController::class);

try {
    $response = $controller->trialBalance($request);
    echo "Trial Balance Success!\n";
    echo substr(json_encode($response->getData()), 0, 500) . "...\n";
} catch (\Throwable $e) {
    echo "Trial Balance Error: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}

try {
    $request = Illuminate\Http\Request::create('/api/reports/profit-loss', 'GET');
    $response = $controller->profitAndLoss($request);
    echo "P&L Success!\n";
} catch (\Throwable $e) {
    echo "P&L Error: " . $e->getMessage() . "\n";
}

try {
    $request = Illuminate\Http\Request::create('/api/reports/balance-sheet', 'GET');
    $response = $controller->balanceSheet($request);
    echo "Balance Sheet Success!\n";
} catch (\Throwable $e) {
    echo "Balance Sheet Error: " . $e->getMessage() . "\n";
}
