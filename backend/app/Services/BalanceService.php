<?php

namespace App\Services;

use App\Models\Account;
use App\Models\TransactionEntry;
use Illuminate\Support\Facades\DB;

class BalanceService
{
    /**
     * Get the current balance of an account.
     * Balance = SUM(debit) - SUM(credit) from ALL non-deleted transactions,
     * including the opening_balance transaction created when the account was set up.
     * The accounts.opening_balance column is always 0 — the ledger is the sole source of truth.
     */
    public function getAccountBalance(int $accountId, ?string $date = null): string
    {
        $query = TransactionEntry::where('transaction_entries.account_id', $accountId)
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->whereNull('transactions.deleted_at');

        if ($date) {
            $query->where('transactions.date', '<=', $date);
        }

        $balance = $query->selectRaw(
            'COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as balance'
        )->value('balance');

        return (string) ($balance ?? '0.0000');
    }

    /**
     * Get account statement with running balance.
     */
    public function getAccountStatement(int $accountId, ?string $startDate = null, ?string $endDate = null): array
    {
        $account = Account::findOrFail($accountId);

        $query = TransactionEntry::where('transaction_entries.account_id', $accountId)
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->whereNull('transactions.deleted_at')
            ->select(
                'transactions.id as transaction_id',
                'transactions.date',
                'transactions.description',
                'transactions.type',
                'transactions.reference_number',
                'transaction_entries.debit',
                'transaction_entries.credit'
            )
            ->orderBy('transactions.date', 'asc')
            ->orderBy('transactions.id', 'asc');

        if ($startDate) {
            $query->where('transactions.date', '>=', $startDate);
        }
        if ($endDate) {
            $query->where('transactions.date', '<=', $endDate);
        }

        $entries = $query->get();

        // Opening balance = sum of all entries BEFORE startDate (including the OB transaction)
        $openingBalance = '0.0000';
        if ($startDate) {
            $priorBalance = TransactionEntry::where('transaction_entries.account_id', $accountId)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->where('transactions.date', '<', $startDate)
                ->selectRaw('COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as balance')
                ->value('balance');

            $openingBalance = (string) ($priorBalance ?? '0.0000');
        }

        // Build running balance
        $runningBalance = $openingBalance;
        $statement = [];

        foreach ($entries as $entry) {
            $runningBalance = bcadd($runningBalance, (string) $entry->debit, 4);
            $runningBalance = bcsub($runningBalance, (string) $entry->credit, 4);

            $statement[] = [
                'transaction_id' => $entry->transaction_id,
                'date' => $entry->date,
                'description' => $entry->description,
                'type' => $entry->type,
                'reference_number' => $entry->reference_number,
                'debit' => $entry->debit,
                'credit' => $entry->credit,
                'balance' => $runningBalance,
            ];
        }

        return [
            'account' => $account,
            'opening_balance' => $openingBalance,
            'entries' => $statement,
            'closing_balance' => $runningBalance,
        ];
    }

    /**
     * Get dashboard balances - aggregated by account type.
     */
    public function getDashboardData(): array
    {
        $accounts = Account::active()->whereNull('deleted_at')->get();

        $balances = [
            'cash' => '0.0000',
            'bank' => '0.0000',
            'credit_card' => '0.0000',
            'receivable' => '0.0000',
            'payable' => '0.0000',
            'asset' => '0.0000',
            'liability' => '0.0000',
            'business' => '0.0000',
            'surplus' => '0.0000',
        ];

        foreach ($accounts as $account) {
            $balance = $this->getAccountBalance($account->id);

            if (in_array($account->type, ['cash', 'bank', 'person', 'credit_card', 'liability', 'business'])) {
                $balances['surplus'] = bcadd($balances['surplus'], $balance, 4);
            }

            switch ($account->type) {
                case 'cash':
                    $balances['cash'] = bcadd($balances['cash'], $balance, 4);
                    break;
                case 'bank':
                    $balances['bank'] = bcadd($balances['bank'], $balance, 4);
                    break;
                case 'credit_card':
                    // Credit card balance is typically negative (liability)
                    // We show the outstanding amount as positive
                    $balances['credit_card'] = bcadd($balances['credit_card'], $balance, 4);
                    break;
                case 'person':
                    // Positive balance = person owes me (receivable)
                    // Negative balance = I owe person (payable)
                    if (bccomp($balance, '0', 4) > 0) {
                        $balances['receivable'] = bcadd($balances['receivable'], $balance, 4);
                    } else {
                        $balances['payable'] = bcadd($balances['payable'], $balance, 4);
                    }
                    break;
                case 'asset':
                    $balances['asset'] = bcadd($balances['asset'], $balance, 4);
                    break;
                case 'liability':
                    $balances['liability'] = bcadd($balances['liability'], $balance, 4);
                    break;
                case 'business':
                    $balances['business'] = bcadd($balances['business'], $balance, 4);
                    break;
            }
        }

        // Today's income and expense
        $today = now()->toDateString();
        $todayIncome = $this->getPeriodTotal('income', $today, $today);
        $todayExpense = $this->getPeriodTotal('expense', $today, $today);
        $todayProfit = bcsub($todayIncome, $todayExpense, 4);

        // Monthly summary
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();
        $monthlyIncome = $this->getPeriodTotal('income', $monthStart, $monthEnd);
        $monthlyExpense = $this->getPeriodTotal('expense', $monthStart, $monthEnd);
        $monthlyProfit = bcsub($monthlyIncome, $monthlyExpense, 4);

        return [
            'balances' => $balances,
            'today' => [
                'income' => $todayIncome,
                'expense' => $todayExpense,
                'profit' => $todayProfit,
            ],
            'monthly' => [
                'income' => $monthlyIncome,
                'expense' => $monthlyExpense,
                'profit' => $monthlyProfit,
            ],
        ];
    }

    /**
     * Get total income or expense for a period.
     */
    public function getPeriodTotal(string $type, string $startDate, string $endDate): string
    {
        $column = $type === 'expense' ? 'debit' : 'credit';

        return DB::table('transaction_entries')
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->join('accounts', 'transaction_entries.account_id', '=', 'accounts.id')
            ->where('accounts.type', $type)
            ->whereNull('transactions.deleted_at')
            ->whereBetween('transactions.date', [$startDate, $endDate])
            ->sum("transaction_entries.$column") ?? '0.0000';
    }

    /**
     * Get monthly breakdown for charts.
     */
    public function getMonthlyBreakdown(int $year): array
    {
        $months = [];

        for ($month = 1; $month <= 12; $month++) {
            $startDate = sprintf('%d-%02d-01', $year, $month);
            $endDate = date('Y-m-t', strtotime($startDate));

            $income = $this->getPeriodTotal('income', $startDate, $endDate);
            $expense = $this->getPeriodTotal('expense', $startDate, $endDate);

            $months[] = [
                'month' => $month,
                'month_name' => date('M', mktime(0, 0, 0, $month, 1)),
                'income' => $income,
                'expense' => $expense,
                'profit' => bcsub($income, $expense, 4),
            ];
        }

        return $months;
    }
}
