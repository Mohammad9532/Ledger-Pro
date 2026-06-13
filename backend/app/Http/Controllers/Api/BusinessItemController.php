<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BusinessItem;
use App\Services\TransactionService;
use App\Services\BalanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class BusinessItemController extends Controller
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
        $query = BusinessItem::with(['buyer', 'purchaseTransaction', 'saleTransaction'])
            ->whereNull('deleted_at');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        $items = $query->orderBy('created_at', 'desc')->paginate(20);
        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description' => 'required|string|max:255',
            'purchase_cost' => 'required|numeric|min:0.01',
            'date' => 'required|date',
            'payment_account_id' => 'nullable|exists:accounts,id',
            'is_credit' => 'nullable|boolean',
            'supplier_contact_id' => 'nullable|exists:contacts,id',
            'immediate_payment_amount' => 'nullable|numeric|min:0',
            'reference_number' => 'nullable|string|max:100',
        ]);

        if (empty($validated['is_credit']) && empty($validated['payment_account_id'])) {
            return response()->json(['error' => 'Payment account is required for direct purchases.'], 422);
        }
        if (!empty($validated['is_credit']) && empty($validated['supplier_contact_id'])) {
            return response()->json(['error' => 'Supplier contact is required for credit purchases.'], 422);
        }

        try {
            return DB::transaction(function () use ($validated) {
                $entries = [];
                // 1. Debit Business Inventory for the full purchase cost
                $entries[] = [
                    'account_id' => $this->getOrCreateBusinessAccount()->id,
                    'debit' => $validated['purchase_cost'],
                    'credit' => 0
                ];

                $purchaseCost = (float) $validated['purchase_cost'];
                $immediatePayment = isset($validated['immediate_payment_amount']) ? (float) $validated['immediate_payment_amount'] : 0;

                if (!empty($validated['is_credit'])) {
                    // Credit Purchase
                    $supplierContact = \App\Models\Contact::with('account')->findOrFail($validated['supplier_contact_id']);
                    $unpaidBalance = bcsub((string)$purchaseCost, (string)$immediatePayment, 4);

                    if ($immediatePayment > 0) {
                        if (empty($validated['payment_account_id'])) {
                            throw new InvalidArgumentException('Payment account is required for partial immediate payment.');
                        }
                        // Credit the payment account for the immediate payment
                        $entries[] = [
                            'account_id' => $validated['payment_account_id'],
                            'debit' => 0,
                            'credit' => $immediatePayment
                        ];
                    }

                    if (bccomp($unpaidBalance, '0', 4) > 0) {
                        // Credit the supplier for the remaining balance
                        $entries[] = [
                            'account_id' => $supplierContact->account_id,
                            'debit' => 0,
                            'credit' => $unpaidBalance
                        ];
                    }
                } else {
                    // Direct Purchase
                    // Credit the payment account for the full cost
                    $entries[] = [
                        'account_id' => $validated['payment_account_id'],
                        'debit' => 0,
                        'credit' => $validated['purchase_cost']
                    ];
                }

                // Create purchase transaction
                $txn = $this->transactionService->createTransaction([
                    'type' => 'purchase',
                    'date' => $validated['date'],
                    'amount' => $validated['purchase_cost'],
                    'description' => 'Purchase: ' . $validated['description'],
                    'reference_number' => $validated['reference_number'] ?? null,
                ], $entries);

                $item = BusinessItem::create([
                    'description' => $validated['description'],
                    'purchase_cost' => $validated['purchase_cost'],
                    'status' => 'purchased',
                    'purchase_transaction_id' => $txn->id,
                    'created_by' => Auth::id(),
                    'updated_by' => Auth::id(),
                ]);

                $txn->update(['business_item_id' => $item->id]);

                return response()->json($item->load('purchaseTransaction'), 201);
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function recordSale(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'sale_amount' => 'required|numeric|min:0.01',
            'buyer_contact_id' => 'required|exists:contacts,id',
            'date' => 'required|date',
            'payment_account_id' => 'nullable|exists:accounts,id',
            'is_credit' => 'nullable|boolean',
            'reference_number' => 'nullable|string|max:100',
        ]);

        $item = BusinessItem::findOrFail($id);

        try {
            return DB::transaction(function () use ($validated, $item) {
                $buyerContact = \App\Models\Contact::with('account')->findOrFail($validated['buyer_contact_id']);
                $profit = bcsub((string)$validated['sale_amount'], (string)$item->purchase_cost, 4);

                $isCredit = $validated['is_credit'] ?? false;

                if ($isCredit) {
                    // Credit sale: Buyer account debited, Sales credited
                    $entries = [
                        ['account_id' => $buyerContact->account->id, 'debit' => $validated['sale_amount'], 'credit' => 0],
                        ['account_id' => $this->getOrCreateSalesAccount()->id, 'debit' => 0, 'credit' => $validated['sale_amount']],
                    ];
                } else {
                    // Cash/bank sale
                    $entries = [
                        ['account_id' => $validated['payment_account_id'], 'debit' => $validated['sale_amount'], 'credit' => 0],
                        ['account_id' => $this->getOrCreateSalesAccount()->id, 'debit' => 0, 'credit' => $validated['sale_amount']],
                    ];
                }

                // Append COGS entries to clear inventory
                $entries[] = ['account_id' => $this->getOrCreateCogsAccount()->id, 'debit' => $item->purchase_cost, 'credit' => 0];
                $entries[] = ['account_id' => $this->getOrCreateBusinessAccount()->id, 'debit' => 0, 'credit' => $item->purchase_cost];

                $txn = $this->transactionService->createTransaction([
                    'type' => 'sale',
                    'date' => $validated['date'],
                    'amount' => $validated['sale_amount'],
                    'description' => 'Sale: ' . $item->description,
                    'reference_number' => $validated['reference_number'] ?? null,
                    'business_item_id' => $item->id,
                ], $entries);

                $item->update([
                    'sale_amount' => $validated['sale_amount'],
                    'profit' => $profit,
                    'status' => 'sold',
                    'buyer_contact_id' => $validated['buyer_contact_id'],
                    'sale_transaction_id' => $txn->id,
                    'updated_by' => Auth::id(),
                ]);

                return response()->json($item->fresh()->load(['buyer', 'saleTransaction']));
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    public function show(int $id): JsonResponse
    {
        $item = BusinessItem::with(['buyer', 'purchaseTransaction.entries.account', 'saleTransaction.entries.account'])
            ->findOrFail($id);
        return response()->json($item);
    }

    public function profitReport(): JsonResponse
    {
        $items = BusinessItem::with('buyer')
            ->where('status', 'sold')
            ->whereNull('deleted_at')
            ->orderBy('created_at', 'desc')
            ->get();

        $totalProfit = $items->sum('profit');
        $totalPurchase = $items->sum('purchase_cost');
        $totalSales = $items->sum('sale_amount');

        return response()->json([
            'items' => $items,
            'total_purchase' => (string)$totalPurchase,
            'total_sales' => (string)$totalSales,
            'total_profit' => (string)$totalProfit,
        ]);
    }

    private function getOrCreateBusinessAccount(): \App\Models\Account
    {
        return \App\Models\Account::firstOrCreate(
            ['name' => 'Business Inventory'],
            ['type' => 'asset', 'opening_balance' => 0, 'is_active' => true, 'created_by' => Auth::id(), 'updated_by' => Auth::id()]
        );
    }

    private function getOrCreateSalesAccount(): \App\Models\Account
    {
        return \App\Models\Account::firstOrCreate(
            ['name' => 'Sales Revenue', 'type' => 'income'],
            ['opening_balance' => 0, 'is_active' => true, 'created_by' => Auth::id(), 'updated_by' => Auth::id()]
        );
    }

    private function getOrCreateCogsAccount(): \App\Models\Account
    {
        return \App\Models\Account::firstOrCreate(
            ['name' => 'Cost of Goods Sold', 'type' => 'expense'],
            ['opening_balance' => 0, 'is_active' => true, 'created_by' => Auth::id(), 'updated_by' => Auth::id()]
        );
    }
}
