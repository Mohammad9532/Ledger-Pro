<?php

namespace App\Console\Commands;

use App\Models\Account;
use App\Models\Contact;
use App\Models\ExpenseCategory;
use App\Models\IncomeCategory;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ScanOrphanedAccounts extends Command
{
    protected $signature = 'ledger:scan-orphans {--fix : Auto-fix missing relationships where possible} {--force : Force fix without prompting}';
    protected $description = 'Scan for orphaned person, expense, or income accounts and backfill is_system flags';

    public function handle(): int
    {
        $this->info('Starting System Accounts Audit...');

        DB::transaction(function () {
            // 1. Backfill is_system = true for Opening Balance Equity
            $equity = Account::where('name', 'Opening Balance Equity')->first();
            if ($equity && !$equity->is_system) {
                $equity->update(['is_system' => true]);
                $this->info("Set is_system=true for Opening Balance Equity account.");
            }

            // 2. Identify and mark valid Person accounts
            $validPersonAccountIds = Contact::whereNotNull('account_id')->pluck('account_id')->toArray();
            $updated = Account::whereIn('id', $validPersonAccountIds)
                ->where('type', 'person')
                ->where('is_system', false)
                ->update(['is_system' => true]);
            if ($updated > 0) $this->info("Backfilled is_system=true for {$updated} linked Person accounts.");

            // 3. Identify and mark valid Expense accounts
            $validExpenseAccountIds = ExpenseCategory::whereNotNull('account_id')->pluck('account_id')->toArray();
            $updated = Account::whereIn('id', $validExpenseAccountIds)
                ->where('type', 'expense')
                ->where('is_system', false)
                ->update(['is_system' => true]);
            if ($updated > 0) $this->info("Backfilled is_system=true for {$updated} linked Expense accounts.");

            // 4. Identify and mark valid Income accounts
            $validIncomeAccountIds = IncomeCategory::whereNotNull('account_id')->pluck('account_id')->toArray();
            $updated = Account::whereIn('id', $validIncomeAccountIds)
                ->where('type', 'income')
                ->where('is_system', false)
                ->update(['is_system' => true]);
            if ($updated > 0) $this->info("Backfilled is_system=true for {$updated} linked Income accounts.");

            $this->newLine();

            // Check for orphans
            $orphanedPersons = Account::where('type', 'person')->whereNotIn('id', $validPersonAccountIds)->get();
            $orphanedExpenses = Account::where('type', 'expense')->whereNotIn('id', $validExpenseAccountIds)->get();
            $orphanedIncomes = Account::where('type', 'income')->whereNotIn('id', $validIncomeAccountIds)->get();

            $totalOrphans = $orphanedPersons->count() + $orphanedExpenses->count() + $orphanedIncomes->count();

            if ($totalOrphans === 0) {
                $this->info('No orphaned accounts found! The system is fully integral.');
                return;
            }

            $this->warn("Found {$totalOrphans} orphaned accounts.");

            if ($orphanedPersons->count() > 0) {
                $this->error('Orphaned Person Accounts:');
                foreach ($orphanedPersons as $account) {
                    $this->line(" - [{$account->id}] {$account->name}");
                }
            }

            if ($orphanedExpenses->count() > 0) {
                $this->error('Orphaned Expense Accounts:');
                foreach ($orphanedExpenses as $account) {
                    $this->line(" - [{$account->id}] {$account->name}");
                }
            }

            if ($orphanedIncomes->count() > 0) {
                $this->error('Orphaned Income Accounts:');
                foreach ($orphanedIncomes as $account) {
                    $this->line(" - [{$account->id}] {$account->name}");
                }
            }

            if ($this->option('fix')) {
                if ($this->option('force') || $this->confirm('Do you want to automatically create missing contacts and categories for these accounts?')) {
                    $adminId = \App\Models\User::first()->id ?? 1;

                    foreach ($orphanedPersons as $account) {
                        $contact = Contact::create([
                            'name' => $account->name,
                            'account_id' => $account->id,
                            'created_by' => $adminId,
                            'updated_by' => $adminId,
                        ]);
                        $account->update(['contact_id' => $contact->id, 'is_system' => true]);
                        $this->info("Fixed orphaned person: {$account->name}");
                    }

                    foreach ($orphanedExpenses as $account) {
                        $name = str_replace(' Expense', '', $account->name);
                        ExpenseCategory::create(['name' => $name, 'account_id' => $account->id]);
                        $account->update(['is_system' => true]);
                        $this->info("Fixed orphaned expense: {$account->name}");
                    }

                    foreach ($orphanedIncomes as $account) {
                        $name = str_replace(' Income', '', $account->name);
                        IncomeCategory::create(['name' => $name, 'account_id' => $account->id]);
                        $account->update(['is_system' => true]);
                        $this->info("Fixed orphaned income: {$account->name}");
                    }
                    $this->info('Auto-fix completed.');
                }
            } else {
                $this->newLine();
                $this->info('Run with --fix to automatically create missing profiles/categories for these accounts.');
            }
        });

        return 0;
    }
}
