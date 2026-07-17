<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCompanyProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'company_name' => 'required|string|max:255',
            'country_code' => 'required|string|size:2',
            'currency_code' => 'required|string|size:3',
            'timezone' => 'required|string|timezone',
            'financial_year_start' => 'required|string|size:5', // e.g. 01-01
            'financial_year_end' => 'required|string|size:5', // e.g. 12-31
            'tax_enabled' => 'required|boolean',
            'tax_rate' => 'nullable|numeric|min:0|max:100',
            'date_format' => 'nullable|string',
            'decimal_places' => 'nullable|integer|min:0|max:4',
            'logo' => 'nullable|image|max:2048', // up to 2MB image
        ];
    }
}
