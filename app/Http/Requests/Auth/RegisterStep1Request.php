<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterStep1Request extends FormRequest
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
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => __('ui.name_required'),
            'email.required' => __('ui.email_required'),
            'email.unique' => __('ui.email_taken'),
            'phone.required' => __('ui.phone_required'),
            'phone.unique' => __('ui.duplicate_phone'),
        ];
    }
}
