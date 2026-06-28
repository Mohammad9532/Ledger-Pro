<?php

namespace App\Services;

use App\Models\Transaction;
use App\Models\TransactionEntry;
use App\Models\AuditLog;
use App\Models\MonthClosing;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use InvalidArgumentException;

class TransactionService
{
    /**
     * Create a new transaction with balanced double-entry ledger entries.
     *
     * @param array $data Transaction header data
     * @param array $entries Array of ['account_id', 'debit', 'credit'] entries
     * @return Transaction
     * @throws InvalidArgumentException if entries are not balanced
     */
    public function createTransaction(array $data, array $entries): Transaction
    {
        // Validate entries are balanced BEFORE opening DB transaction
        $this->validateBalance($entries);

        // Enforce month closing — no backdated transactions into closed months
        $this->assertMonthOpen($data['date']);

        return DB::transaction(function () use ($data, $entries) {
            $userId = Auth::id();

            // Generate sequential transaction number: TXN-YYYY-NNNNNN
            $txnNumber = $this->generateTxnNumber();

            // Create the transaction header
            $transaction = Transaction::create([
                'txn_number' => $txnNumber,
                'type' => $data['type'],
                'date' => $data['date'],
                'amount' => $data['amount'],
                'description' => $data['description'] ?? null,
                'reference_number' => $data['reference_number'] ?? null,
                'expense_category_id' => $data['expense_category_id'] ?? null,
                'business_item_id' => $data['business_item_id'] ?? null,
                'created_by' => $userId,
                'updated_by' => $userId,
            ]);

            // Create each ledger entry
            foreach ($entries as $entry) {
                TransactionEntry::create([
                    'transaction_id' => $transaction->id,
                    'account_id' => $entry['account_id'],
                    'debit' => $entry['debit'] ?? 0,
                    'credit' => $entry['credit'] ?? 0,
                ]);
            }

            // FINAL SAFETY CHECK: verify the entries we just inserted are balanced
            $this->verifyTransactionBalance($transaction);

            // Audit log
            $this->logAudit($transaction, 'created');

            return $transaction->load('entries.account');
        });
    }

    /**
     * Update an existing transaction - replaces all entries atomically.
     *
     * @param int $transactionId
     * @param array $data Updated transaction header data
     * @param array $entries New set of entries
     * @return Transaction
     */
    public function updateTransaction(int $transactionId, array $data, array $entries): Transaction
    {
        $this->validateBalance($entries);

        return DB::transaction(function () use ($transactionId, $data, $entries) {
            $transaction = Transaction::findOrFail($transactionId);

            // Enforce month closing — cannot edit transactions in closed months
            $this->assertMonthOpen($transaction->date->toDateString());
            // Also check the new date if it's being changed
            if (isset($data['date'])) {
                $this->assertMonthOpen($data['date']);
            }
            $oldValues = $transaction->toArray();

            $userId = Auth::id();

            // Update header
            $transaction->update([
                'type' => $data['type'] ?? $transaction->type,
                'date' => $data['date'] ?? $transaction->date,
                'amount' => $data['amount'] ?? $transaction->amount,
                'description' => $data['description'] ?? $transaction->description,
                'reference_number' => $data['reference_number'] ?? $transaction->reference_number,
                'expense_category_id' => $data['expense_category_id'] ?? $transaction->expense_category_id,
                'business_item_id' => $data['business_item_id'] ?? $transaction->business_item_id,
                'updated_by' => $userId,
            ]);

            // Delete old entries and create new ones
            $transaction->entries()->delete();

            foreach ($entries as $entry) {
                TransactionEntry::create([
                    'transaction_id' => $transaction->id,
                    'account_id' => $entry['account_id'],
                    'debit' => $entry['debit'] ?? 0,
                    'credit' => $entry['credit'] ?? 0,
                ]);
            }

            // FINAL SAFETY CHECK
            $this->verifyTransactionBalance($transaction);

            // Audit log
            $this->logAudit($transaction, 'updated', $oldValues);

            return $transaction->load('entries.account');
        });
    }

