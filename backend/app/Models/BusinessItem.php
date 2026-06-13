<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BusinessItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'description',
        'purchase_cost',
        'sale_amount',
        'profit',
        'status',
        'buyer_contact_id',
        'purchase_transaction_id',
        'sale_transaction_id',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'purchase_cost' => 'decimal:4',
        'sale_amount' => 'decimal:4',
        'profit' => 'decimal:4',
    ];

    public function buyer(): BelongsTo
    {
        return $this->belongsTo(Contact::class, 'buyer_contact_id');
    }

    public function purchaseTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'purchase_transaction_id');
    }

    public function saleTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'sale_transaction_id');
    }

    /**
     * Calculate outstanding amount (for credit sales).
     */
    public function getOutstandingAttribute(): string
    {
        if (!$this->sale_amount || !$this->buyer_contact_id) {
            return '0.0000';
        }

        $buyerAccount = Contact::find($this->buyer_contact_id)?->account;
        if (!$buyerAccount) {
            return '0.0000';
        }

        return $buyerAccount->balance;
    }
}
