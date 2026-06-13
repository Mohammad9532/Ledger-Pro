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
        $accounts = Account::active()->whereNull('deleted_at')->get();

        $assets = [];
        $liabilities = [];
        $equity = [];
        $totalAssets = '0.0000';
        $totalLiabilities = '0.0000';
        $totalEquity = '0.0000';

        foreach ($accounts as $account) {
            $balance = $this->balanceService->getAccountBalance($account->id, $date);
            $item = [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'balance' => $balance,
            ];

            if (in_array($account->type, ['cash', 'bank', 'asset'])) {
                $assets[] = $item;
                $totalAssets = bcadd($totalAssets, $balance, 4);
            } elseif (in_array($account->type, ['credit_card', 'liability'])) {
                // For liabilities, balance is typically negative (credit heavy)
                $liabilities[] = $item;
                $totalLiabilities = bcadd($totalLiabilities, $balance, 4);
            } elseif ($account->type === 'person') {
                if (bccomp($balance, '0', 4) > 0) {
                    $assets[] = $item; // Receivable
                    $totalAssets = bcadd($totalAssets, $balance, 4);
                } else {
                    $liabilities[] = $item; // Payable
                    $totalLiabilities = bcadd($totalLiabilities, $balance, 4);
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

        return [
            'date' => $date,
            'assets' => $assets,
            'liabilities' => $liabilities,
            'equity' => $equity,
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
        $incomeAccounts = Account::where('type', 'income')->whereNull('deleted_at')->get();
        $incomeItems = [];
        $totalIncome = '0.0000';

        foreach ($incomeAccounts as $account) {
            $credits = TransactionEntry::where('transaction_entries.account_id', $account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->whereBetween('transactions.date', [$startDate, $endDate])
                ->sum('transaction_entries.credit');

            $incomeItems[] = [
                'id' => $account->id,
                'name' => $account->name,
                'amount' => (string) $credits,
            ];
            $totalIncome = bcadd($totalIncome, (string) $credits, 4);
        }

        // Expense accounts
        $expenseAccounts = Account::where('type', 'expense')->whereNull('deleted_at')->get();
        $expenseItems = [];
        $totalExpense = '0.0000';

        foreach ($expenseAccounts as $account) {
            $debits = TransactionEntry::where('transaction_entries.account_id', $account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->whereBetween('transactions.date', [$startDate, $endDate])
                ->sum('transaction_entries.debit');

            $expenseItems[] = [
                'id' => $account->id,
                'name' => $account->name,
                'amount' => (string) $debits,
            ];
            $totalExpense = bcadd($totalExpense, (string) $debits, 4);
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
        $personAccounts = Account::where('type', 'person')
            ->whereNull('deleted_at')
            ->active()
            ->get();

        $receivables = [];
        $total = '0.0000';

        foreach ($personAccounts as $account) {
            $balance = $this->balanceService->getAccountBalance($account->id);
            if (bccomp($balance, '0', 4) > 0) {
                $receivables[] = [
                    'id' => $account->id,
                    'name' => $account->name,
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
        $personAccounts = Account::where('type', 'person')
            ->whereNull('deleted_at')
            ->active()
            ->get();

        $payables = [];
        $total = '0.0000';

        foreach ($personAccounts as $account) {
            $balance = $this->balanceService->getAccountBalance($account->id);
            if (bccomp($balance, '0', 4) < 0) {
                $payables[] = [
                    'id' => $account->id,
                    'name' => $account->name,
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
        $query = DB::table('transaction_entries')
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
                DB::raw('COALESCE(SUM(transaction_entries.debit), 0) as total'),
                DB::raw('COUNT(DISTINCT transactions.id) as count')
            )
            ->groupBy('expense_categories.id', 'expense_categories.name')
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
        $query = DB::table('transaction_entries')
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
                DB::raw('COALESCE(SUM(transaction_entries.credit), 0) as total'),
                DB::raw('COUNT(DISTINCT transactions.id) as count')
            )
            ->groupBy('accounts.id', 'accounts.name')
            ->havingRaw('COALESCE(SUM(transaction_entries.credit), 0) > 0')
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