    /**
     * Soft delete a transaction (entries remain for audit, but excluded from balance calc).
     */
    public function deleteTransaction(int $transactionId): bool
    {
        return DB::transaction(function () use ($transactionId) {
            $transaction = Transaction::findOrFail($transactionId);

            // Enforce month closing — cannot delete transactions in closed months
            $this->assertMonthOpen($transaction->date->toDateString());

            $oldValues = $transaction->toArray();

            $transaction->update(['updated_by' => Auth::id()]);
            $transaction->delete(); // Soft delete

            // If this was a purchase transaction, also soft-delete the linked BusinessItem
            // so it no longer appears as a ghost entry in the Business page.
            if ($transaction->type === 'purchase' && $transaction->business_item_id) {
                \App\Models\BusinessItem::where('id', $transaction->business_item_id)
                    ->whereNull('deleted_at')
                    ->update(['deleted_at' => now()]);
            }

            // If this was a sale transaction, revert the linked BusinessItem back to 'purchased'
            if ($transaction->type === 'sale' && $transaction->business_item_id) {
                \App\Models\BusinessItem::where('id', $transaction->business_item_id)
                    ->whereNull('deleted_at')
                    ->update([
                        'status'               => 'purchased',
                        'sale_amount'          => null,
                        'profit'               => null,
                        'buyer_contact_id'     => null,
                        'sale_transaction_id'  => null,
                        'updated_by'           => Auth::id(),
                    ]);
            }

            $this->logAudit($transaction, 'deleted', $oldValues);

            return true;
        });
    }

    /**
     * Restore a soft-deleted transaction.
     */
    public function restoreTransaction(int $transactionId): Transaction
    {
        return DB::transaction(function () use ($transactionId) {
            $transaction = Transaction::withTrashed()->findOrFail($transactionId);
            $transaction->restore();

            $this->logAudit($transaction, 'restored');

            return $transaction->load('entries.account');
        });
    }

    /**
     * Create or replace the opening balance ledger transaction for an account.
     * Uses account creation date so it always sorts before all real transactions.
     * Bypasses month-lock (opening balances are historical setup entries).
     *
     * Double-entry rule:
     *   Asset / Cash / Bank / Person with positive balance → DR account, CR Opening Balance Equity
     *   Credit Card / Liability with positive balance (money owed) → DR Opening Balance Equity, CR account
     *   Any negative balance → reverse the above
     */
    public function createOpeningBalanceTransaction(
        int $accountId,
        string $accountType,
        float $amount,
        string $date,
        ?int $existingTransactionId = null
    ): ?Transaction {
        if ($amount == 0) {
            // If amount is zero and there's an old OB transaction, delete it
            if ($existingTransactionId) {
                Transaction::withTrashed()
                    ->where('id', $existingTransactionId)
                    ->where('type', 'opening_balance')
                    ->forceDelete();
            }
            return null;
        }

        // Get the Opening Balance Equity account
        $equityAccount = \App\Models\Account::where('name', 'Opening Balance Equity')
            ->where('type', 'equity')
            ->first();

        if (!$equityAccount) {
            throw new InvalidArgumentException('Opening Balance Equity account not found. Please run migrations.');
        }

        $absAmount = abs($amount);

        // Liability-type accounts (credit_card, liability) have reversed normal balance
        $isLiability = in_array($accountType, ['credit_card', 'liability']);

        if ($amount > 0) {
            if ($isLiability) {
                // Money owed — credit the account (increases liability)
                $entries = [
                    ['account_id' => $equityAccount->id, 'debit' => $absAmount, 'credit' => 0],
                    ['account_id' => $accountId,          'debit' => 0,          'credit' => $absAmount],
                ];
            } else {
                // Asset — debit the account (increases balance)
                $entries = [
                    ['account_id' => $accountId,          'debit' => $absAmount, 'credit' => 0],
                    ['account_id' => $equityAccount->id,  'debit' => 0,          'credit' => $absAmount],
                ];
            }
        } else {
            // Negative opening balance — reverse
            if ($isLiability) {
                $entries = [
                    ['account_id' => $accountId,          'debit' => $absAmount, 'credit' => 0],
                    ['account_id' => $equityAccount->id,  'debit' => 0,          'credit' => $absAmount],
                ];
            } else {
                $entries = [
                    ['account_id' => $equityAccount->id,  'debit' => $absAmount, 'credit' => 0],
                    ['account_id' => $accountId,           'debit' => 0,          'credit' => $absAmount],
                ];
            }
        }

        return DB::transaction(function () use (
            $accountId, $accountType, $absAmount, $date,
            $existingTransactionId, $entries
        ) {
            // Remove old opening balance transaction for this account if it exists
            if ($existingTransactionId) {
                Transaction::withTrashed()
                    ->where('id', $existingTransactionId)
                    ->where('type', 'opening_balance')
                    ->forceDelete();
            } else {
                // Also sweep for any previously created OB transaction for this account
                $existing = Transaction::join('transaction_entries', 'transactions.id', '=', 'transaction_entries.transaction_id')
                    ->where('transactions.type', 'opening_balance')
                    ->where('transaction_entries.account_id', $accountId)
                    ->select('transactions.id')
                    ->first();
                if ($existing) {
                    Transaction::withTrashed()->where('id', $existing->id)->forceDelete();
                }
            }

            // Create the opening balance transaction — no TXN number, no month-lock
            $transaction = Transaction::create([
                'txn_number'  => null, // Opening balance entries don't get TXN numbers
                'type'        => 'opening_balance',
                'date'        => $date,
                'amount'      => $absAmount,
                'description' => 'Opening Balance',
                'created_by'  => Auth::id(),
                'updated_by'  => Auth::id(),
            ]);

            foreach ($entries as $entry) {
                TransactionEntry::create([
                    'transaction_id' => $transaction->id,
                    'account_id'     => $entry['account_id'],
                    'debit'          => $entry['debit'],
                    'credit'         => $entry['credit'],
                ]);
            }

            // Verify balance integrity
            $this->verifyTransactionBalance($transaction);

            return $transaction->load('entries.account');
        });
    }

