<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$companies = App\Models\Master\Company::where('status', 'active')->get();

foreach ($companies as $company) {
    config(['database.connections.tenant.database' => $company->database_name]);
    DB::purge('tenant');
    try {
        DB::connection('tenant')->table('cheque_reminder_sends')->truncate();
    } catch (\Exception $e) {
    }
}
echo "History reset successfully!\n";
