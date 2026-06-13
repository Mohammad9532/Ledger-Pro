<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Services\TransactionService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Auth;

class MigrateOpeningBalances extends Command
{
    protected $signature   = 'ledger:migrate-opening-balances {--dry-run : Preview without making changes}';
    protected $description = 'Convert stored opening_balance column values into proper ledger transactions';

    public function handle(TransactionService $txnService): int
    {
        $dryRun = $this->option('dry-run');

        $accounts = Account::whereNotNull('opening_balance')
            ->where('opening_balance', '!=', 0)
            ->whereNull('deleted_at')
            ->get();

        if ($accounts->isEmpty()) {
            $this->info('No accounts with stored opening balances found. Nothing to do.');
            return 0;
        }

        $this->table(
            ['ID', 'Name', 'Type', 'Opening Balance'],
            $accounts->map(fn($a) => [$a->id, $a->name, $a->type, $a->opening_balance])
        );

        if ($dryRun) {
            $this->warn('DRY RUN — no changes made.');
            return 0;
        }

        if (!$this->confirm("Convert {$accounts->count()} account(s) to ledger-based opening balances?")) {
            return 1;
        }

        $success = 0;
        $failed  = 0;

        foreach ($accounts as $account) {
            try {
                $this->line("Processing: [{$account->id}] {$account->name} ({$account->type}) = {$account->opening_balance}");

                $txnService->createOpeningBalanceTransaction(
                    accountId:   $account->id,
                    accountType: $account->type,
                    amount:      (float) $account->opening_balance,
                    date:        $account->created_at->toDateString(),
                );

                // Zero out the stored column — ledger is now the source of truth
                $account->updateQuietly(['opening_balance' => 0]);

                $this->info("  ✓ Migrated");
                $success++;
            } catch (\Throwable $e) {
                $this->error("  ✗ Failed: {$e->getMessage()}");
                $failed++;
            }
        }

        $this->newLine();
        $this->info("Done. Migrated: {$success} | Failed: {$failed}");

        return $failed > 0 ? 1 : 0;
    }
}
