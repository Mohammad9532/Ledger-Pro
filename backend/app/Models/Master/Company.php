<?php

namespace App\Models\Master;

use Illuminate\Database\Eloquent\Model;

class Company extends Model
{
    protected $connection = 'master';

    protected $fillable = [
        'company_uuid',
        'company_name',
        'database_name',
        'status',
        'onboarding_completed_at',
    ];

    protected $hidden = [
        'database_name',
    ];

    protected $casts = [
        'onboarding_completed_at' => 'datetime',
    ];
}
