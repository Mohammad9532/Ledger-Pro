<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Tenant\TenantModel;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Contact extends TenantModel
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'phone',
        'notes',
        'account_id',
        'created_by',
        'updated_by',
    ];

    /**
     * Get the ledger account for this contact.
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /**
     * Get the balance of the person's account.
     * Positive = person owes me, Negative = I owe person
     */
    public function getBalanceAttribute(): string
    {
        if ($this->account) {
            return $this->account->balance;
        }
        return '0.0000';
    }
}
