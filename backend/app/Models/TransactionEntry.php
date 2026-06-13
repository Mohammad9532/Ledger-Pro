<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TransactionEntry extends Model
{
    protected $fillable = [
        'transaction_id',
        'account_id',
        'debit',
        'credit',
    ];

    protected $casts = [
        'debit' => 'decimal:4',
        'credit' => 'decimal:4',
    ];

    /**
     * Get the parent transaction.
     */
    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    /**
     * Get the account this entry belongs to.
     */
    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
