<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IncomeCategory extends Model
{
    protected $fillable = ['name', 'account_id'];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
