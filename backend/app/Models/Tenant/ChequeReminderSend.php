<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Tenant\TenantModel;

class ChequeReminderSend extends TenantModel
{
    use HasFactory;

    protected $fillable = [
        'cheque_reminder_id',
        'reminder_day',
        'recipient',
        'status',
        'sent_at',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'reminder_day' => 'integer',
    ];

    public function chequeReminder()
    {
        return $this->belongsTo(ChequeReminder::class);
    }
}
