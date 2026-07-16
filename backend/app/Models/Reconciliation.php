<?php

namespace App\Models;

use App\Models\Tenant\TenantModel;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reconciliation extends TenantModel
{
    protected $fillable = [
        'account_id',
        'reconciliation_date',
        'system_balance',
        'actual_balance',
        'difference',
        'status',
        'notes',
        'adjustment_transaction_id',
        'created_by',
    ];

    protected $casts = [
        'reconciliation_date' => 'date',
        'system_balance' => 'decimal:4',
        'actual_balance' => 'decimal:4',
        'difference' => 'decimal:4',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function adjustmentTransaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class, 'adjustment_transaction_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
