<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$request = Illuminate\Http\Request::create('/api/contacts', 'GET', ['status' => 'active']);
// Mock auth
$user = App\Models\User::first();
if ($user) {
    Auth::login($user);
}
$response = $kernel->handle($request);
echo $response->getStatusCode() . "\n";
echo $response->getContent() . "\n";
