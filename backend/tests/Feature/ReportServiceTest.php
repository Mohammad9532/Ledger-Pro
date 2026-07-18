<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\TransactionEntry;
use App\Services\ReportService;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ReportServiceTest extends TestCase
{
    use DatabaseTransactions;

    protected function setUp(): void
    {
        parent::setUp();
        // Since we are using DatabaseTransactions, just map the tenant connection 
        // to the exact same config as the default mysql connection.
        config(['database.connections.tenant' => config('database.connections.mysql')]);
        config(['database.connections.tenant.database' => env('DB_DATABASE')]);
    }

    public function test_profit_and_loss_handles_contra_entries_correctly()
    {
        // 1. Create accounts
        $incomeAccount = Account::create(['name' => 'Sales', 'type' => 'income', 'is_active' => true, 'opening_balance' => 0]);
        $expenseAccount = Account::create(['name' => 'Supplies', 'type' => 'expense', 'is_active' => true, 'opening_balance' => 0]);
        $bankAccount = Account::create(['name' => 'Bank', 'type' => 'bank', 'is_active' => true, 'opening_balance' => 0]);

        // 2. Normal Income Transaction (Credit Income, Debit Bank)
        $t1 = Transaction::create(['date' => now()->toDateString(), 'description' => 'Sale', 'amount' => 1000]);
        TransactionEntry::create(['transaction_id' => $t1->id, 'account_id' => $bankAccount->id, 'debit' => 1000, 'credit' => 0]);
        TransactionEntry::create(['transaction_id' => $t1->id, 'account_id' => $incomeAccount->id, 'debit' => 0, 'credit' => 1000]);

        // 3. Normal Expense Transaction (Debit Expense, Credit Bank)
        $t2 = Transaction::create(['date' => now()->toDateString(), 'description' => 'Supplies purchase', 'amount' => 400]);
        TransactionEntry::create(['transaction_id' => $t2->id, 'account_id' => $expenseAccount->id, 'debit' => 400, 'credit' => 0]);
        TransactionEntry::create(['transaction_id' => $t2->id, 'account_id' => $bankAccount->id, 'debit' => 0, 'credit' => 400]);

        // 4. Contra Income Transaction (Debit Income, Credit Bank) - e.g. refunding a customer
        $t3 = Transaction::create(['date' => now()->toDateString(), 'description' => 'Refund customer', 'amount' => 100]);
        TransactionEntry::create(['transaction_id' => $t3->id, 'account_id' => $incomeAccount->id, 'debit' => 100, 'credit' => 0]);
        TransactionEntry::create(['transaction_id' => $t3->id, 'account_id' => $bankAccount->id, 'debit' => 0, 'credit' => 100]);

        // 5. Contra Expense Transaction (Credit Expense, Debit Bank) - e.g. returning supplies
        $t4 = Transaction::create(['date' => now()->toDateString(), 'description' => 'Return supplies', 'amount' => 50]);
        TransactionEntry::create(['transaction_id' => $t4->id, 'account_id' => $bankAccount->id, 'debit' => 50, 'credit' => 0]);
        TransactionEntry::create(['transaction_id' => $t4->id, 'account_id' => $expenseAccount->id, 'debit' => 0, 'credit' => 50]);

        // Execute
        $reportService = app(ReportService::class);
        $pnl = $reportService->profitAndLoss('1970-01-01', now()->toDateString());

        // Assert Net Income is 1000 - 100 = 900
        $incomeItem = collect($pnl['income'])->firstWhere('id', $incomeAccount->id);
        $this->assertEquals('900.0000', $incomeItem['amount']);
        
        // Assert Net Expense is 400 - 50 = 350
        $expenseItem = collect($pnl['expenses'])->firstWhere('id', $expenseAccount->id);
        $this->assertEquals('350.0000', $expenseItem['amount']);

        // Assert Balance Sheet Equation
        $bs = $reportService->balanceSheet(now()->toDateString());
        
        // Bank Balance: +1000 -400 -100 +50 = 550
        $bankItem = collect($bs['current_assets'])->firstWhere('id', $bankAccount->id);
        $this->assertEquals('550.0000', $bankItem['balance']);

        // Check equation: Assets = Liabilities + Equity
        // We calculate this over all accounts in the BS, which should be perfectly balanced
        // even with pre-existing data, since we fixed the logic!
        $equation = bcadd(bcadd($bs['total_assets'], $bs['total_liabilities'], 4), $bs['total_equity'], 4);
        $this->assertEquals('0.0000', $equation);
    }
}
