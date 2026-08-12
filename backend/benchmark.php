<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Manually test the raw queries to see if they are timing out
use Illuminate\Support\Facades\DB;
use App\Models\Account;

echo "Testing Trial Balance Query...\n";
$start = microtime(true);
$date = now()->toDateString();
$accounts = DB::table('accounts')
    ->leftJoin('transaction_entries', 'accounts.id', '=', 'transaction_entries.account_id')
    ->leftJoin('transactions', function($join) use ($date) {
        $join->on('transaction_entries.transaction_id', '=', 'transactions.id')
             ->whereNull('transactions.deleted_at')
             ->where('transactions.date', '<=', $date);
    })
    ->selectRaw('
        accounts.id,
        accounts.name,
        accounts.type,
        accounts.deleted_at,
        accounts.is_active,
        COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as net_balance
    ')
    ->groupBy('accounts.id', 'accounts.name', 'accounts.type', 'accounts.deleted_at', 'accounts.is_active')
    ->orderBy('accounts.type')
    ->orderBy('accounts.name')
    ->get();
echo "Trial Balance Query Time: " . (microtime(true) - $start) . "s\n";

echo "Testing Profit & Loss Query...\n";
$start = microtime(true);
$startDate = '2020-01-01';
$endDate = '2030-12-31';
$balances = DB::table('transaction_entries')
    ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
    ->whereNull('transactions.deleted_at')
    ->whereBetween('transactions.date', [$startDate, $endDate])
    ->selectRaw('
        transaction_entries.account_id,
        COALESCE(SUM(transaction_entries.debit), 0) as total_debit,
        COALESCE(SUM(transaction_entries.credit), 0) as total_credit
    ')
    ->groupBy('transaction_entries.account_id')
    ->get()
    ->keyBy('account_id');
echo "P&L Query Time: " . (microtime(true) - $start) . "s\n";

echo "All queries completed.\n";
