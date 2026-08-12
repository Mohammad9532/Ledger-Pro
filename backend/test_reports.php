<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

echo "Testing Profit & Loss\n";
$response = $kernel->handle(
    Illuminate\Http\Request::create('/api/reports/profit-loss', 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/json'])
);
echo json_encode(json_decode($response->getContent()), JSON_PRETTY_PRINT) . "\n\n";

echo "Testing Balance Sheet\n";
$response = $kernel->handle(
    Illuminate\Http\Request::create('/api/reports/balance-sheet', 'GET', [], [], [], ['HTTP_ACCEPT' => 'application/json'])
);
echo json_encode(json_decode($response->getContent()), JSON_PRETTY_PRINT) . "\n\n";
