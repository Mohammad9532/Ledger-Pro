<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\TransactionEntry;
use Illuminate\Support\Facades\DB;

class ReportService
{
    protected BalanceService $balanceService;

    public function __construct(BalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    /**
     * Balance Sheet: Assets vs Liabilities + Equity
     */
    public function balanceSheet(?string $date = null): array
    {
        $date = $date ?? now()->toDateString();
        // Include soft-deleted and inactive accounts for historical accuracy
        $accounts = Account::withTrashed()->get();

        $currentAssets = [];
        $nonCurrentAssets = [];
        $currentLiabilities = [];
        $nonCurrentLiabilities = [];
        $equity = [];
        
        $totalCurrentAssets = '0.0000';
        $totalNonCurrentAssets = '0.0000';
        $totalCurrentLiabilities = '0.0000';
        $totalNonCurrentLiabilities = '0.0000';
        $totalEquity = '0.0000';

        foreach ($accounts as $account) {
            $balance = $this->balanceService->getAccountBalance($account->id, $date);
            
            // Skip if the account is deleted or inactive AND has a zero balance
            if (bccomp($balance, '0', 4) == 0 && ($account->deleted_at !== null || !$account->is_active)) {
                continue;
            }

            // Append (Deleted) or (Inactive) to name if applicable, for clarity
            $name = $account->name;
            if ($account->deleted_at !== null) {
                $name .= ' (Deleted)';
            } elseif (!$account->is_active) {
                $name .= ' (Inactive)';
            }

            $item = [
                'id' => $account->id,
                'name' => $name,
                'type' => $account->type,
                'balance' => $balance,
            ];

            if (in_array($account->type, ['cash', 'bank'])) {
                $currentAssets[] = $item;
                $totalCurrentAssets = bcadd($totalCurrentAssets, $balance, 4);
            } elseif ($account->type === 'asset') {
                $nonCurrentAssets[] = $item;
                $totalNonCurrentAssets = bcadd($totalNonCurrentAssets, $balance, 4);
            } elseif ($account->type === 'credit_card') {
                $currentLiabilities[] = $item;
                $totalCurrentLiabilities = bcadd($totalCurrentLiabilities, $balance, 4);
            } elseif ($account->type === 'liability') {
                $nonCurrentLiabilities[] = $item;
                $totalNonCurrentLiabilities = bcadd($totalNonCurrentLiabilities, $balance, 4);
            } elseif ($account->type === 'person') {
                if (bccomp($balance, '0', 4) > 0) {
                    $currentAssets[] = $item; // Receivable
                    $totalCurrentAssets = bcadd($totalCurrentAssets, $balance, 4);
                } else {
                    $currentLiabilities[] = $item; // Payable
                    $totalCurrentLiabilities = bcadd($totalCurrentLiabilities, $balance, 4);
                }
            } elseif ($account->type === 'equity') {
                $equity[] = $item;
                $totalEquity = bcadd($totalEquity, $balance, 4);
            }
        }

        // Calculate Retained Earnings (Net Profit)
        $pnl = $this->profitAndLoss('1970-01-01', $date);
        // Income is a credit, Expense is a debit. So Retained Earnings (Equity) should be Expense - Income to be a Credit (negative) balance.
        $retainedEarnings = bcsub($pnl['total_expense'] ?? '0', $pnl['total_income'] ?? '0', 4);
        
        $equity[] = [
            'id' => 'retained_earnings',
            'name' => 'Retained Earnings',
            'type' => 'equity',
            'balance' => $retainedEarnings,
        ];
        $totalEquity = bcadd($totalEquity, $retainedEarnings, 4);

        $totalAssets = bcadd($totalCurrentAssets, $totalNonCurrentAssets, 4);
        $totalLiabilities = bcadd($totalCurrentLiabilities, $totalNonCurrentLiabilities, 4);

        return [
            'date' => $date,
            'current_assets' => $currentAssets,
            'non_current_assets' => $nonCurrentAssets,
            'current_liabilities' => $currentLiabilities,
            'non_current_liabilities' => $nonCurrentLiabilities,
            'equity' => $equity,
            'total_current_assets' => $totalCurrentAssets,
            'total_non_current_assets' => $totalNonCurrentAssets,
            'total_current_liabilities' => $totalCurrentLiabilities,
            'total_non_current_liabilities' => $totalNonCurrentLiabilities,
            'total_assets' => $totalAssets,
            'total_liabilities' => $totalLiabilities,
            'total_equity' => $totalEquity,
        ];
    }

    /**
     * Profit & Loss Statement
     */
    public function profitAndLoss(string $startDate, string $endDate): array
    {
        // Income accounts
        $incomeAccounts = Account::withTrashed()->where('type', 'income')->get();
        $incomeItems = [];
        $totalIncome = '0.0000';

        foreach ($incomeAccounts as $account) {
            $net = TransactionEntry::where('transaction_entries.account_id', $account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->whereBetween('transactions.date', [$startDate, $endDate])
                ->selectRaw('COALESCE(SUM(transaction_entries.credit), 0) - COALESCE(SUM(transaction_entries.debit), 0) as balance')
                ->value('balance');

            $amount = (string) ($net ?? '0.0000');
            
            // Skip deleted/inactive accounts if they have 0 activity in this period
            if (bccomp($amount, '0', 4) == 0 && ($account->deleted_at !== null || !$account->is_active)) {
                continue;
            }

            $name = $account->name;
            if ($account->deleted_at !== null) {
                $name .= ' (Deleted)';
            } elseif (!$account->is_active) {
                $name .= ' (Inactive)';
            }

            $incomeItems[] = [
                'id' => $account->id,
                'name' => $name,
                'amount' => $amount,
            ];
            $totalIncome = bcadd($totalIncome, $amount, 4);
        }

        // Expense accounts
        $expenseAccounts = Account::withTrashed()->where('type', 'expense')->get();
        $expenseItems = [];
        $totalExpense = '0.0000';

        foreach ($expenseAccounts as $account) {
            $net = TransactionEntry::where('transaction_entries.account_id', $account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->whereBetween('transactions.date', [$startDate, $endDate])
                ->selectRaw('COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as balance')
                ->value('balance');

            $amount = (string) ($net ?? '0.0000');

            // Skip deleted/inactive accounts if they have 0 activity in this period
            if (bccomp($amount, '0', 4) == 0 && ($account->deleted_at !== null || !$account->is_active)) {
                continue;
            }

            $name = $account->name;
            if ($account->deleted_at !== null) {
                $name .= ' (Deleted)';
            } elseif (!$account->is_active) {
                $name .= ' (Inactive)';
            }

            $expenseItems[] = [
                'id' => $account->id,
                'name' => $name,
                'amount' => $amount,
            ];
            $totalExpense = bcadd($totalExpense, $amount, 4);
        }

        $netProfit = bcsub($totalIncome, $totalExpense, 4);

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'income' => $incomeItems,
            'expenses' => $expenseItems,
            'total_income' => $totalIncome,
            'total_expense' => $totalExpense,
            'net_profit' => $netProfit,
        ];
    }

    /**
     * Receivable Report - people who owe money
     */
    public function receivableReport(): array
    {
        $personAccounts = Account::withTrashed()->where('type', 'person')->get();

        $receivables = [];
        $total = '0.0000';

        foreach ($personAccounts as $account) {
            $balance = $this->balanceService->getAccountBalance($account->id);
            if (bccomp($balance, '0', 4) > 0) {
                $name = $account->name;
                if ($account->deleted_at !== null) {
                    $name .= ' (Deleted)';
                } elseif (!$account->is_active) {
                    $name .= ' (Inactive)';
                }
                
                $receivables[] = [
                    'id' => $account->id,
                    'name' => $name,
                    'contact_id' => $account->contact_id,
                    'balance' => $balance,
                ];
                $total = bcadd($total, $balance, 4);
            }
        }

        return ['items' => $receivables, 'total' => $total];
    }

    /**
     * Payable Report - people I owe money to
     */
    public function payableReport(): array
    {
        $personAccounts = Account::withTrashed()->where('type', 'person')->get();

        $payables = [];
        $total = '0.0000';

        foreach ($personAccounts as $account) {
            $balance = $this->balanceService->getAccountBalance($account->id);
            if (bccomp($balance, '0', 4) < 0) {
                $name = $account->name;
                if ($account->deleted_at !== null) {
                    $name .= ' (Deleted)';
                } elseif (!$account->is_active) {
                    $name .= ' (Inactive)';
                }
                
                $payables[] = [
                    'id' => $account->id,
                    'name' => $name,
                    'contact_id' => $account->contact_id,
                    'balance' => $balance,
                ];
                $total = bcadd($total, $balance, 4);
            }
        }

        return ['items' => $payables, 'total' => $total];
    }

    /**
     * Expense Summary by category for a period
     */
    public function expenseSummary(string $startDate, string $endDate, bool $includeBusiness = false): array
    {
        $query = DB::connection('tenant')->table('transaction_entries')
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->join('accounts', 'transaction_entries.account_id', '=', 'accounts.id')
            ->leftJoin('expense_categories', 'accounts.id', '=', 'expense_categories.account_id')
            ->where('accounts.type', 'expense')
            ->whereNull('transactions.deleted_at')
            ->whereBetween('transactions.date', [$startDate, $endDate]);

        if (!$includeBusiness) {
            $query->whereNotIn('accounts.name', ['Cost of Goods Sold']);
        }

        $summary = $query->select(
                'expense_categories.id as category_id',
                'expense_categories.name as category_name',
                DB::raw('COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as total'),
                DB::raw('COUNT(DISTINCT transactions.id) as count')
            )
            ->groupBy('expense_categories.id', 'expense_categories.name')
            ->havingRaw('COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) > 0')
            ->orderByDesc('total')
            ->get();

        $grandTotal = $summary->sum('total');

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'categories' => $summary->toArray(),
            'grand_total' => (string) $grandTotal,
        ];
    }

    /**
     * Income Summary for a period
     */
    public function incomeSummary(string $startDate, string $endDate, bool $includeBusiness = false): array
    {
        $query = DB::connection('tenant')->table('transaction_entries')
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->join('accounts', 'transaction_entries.account_id', '=', 'accounts.id')
            ->where('accounts.type', 'income')
            ->whereNull('transactions.deleted_at')
            ->whereBetween('transactions.date', [$startDate, $endDate]);

        if (!$includeBusiness) {
            $query->whereNotIn('accounts.name', ['Sales Revenue', 'Sales Income']);
        }

        $summary = $query->select(
                'accounts.id as category_id',
                'accounts.name as category_name',
                DB::raw('COALESCE(SUM(transaction_entries.credit), 0) - COALESCE(SUM(transaction_entries.debit), 0) as total'),
                DB::raw('COUNT(DISTINCT transactions.id) as count')
            )
            ->groupBy('accounts.id', 'accounts.name')
            ->havingRaw('COALESCE(SUM(transaction_entries.credit), 0) - COALESCE(SUM(transaction_entries.debit), 0) > 0')
            ->orderByDesc('total')
            ->get();

        $grandTotal = $summary->sum('total');

        // Provide backwards compatibility structure for ReportsPage.tsx
        $items = $summary->map(function ($row) {
            return [
                'id' => $row->category_id,
                'name' => $row->category_name,
                'amount' => (string) $row->total,
            ];
        })->toArray();

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'categories' => $summary->toArray(),
            'grand_total' => (string) $grandTotal,
            'items' => $items,
            'total' => (string) $grandTotal,
        ];
    }

