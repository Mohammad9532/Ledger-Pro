<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Request;

$user = App\Models\User::has('company')->first();
$token = $user->createToken('test')->plainTextToken;

// 2. Make the HTTP kernel request
$httpKernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create(
    '/api/reports/trial-balance',
    'GET'
);
$request->headers->set('Accept', 'application/json');
$request->headers->set('Authorization', 'Bearer ' . $token);

$start = microtime(true);
$response = $httpKernel->handle($request);
echo "Time: " . (microtime(true) - $start) . "s\n";
echo "Status: " . $response->getStatusCode() . "\n";
echo "Content: " . $response->getContent() . "\n";
