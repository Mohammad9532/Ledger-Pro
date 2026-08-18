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

        if (!in_array($item->status, ['sold', 'purchased'])) {
            return response()->json(['error' => 'Only sold or purchased items can be cancelled.'], 422);
        }

        try {
            return DB::connection('tenant')->transaction(function () use ($validated, $item) {
                $isSold = $item->status === 'sold';

                $saleAmount        = $isSold ? (float) $item->sale_amount : 0;
                $purchaseCost      = (float) $item->purchase_cost;
                $supplierRefund    = (float) $validated['supplier_refund_amount'];
                
                // If purchased, customer refund must logically be 0
                $customerRefund    = $isSold ? (float) $validated['customer_refund_amount'] : 0;
                
                $supplierFee       = round($purchaseCost - $supplierRefund, 4); // what airline kept
                $yourCharge        = $isSold ? round($saleAmount - $customerRefund, 4) : 0;   // what you kept

                if ($isSold && $customerRefund > $saleAmount) {
                    throw new InvalidArgumentException('Customer refund cannot exceed the original sale amount.');
                }
                if ($supplierRefund > $purchaseCost) {
                    throw new InvalidArgumentException('Supplier refund cannot exceed the original purchase cost.');
                }

                $entries = [];
                $salesAccountId  = $this->getOrCreateSalesAccount()->id;
                $cogsAccountId   = $this->getOrCreateCogsAccount()->id;
                $inventoryId     = $this->getOrCreateBusinessAccount()->id;
                $cancChargeId    = $this->getOrCreateCancellationChargeAccount()->id;
                $supplierFeeId   = $this->getOrCreateSupplierFeeAccount()->id;

                if ($isSold) {
                    // Reverse the sale
                    // Determine if the original sale was a credit sale (buyer hadn't paid cash)
                    $saleTxn = $item->saleTransaction()->with('entries.account')->first();
                    $buyerAccount = $item->buyer_contact_id
                        ? \App\Models\Contact::with('account')->find($item->buyer_contact_id)?->account
                        : null;

                    $wasCredit = false;
                    if ($saleTxn && $buyerAccount) {
                        $wasCredit = $saleTxn->entries
                            ->where('account_id', $buyerAccount->id)
                            ->where('debit', '>', 0)
                            ->isNotEmpty();
                    }

                    // 1. Reverse the sale: Debit Sales Revenue
                    $entries[] = ['account_id' => $salesAccountId, 'debit' => $saleAmount, 'credit' => 0];

                    // 2. Reverse COGS: Credit COGS
                    $entries[] = ['account_id' => $cogsAccountId, 'debit' => 0, 'credit' => $purchaseCost];

                    // 3. Customer refund: credit cash/bank OR reduce buyer's receivable
                    if ($customerRefund > 0) {
                        if ($wasCredit && $buyerAccount) {
                            $entries[] = ['account_id' => $buyerAccount->id, 'debit' => 0, 'credit' => $customerRefund];
                        } else {
                            if (empty($validated['refund_account_id'])) {
                                throw new InvalidArgumentException('A refund account is required to pay the customer refund.');
                            }
                            $entries[] = ['account_id' => $validated['refund_account_id'], 'debit' => 0, 'credit' => $customerRefund];
                        }
                    }

                    // 4. Your cancellation charge as income
                    if ($yourCharge > 0) {
                        $entries[] = ['account_id' => $cancChargeId, 'debit' => 0, 'credit' => $yourCharge];
                    }
                } else {
                    // Item was purchased but NOT sold. We need to clear inventory.
                    $entries[] = ['account_id' => $inventoryId, 'debit' => 0, 'credit' => $purchaseCost];
                }

                // Airline refund received into a bank/cash account
                if ($supplierRefund > 0) {
                    if (empty($validated['refund_account_id'])) {
                        throw new InvalidArgumentException('A refund account is required when supplier refund amount is greater than 0.');
                    }
                    $entries[] = ['account_id' => $validated['refund_account_id'], 'debit' => $supplierRefund, 'credit' => 0];
                }

                // Supplier fee (airline's penalty) — your expense
                if ($supplierFee > 0) {
                    $entries[] = ['account_id' => $supplierFeeId, 'debit' => $supplierFee, 'credit' => 0];
                }

                // Create the cancellation transaction
                $txnAmount = $isSold ? $saleAmount : $purchaseCost;
                
                $txn = $this->transactionService->createTransaction([
                    'type'        => 'cancellation',
                    'date'        => $validated['date'],
                    'amount'      => $txnAmount,
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

        // Normalize segments for backward compatibility
        if (empty($metadata['segments']) || !is_array($metadata['segments'])) {
            // Legacy format: build a single segment from flight + journey
            $seg = [];
            if (!empty($metadata['flight'])) {
                $seg = array_merge($seg, [
                    'airline' => $metadata['flight']['airline'] ?? '',
                    'flight_number' => $metadata['flight']['flight_number'] ?? '',
                    'pnr' => $metadata['flight']['pnr'] ?? '',
                    'ticket_number' => $metadata['flight']['ticket_number'] ?? '',
                    'class' => $metadata['flight']['class'] ?? 'Economy',
                    'seat' => $metadata['flight']['seat'] ?? '',
                    'baggage' => $metadata['flight']['baggage'] ?? '30 Kg',
                    'cabin_baggage' => $metadata['flight']['cabin_baggage'] ?? '7 Kg',
                ]);
            }
            if (!empty($metadata['journey'])) {
                $seg = array_merge($seg, [
                    'from' => $metadata['journey']['from'] ?? '',
                    'to' => $metadata['journey']['to'] ?? '',
                    'departure' => $metadata['journey']['departure'] ?? '',
                    'arrival' => $metadata['journey']['arrival'] ?? '',
                    'terminal' => $metadata['journey']['terminal'] ?? '',
                    'gate' => $metadata['journey']['gate'] ?? '',
                ]);
            }
            $metadata['segments'] = [array_merge([
                'airline' => '', 'flight_number' => '', 'pnr' => '', 'ticket_number' => '',
                'class' => 'Economy', 'seat' => '', 'baggage' => '30 Kg', 'cabin_baggage' => '7 Kg',
                'from' => '', 'to' => '', 'departure' => '', 'arrival' => '', 'terminal' => '', 'gate' => ''
            ], $seg)];
        }

        // Generate PDF
        $company = auth()->user()->company;
        $profile = \App\Models\Tenant\CompanyProfile::first();
        
        $logoPath = null;
        if ($profile && $profile->logo_path) {
            $logoPath = storage_path('app/public/' . $profile->logo_path);
        }

        if ($validated['document_type'] === 'flight') {
            $firstSegPnr = $metadata['segments'][0]['pnr'] ?? 'N/A';
            
            $pdf = Pdf::loadView('tickets.flight', [
                'company' => $company,
                'profile' => $profile,
                'item' => $item,
                'data' => $metadata,
                'companyName' => $profile->company_name ?? ($company->company_name ?? 'Company'),
                'title' => 'E-Ticket Confirmation',
                'period' => 'Booking Ref: ' . ($firstSegPnr),
                'generatedAt' => now()->format('Y-m-d H:i:s'),
                'currency' => $profile->currency_code ?? 'INR',
                'logoPath' => $logoPath,
            ]);
            
            $passengers = $metadata['passengers'] ?? [];
            $passengerName = !empty($passengers) ? ($passengers[0]['first_name'] ?? 'Ticket') : 'Ticket';
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

    /**
    /**
     * Record a standalone service charge to a party's account, with optional direct expense.
     * Accounting:
     *   Income:
     *     Credit sale: Debit Party Account, Credit Service Income
     *     Cash sale:   Debit Cash/Bank,     Credit Service Income
     *   Expense (Optional):
     *     Debit Service Expense, Credit Cash/Bank/Credit Card
     */
    public function storeServiceCharge(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'description'                => 'required|string|max:255',
            'amount'                     => 'required|numeric|min:0.01',
            'date'                       => 'required|date',
            'contact_id'                 => 'required|exists:tenant.contacts,id',
            'is_credit'                  => 'nullable|boolean',
            'payment_account_id'         => 'nullable|exists:tenant.accounts,id',
            'reference_number'           => 'nullable|string|max:100',
            'notes'                      => 'nullable|string|max:500',
            'has_expense'                => 'nullable|boolean',
            'expense_amount'             => 'nullable|numeric|min:0.01',
            'expense_payment_account_id' => 'nullable|exists:tenant.accounts,id',
            'expense_description'        => 'nullable|string|max:255',
        ]);

        $isCredit = $validated['is_credit'] ?? false;
        $hasExpense = $validated['has_expense'] ?? false;

        if (!$isCredit && empty($validated['payment_account_id'])) {
            return response()->json(['error' => 'Payment account is required for immediate payment.'], 422);
        }

        if ($hasExpense) {
            if (empty($validated['expense_amount']) || floatval($validated['expense_amount']) <= 0) {
                return response()->json(['error' => 'Expense amount is required when adding a service expense.'], 422);
            }
            if (empty($validated['expense_payment_account_id'])) {
                return response()->json(['error' => 'Expense payment account is required.'], 422);
            }
        }

        try {
            return DB::connection('tenant')->transaction(function () use ($validated, $isCredit, $hasExpense) {
                $contact = \App\Models\Contact::with('account')->findOrFail($validated['contact_id']);
                $serviceIncomeId = $this->getOrCreateServiceIncomeAccount()->id;

                $incomeEntries = [];

                if ($isCredit) {
                    // Credit sale: party owes you
                    $incomeEntries[] = ['account_id' => $contact->account_id, 'debit' => $validated['amount'], 'credit' => 0];
                } else {
                    // Cash sale: money received immediately
                    $incomeEntries[] = ['account_id' => $validated['payment_account_id'], 'debit' => $validated['amount'], 'credit' => 0];
                }

                // Credit Service Income
                $incomeEntries[] = ['account_id' => $serviceIncomeId, 'debit' => 0, 'credit' => $validated['amount']];

                $incomeTxn = $this->transactionService->createTransaction([
                    'type'             => 'service_income',
                    'date'             => $validated['date'],
                    'amount'           => $validated['amount'],
                    'description'      => 'Service Income: ' . $validated['description'],
                    'reference_number' => $validated['reference_number'] ?? null,
                ], $incomeEntries);

                $expenseTxn = null;
                if ($hasExpense) {
                    $serviceExpenseId = $this->getOrCreateServiceExpenseAccount()->id;
                    $expDesc = !empty($validated['expense_description']) 
                        ? $validated['expense_description'] 
                        : 'Cost for Service: ' . $validated['description'];

                    $expenseEntries = [
                        ['account_id' => $serviceExpenseId, 'debit' => $validated['expense_amount'], 'credit' => 0],
                        ['account_id' => $validated['expense_payment_account_id'], 'debit' => 0, 'credit' => $validated['expense_amount']],
                    ];

                    $expenseTxn = $this->transactionService->createTransaction([
                        'type'             => 'service_expense',
                        'date'             => $validated['date'],
                        'amount'           => $validated['expense_amount'],
                        'description'      => $expDesc,
                        'reference_number' => $validated['reference_number'] ?? null,
                    ], $expenseEntries);
                }

                return response()->json([
                    'message'             => 'Service charge recorded successfully.',
                    'transaction'         => $incomeTxn,
                    'expense_transaction' => $expenseTxn,
                ], 201);
            });
        } catch (InvalidArgumentException $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    private function getOrCreateServiceIncomeAccount(): \App\Models\Account
    {
        return \App\Models\Account::firstOrCreate(
            ['name' => 'Service Income', 'type' => 'income'],
            ['opening_balance' => 0, 'is_active' => true, 'created_by' => Auth::id(), 'updated_by' => Auth::id()]
        );
    }

    private function getOrCreateServiceExpenseAccount(): \App\Models\Account
    {
        return \App\Models\Account::firstOrCreate(
            ['name' => 'Direct Service Expenses', 'type' => 'expense'],
            ['opening_balance' => 0, 'is_active' => true, 'created_by' => Auth::id(), 'updated_by' => Auth::id()]
        );
    }
}