    /**
     * Credit Card Summary
     */
    public function creditCardSummary(): array
    {
        $ccAccounts = Account::where('type', 'credit_card')
            ->whereNull('deleted_at')
            ->active()
            ->get();

        $cards = [];

        foreach ($ccAccounts as $account) {
            $balance = $this->balanceService->getAccountBalance($account->id);
            // Credit card balance is typically negative (amount owed)
            $outstanding = bcmul($balance, '-1', 4);

            $cards[] = [
                'id' => $account->id,
                'name' => $account->name,
                'balance' => $balance,
                'outstanding' => bccomp($outstanding, '0', 4) > 0 ? $outstanding : '0.0000',
            ];
        }

        return $cards;
    }

    /**
     * Cash Flow for a period
     */
    public function cashFlow(string $startDate, string $endDate): array
    {
        $cashBankAccounts = Account::whereIn('type', ['cash', 'bank'])
            ->whereNull('deleted_at')
            ->active()
            ->get();

        $inflows = '0.0000';
        $outflows = '0.0000';

        foreach ($cashBankAccounts as $account) {
            $debits = TransactionEntry::where('transaction_entries.account_id', $account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->whereBetween('transactions.date', [$startDate, $endDate])
                ->sum('transaction_entries.debit');

            $credits = TransactionEntry::where('transaction_entries.account_id', $account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->whereBetween('transactions.date', [$startDate, $endDate])
                ->sum('transaction_entries.credit');

            $inflows = bcadd($inflows, (string) $debits, 4);
            $outflows = bcadd($outflows, (string) $credits, 4);
        }

        return [
            'period' => ['start' => $startDate, 'end' => $endDate],
            'inflows' => $inflows,
            'outflows' => $outflows,
            'net_flow' => bcsub($inflows, $outflows, 4),
        ];
    }
}
