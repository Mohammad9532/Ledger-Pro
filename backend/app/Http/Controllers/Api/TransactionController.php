<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\TransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class TransactionController extends Controller
{
    protected TransactionService $transactionService;

    public function __construct(TransactionService $transactionService)
    {
        $this->transactionService = $transactionService;
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
            'type' => 'required|in:give_money,receive_money,expense,income,transfer,purchase,sale,credit_card_payment',
            'date' => 'required|date',
            'amount' => 'required|numeric|min:0.01',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string|max:100',
            'expense_category_id' => 'nullable|exists:expense_categories,id',
            'business_item_id' => 'nullable|exists:business_items,id',
            'entries' => 'required|array|min:2',
            'entries.*.account_id' => 'required|exists:accounts,id',
            'entries.*.debit' => 'nullable|numeric|min:0',
            'entries.*.credit' => 'nullable|numeric|min:0',
        ]);

        try {
            $transaction = $this->transactionService->createTransaction(
                $validated,
                $validated['entries']
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
            'type' => 'sometimes|in:give_money,receive_money,expense,income,transfer,purchase,sale,credit_card_payment',
            'date' => 'sometimes|date',
            'amount' => 'sometimes|numeric|min:0.01',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string|max:100',
            'expense_category_id' => 'nullable|exists:expense_categories,id',
            'business_item_id' => 'nullable|exists:business_items,id',
            'entries' => 'required|array|min:2',
            'entries.*.account_id' => 'required|exists:accounts,id',
            'entries.*.debit' => 'nullable|numeric|min:0',
            'entries.*.credit' => 'nullable|numeric|min:0',
        ]);

        try {
            $transaction = $this->transactionService->updateTransaction(
                $id,
                $validated,
                $validated['entries']
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
}
