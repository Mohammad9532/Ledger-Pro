<?php

namespace App\Models\Tenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Models\Tenant\TenantModel;
use App\Models\Contact;

class ChequeReminder extends TenantModel
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'type',
        'cheque_number',
        'bank_name',
        'amount',
        'due_date',
        'contact_id',
        'status',
        'notes',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'due_date' => 'date',
        'amount' => 'decimal:4',
    ];

    public function contact()
    {
        return $this->belongsTo(Contact::class);
    }

    public function reminderSends()
    {
        return $this->hasMany(ChequeReminderSend::class);
    }
}
