<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\BusinessItem;
use App\Models\Account;
use App\Models\TransactionEntry;
use Illuminate\Support\Facades\DB;

class RepairBusinessSales extends Command
{
    protected $signature = 'ledger:repair-business-sales';
    protected $description = 'Fix historical business sales by injecting missing COGS and Inventory Reduction entries';

    public function handle()
    {
        $this->info('Starting Business Ledger repair...');

        DB::transaction(function () {
            // 1. Fix Business Inventory account type
            $businessAccount = Account::where('name', 'Business Inventory')->first();
            if ($businessAccount && $businessAccount->type !== 'asset') {
                $businessAccount->update(['type' => 'asset']);
                $this->info('Updated Business Inventory to type: asset');
            }

            if (!$businessAccount) {
                $this->warn('No Business Inventory account found. Skipping repair.');
                return;
            }

            // 2. Ensure COGS account exists
            $cogsAccount = Account::firstOrCreate(
                ['name' => 'Cost of Goods Sold', 'type' => 'expense'],
                ['opening_balance' => 0, 'is_active' => true, 'created_by' => 1, 'updated_by' => 1]
            );
            $this->info('Ensured COGS account exists (ID: ' . $cogsAccount->id . ')');

            // 3. Find all sold items
            $soldItems = BusinessItem::where('status', 'sold')
                ->whereNotNull('sale_transaction_id')
                ->get();

            $repairedCount = 0;

            foreach ($soldItems as $item) {
                // Check if COGS entry already exists in this transaction
                $hasCogs = TransactionEntry::where('transaction_id', $item->sale_transaction_id)
                    ->where('account_id', $cogsAccount->id)
                    ->exists();

                if (!$hasCogs) {
                    // Inject the missing entries
                    TransactionEntry::insert([
                        [
                            'transaction_id' => $item->sale_transaction_id,
                            'account_id' => $cogsAccount->id,
                            'debit' => $item->purchase_cost,
                            'credit' => 0,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ],
                        [
                            'transaction_id' => $item->sale_transaction_id,
                            'account_id' => $businessAccount->id,
                            'debit' => 0,
                            'credit' => $item->purchase_cost,
                            'created_at' => now(),
                            'updated_at' => now(),
                        ]
                    ]);
                    $repairedCount++;
                }
            }

            $this->info("Repair completed! Fixed {$repairedCount} historical sales transactions.");
        });

        return 0;
    }
}
