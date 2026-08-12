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
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Str;

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
        $query = BusinessItem::with(['buyer', 'purchaseTransaction', 'saleTransaction']);

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
            'payment_account_id' => 'nullable|exists:tenant.accounts,id',
            'is_credit' => 'nullable|boolean',
            'supplier_contact_id' => 'nullable|exists:tenant.contacts,id',
            'immediate_payment_amount' => 'nullable|numeric|min:0',
            'reference_number' => 'nullable|string|max:100',
            'cashback_amount' => 'nullable|numeric|min:0',
            'cashback_account_id' => 'nullable|exists:tenant.accounts,id',
        ]);

        if (empty($validated['is_credit']) && empty($validated['payment_account_id'])) {
            return response()->json(['error' => 'Payment account is required for direct purchases.'], 422);
        }
        if (!empty($validated['is_credit']) && empty($validated['supplier_contact_id'])) {
            return response()->json(['error' => 'Supplier contact is required for credit purchases.'], 422);
        }

        try {
            return DB::connection('tenant')->transaction(function () use ($validated) {
                $purchaseCost = (float) $validated['purchase_cost'];
                $cashbackAmt = !empty($validated['cashback_amount']) ? (float) $validated['cashback_amount'] : 0;
                $effectiveCost = bcsub((string)$purchaseCost, (string)$cashbackAmt, 4);

                $entries = [];
                // 1. Debit Business Inventory for the effective purchase cost
                $entries[] = [
                    'account_id' => $this->getOrCreateBusinessAccount()->id,
                    'debit' => $effectiveCost,
                    'credit' => 0
                ];

                $immediatePayment = isset($validated['immediate_payment_amount']) ? (float) $validated['immediate_payment_amount'] : 0;

                if (!empty($validated['is_credit'])) {
                    // Credit Purchase
                    $supplierContact = \App\Models\Contact::with('account')->findOrFail($validated['supplier_contact_id']);

                    // Always credit the supplier for the full purchase cost to establish the liability
                    $entries[] = [
                        'account_id' => $supplierContact->account_id,
                        'debit' => 0,
                        'credit' => $purchaseCost
                    ];

                    if ($immediatePayment > 0) {
                        if (empty($validated['payment_account_id'])) {
                            throw new InvalidArgumentException('Payment account is required for partial immediate payment.');
                        }
                        // Debit the supplier for the immediate payment
                        $entries[] = [
                            'account_id' => $supplierContact->account_id,
                            'debit' => $immediatePayment,
                            'credit' => 0
                        ];
                        // Credit the payment account for the immediate payment
                        $entries[] = [
                            'account_id' => $validated['payment_account_id'],
                            'debit' => 0,
                            'credit' => $immediatePayment
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

                if ($cashbackAmt > 0) {
                    if (empty($validated['cashback_account_id'])) {
                        throw new InvalidArgumentException('Cashback wallet is required for cashback.');
                    }
                    $entries[] = [
                        'account_id' => $validated['cashback_account_id'],
                        'debit' => $cashbackAmt,
                        'credit' => 0
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
                    'purchase_cost' => $effectiveCost,
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
            'buyer_contact_id' => 'required|exists:tenant.contacts,id',
            'date' => 'required|date',
            'payment_account_id' => 'nullable|exists:tenant.accounts,id',
            'is_credit' => 'nullable|boolean',
            'reference_number' => 'nullable|string|max:100',
        ]);

        if (empty($validated['is_credit']) && empty($validated['payment_account_id'])) {
            return response()->json(['error' => 'Payment account is required for direct sales.'], 422);
        }

        $item = BusinessItem::findOrFail($id);

        try {
            return DB::connection('tenant')->transaction(function () use ($validated, $item) {
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

    public function recordCancellation(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'date'                     => 'required|date',
            'supplier_refund_amount'   => 'required|numeric|min:0',
            'customer_refund_amount'   => 'required|numeric|min:0',
            'refund_account_id'        => 'nullable|exists:tenant.accounts,id',
            'notes'                    => 'nullable|string|max:500',
        ]);

        $item = BusinessItem::findOrFail($id);

        if ($item->status !== 'sold') {
            return response()->json(['error' => 'Only sold items can be cancelled.'], 422);
        }

        try {
            return DB::connection('tenant')->transaction(function () use ($validated, $item) {
                $saleAmount        = (float) $item->sale_amount;
                $purchaseCost      = (float) $item->purchase_cost;
                $supplierRefund    = (float) $validated['supplier_refund_amount'];
                $customerRefund    = (float) $validated['customer_refund_amount'];
                $supplierFee       = round($purchaseCost - $supplierRefund, 4); // what airline kept
                $yourCharge        = round($saleAmount - $customerRefund, 4);   // what you kept

                if ($customerRefund > $saleAmount) {
                    throw new InvalidArgumentException('Customer refund cannot exceed the original sale amount.');
                }
                if ($supplierRefund > $purchaseCost) {
                    throw new InvalidArgumentException('Supplier refund cannot exceed the original purchase cost.');
                }

                // Determine if the original sale was a credit sale (buyer hadn't paid cash)
                $isCreditSale = is_null($item->saleTransaction?->entries
                    ->where('account_id', '!=', $this->getOrCreateSalesAccount()->id)
                    ->where('debit', '>', 0)
                    ->where('account_id', function ($q) { })
                    ->first());

                // Reload sale transaction with entries to detect credit vs cash
                $saleTxn = $item->saleTransaction()->with('entries.account')->first();
                $buyerAccount = $item->buyer_contact_id
                    ? \App\Models\Contact::with('account')->find($item->buyer_contact_id)?->account
                    : null;

                $salesAccountId  = $this->getOrCreateSalesAccount()->id;
                $cogsAccountId   = $this->getOrCreateCogsAccount()->id;
                $inventoryId     = $this->getOrCreateBusinessAccount()->id;
                $cancChargeId    = $this->getOrCreateCancellationChargeAccount()->id;
                $supplierFeeId   = $this->getOrCreateSupplierFeeAccount()->id;

                // Detect whether original sale was credit (buyer account was debited)
                $wasCredit = false;
                if ($saleTxn && $buyerAccount) {
                    $wasCredit = $saleTxn->entries
                        ->where('account_id', $buyerAccount->id)
                        ->where('debit', '>', 0)
                        ->isNotEmpty();
                }

                /*
                 * Build double-entry cancellation journal:
                 *
                 * Dr  Sales Revenue          sale_amount        (reverse the sale)
                 * Dr  Supplier Cancellation Fee  supplier_fee   (airline penalty, your expense)
                 * Cr  Business Inventory     purchase_cost      (clear inventory cost)
                 * Cr  Cash/Bank OR Buyer A/c customer_refund   (refund paid out or balance reduced)
                 * Cr  Cancellation Charges   your_charge        (your income, only if > 0)
                 * Dr  Cash/Bank              supplier_refund    (money received from airline)
                 *
                 * Debit total  = sale_amount + supplier_fee + supplier_refund
                 * Credit total = purchase_cost + customer_refund + your_charge
                 *
                 * Since: purchase_cost = supplier_refund + supplier_fee
                 *   and: sale_amount   = customer_refund  + your_charge
                 * => Both sides balance automatically ✅
                 */
                $entries = [];

                // 1. Reverse the sale: Debit Sales Revenue
                $entries[] = ['account_id' => $salesAccountId, 'debit' => $saleAmount, 'credit' => 0];

                // 2. Airline refund received into a bank/cash account
                if ($supplierRefund > 0) {
                    if (empty($validated['refund_account_id'])) {
                        throw new InvalidArgumentException('A refund account is required when supplier refund amount is greater than 0.');
                    }
                    $entries[] = ['account_id' => $validated['refund_account_id'], 'debit' => $supplierRefund, 'credit' => 0];
                }

                // 3. Supplier fee (airline's penalty) — your expense
                if ($supplierFee > 0) {
                    $entries[] = ['account_id' => $supplierFeeId, 'debit' => $supplierFee, 'credit' => 0];
                }

                // 4. Clear business inventory cost
                $entries[] = ['account_id' => $inventoryId, 'debit' => 0, 'credit' => $purchaseCost];

                // 5. Customer refund: credit cash/bank OR reduce buyer's receivable
                if ($customerRefund > 0) {
                    if ($wasCredit && $buyerAccount) {
                        // Credit sale: reduce buyer's receivable (credit their account)
                        $entries[] = ['account_id' => $buyerAccount->id, 'debit' => 0, 'credit' => $customerRefund];
                    } else {
                        // Cash/bank sale: pay money back from refund account
                        if (empty($validated['refund_account_id'])) {
                            throw new InvalidArgumentException('A refund account is required to pay the customer refund.');
                        }
                        $entries[] = ['account_id' => $validated['refund_account_id'], 'debit' => 0, 'credit' => $customerRefund];
                    }
                }

                // 6. Your cancellation charge as income (only if you kept something)
                if ($yourCharge > 0) {
                    $entries[] = ['account_id' => $cancChargeId, 'debit' => 0, 'credit' => $yourCharge];
                }

                // Create the cancellation transaction
                $txn = $this->transactionService->createTransaction([
                    'type'        => 'cancellation',
                    'date'        => $validated['date'],
                    'amount'      => $saleAmount,
                    'description' => 'Cancellation: ' . $item->description,
                    'business_item_id' => $item->id,
                ], $entries);

                // Update the business item
                $item->update([
                    'status'                    => 'cancelled',
                    'supplier_refund_amount'    => $supplierRefund,
                    'supplier_cancellation_fee' => $supplierFee,
                    'customer_refund_amount'    => $customerRefund,
                    'your_cancellation_charge'  => $yourCharge,
                    'cancellation_date'         => $validated['date'],
                    'cancellation_notes'        => $validated['notes'] ?? null,
                    'cancellation_transaction_id' => $txn->id,
                    'updated_by'                => Auth::id(),
                ]);

                return response()->json([
                    'item'        => $item->fresh()->load(['buyer', 'cancellationTransaction']),
                    'transaction' => $txn,
                    'summary' => [
                        'supplier_refund'    => $supplierRefund,
                        'supplier_fee'       => $supplierFee,
                        'customer_refund'    => $customerRefund,
                        'your_charge'        => $yourCharge,
                        'net_profit'         => round($yourCharge - $supplierFee, 4),
                    ],
                ]);
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
        $items = BusinessItem::all();

        $totalPurchase = 0;
        $totalSales = 0;
        $totalProfit = 0;

        foreach ($items as $item) {
            if ($item->status === 'cancelled') {
                // Cancelled items: 
                // Treat the airline's cancellation fee as the "Purchase Cost"
                // Treat the cancellation charge to the customer as the "Sale Amount"
                $supplierFee = $item->supplier_cancellation_fee ?? 0;
                $yourCharge = $item->your_cancellation_charge ?? 0;
                
                $totalPurchase += $supplierFee;
                $totalSales += $yourCharge;
                $totalProfit += ($yourCharge - $supplierFee);
            } else {
                // Active items: sum regular volume
                $totalPurchase += $item->purchase_cost;
                $totalSales += $item->sale_amount;
                
                // Add regular profit if sold
                if (in_array($item->status, ['sold', 'partial'])) {
                    $totalProfit += $item->profit;
                }
            }
        }

        return response()->json([
            'total_purchase' => (string)$totalPurchase,
            'total_sales' => (string)$totalSales,
            'total_profit' => (string)$totalProfit,
        ]);
    }

    public function generateDocument(Request $request, int $id)
    {
        $validated = $request->validate([
            'document_type' => 'required|string|in:flight',
            'data' => 'required|array',
        ]);

        $item = BusinessItem::findOrFail($id);
        
        // Save metadata
        $metadata = $item->metadata ?? [];
        $metadata['document_type'] = $validated['document_type'];
        $metadata = array_merge($metadata, $validated['data']);
        
        $item->update(['metadata' => $metadata]);

        // Generate PDF
        $company = auth()->user()->company;
        $profile = \App\Models\Tenant\CompanyProfile::first();
        
        $logoPath = null;
        if ($profile && $profile->logo_path) {
            $logoPath = storage_path('app/public/' . $profile->logo_path);
        }

        if ($validated['document_type'] === 'flight') {
            $pdf = Pdf::loadView('tickets.flight', [
                'company' => $company,
                'profile' => $profile,
                'item' => $item,
                'data' => $metadata,
                'companyName' => $profile->company_name ?? ($company->company_name ?? 'Company'),
                'title' => 'E-Ticket Confirmation',
                'period' => 'Booking Ref: ' . ($metadata['flight']['pnr'] ?? 'N/A'),
                'generatedAt' => now()->format('Y-m-d H:i:s'),
                'currency' => $profile->currency_code ?? 'INR',
                'logoPath' => $logoPath,
            ]);
            
            $passengerName = $metadata['passenger']['first_name'] ?? 'Ticket';
            $filename = 'Flight_Itinerary_' . Str::slug($passengerName) . '.pdf';
            
            return $pdf->download($filename);
        }

        return response()->json(['error' => 'Unsupported document type'], 400);
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

    /**
     * Income account for cancellation charges you earn from customers.
     * Tracked separately from Sales Revenue for clear P&L visibility.
     */
    private function getOrCreateCancellationChargeAccount(): \App\Models\Account
    {
        return \App\Models\Account::firstOrCreate(
            ['name' => 'Cancellation Charges Income', 'type' => 'income'],
            ['opening_balance' => 0, 'is_active' => true, 'created_by' => Auth::id(), 'updated_by' => Auth::id()]
        );
    }

    /**
     * Expense account for cancellation fees charged by the supplier/airline.
     * Tracked separately for clear cost analysis.
     */
    private function getOrCreateSupplierFeeAccount(): \App\Models\Account
    {
        return \App\Models\Account::firstOrCreate(
            ['name' => 'Supplier Cancellation Fee', 'type' => 'expense'],
            ['opening_balance' => 0, 'is_active' => true, 'created_by' => Auth::id(), 'updated_by' => Auth::id()]
        );
    }
}
