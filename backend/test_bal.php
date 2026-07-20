<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$accounts = App\Models\Account::where('type', 'credit_card')->get();
foreach ($accounts as $a) {
    echo "ID {$a->id} - {$a->name}:\n";
    echo "  Type: {$a->type}\n";
    echo "  Parent ID: {$a->parent_account_id}\n";
    echo "  Limit: {$a->credit_limit}\n";
    echo "  Balance: {$a->balance}\n";
    echo "  Available: {$a->available_balance}\n";
}
