<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\TransactionService;
use App\Services\BalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class TransactionController extends Controller
{
    protected TransactionService $transactionService;
    protected BalanceService $balanceService;

    public function __construct(TransactionService $transactionService, BalanceService $balanceService)
    {
        $this->transactionService = $transactionService;
        $this->balanceService = $balanceService;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Transaction::with(['entries.account', 'expenseCategory', 'businessItem', 'creator'])
            ->whereNull('deleted_at');

        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        // Filter by date range
        if ($request->has('start_date')) {
            $query->where('date', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('date', '<=', $request->end_date);
        }

        // Filter by account (involved in entries)
        if ($request->has('account_id')) {
            $query->whereHas('entries', function ($q) use ($request) {
                $q->where('account_id', $request->account_id);
            });
        }

        // Search
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%")
                  ->orWhere('id', $search)
                  ->orWhere('amount', $search);
            });
        }

        $transactions = $query->orderBy('date', 'desc')
            ->orderBy('id', 'desc')
            ->paginate($request->get('per_page', 20));

        return response()->json($transactions);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'required|in:give_money,receive_money,expense,income,transfer,purchase,sale,credit_card_payment,settlement,journal',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string|max:100',
            'expense_category_id' => 'nullable|exists:tenant.expense_categories,id',
            'business_item_id' => 'nullable|exists:tenant.business_items,id',
            'entries' => 'sometimes|array|min:2',
            'entries.*.account_id' => 'required_with:entries|exists:tenant.accounts,id',
            'entries.*.debit' => 'nullable|numeric|min:0',
            'entries.*.credit' => 'nullable|numeric|min:0',
            'bank_account_id' => 'nullable|exists:tenant.accounts,id',
            'person_account_id' => 'nullable|exists:tenant.accounts,id',
            'overpayment_handling' => 'nullable|in:customer_credit,income',
            'income_account_id' => 'nullable|exists:tenant.accounts,id',
        ]);

        try {
            $entries = $request->input('entries');
            if (empty($entries) && $validated['type'] === 'receive_money') {
                $entries = $this->resolveReceiveMoneyEntries($validated);
            } elseif (empty($entries)) {
                throw new InvalidArgumentException('Entries array is required.');
            }

            $transaction = $this->transactionService->createTransaction(
                $validated,
                $entries
            );

            return response()->json($transaction, 201);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function show(int $id): JsonResponse
    {
        $transaction = Transaction::with(['entries.account', 'expenseCategory', 'businessItem', 'creator'])
            ->findOrFail($id);

        return response()->json($transaction);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'type' => 'sometimes|in:give_money,receive_money,expense,income,transfer,purchase,sale,credit_card_payment,settlement,journal',
            'date' => 'sometimes|date',
            'amount' => 'sometimes|numeric|min:0.01',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string|max:100',
            'expense_category_id' => 'nullable|exists:tenant.expense_categories,id',
            'business_item_id' => 'nullable|exists:tenant.business_items,id',
            'entries' => 'sometimes|array|min:2',
            'entries.*.account_id' => 'required_with:entries|exists:tenant.accounts,id',
            'entries.*.debit' => 'nullable|numeric|min:0',
            'entries.*.credit' => 'nullable|numeric|min:0',
            'bank_account_id' => 'nullable|exists:tenant.accounts,id',
            'person_account_id' => 'nullable|exists:tenant.accounts,id',
            'overpayment_handling' => 'nullable|in:customer_credit,income',
            'income_account_id' => 'nullable|exists:tenant.accounts,id',
        ]);

        try {
            $entries = $request->input('entries');
            $type = $validated['type'] ?? Transaction::findOrFail($id)->type;
            
            if (empty($entries) && $type === 'receive_money') {
                $entries = $this->resolveReceiveMoneyEntries($validated, $id);
            } elseif (empty($entries)) {
                throw new InvalidArgumentException('Entries array is required.');
            }

            $transaction = $this->transactionService->updateTransaction(
                $id,
                $validated,
                $entries
            );

            return response()->json($transaction);
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        try {
            $this->transactionService->deleteTransaction($id);
            return response()->json(['message' => 'Transaction deleted (soft)']);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Restore a soft-deleted transaction.
     */
    public function restore(int $id): JsonResponse
    {
        try {
            $transaction = $this->transactionService->restoreTransaction($id);
            return response()->json($transaction);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function resolveReceiveMoneyEntries(array $data, ?int $excludeTransactionId = null): array
    {
        $amount = (float) $data['amount'];
        $bankAccountId = $data['bank_account_id'] ?? null;
        $personAccountId = $data['person_account_id'] ?? null;
        
        if (!$bankAccountId || !$personAccountId) {
            throw new InvalidArgumentException('bank_account_id and person_account_id are required for semantic receive_money');
        }

        // Get effective outstanding balance (excluding this txn if updating)
        $balanceStr = $this->balanceService->getAccountBalance($personAccountId, null, $excludeTransactionId);
        $outstanding = (float) $balanceStr;

        $handling = $data['overpayment_handling'] ?? null;
        
        // Exact payment, partial payment, negative balance (customer already in credit), or explicit customer_credit
        if ($amount <= $outstanding || $outstanding <= 0 || $handling === 'customer_credit') {
            return [
                ['account_id' => $bankAccountId, 'debit' => $amount, 'credit' => 0],
                ['account_id' => $personAccountId, 'debit' => 0, 'credit' => $amount],
            ];
        }

        // Overpayment -> Income
        if ($handling === 'income') {
            $incomeAccountId = $data['income_account_id'] ?? null;
            if (!$incomeAccountId) {
                throw new InvalidArgumentException('income_account_id is required when adjusting overpayment as income');
            }

            $excess = $amount - $outstanding;

            return [
                ['account_id' => $bankAccountId, 'debit' => $amount, 'credit' => 0],
                ['account_id' => $personAccountId, 'debit' => 0, 'credit' => $outstanding],
                ['account_id' => $incomeAccountId, 'debit' => 0, 'credit' => $excess],
            ];
        }

        throw new InvalidArgumentException('Overpayment detected. Please specify overpayment_handling (customer_credit or income).');
    }
}
