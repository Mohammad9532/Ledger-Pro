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
        'credit_limit',
        'parent_account_id',
        'is_active',
        'contact_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'opening_balance' => 'decimal:4',
        'credit_limit' => 'decimal:4',
        'is_active' => 'boolean',
    ];

    protected $appends = ['available_balance'];

    public function getAvailableBalanceAttribute(): ?string
    {
        if ($this->type !== 'credit_card') {
            return null;
        }

        $isSupplementary = !is_null($this->parent_account_id);
        
        // Fetch primary account directly to avoid loading 'parent' relation on $this
        $primaryAccount = $isSupplementary 
            ? Account::find($this->parent_account_id) 
            : $this;

        if (is_null($primaryAccount) || is_null($primaryAccount->credit_limit)) {
            return null;
        }

        $combinedBalance = $primaryAccount->balance;
        
        // Fetch children directly to avoid loading 'children' relation which causes serialization loops
        $children = Account::where('parent_account_id', $primaryAccount->id)->get();
        foreach ($children as $child) {
            $combinedBalance = bcadd($combinedBalance, $child->balance, 4);
        }

        return bcadd((string)$primaryAccount->credit_limit, $combinedBalance, 4);
    }

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
        $entryBalance = TransactionEntry::where('transaction_entries.account_id', $this->id)
            ->join('transactions', 'transaction_entries.transaction_id', '=', 'transactions.id')
            ->whereNull('transactions.deleted_at')
            ->selectRaw('COALESCE(SUM(transaction_entries.debit), 0) - COALESCE(SUM(transaction_entries.credit), 0) as balance')
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

    /**
     * Get the parent account for a supplementary credit card.
     */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'parent_account_id');
    }

    /**
     * Get the supplementary credit cards linked to this primary card.
     */
    public function children(): HasMany
    {
        return $this->hasMany(Account::class, 'parent_account_id');
    }
}
