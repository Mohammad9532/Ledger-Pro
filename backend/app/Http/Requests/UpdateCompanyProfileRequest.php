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
            'company_name'         => 'sometimes|required|string|max:255',
            'country_code'         => 'sometimes|required|string|size:2',
            'currency_code'        => 'sometimes|required|string|size:3',
            'timezone'             => 'sometimes|required|string|timezone',
            'financial_year_start' => 'sometimes|required|string|size:5', // e.g. 01-01
            'financial_year_end'   => 'sometimes|required|string|size:5', // e.g. 12-31
            'tax_enabled'          => 'sometimes|required|boolean',
            'tax_rate'             => 'nullable|numeric|min:0|max:100',
            'date_format'          => 'nullable|string',
            'decimal_places'       => 'nullable|integer|min:0|max:4',
            'cheque_reminder_time' => 'nullable|date_format:H:i',
            'logo'                 => 'nullable|image|max:2048', // up to 2MB image
        ];
    }
}
