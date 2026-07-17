<?php

namespace App\Models\Tenant;

use App\Models\Tenant\TenantModel;

class CompanyProfile extends TenantModel
{
    protected $fillable = [
        'company_name',
        'logo_path',
        'country_code',
        'currency_code',
        'timezone',
        'financial_year_start',
        'financial_year_end',
        'tax_enabled',
        'tax_rate',
        'date_format',
        'decimal_places',
    ];

    protected $casts = [
        'tax_enabled' => 'boolean',
        'tax_rate' => 'decimal:2',
        'decimal_places' => 'integer',
    ];
}
