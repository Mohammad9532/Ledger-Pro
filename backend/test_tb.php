<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);

$response = $kernel->handle(
    $request = Illuminate\Http\Request::create(
        '/api/reports/trial-balance',
        'GET',
        [],
        [],
        [],
        ['HTTP_ACCEPT' => 'application/json']
    )
);

echo json_encode(json_decode($response->getContent()), JSON_PRETTY_PRINT);
