<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class RegisterStep3Request extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'password' => ['required', 'confirmed', Password::min(8)->mixedCase()->numbers()],
            'terms' => ['accepted'],
            'website' => ['nullable', 'max:0'],
            '_form_started' => ['required', 'integer'],
        ];
    }

    public function messages(): array
    {
        return [
            'password.required' => __('ui.password_required'),
            'password.confirmed' => __('ui.password_mismatch'),
            'terms.accepted' => __('ui.terms_required'),
        ];
    }
}
