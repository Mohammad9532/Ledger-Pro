<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Master\Company;
use App\Services\Tenant\TenantSwitcher;

$tenant = Company::first();
if ($tenant) {
    app(TenantSwitcher::class)->switch($tenant->database_name);
}

$service = app(\App\Services\ReportService::class);
$bs = $service->balanceSheet();

echo json_encode($bs, JSON_PRETTY_PRINT);

