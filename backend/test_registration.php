<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$user = \App\Models\Master\User::where('email', 'bruce@wayne-ents.test')->first();

echo "User: {$user->name}\n";
echo "Company: {$user->company->company_name}\n";
echo "Onboarding Completed At: " . ($user->company->onboarding_completed_at ?? 'NULL') . "\n";

// Emulate Controller Update
$validated = [
    'company_name' => 'Wayne Enterprises Inc.',
    'country_code' => 'US',
    'currency_code' => 'USD',
    'timezone' => 'America/New_York',
    'financial_year_start' => '01-01',
    'financial_year_end' => '12-31',
    'tax_enabled' => true,
    'tax_rate' => 8.5
];

// Set Tenant connection
app(\App\Services\Tenant\TenantSwitcher::class)->switch($user->company->database_name);

$profile = \App\Models\Tenant\CompanyProfile::first();
if ($profile) {
    $profile->update($validated);
} else {
    $profile = \App\Models\Tenant\CompanyProfile::create($validated);
}

echo "Created Tenant Profile: {$profile->company_name}\n";

$masterCompany = $user->company;
$masterCompany->update([
    'onboarding_completed_at' => now(),
    'company_name' => $validated['company_name']
]);

echo "Updated Master Company Onboarding At: " . $masterCompany->fresh()->onboarding_completed_at . "\n";
