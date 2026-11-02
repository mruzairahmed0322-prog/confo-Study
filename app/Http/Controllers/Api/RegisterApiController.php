<?php

namespace App\Http\Controllers\Api;

use App\AccountStatus;
use App\ApprovalStatus;
use App\Http\Requests\Api\RegisterRequest;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\RegistrationGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class RegisterApiController extends BaseApiController
{
    public function register(RegisterRequest $request): JsonResponse
    {
        if (RegistrationGuard::registrationDisabled()) {
            return $this->error(
                'Public registration is disabled. Contact your school administrator to get login credentials.',
                403
            );
        }

        RegistrationGuard::validateSecurity($request);

        $validated = $request->validated();
        $role = RegistrationGuard::mapRole($validated['role']);

        if (in_array($role, RegistrationGuard::adminOnlyRoles(), true)) {
            return $this->error(
                'Student and teacher accounts are created by the school administrator. Please register as Parent or Staff, or contact the school.',
                422
            );
        }

        $schoolId = \App\Models\School::query()->value('id') ?? 1;

        $user = User::create([
            'school_id' => $schoolId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?? null,
            'address' => $validated['address'] ?? null,
            'gender' => $validated['gender'] ?? 'other',
            'password' => Hash::make($validated['password']),
            'email_verified_at' => null,
            'account_status' => AccountStatus::PENDING,
            'approval_status' => ApprovalStatus::PENDING,
            'fee_cleared' => false,
            'registration_ip' => $request->ip(),
            'registration_note' => $validated['registration_note'] ?? null,
        ]);

        $user->assignRole($role);

        ActivityLog::create([
            'school_id' => $user->school_id,
            'user_id' => $user->id,
            'action' => 'register',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => $user->name.' submitted registration (pending approval).',
            'properties' => ['role' => $role, 'ip' => $request->ip()],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        RegistrationGuard::hit($request);

        return $this->success(['email' => $user->email], 'Registration submitted successfully.', 201);
    }
}
