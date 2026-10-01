<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => 'required|string|max:255',
            'company_name' => 'required|string|max:255',
            // Only a verified account blocks the address; an unverified one is handled in RegisterController.
            'email' => ['required', 'email', Rule::unique('master.users', 'email')->whereNotNull('email_verified_at')],
            'password' => 'required|string|min:8|confirmed',
        ];
    }
}
