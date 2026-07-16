<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Tenant\TenantModel;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transaction extends TenantModel
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'txn_number',
        'type',
        'date',
        'amount',
        'description',
        'reference_number',
        'expense_category_id',
        'business_item_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'date' => 'date',
        'amount' => 'decimal:4',
    ];

    /**
     * Get the ledger entries (debits and credits) for this transaction.
     */
    public function entries(): HasMany
    {
        return $this->hasMany(TransactionEntry::class);
    }

    /**
     * Get the expense category.
     */
    public function expenseCategory(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class);
    }

    /**
     * Get the linked business item.
     */
    public function businessItem(): BelongsTo
    {
        return $this->belongsTo(BusinessItem::class);
    }

    /**
     * Get the user who created this transaction.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * Get the user who last updated this transaction.
     */
    public function updater(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    /**
     * Verify that this transaction's entries are balanced.
     */
    public function isBalanced(): bool
    {
        $totals = $this->entries()
            ->selectRaw('COALESCE(SUM(debit), 0) as total_debit, COALESCE(SUM(credit), 0) as total_credit')
            ->first();

        return bccomp($totals->total_debit, $totals->total_credit, 4) === 0;
    }
}
