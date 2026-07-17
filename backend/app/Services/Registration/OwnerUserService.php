<?php

namespace App\Services\Registration;

use App\Models\Master\User;
use App\Models\Master\Company;
use Illuminate\Support\Facades\Hash;

class OwnerUserService
{
    public function createOwner(array $data, Company $company): User
    {
        return User::create([
            'company_id' => $company->id,
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'owner',
            'email_verified_at' => null,
        ]);
    }
}
