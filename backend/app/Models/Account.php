<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Tenant\TenantModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Account extends TenantModel
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'type',
        'opening_balance',
        'is_active',
        'contact_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    /**
     * Get all ledger entries for this account.
     */
    public function entries(): HasMany
    {
        return $this->hasMany(TransactionEntry::class);
    }

    /**
     * Get the linked contact (for person-type accounts).
     */
    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    /**
     * Calculate the current balance from ledger entries.
     * Balance = opening_balance + SUM(debit) - SUM(credit)
     *
     * For liability/income/credit_card accounts, the natural balance is credit-heavy,
     * so we may display as SUM(credit) - SUM(debit) depending on context.
     */
    public function getBalanceAttribute(): string
    {
        $entryBalance = $this->entries()
            ->selectRaw('COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0) as balance')
            ->value('balance');

        return bcadd((string) $this->opening_balance, (string) $entryBalance, 4);
    }

    /**
     * Calculate balance up to a specific date.
     */
    public function getBalanceAsOf(string $date): string
    {
        $entryBalance = $this->entries()
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->whereNull('transactions.deleted_at')
            ->where('transactions.date', '<=', $date)
            ->selectRaw('COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as balance')
            ->value('balance');

        return bcadd((string) $this->opening_balance, (string) $entryBalance, 4);
    }

    /**
     * Scope to filter by type.
     */
    public function scopeOfType($query, string $type)
    {
        return $query->where('type', $type);
    }

    /**
     * Scope to filter active accounts.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
