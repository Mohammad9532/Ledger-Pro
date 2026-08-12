<?php

namespace App\Services;

use App\Models\Account;
use App\Models\Transaction;
use App\Models\TransactionEntry;
use App\DTOs\Reports\TrialBalanceRow;
use App\DTOs\Reports\TrialBalanceResult;
use App\DTOs\Reports\ProfitAndLossRow;
use App\DTOs\Reports\ProfitAndLossResult;
use App\DTOs\Reports\BalanceSheetRow;
use App\DTOs\Reports\BalanceSheetResult;
use App\DTOs\Reports\CashFlowRow;
use App\DTOs\Reports\CashFlowResult;
use App\DTOs\Reports\ReceivablePayableRow;
use App\DTOs\Reports\ReceivablePayableResult;
use Illuminate\Support\Facades\DB;

class ReportService
{
    protected BalanceService $balanceService;

    public function __construct(BalanceService $balanceService)
    {
        $this->balanceService = $balanceService;
    }

    /**
     * Trial Balance: Lists all accounts and their net debit/credit balances
     */
    public function trialBalance(?string $date = null): TrialBalanceResult
    {
        $date = $date ?? now()->toDateString();
        
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

        $rows = [];
        $totalDebit = '0.0000';
        $totalCredit = '0.0000';

        foreach ($accounts as $account) {
            $balance = (string) $account->net_balance;
            
            // Skip accounts with exactly 0 balance unless they are active and not deleted
            if (bccomp($balance, '0', 4) === 0 && ($account->deleted_at !== null || !$account->is_active)) {
                continue;
            }

            $debit = '0.0000';
            $credit = '0.0000';

            if (bccomp($balance, '0', 4) > 0) {
                $debit = $balance;
            } elseif (bccomp($balance, '0', 4) < 0) {
                // Absolute value for credit
                $credit = bcsub('0', $balance, 4);
            }

            $name = $account->name;
            if ($account->deleted_at !== null) {
                $name .= ' (Deleted)';
            } elseif (!$account->is_active) {
                $name .= ' (Inactive)';
            }

            $rows[] = new TrialBalanceRow(
                accountId: $account->id,
                accountName: $name,
                accountCode: null, // Add to DB later if needed
                accountType: $account->type,
                debit: $debit,
                credit: $credit
            );

            $totalDebit = bcadd($totalDebit, $debit, 4);
            $totalCredit = bcadd($totalCredit, $credit, 4);
        }

        return new TrialBalanceResult(
            rows: $rows,
            totalDebit: $totalDebit,
            totalCredit: $totalCredit,
            isBalanced: bccomp($totalDebit, $totalCredit, 4) === 0,
            asOfDate: $date,
            generatedAt: now()->toIso8601String(),
            currency: 'AED', // Hardcoded for now, can be dynamic
            tenant: config('database.connections.tenant.database', 'N/A')
        );
    }

