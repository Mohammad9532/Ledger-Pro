<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Contact;
use App\Models\Account;
use App\Models\AuditLog;
use App\Models\BusinessItem;
use App\Models\TransactionEntry;
use App\Services\BalanceService;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ContactController extends Controller
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
        $status = $request->query('status', 'active');
        $isArchived = $status === 'archived';

        $contacts = Contact::with('account')
            ->whereNull('deleted_at')
            ->where('is_archived', $isArchived)
            ->orderBy('name')
            ->get();

        // Fetch opening balance entries
        $obEntries = DB::connection('tenant')->table('transaction_entries')
            ->join('transactions', 'transactions.id', '=', 'transaction_entries.transaction_id')
            ->where('transactions.type', 'opening_balance')
            ->whereNull('transactions.deleted_at')
            ->whereIn('transaction_entries.account_id', $contacts->pluck('account_id')->filter())
            ->select('transaction_entries.account_id', 'transaction_entries.debit', 'transaction_entries.credit')
            ->get()
            ->keyBy('account_id');

        // Append computed balance
        $contacts->each(function ($contact) use ($obEntries) {
            if ($contact->account) {
                $contact->computed_balance = $this->balanceService->getAccountBalance($contact->account->id);
                
                $ob = $obEntries->get($contact->account->id);
                if ($ob) {
                    $net = $ob->debit - $ob->credit;
                    $contact->opening_balance = abs($net);
                    $contact->opening_balance_type = $net < 0 ? 'payable' : 'receivable';
                } else {
                    $contact->opening_balance = 0;
                    $contact->opening_balance_type = 'receivable';
                }
            } else {
                $contact->computed_balance = '0.0000';
                $contact->opening_balance = 0;
                $contact->opening_balance_type = 'receivable';
            }
        });

        return response()->json($contacts);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'opening_balance' => 'nullable|numeric|min:0',
            'opening_balance_type' => 'nullable|in:receivable,payable',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $userId = Auth::id();

            // Auto-create a ledger account for this person
            $account = Account::create([
                'name' => $validated['name'],
                'type' => 'person',
                'opening_balance' => 0,
                'is_active' => true,
                'is_system' => true,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            $contact = Contact::create([
                'name' => $validated['name'],
                'phone' => $validated['phone'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'account_id' => $account->id,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            // Link account back to contact
            $account->update(['contact_id' => $contact->id]);

            AuditLog::create([
                'user_id' => $userId,
                'auditable_type' => Contact::class,
                'auditable_id' => $contact->id,
                'action' => 'created',
                'new_values' => $contact->toArray(),
                'ip_address' => $request->ip(),
                'created_at' => now(),
            ]);

            if (!empty($validated['opening_balance']) && $validated['opening_balance'] > 0) {
                $obAmount = ($validated['opening_balance_type'] ?? 'receivable') === 'payable' 
                    ? -abs($validated['opening_balance']) 
                    : abs($validated['opening_balance']);
                
                $this->transactionService->createOpeningBalanceTransaction(
                    $account->id,
                    'person',
                    $obAmount,
                    now()->toDateString()
                );
            }

            $contact->load('account');
            $contact->computed_balance = '0.0000';
            $contact->opening_balance = $validated['opening_balance'] ?? 0;
            $contact->opening_balance_type = $validated['opening_balance_type'] ?? 'receivable';

            return response()->json($contact, 201);
        });
    }

    public function show(int $id): JsonResponse
    {
        $contact = Contact::with('account')->findOrFail($id);

        if ($contact->account) {
            $contact->computed_balance = $this->balanceService->getAccountBalance($contact->account->id);

            $ob = DB::connection('tenant')->table('transaction_entries')
                ->join('transactions', 'transactions.id', '=', 'transaction_entries.transaction_id')
                ->where('transactions.type', 'opening_balance')
                ->whereNull('transactions.deleted_at')
                ->where('transaction_entries.account_id', $contact->account->id)
                ->select('transaction_entries.debit', 'transaction_entries.credit')
                ->first();

            if ($ob) {
                $net = $ob->debit - $ob->credit;
                $contact->opening_balance = abs($net);
                $contact->opening_balance_type = $net < 0 ? 'payable' : 'receivable';
            } else {
                $contact->opening_balance = 0;
                $contact->opening_balance_type = 'receivable';
            }
        }

        return response()->json($contact);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);
        $oldValues = $contact->toArray();

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'phone' => 'nullable|string|max:20',
            'notes' => 'nullable|string',
            'opening_balance' => 'nullable|numeric|min:0',
            'opening_balance_type' => 'nullable|in:receivable,payable',
        ]);

        $validated['updated_by'] = Auth::id();
        $contact->update($validated);

        // Also update linked account name
        if (isset($validated['name']) && $contact->account) {
            $contact->account->update(['name' => $validated['name'], 'updated_by' => Auth::id()]);
        }

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => Contact::class,
            'auditable_id' => $contact->id,
            'action' => 'updated',
            'old_values' => $oldValues,
            'new_values' => $contact->fresh()->toArray(),
            'ip_address' => $request->ip(),
            'created_at' => now(),
        ]);

        if (array_key_exists('opening_balance', $validated) && $contact->account) {
            $existingOb = \App\Models\Transaction::where('type', 'opening_balance')
                ->whereHas('entries', function ($q) use ($contact) {
                    $q->where('account_id', $contact->account_id);
                })->first();

            $obAmount = 0;
            if ($validated['opening_balance'] > 0) {
                $obType = $validated['opening_balance_type'] ?? 'receivable';
                $obAmount = $obType === 'payable' ? -abs($validated['opening_balance']) : abs($validated['opening_balance']);
            }

            $this->transactionService->createOpeningBalanceTransaction(
                $contact->account_id,
                'person',
                $obAmount,
                $existingOb ? $existingOb->date : now()->toDateString(),
                $existingOb ? $existingOb->id : null
            );
        }

        return response()->json($contact->load('account'));
    }

    public function destroy(int $id): JsonResponse
    {
        $contact = Contact::findOrFail($id);

        if ($contact->account) {
            $hasFinancialHistory = TransactionEntry::where('account_id', $contact->account->id)
                ->whereHas('transaction', function ($q) {
                    $q->where('type', '!=', 'opening_balance')
                      ->whereNull('deleted_at');
                })->exists();

            if ($hasFinancialHistory) {
                return response()->json([
                    'error' => 'Contacts with financial history cannot be deleted. Archive the contact instead.'
                ], 422);
            }
        }

        $contact->update(['updated_by' => Auth::id()]);
        $contact->delete(); // Soft delete

        // Also deactivate linked account
        if ($contact->account) {
            $contact->account->update(['is_active' => false]);
            $contact->account->delete();
        }

        return response()->json(['message' => 'Contact deleted']);
    }

    public function archive(int $id): JsonResponse
    {
        $contact = Contact::with('account')->findOrFail($id);
        
        if (!$contact->account || $contact->account->type !== 'person') {
            return response()->json(['error' => 'Invalid contact account'], 422);
        }

        $balance = $this->balanceService->getAccountBalance($contact->account->id);
        if ((float) $balance !== 0.0) {
            return response()->json([
                'error' => 'Cannot archive this contact because the account has an outstanding balance.'
            ], 422);
        }

        $contact->update(['is_archived' => true, 'updated_by' => Auth::id()]);
        $contact->account->update(['is_active' => false, 'updated_by' => Auth::id()]);

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => Contact::class,
            'auditable_id' => $contact->id,
            'action' => 'archived',
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Contact archived successfully', 'contact' => $contact]);
    }

    public function restore(int $id): JsonResponse
    {
        $contact = Contact::with('account')->findOrFail($id);

        $contact->update(['is_archived' => false, 'updated_by' => Auth::id()]);
        if ($contact->account) {
            $contact->account->update(['is_active' => true, 'updated_by' => Auth::id()]);
        }

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => Contact::class,
            'auditable_id' => $contact->id,
            'action' => 'restored',
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);

        return response()->json(['message' => 'Contact restored successfully', 'contact' => $contact]);
    }

    public function balanceAdjustment(Request $request, int $id): JsonResponse
    {
        $contact = Contact::with('account')->findOrFail($id);
        if (!$contact->account) {
            return response()->json(['error' => 'Contact has no ledger account'], 422);
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'adjustment_type' => 'required|string',
            'account_id' => 'required|integer',
            'notes' => 'nullable|string',
        ]);

        $offsetAccount = Account::findOrFail($validated['account_id']);
        
        $currentBalanceStr = $this->balanceService->getAccountBalance($contact->account->id);
        $currentBalance = (float) $currentBalanceStr;
        $adjustmentAmount = (float) $validated['amount'];

        if ($currentBalance == 0) {
            return response()->json(['error' => 'Contact balance is already zero'], 422);
        }

        if ($adjustmentAmount > abs($currentBalance)) {
            return response()->json(['error' => 'Adjustment amount cannot exceed current balance'], 422);
        }

        $entries = [];
        
        if ($currentBalance > 0) {
            // Customer owes us (Receivable). We are writing it off.
            // Debit Expense, Credit Person
            if ($offsetAccount->type !== 'expense') {
                return response()->json(['error' => 'Offset account must be an expense account for receivable write-offs'], 422);
            }
            $entries[] = ['account_id' => $offsetAccount->id, 'debit' => $adjustmentAmount, 'credit' => 0];
            $entries[] = ['account_id' => $contact->account->id, 'debit' => 0, 'credit' => $adjustmentAmount];
        } else {
            // We owe customer (Customer Credit/Payable). We are releasing it.
            // Debit Person, Credit Income
            if ($offsetAccount->type !== 'income') {
                return response()->json(['error' => 'Offset account must be an income account for liability releases'], 422);
            }
            $entries[] = ['account_id' => $contact->account->id, 'debit' => $adjustmentAmount, 'credit' => 0];
            $entries[] = ['account_id' => $offsetAccount->id, 'debit' => 0, 'credit' => $adjustmentAmount];
        }

        return DB::transaction(function () use ($request, $contact, $validated, $entries, $adjustmentAmount) {
            $transaction = $this->transactionService->createTransaction([
                'type' => 'journal',
                'amount' => $adjustmentAmount,
                'date' => now()->toDateString(),
                'description' => $validated['notes'] ?? 'Balance Adjustment',
                'contact_id' => $contact->id
            ], $entries);

            return response()->json([
                'message' => 'Balance adjusted successfully',
                'transaction' => $transaction
            ]);
        });
    }

    /**
     * Get person's ledger with running balance.
     */
    public function ledger(Request $request, int $id): JsonResponse
    {
        $contact = Contact::with('account')->findOrFail($id);

        if (!$contact->account) {
            return response()->json(['error' => 'No ledger account found for this contact'], 404);
        }

        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');
        $perPage = $request->get('per_page');

        $statement = $this->balanceService->getAccountStatement(
            $contact->account->id,
            $startDate,
            $endDate,
            $perPage ? (int) $perPage : null
        );

        return response()->json([
            'contact' => $contact,
            'statement' => $statement,
        ]);
    }

    /**
     * Customer Summary — all metrics computed from ledger entries + business_items.
     * Nothing is read from a stored balance column.
     */
    public function summary(int $id): JsonResponse
    {
        $contact = Contact::with('account')->findOrFail($id);

        // --- Business Items sold TO this person ---
        $businessItems = BusinessItem::where('buyer_contact_id', $contact->id)
            ->whereNull('deleted_at')
            ->get();

        $totalPurchases = $businessItems->count();
        $totalSales = $businessItems->sum('sale_amount');
        $profitGenerated = $businessItems->sum('profit');

        // --- Amount Received: computed from ledger ---
        // Credits on this person's account = money received FROM them
        $amountReceived = '0.0000';
        if ($contact->account) {
            $amountReceived = TransactionEntry::where('transaction_entries.account_id', $contact->account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->sum('transaction_entries.credit');
        }

        // --- Outstanding: computed from ledger (SUM debit - SUM credit) ---
        $outstanding = '0.0000';
        if ($contact->account) {
            $outstanding = $this->balanceService->getAccountBalance($contact->account->id);
        }

        // --- Total Given: total debits on this person's account (money given/sold to them) ---
        $totalGiven = '0.0000';
        if ($contact->account) {
            $totalGiven = TransactionEntry::where('transaction_entries.account_id', $contact->account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->sum('transaction_entries.debit');
        }

        // --- Recent transactions involving this person ---
        $recentTransactions = [];
        if ($contact->account) {
            $recentTransactions = TransactionEntry::where('transaction_entries.account_id', $contact->account->id)
                ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
                ->whereNull('transactions.deleted_at')
                ->select(
                    'transactions.id',
                    'transactions.type',
                    'transactions.date',
                    'transactions.description',
                    'transactions.amount',
                    'transaction_entries.debit',
                    'transaction_entries.credit'
                )
                ->orderBy('transactions.date', 'desc')
                ->orderBy('transactions.id', 'desc')
                ->limit(10)
                ->get();
        }

        // --- Sold items list ---
        $soldItems = BusinessItem::where('buyer_contact_id', $contact->id)
            ->where('status', 'sold')
            ->whereNull('deleted_at')
            ->orderBy('updated_at', 'desc')
            ->get(['id', 'description', 'purchase_cost', 'sale_amount', 'profit', 'status', 'created_at']);

        return response()->json([
            'contact' => $contact,
            'total_purchases' => $totalPurchases,
            'total_sales' => (string) $totalSales,
            'amount_received' => (string) $amountReceived,
            'total_given' => (string) $totalGiven,
            'outstanding' => $outstanding,
            'profit_generated' => (string) $profitGenerated,
            'recent_transactions' => $recentTransactions,
            'sold_items' => $soldItems,
        ]);
    }
}
