<?php

namespace App\Models\Master;

use Illuminate\Database\Eloquent\Model;

class VerificationCode extends Model
{
    protected $connection = 'master';

    protected $fillable = [
        'user_id',
        'purpose',
        'code_hash',
        'expires_at',
        'attempts',
        'last_sent_at',
        'verified_at',
    ];

    protected $casts = [
        'purpose' => \App\Enums\VerificationPurpose::class,
        'expires_at' => 'datetime',
        'last_sent_at' => 'datetime',
        'verified_at' => 'datetime',
        'attempts' => 'integer',
    ];
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
