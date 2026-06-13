<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Reconciliation;
use App\Models\AuditLog;
use App\Services\BalanceService;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ReconciliationController extends Controller
{
    protected BalanceService $balanceService;
    protected TransactionService $transactionService;

    public function __construct(BalanceService $balanceService, TransactionService $transactionService)
    {
        $this->balanceService = $balanceService;
        $this->transactionService = $transactionService;
    }

    /**
     * Get all reconcilable accounts with their current system balances.
     */
    public function accounts(): JsonResponse
    {
        $types = ['cash', 'bank', 'credit_card'];

        $accounts = Account::whereIn('type', $types)
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->orderBy('type')
            ->orderBy('name')
            ->get();

        $result = $accounts->map(function ($account) {
            $systemBalance = $this->balanceService->getAccountBalance($account->id);

            // Get last reconciliation for this account
            $lastRecon = Reconciliation::where('account_id', $account->id)
                ->orderBy('reconciliation_date', 'desc')
                ->first();

            return [
                'id' => $account->id,
                'name' => $account->name,
                'type' => $account->type,
                'system_balance' => $systemBalance,
                'last_reconciliation' => $lastRecon ? [
                    'date' => $lastRecon->reconciliation_date->toDateString(),
                    'status' => $lastRecon->status,
                    'difference' => $lastRecon->difference,
                ] : null,
            ];
        });

        return response()->json($result);
    }

    /**
     * Perform a reconciliation for an account.
     */
    public function reconcile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_id' => 'required|exists:accounts,id',
            'actual_balance' => 'required|numeric',
            'reconciliation_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        $account = Account::findOrFail($validated['account_id']);

        // Compute system balance from ledger (the source of truth)
        $systemBalance = $this->balanceService->getAccountBalance(
            $account->id,
            $validated['reconciliation_date']
        );

        $actualBalance = (string) $validated['actual_balance'];
        $difference = bcsub($actualBalance, $systemBalance, 4);

        // Determine status
        $status = bccomp($difference, '0', 4) === 0 ? 'matched' : 'unmatched';

        $reconciliation = Reconciliation::create([
            'account_id' => $account->id,
            'reconciliation_date' => $validated['reconciliation_date'],
            'system_balance' => $systemBalance,
            'actual_balance' => $actualBalance,
            'difference' => $difference,
            'status' => $status,
            'notes' => $validated['notes'] ?? null,
            'created_by' => Auth::id(),
        ]);

        // Audit log
        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => Reconciliation::class,
            'auditable_id' => $reconciliation->id,
            'action' => 'reconciled',
            'new_values' => $reconciliation->toArray(),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        $reconciliation->load('account');

        return response()->json($reconciliation, 201);
    }

    /**
     * Auto-adjust a reconciliation difference by creating a correcting transaction.
     * This creates a journal entry to bring the system in line with the physical count.
     */
    public function adjust(Request $request, int $id): JsonResponse
    {
        $reconciliation = Reconciliation::findOrFail($id);

        if ($reconciliation->status === 'matched') {
            return response()->json(['error' => 'This reconciliation is already matched.'], 422);
        }

        if ($reconciliation->status === 'adjusted') {
            return response()->json(['error' => 'This reconciliation has already been adjusted.'], 422);
        }

        $difference = (float) $reconciliation->difference;
        if ($difference == 0) {
            return response()->json(['error' => 'No difference to adjust.'], 422);
        }

        $account = Account::findOrFail($reconciliation->account_id);

        // Find or determine the adjustment account (expense for shortage, income for surplus)
        $adjustmentAccountType = $difference < 0 ? 'expense' : 'income';
        $adjustmentAccount = Account::where('type', $adjustmentAccountType)
            ->where('name', 'like', '%Other%')
            ->whereNull('deleted_at')
            ->first();

        if (!$adjustmentAccount) {
            return response()->json([
                'error' => "No '{$adjustmentAccountType}' account found for adjustment. Please create an 'Other Expense' or 'Other Income' account."
            ], 422);
        }

        $absDifference = abs($difference);

        // Build double-entry:
        // If difference is NEGATIVE (shortage): system has more than actual
        //   → Credit the cash/bank account (reduce it), Debit the expense account
        // If difference is POSITIVE (surplus): actual has more than system
        //   → Debit the cash/bank account (increase it), Credit the income account
        if ($difference < 0) {
            // Shortage
            $entries = [
                ['account_id' => $adjustmentAccount->id, 'debit' => $absDifference, 'credit' => 0],
                ['account_id' => $account->id, 'debit' => 0, 'credit' => $absDifference],
            ];
        } else {
            // Surplus
            $entries = [
                ['account_id' => $account->id, 'debit' => $absDifference, 'credit' => 0],
                ['account_id' => $adjustmentAccount->id, 'debit' => 0, 'credit' => $absDifference],
            ];
        }

        $transaction = $this->transactionService->createTransaction([
            'type' => $difference < 0 ? 'expense' : 'income',
            'date' => $reconciliation->reconciliation_date->toDateString(),
            'amount' => $absDifference,
            'description' => "Reconciliation Adjustment — {$account->name} (" .
                ($difference < 0 ? 'Shortage' : 'Surplus') . " of ₹" . number_format($absDifference, 2) . ")",
            'reference_number' => 'RECON-' . $reconciliation->id,
        ], $entries);

        // Update reconciliation status
        $reconciliation->update([
            'status' => 'adjusted',
            'adjustment_transaction_id' => $transaction->id,
        ]);

        return response()->json([
            'message' => 'Adjustment recorded successfully.',
            'reconciliation' => $reconciliation->fresh()->load('account', 'adjustmentTransaction'),
            'transaction' => $transaction,
        ]);
    }

    /**
     * Get reconciliation history for an account.
     */
    public function history(Request $request): JsonResponse
    {
        $query = Reconciliation::with('account', 'creator')
            ->orderBy('reconciliation_date', 'desc');

        if ($request->has('account_id')) {
            $query->where('account_id', $request->get('account_id'));
        }

        $reconciliations = $query->limit(50)->get();

        return response()->json($reconciliations);
    }
}