    /**
     * Balance Sheet: Assets vs Liabilities + Equity
     * Calculates everything via a single set of aggregations to prevent N+1
     */
    public function balanceSheet(?string $date = null): BalanceSheetResult
    {
        $date = $date ?? now()->toDateString();
        
        // 1. Get all balances up to the specified date
        $balances = DB::table('transaction_entries')
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->whereNull('transactions.deleted_at')
            ->where('transactions.date', '<=', $date)
            ->selectRaw('
                transaction_entries.account_id,
                COALESCE(SUM(transaction_entries.debit), 0) as total_debit,
                COALESCE(SUM(transaction_entries.credit), 0) as total_credit
            ')
            ->groupBy('transaction_entries.account_id')
            ->get()
            ->keyBy('account_id');

        // 2. Fetch all accounts
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

        $totalIncomeForRetainedEarnings = '0.0000';
        $totalExpenseForRetainedEarnings = '0.0000';

        foreach ($accounts as $account) {
            $bal = $balances->get($account->id);
            $debit = $bal ? $bal->total_debit : '0';
            $credit = $bal ? $bal->total_credit : '0';
            
            // Raw balance: Debits - Credits
            $netBalance = bcsub((string) $debit, (string) $credit, 4);
            $netBalance = bcadd($netBalance, (string) $account->opening_balance, 4);

            // Calculate Retained Earnings strictly from income/expense accounts
            if ($account->type === 'income') {
                // Income is a credit balance
                $incomeBalance = bcsub((string) $credit, (string) $debit, 4);
                $totalIncomeForRetainedEarnings = bcadd($totalIncomeForRetainedEarnings, $incomeBalance, 4);
                continue; // Do not list income accounts on the balance sheet
            } elseif ($account->type === 'expense') {
                // Expense is a debit balance
                $expenseBalance = bcsub((string) $debit, (string) $credit, 4);
                $totalExpenseForRetainedEarnings = bcadd($totalExpenseForRetainedEarnings, $expenseBalance, 4);
                continue; // Do not list expense accounts on the balance sheet
            }

            // Skip if the account is deleted or inactive AND has a zero balance
            if (bccomp($netBalance, '0', 4) === 0 && ($account->deleted_at !== null || !$account->is_active)) {
                continue;
            }

            $name = $account->name;
            if ($account->deleted_at !== null) {
                $name .= ' (Deleted)';
            } elseif (!$account->is_active) {
                $name .= ' (Inactive)';
            }

            if (in_array($account->type, ['cash', 'bank', 'asset', 'person'])) {
                // Assets are Debit balances
                $displayBalance = $netBalance;
            } else {
                // Liabilities and Equity are Credit balances
                $displayBalance = bcsub('0', $netBalance, 4);
            }

            $row = new BalanceSheetRow(
                accountId: $account->id,
                accountName: $name,
                accountType: $account->type,
                balance: $displayBalance
            );

            if (in_array($account->type, ['cash', 'bank'])) {
                $currentAssets[] = $row;
                $totalCurrentAssets = bcadd($totalCurrentAssets, $displayBalance, 4);
            } elseif ($account->type === 'asset') {
                $nonCurrentAssets[] = $row;
                $totalNonCurrentAssets = bcadd($totalNonCurrentAssets, $displayBalance, 4);
            } elseif ($account->type === 'credit_card') {
                $currentLiabilities[] = $row;
                $totalCurrentLiabilities = bcadd($totalCurrentLiabilities, $displayBalance, 4);
            } elseif ($account->type === 'liability') {
                $nonCurrentLiabilities[] = $row;
                $totalNonCurrentLiabilities = bcadd($totalNonCurrentLiabilities, $displayBalance, 4);
            } elseif ($account->type === 'person') {
                if (bccomp($displayBalance, '0', 4) >= 0) {
                    $currentAssets[] = $row; // Receivable
                    $totalCurrentAssets = bcadd($totalCurrentAssets, $displayBalance, 4);
                } else {
                    // Payable: invert balance for display
                    $payableBalance = bcsub('0', $displayBalance, 4);
                    $payableRow = new BalanceSheetRow(
                        accountId: $account->id,
                        accountName: $name,
                        accountType: $account->type,
                        balance: $payableBalance
                    );
                    $currentLiabilities[] = $payableRow;
                    $totalCurrentLiabilities = bcadd($totalCurrentLiabilities, $payableBalance, 4);
                }
            } elseif ($account->type === 'equity') {
                $equity[] = $row;
                $totalEquity = bcadd($totalEquity, $displayBalance, 4);
            }
        }

        // Retained Earnings (Cumulative Income - Cumulative Expense)
        $retainedEarningsAmount = bcsub($totalIncomeForRetainedEarnings, $totalExpenseForRetainedEarnings, 4);
        
        $equity[] = new BalanceSheetRow(
            accountId: 'retained_earnings',
            accountName: 'Retained Earnings',
            accountType: 'equity',
            balance: $retainedEarningsAmount
        );
        $totalEquity = bcadd($totalEquity, $retainedEarningsAmount, 4);

        $totalAssets = bcadd($totalCurrentAssets, $totalNonCurrentAssets, 4);
        $totalLiabilities = bcadd($totalCurrentLiabilities, $totalNonCurrentLiabilities, 4);
        $totalLiabilitiesAndEquity = bcadd($totalLiabilities, $totalEquity, 4);

        $difference = bcsub($totalAssets, $totalLiabilitiesAndEquity, 4);
        $isBalanced = bccomp($difference, '0', 4) === 0;

        return new BalanceSheetResult(
            currentAssets: $currentAssets,
            nonCurrentAssets: $nonCurrentAssets,
            currentLiabilities: $currentLiabilities,
            nonCurrentLiabilities: $nonCurrentLiabilities,
            equity: $equity,
            totalCurrentAssets: $totalCurrentAssets,
            totalNonCurrentAssets: $totalNonCurrentAssets,
            totalCurrentLiabilities: $totalCurrentLiabilities,
            totalNonCurrentLiabilities: $totalNonCurrentLiabilities,
            totalAssets: $totalAssets,
            totalLiabilities: $totalLiabilities,
            totalEquity: $totalEquity,
            totalLiabilitiesAndEquity: $totalLiabilitiesAndEquity,
            isBalanced: $isBalanced,
            difference: $difference,
            asOfDate: $date,
            generatedAt: now()->toIso8601String(),
            currency: 'AED', // Dynamic later
            tenant: config('database.connections.tenant.database', 'N/A')
        );
    }

    /**
     * Profit & Loss Statement
     */
    public function profitAndLoss(string $startDate, string $endDate): ProfitAndLossResult
    {
        // 1. Get all balances within the period
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

        // 2. Fetch all income and expense accounts
        $accounts = Account::withTrashed()->whereIn('type', ['income', 'expense'])->get();

        $incomeRows = [];
        $expenseRows = [];
        $totalIncome = '0.0000';
        $totalExpense = '0.0000';

        foreach ($accounts as $account) {
            $bal = $balances->get($account->id);
            $debit = $bal ? $bal->total_debit : '0';
            $credit = $bal ? $bal->total_credit : '0';
            
            // Income is natural credit, Expense is natural debit
            if ($account->type === 'income') {
                $netBalance = bcsub((string) $credit, (string) $debit, 4);
            } else {
                $netBalance = bcsub((string) $debit, (string) $credit, 4);
            }

            // Skip deleted/inactive accounts if they have 0 activity in this period
            if (bccomp($netBalance, '0', 4) === 0 && ($account->deleted_at !== null || !$account->is_active)) {
                continue;
            }

            $name = $account->name;
            if ($account->deleted_at !== null) {
                $name .= ' (Deleted)';
            } elseif (!$account->is_active) {
                $name .= ' (Inactive)';
            }

            $row = new ProfitAndLossRow(
                accountId: $account->id,
                accountName: $name,
                accountType: $account->type,
                amount: $netBalance
            );

            if ($account->type === 'income') {
                $incomeRows[] = $row;
                $totalIncome = bcadd($totalIncome, $netBalance, 4);
            } else {
                $expenseRows[] = $row;
                $totalExpense = bcadd($totalExpense, $netBalance, 4);
            }
        }

        $netProfit = bcsub($totalIncome, $totalExpense, 4);

        return new ProfitAndLossResult(
            incomeRows: $incomeRows,
            expenseRows: $expenseRows,
            totalIncome: $totalIncome,
            totalExpense: $totalExpense,
            netProfit: $netProfit,
            startDate: $startDate,
            endDate: $endDate,
            generatedAt: now()->toIso8601String(),
            currency: 'AED',
            tenant: config('database.connections.tenant.database', 'N/A')
        );
    }

    /**
     * Cash Flow Statement using Direct/Offset Method
     */
    public function cashFlow(string $startDate, string $endDate): CashFlowResult
    {
        // 1. Calculate Opening Balance of Cash & Bank accounts
        $historicalCashFlow = DB::table('transaction_entries')
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->join('accounts', 'transaction_entries.account_id', '=', 'accounts.id')
            ->whereNull('transactions.deleted_at')
            ->where('transactions.date', '<', $startDate)
            ->whereIn('accounts.type', ['cash', 'bank'])
            ->selectRaw('COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as balance')
            ->value('balance') ?? '0.0000';

        $accountOpeningBalances = DB::table('accounts')
            ->whereIn('type', ['cash', 'bank'])
            ->sum('opening_balance') ?? '0.0000';

        $openingBalance = bcadd((string)$historicalCashFlow, (string)$accountOpeningBalances, 4);

        // 2. Calculate Offset Cash Flow inside the period
        $offsets = DB::table('transaction_entries as te1')
            ->join('transactions', 'te1.transaction_id', '=', 'transactions.id')
            ->join('accounts as a1', 'te1.account_id', '=', 'a1.id')
            ->whereNull('transactions.deleted_at')
            ->whereBetween('transactions.date', [$startDate, $endDate])
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                      ->from('transaction_entries as te2')
                      ->join('accounts as a2', 'te2.account_id', '=', 'a2.id')
                      ->whereColumn('te2.transaction_id', 'transactions.id')
                      ->whereIn('a2.type', ['cash', 'bank']);
            })
            // We want to group by the NON-cash accounts (the offsets)
            ->whereNotIn('a1.type', ['cash', 'bank'])
            ->selectRaw('
                a1.id as account_id,
                a1.name as account_name,
                a1.type as account_type,
                a1.deleted_at,
                a1.is_active,
                COALESCE(SUM(te1.credit), 0) - COALESCE(SUM(te1.debit), 0) as net_cash_effect
            ')
            ->groupBy('a1.id', 'a1.name', 'a1.type', 'a1.deleted_at', 'a1.is_active')
            ->get();

        $operatingActivities = [];
        $investingActivities = [];
        $financingActivities = [];

        $netOperatingCashFlow = '0.0000';
        $netInvestingCashFlow = '0.0000';
        $netFinancingCashFlow = '0.0000';

        foreach ($offsets as $offset) {
            $amount = (string) $offset->net_cash_effect;
            
            if (bccomp($amount, '0', 4) === 0 && ($offset->deleted_at !== null || !$offset->is_active)) {
                continue;
            }

            $name = $offset->account_name;
            if ($offset->deleted_at !== null) {
                $name .= ' (Deleted)';
            } elseif (!$offset->is_active) {
                $name .= ' (Inactive)';
            }

            $row = new CashFlowRow(
                accountId: $offset->account_id,
                accountName: $name,
                accountType: $offset->account_type,
                amount: $amount
            );

            // Categorize based on offset account type
            if (in_array($offset->account_type, ['income', 'expense', 'person'])) {
                $operatingActivities[] = $row;
                $netOperatingCashFlow = bcadd($netOperatingCashFlow, $amount, 4);
            } elseif ($offset->account_type === 'asset') {
                $investingActivities[] = $row;
                $netInvestingCashFlow = bcadd($netInvestingCashFlow, $amount, 4);
            } elseif (in_array($offset->account_type, ['liability', 'equity', 'credit_card'])) {
                $financingActivities[] = $row;
                $netFinancingCashFlow = bcadd($netFinancingCashFlow, $amount, 4);
            }
        }

        $netCashFlow = bcadd($netOperatingCashFlow, bcadd($netInvestingCashFlow, $netFinancingCashFlow, 4), 4);
        $closingBalance = bcadd($openingBalance, $netCashFlow, 4);

        return new CashFlowResult(
            operatingActivities: $operatingActivities,
            investingActivities: $investingActivities,
            financingActivities: $financingActivities,
            netOperatingCashFlow: $netOperatingCashFlow,
            netInvestingCashFlow: $netInvestingCashFlow,
            netFinancingCashFlow: $netFinancingCashFlow,
            netCashFlow: $netCashFlow,
            openingBalance: $openingBalance,
            closingBalance: $closingBalance,
            startDate: $startDate,
            endDate: $endDate,
            generatedAt: now()->toIso8601String(),
            currency: 'AED',
            tenant: config('database.connections.tenant.database', 'N/A')
        );
    }
    public function receivableReport(?string $date = null): ReceivablePayableResult
    {
        $date = $date ?? now()->toDateString();
        
        $accounts = DB::table('accounts')
            ->leftJoin('transaction_entries', 'accounts.id', '=', 'transaction_entries.account_id')
            ->leftJoin('transactions', function($join) use ($date) {
                $join->on('transaction_entries.transaction_id', '=', 'transactions.id')
                     ->whereNull('transactions.deleted_at')
                     ->where('transactions.date', '<=', $date);
            })
            ->where('accounts.type', 'person')
            ->selectRaw('
                accounts.id,
                accounts.name,
                accounts.contact_id,
                accounts.deleted_at,
                accounts.is_active,
                accounts.opening_balance,
                COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as net_balance
            ')
            ->groupBy('accounts.id', 'accounts.name', 'accounts.contact_id', 'accounts.deleted_at', 'accounts.is_active', 'accounts.opening_balance')
            ->get();

        $receivables = [];
        $total = '0.0000';

        foreach ($accounts as $account) {
            $balance = bcadd((string)$account->opening_balance, (string)$account->net_balance, 4);
            
            if (bccomp($balance, '0', 4) > 0) {
                $name = $account->name;
                if ($account->deleted_at !== null) {
                    $name .= ' (Deleted)';
                } elseif (!$account->is_active) {
                    $name .= ' (Inactive)';
                }
                
                $receivables[] = new ReceivablePayableRow(
                    id: $account->id,
                    name: $name,
                    contactId: $account->contact_id,
                    balance: $balance
                );
                
                $total = bcadd($total, $balance, 4);
            }
        }

        return new ReceivablePayableResult(
            items: $receivables,
            total: $total,
            asOfDate: $date,
            generatedAt: now()->toIso8601String(),
            currency: 'AED',
            tenant: config('database.connections.tenant.database', 'N/A'),
            reportType: 'receivable'
        );
    }

    /**
     * Payable Report - people I owe money to
     */
    public function payableReport(?string $date = null): ReceivablePayableResult
    {
        $date = $date ?? now()->toDateString();
        
        $accounts = DB::table('accounts')
            ->leftJoin('transaction_entries', 'accounts.id', '=', 'transaction_entries.account_id')
            ->leftJoin('transactions', function($join) use ($date) {
                $join->on('transaction_entries.transaction_id', '=', 'transactions.id')
                     ->whereNull('transactions.deleted_at')
                     ->where('transactions.date', '<=', $date);
            })
            ->where('accounts.type', 'person')
            ->selectRaw('
                accounts.id,
                accounts.name,
                accounts.contact_id,
                accounts.deleted_at,
                accounts.is_active,
                accounts.opening_balance,
                COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as net_balance
            ')
            ->groupBy('accounts.id', 'accounts.name', 'accounts.contact_id', 'accounts.deleted_at', 'accounts.is_active', 'accounts.opening_balance')
            ->get();

        $payables = [];
        $total = '0.0000';

        foreach ($accounts as $account) {
            $balance = bcadd((string)$account->opening_balance, (string)$account->net_balance, 4);
            
            // For Payables, the balance should be negative (Credit > Debit)
            if (bccomp($balance, '0', 4) < 0) {
                $name = $account->name;
                if ($account->deleted_at !== null) {
                    $name .= ' (Deleted)';
                } elseif (!$account->is_active) {
                    $name .= ' (Inactive)';
                }
                
                $payables[] = new ReceivablePayableRow(
                    id: $account->id,
                    name: $name,
                    contactId: $account->contact_id,
                    balance: $balance // Keeping it as the true negative balance, frontend can Math.abs it
                );
                
                $total = bcadd($total, $balance, 4);
            }
        }

        return new ReceivablePayableResult(
            items: $payables,
            total: $total,
            asOfDate: $date,
            generatedAt: now()->toIso8601String(),
            currency: 'AED',
            tenant: config('database.connections.tenant.database', 'N/A'),
            reportType: 'payable'
        );

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
            $balance = $account->balance;
            // Credit card balance is typically negative (amount owed)
            $outstanding = bcmul($balance, '-1', 4);

            $cards[] = [
                'id' => $account->id,
                'name' => $account->name,
                'balance' => $balance,
                'outstanding' => bccomp($outstanding, '0', 4) > 0 ? $outstanding : '0.0000',
                'credit_limit' => $account->credit_limit,
                'available_balance' => $account->available_balance,
                'parent_account_id' => $account->parent_account_id,
                'parent_name' => $account->parent ? $account->parent->name : null,
            ];
        }

        return $cards;
    }


}
