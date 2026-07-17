<?php

namespace App\Services\Registration;

use App\Models\Master\Company;
use Illuminate\Support\Str;


class CompanyRegistrationService
{
    public function createCompany(array $data, string $databaseName): Company
    {
        return Company::create([
            'company_uuid' => Str::uuid()->toString(),
            'company_name' => $data['company_name'],
            'database_name' => $databaseName,
            'status' => 'pending',
        ]);
    }
}
