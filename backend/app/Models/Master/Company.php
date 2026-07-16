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
    ];
}
