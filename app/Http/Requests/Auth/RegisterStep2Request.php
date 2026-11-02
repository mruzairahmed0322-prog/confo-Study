<?php

namespace App\Http\Requests\Auth;

use App\Support\RegistrationGuard;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class RegisterStep2Request extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'role' => ['required', Rule::in(RegistrationGuard::publicRoles())],
            'gender' => ['required', Rule::in(['male', 'female', 'other'])],
            'address' => ['nullable', 'string', 'max:500'],
            'registration_note' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'role.required' => __('ui.role_required'),
            'gender.required' => __('ui.gender_required'),
        ];
    }
}
