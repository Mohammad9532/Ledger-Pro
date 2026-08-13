<?php

require __DIR__ . '/vendor/autoload.php';
$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\BusinessItem;
use App\Models\Transaction;
use App\Models\TransactionEntry;
use App\Models\Tenant\TenantModel;

// Set up tenant context - assuming standard single tenant ID 1 for now or we just query across the board
// If multi-tenant, we should set the tenant connection
// The system uses stancl/tenancy, let's initialize tenant 1
use App\Models\Master\Company;
use App\Services\Tenant\TenantSwitcher;

try {
    $tenant = Company::first();
    if ($tenant) {
        app(TenantSwitcher::class)->switch($tenant->database_name);
    }
} catch (\Exception $e) {
    echo "Could not initialize tenant context: " . $e->getMessage() . "\n";
}

$cancelledItems = BusinessItem::where('status', 'cancelled')->get();

echo "=================================================\n";
echo "      CANCELLATION DIAGNOSTIC & AUDIT REPORT     \n";
echo "=================================================\n\n";

if ($cancelledItems->isEmpty()) {
    echo "No cancelled business items found.\n";
    exit;
}

$totalInventoryCorrection = 0;
$totalCogsCorrection = 0;

foreach ($cancelledItems as $item) {
    echo "Item ID: {$item->id} - {$item->description}\n";
    echo "Cancellation Date: {$item->cancellation_date}\n";
    
    $wasSold = !is_null($item->sale_transaction_id);
    echo "Original Status before cancellation: " . ($wasSold ? 'Sold' : 'Purchased/Unsold') . "\n";
    echo "Cancellation Transaction ID: {$item->cancellation_transaction_id}\n";
    
    if (!$item->cancellation_transaction_id) {
        echo "[WARNING] No cancellation transaction ID found!\n\n";
        continue;
    }
    
    $txn = Transaction::with('entries.account')->find($item->cancellation_transaction_id);
    
    if (!$txn) {
        echo "[WARNING] Cancellation transaction not found in DB!\n\n";
        continue;
    }
    
    $inventoryEntries = [];
    $cogsEntries = [];
    $customerRefund = $item->customer_refund_amount;
    $supplierRefund = $item->supplier_refund_amount;
    $cancellationFee = $item->supplier_cancellation_fee;
    
    foreach ($txn->entries as $entry) {
        // Business Inventory is typically an 'asset' or 'business' account type, let's just show names
        if ($entry->account->type === 'business' || stripos($entry->account->name, 'inventory') !== false) {
            $inventoryEntries[] = $entry;
        }
        if ($entry->account->type === 'expense' && stripos($entry->account->name, 'cost') !== false) {
            $cogsEntries[] = $entry;
        }
    }
    
    echo "Customer Refund recorded: $customerRefund\n";
    echo "Supplier Refund recorded: $supplierRefund\n";
    echo "Cancellation Fee recorded: $cancellationFee\n";
    
    echo "Inventory Entries in txn:\n";
    if (empty($inventoryEntries)) {
        echo "  (None found)\n";
    } else {
        foreach ($inventoryEntries as $entry) {
            echo "  Account: {$entry->account->name} | Dr: {$entry->debit} | Cr: {$entry->credit}\n";
        }
    }
    
    echo "COGS Entries in txn:\n";
    if (empty($cogsEntries)) {
        echo "  (None found - THIS IS THE ERROR IF ITEM WAS SOLD)\n";
    } else {
        foreach ($cogsEntries as $entry) {
            echo "  Account: {$entry->account->name} | Dr: {$entry->debit} | Cr: {$entry->credit}\n";
        }
    }
    
    // Calculate correction
    echo "-------------------------------------------------\n";
    if ($wasSold) {
        // If it was sold, the old logic incorrectly credited Inventory instead of COGS
        // We need to:
        // 1. Debit Inventory (to reverse the erroneous credit)
        // 2. Credit COGS (to correctly reverse the cost of goods sold)
        $correctionAmount = $item->purchase_cost;
        
        echo "REQUIRED CORRECTION FOR SOLD ITEM:\n";
        echo "  Debit: Business Inventory -> {$correctionAmount}\n";
        echo "  Credit: Cost of Goods Sold -> {$correctionAmount}\n";
        
        $totalInventoryCorrection += $correctionAmount;
        $totalCogsCorrection += $correctionAmount;
    } else {
        // If it was purchased but never sold, the old logic would have thrown an error,
        // so it shouldn't exist, but if it does, the inventory credit was correct!
        echo "REQUIRED CORRECTION FOR UNSOLD ITEM:\n";
        echo "  None (Logic was correct for unsold items)\n";
    }
    
    echo "=================================================\n\n";
}

echo "TOTAL CORRECTIONS REQUIRED ACROSS ALL CANCELLED ITEMS:\n";
echo "  Total Debit to Business Inventory: $totalInventoryCorrection\n";
echo "  Total Credit to Cost of Goods Sold: $totalCogsCorrection\n";
echo "\n(This proves why Inventory is negative and COGS is overstated)\n";
