<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Set tenant context for the test
use App\Models\Master\Company;
use App\Services\TenantSwitcher;

$tenant = Company::first();
if ($tenant) {
    app(TenantSwitcher::class)->switchTo($tenant);
}

$service = app(\App\Services\ReportService::class);

echo "Running Trial Balance...\n";
$start = microtime(true);
$tb = $service->trialBalance();
echo "Time: " . (microtime(true) - $start) . "s\n";

echo "Running P&L...\n";
$start = microtime(true);
$pl = $service->profitAndLoss('2026-01-01', '2026-12-31');
echo "Time: " . (microtime(true) - $start) . "s\n";

echo "Running Balance Sheet...\n";
$start = microtime(true);
$bs = $service->balanceSheet();
echo "Time: " . (microtime(true) - $start) . "s\n";

echo "Done.\n";
