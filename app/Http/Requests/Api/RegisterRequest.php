<?php

namespace App\Http\Requests\Api;

use App\Support\RegistrationGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class RegisterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', 'regex:/^[\pL\s\-\'\.]+$/u'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'phone' => ['required', 'string', 'max:20', 'unique:users,phone'],
            'role' => ['required', Rule::in(RegistrationGuard::publicRoles())],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'address' => ['nullable', 'string', 'max:500'],
            'registration_note' => ['nullable', 'string', 'max:1000'],
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'terms' => ['accepted'],
            'website' => ['nullable', 'max:0'],
            '_form_started' => ['required', 'integer'],
        ];
    }
}