    /**
     * Validate that total debits equal total credits.
     * This is the CORE accounting rule.
     *
     * @throws InvalidArgumentException
     */
    private function validateBalance(array $entries): void
    {
        if (empty($entries)) {
            throw new InvalidArgumentException('A transaction must have at least two entries.');
        }

        if (count($entries) < 2) {
            throw new InvalidArgumentException('A transaction must have at least two entries (debit and credit).');
        }

        $totalDebit = '0';
        $totalCredit = '0';

        foreach ($entries as $entry) {
            $debit = (string) ($entry['debit'] ?? '0');
            $credit = (string) ($entry['credit'] ?? '0');

            $totalDebit = bcadd($totalDebit, $debit, 4);
            $totalCredit = bcadd($totalCredit, $credit, 4);
        }

        if (bccomp($totalDebit, $totalCredit, 4) !== 0) {
            throw new InvalidArgumentException(
                "Transaction is not balanced. Total debits ({$totalDebit}) != Total credits ({$totalCredit}). " .
                "Every transaction MUST have equal debits and credits."
            );
        }

        // Also validate no entry has both debit and credit > 0
        foreach ($entries as $entry) {
            $debit = (float) ($entry['debit'] ?? 0);
            $credit = (float) ($entry['credit'] ?? 0);

            if ($debit > 0 && $credit > 0) {
                throw new InvalidArgumentException(
                    'A single entry cannot have both debit and credit amounts. Split into separate entries.'
                );
            }

            if ($debit < 0 || $credit < 0) {
                throw new InvalidArgumentException('Debit and credit amounts must be positive.');
            }

            if ($debit == 0 && $credit == 0) {
                throw new InvalidArgumentException('An entry must have either a debit or credit amount.');
            }
        }
    }

    /**
     * Final safety check - verify stored entries are balanced.
     * This catches any database-level issues.
     *
     * @throws InvalidArgumentException
     */
    private function verifyTransactionBalance(Transaction $transaction): void
    {
        $totals = $transaction->entries()
            ->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')
            ->first();

        if (bccomp((string) $totals->total_debit, (string) $totals->total_credit, 4) !== 0) {
            throw new InvalidArgumentException(
                'CRITICAL: Transaction entries failed balance verification after save. ' .
                'Debits: ' . $totals->total_debit . ', Credits: ' . $totals->total_credit .
                '. Rolling back.'
            );
        }
    }

    /**
     * Log an audit trail entry.
     */
    private function logAudit(Transaction $transaction, string $action, array $oldValues = null): void
    {
        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => Transaction::class,
            'auditable_id' => $transaction->id,
            'action' => $action,
            'old_values' => $oldValues,
            'new_values' => $transaction->fresh()?->toArray(),
            'ip_address' => request()->ip(),
            'created_at' => now(),
        ]);
    }

    /**
     * Generate the next sequential transaction number: TXN-YYYY-NNNNNN
     * Uses a DB query inside the existing transaction for atomicity.
     */
    private function generateTxnNumber(): string
    {
        $year = now()->year;
        $prefix = "TXN-{$year}-";

        // Get the highest existing number for this year
        $lastTxn = Transaction::withTrashed()
            ->where('txn_number', 'like', $prefix . '%')
            ->orderByRaw('CAST(SUBSTRING(txn_number, ' . (strlen($prefix) + 1) . ') AS UNSIGNED) DESC')
            ->lockForUpdate()
            ->first();

        if ($lastTxn && $lastTxn->txn_number) {
            $lastSeq = (int) substr($lastTxn->txn_number, strlen($prefix));
            $nextSeq = $lastSeq + 1;
        } else {
            $nextSeq = 1;
        }

        return $prefix . str_pad($nextSeq, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Assert that the given date's month is not closed.
     * Throws if the month is locked, preventing any create/update/delete.
     *
     * @throws InvalidArgumentException
     */
    private function assertMonthOpen(string $date): void
    {
        if (MonthClosing::isDateLocked($date)) {
            $parsed = \Carbon\Carbon::parse($date);
            $label = $parsed->format('F Y');
            throw new InvalidArgumentException(
                "Cannot modify transactions in {$label}. This month has been closed. " .
                "Reopen the month first if you need to make changes."
            );
        }
    }
}
