<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\Transaction;
use App\Services\BalanceService;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AccountController extends Controller
{
    protected BalanceService $balanceService;
    protected TransactionService $transactionService;

    public function __construct(BalanceService $balanceService, TransactionService $transactionService)
    {
        $this->balanceService = $balanceService;
        $this->transactionService = $transactionService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Account::whereNull('deleted_at');

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        $accounts = $query->orderBy('type')->orderBy('name')->get();

        // Fetch opening balance entries
        $obEntries = DB::connection('tenant')->table('transaction_entries')
            ->join('transactions', 'transactions.id', '=', 'transaction_entries.transaction_id')
            ->where('transactions.type', 'opening_balance')
            ->whereNull('transactions.deleted_at')
            ->whereIn('transaction_entries.account_id', $accounts->pluck('id'))
            ->select('transaction_entries.account_id', 'transaction_entries.debit', 'transaction_entries.credit')
            ->get()
            ->keyBy('account_id');

        // Append computed balance to each account (100% from ledger)
        $accounts->each(function ($account) use ($obEntries) {
            $account->computed_balance = $this->balanceService->getAccountBalance($account->id);

            // Dynamically set opening_balance from the ledger entry
            $ob = $obEntries->get($account->id);
            if ($ob) {
                $isLiability = in_array($account->type, ['credit_card', 'liability']);
                $account->opening_balance = $isLiability 
                    ? ($ob->credit - $ob->debit) 
                    : ($ob->debit - $ob->credit);
            } else {
                $account->opening_balance = 0;
            }
        });

        return response()->json($accounts);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name'            => 'required|string|max:255',
            'type'            => 'required|in:cash,bank,credit_card,person,expense,income,asset,liability,business,equity',
            'opening_balance' => 'nullable|numeric',
            'credit_limit'    => 'nullable|numeric|min:0',
            'parent_account_id' => 'nullable|exists:tenant.accounts,id',
            'is_active'       => 'nullable|boolean',
        ]);

        if (in_array($validated['type'], ['person', 'expense', 'income'])) {
            return response()->json(['error' => 'These account types are system-managed and cannot be created manually.'], 422);
        }

        $openingBalance = (float) ($validated['opening_balance'] ?? 0);

        return DB::transaction(function () use ($validated, $openingBalance, $request) {
            // Store 0 — the real opening balance lives in the ledger
            $isSupplementary = !empty($validated['parent_account_id']) && $validated['type'] === 'credit_card';

            $account = Account::create([
                'name'            => $validated['name'],
                'type'            => $validated['type'],
                'opening_balance' => 0, // Neutralised — balance is in ledger entries
                'credit_limit'    => ($validated['type'] === 'credit_card' && !$isSupplementary) ? ($validated['credit_limit'] ?? null) : null,
                'parent_account_id' => $isSupplementary ? $validated['parent_account_id'] : null,
                'is_active'       => $validated['is_active'] ?? true,
                'created_by'      => Auth::id(),
                'updated_by'      => Auth::id(),
            ]);

            // If a non-zero opening balance was supplied, create the ledger transaction
            if ($openingBalance != 0) {
                $this->transactionService->createOpeningBalanceTransaction(
                    accountId:   $account->id,
                    accountType: $account->type,
                    amount:      $openingBalance,
                    date:        $account->created_at->toDateString(),
                );
            }

            AuditLog::create([
                'user_id'        => Auth::id(),
                'auditable_type' => Account::class,
                'auditable_id'   => $account->id,
                'action'         => 'created',
                'new_values'     => $account->toArray(),
                'ip_address'     => $request->ip(),
                'created_at'     => now(),
            ]);

            $account->computed_balance = $this->balanceService->getAccountBalance($account->id);

            return response()->json($account, 201);
        });
    }

    public function show(int $id): JsonResponse
    {
        $account = Account::findOrFail($id);
        $account->computed_balance = $this->balanceService->getAccountBalance($account->id);

        $ob = DB::connection('tenant')->table('transaction_entries')
            ->join('transactions', 'transactions.id', '=', 'transaction_entries.transaction_id')
            ->where('transactions.type', 'opening_balance')
            ->whereNull('transactions.deleted_at')
            ->where('transaction_entries.account_id', $account->id)
            ->select('transaction_entries.debit', 'transaction_entries.credit')
            ->first();

        if ($ob) {
            $isLiability = in_array($account->type, ['credit_card', 'liability']);
            $account->opening_balance = $isLiability 
                ? ($ob->credit - $ob->debit) 
                : ($ob->debit - $ob->credit);
        } else {
            $account->opening_balance = 0;
        }

        return response()->json($account);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $account = Account::findOrFail($id);
        $oldValues = $account->toArray();

        $validated = $request->validate([
            'name'            => 'sometimes|string|max:255',
            'type'            => 'sometimes|in:cash,bank,credit_card,person,expense,income,asset,liability,business,equity',
            'opening_balance' => 'sometimes|numeric',
            'credit_limit'    => 'nullable|numeric|min:0',
            'parent_account_id' => 'nullable|exists:tenant.accounts,id',
            'is_active'       => 'sometimes|boolean',
        ]);

        if ($account->is_system) {
            // Block type change from this endpoint for system accounts
            if (isset($validated['type']) && $validated['type'] !== $account->type) {
                return response()->json(['error' => 'Cannot change the type of a system-managed account.'], 422);
            }
        } else {
            // Non-system accounts cannot be changed TO a system-managed type
            if (isset($validated['type']) && in_array($validated['type'], ['person', 'expense', 'income'])) {
                return response()->json(['error' => 'Cannot convert account to a system-managed type.'], 422);
            }
        }

        return DB::transaction(function () use ($account, $validated, $oldValues, $request) {
            $validated['updated_by'] = Auth::id();

            // If name is changed on a system account, sync it back to the parent module
            if ($account->is_system && isset($validated['name']) && $validated['name'] !== $account->name) {
                if ($account->type === 'person') {
                    \App\Models\Contact::where('account_id', $account->id)->update(['name' => $validated['name'], 'updated_by' => Auth::id()]);
                } elseif ($account->type === 'expense') {
                    $baseName = str_replace(' Expense', '', $validated['name']);
                    \App\Models\ExpenseCategory::where('account_id', $account->id)->update(['name' => $baseName]);
                } elseif ($account->type === 'income') {
                    $baseName = str_replace(' Income', '', $validated['name']);
                    \App\Models\IncomeCategory::where('account_id', $account->id)->update(['name' => $baseName]);
                }
            }

            // If opening_balance is being changed, update the ledger transaction
            if (array_key_exists('opening_balance', $validated)) {
                $newAmount = (float) $validated['opening_balance'];
                $accountType = $validated['type'] ?? $account->type;

                // Find any existing opening balance transaction for this account
                $existingObTxn = Transaction::join('transaction_entries', 'transactions.id', '=', 'transaction_entries.transaction_id')
                    ->where('transactions.type', 'opening_balance')
                    ->where('transaction_entries.account_id', $account->id)
                    ->select('transactions.id')
                    ->first();

                $this->transactionService->createOpeningBalanceTransaction(
                    accountId:             $account->id,
                    accountType:           $accountType,
                    amount:                $newAmount,
                    date:                  $account->created_at->toDateString(),
                    existingTransactionId: $existingObTxn?->id,
                );

                // Keep the column at 0 — balance is now in the ledger
                $validated['opening_balance'] = 0;
            }

            if (array_key_exists('type', $validated) && $validated['type'] !== 'credit_card') {
                $validated['credit_limit'] = null;
                $validated['parent_account_id'] = null;
            } elseif ($account->type !== 'credit_card' && !isset($validated['type'])) {
                // If type is not changing and wasn't credit card, ensure we don't set credit_limit
                unset($validated['credit_limit']);
                unset($validated['parent_account_id']);
            } else {
                // It is a credit card
                if (!empty($validated['parent_account_id'])) {
                    // It's supplementary, remove credit limit
                    $validated['credit_limit'] = null;
                }
            }

            $account->update($validated);

            AuditLog::create([
                'user_id'        => Auth::id(),
                'auditable_type' => Account::class,
                'auditable_id'   => $account->id,
                'action'         => 'updated',
                'old_values'     => $oldValues,
                'new_values'     => $account->fresh()->toArray(),
                'ip_address'     => $request->ip(),
                'created_at'     => now(),
            ]);

            $account->computed_balance = $this->balanceService->getAccountBalance($account->id);

            return response()->json($account);
        });
    }

    public function destroy(int $id): JsonResponse
    {
        $account = Account::findOrFail($id);

        if ($account->is_system || in_array($account->type, ['person', 'expense', 'income'])) {
            return response()->json(['error' => 'System-managed accounts cannot be deleted directly.'], 422);
        }

        // Check if account has entries
        if ($account->entries()->count() > 0) {
            $account->update(['is_active' => false, 'updated_by' => Auth::id()]);
            $account->delete(); // Soft delete

            AuditLog::create([
                'user_id'        => Auth::id(),
                'auditable_type' => Account::class,
                'auditable_id'   => $account->id,
                'action'         => 'deleted',
                'old_values'     => $account->toArray(),
                'ip_address'     => request()->ip(),
                'created_at'     => now(),
            ]);

            return response()->json(['message' => 'Account deactivated and soft-deleted (has existing entries)']);
        }

        $account->delete();

        return response()->json(['message' => 'Account deleted']);
    }

    /**
     * Get account statement with running balance.
     */
    public function statement(Request $request, int $id): JsonResponse
    {
        $startDate = $request->get('start_date');
        $endDate   = $request->get('end_date');

        $statement = $this->balanceService->getAccountStatement($id, $startDate, $endDate);

        return response()->json($statement);
    }
}
