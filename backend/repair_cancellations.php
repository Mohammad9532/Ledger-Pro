<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Master\Company;
use App\Services\Tenant\TenantSwitcher;
use App\Models\Transaction;
use App\Models\TransactionEntry;
use App\Models\Account;
use Illuminate\Support\Facades\DB;

try {
    $tenant = Company::first();
    if ($tenant) {
        app(TenantSwitcher::class)->switch($tenant->database_name);
    }
} catch (\Exception $e) {
    echo "Could not initialize tenant context: " . $e->getMessage() . "\n";
    exit(1);
}

echo "=================================================\n";
echo "      CANCELLATION REPAIR SCRIPT                 \n";
echo "=================================================\n\n";

$expectedTxns = [
    47 => 25577.0000,
    49 => 900.0000,
    54 => 1500.0000,
    57 => 500.0000
];

// Identify accounts
$inventoryAccount = Account::where('type', 'business')->orWhere('name', 'like', '%Inventory%')->first();
$cogsAccount = Account::where('type', 'expense')->where('name', 'like', '%Cost of Goods%')->first();

if (!$inventoryAccount || !$cogsAccount) {
    echo "ERROR: Could not identify Inventory or COGS accounts.\n";
    exit(1);
}

// Idempotency Check
$alreadyRepaired = true;
foreach ($expectedTxns as $txnId => $expectedAmount) {
    $hasCogsCredit = TransactionEntry::where('transaction_id', $txnId)
        ->where('account_id', $cogsAccount->id)
        ->where('credit', $expectedAmount)
        ->exists();
    if (!$hasCogsCredit) {
        $alreadyRepaired = false;
        break;
    }
}

if ($alreadyRepaired) {
    echo "Idempotency check passed: The repair has already been executed successfully.\n";
    echo "No further changes required.\n";
    exit(0);
}

// 1. Backup the tenant table
echo "1. Creating backup of transaction_entries table...\n";
DB::statement("CREATE TABLE IF NOT EXISTS transaction_entries_backup_cancellations AS SELECT * FROM transaction_entries");
echo "   Backup created successfully.\n\n";

// 2. Verify all exact entries
echo "2. Verifying expected entries...\n";
$entriesToUpdate = [];

foreach ($expectedTxns as $txnId => $expectedAmount) {
    $entry = TransactionEntry::where('transaction_id', $txnId)
        ->where('account_id', $inventoryAccount->id)
        ->where('credit', $expectedAmount)
        ->first();
        
    if (!$entry) {
        echo "   ERROR: Expected Inventory Credit of {$expectedAmount} for Transaction ID {$txnId} NOT FOUND!\n";
        echo "   Aborting repair to prevent data corruption.\n";
        exit(1);
    }
    
    $entriesToUpdate[] = $entry;
    echo "   Verified Txn {$txnId}: Found Inventory Credit for {$expectedAmount}\n";
}

echo "\nAll expected entries verified successfully.\n\n";

// 3. Execute Repair
echo "3. Executing Surgical Repair...\n";
DB::beginTransaction();

try {
    foreach ($entriesToUpdate as $entry) {
        // Swap account_id to COGS
        $entry->account_id = $cogsAccount->id;
        $entry->save();
        echo "   Updated Entry ID {$entry->id} (Txn {$entry->transaction_id}): Changed to COGS account.\n";
    }
    DB::commit();
    echo "\n   Repair committed successfully.\n\n";
} catch (\Exception $e) {
    DB::rollBack();
    echo "   ERROR during repair: " . $e->getMessage() . "\n";
    echo "   Rolled back all changes.\n";
    exit(1);
}

// 4. Verification
echo "4. Post-Repair Verification...\n";

$inventoryBalance = app(\App\Services\BalanceService::class)->getAccountBalance($inventoryAccount->id);
$cogsBalance = app(\App\Services\BalanceService::class)->getAccountBalance($cogsAccount->id);

echo "   New Business Inventory Balance: {$inventoryBalance}\n";
echo "   New COGS Balance: {$cogsBalance}\n";

// Run Trial Balance to ensure Assets = Liabilities + Equity
$reportService = app(\App\Services\ReportService::class);
$tb = $reportService->trialBalance();

echo "\nTrial Balance Check:\n";
echo "   Total Debits: {$tb->totalDebit}\n";
echo "   Total Credits: {$tb->totalCredit}\n";
if ($tb->totalDebit === $tb->totalCredit) {
    echo "   ✅ Trial Balance is mathematically perfectly balanced!\n";
} else {
    echo "   ❌ ERROR: Trial Balance is NOT balanced!\n";
}

echo "\n=================================================\n";
echo "Repair fully completed.\n";
