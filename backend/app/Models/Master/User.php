<?php

namespace App\Models\Master;

use Illuminate\Foundation\Auth\User as Authenticatable;

class User extends Authenticatable
{
    use \Laravel\Sanctum\HasApiTokens;

    protected $connection = 'master';

    protected $fillable = [
        'company_id',
        'name',
        'email',
        'password',
        'role',
        'email_verified_at',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function company()
    {
        return $this->belongsTo(Company::class);
    }
}
