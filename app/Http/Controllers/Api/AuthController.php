<?php

namespace App\Http\Controllers\Api;

use App\AccountStatus;
use App\ApprovalStatus;
use App\Models\User;
use App\Models\LoginLog;
use App\Support\RegistrationGuard;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;

class AuthController extends BaseApiController
{
    public function user(Request $request): JsonResponse
    {
        $user = $request->user()->load('roles', 'school');
        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->primaryRoleName(),
            'school' => $user->school?->only(['id', 'name', 'logo']),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    public function login(Request $request): JsonResponse
    {
        $request->validate([
            // Accept email, full name, or a generic login id (SPA sends it as "email").
            'email' => 'nullable|string|required_without:mobile',
            'mobile' => 'nullable|string|required_without:email',
            'password' => 'required|string',
        ]);

        $key = 'api-login:' . $request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            return $this->error('Too many attempts. Try again later.', 429);
        }

        $identifier = trim((string) $request->input('email', ''));
        $mobileRaw = trim((string) $request->input('mobile', ''));
        $mobileDigits = preg_replace('/\D+/', '', $mobileRaw !== '' ? $mobileRaw : $identifier) ?: '';

        // Token SPA: avoid Auth::attempt() (starts session → file locks / timeouts on shared hosting).
        $user = null;
        if ($identifier !== '') {
            $lower = strtolower($identifier);
            $user = User::query()->whereRaw('LOWER(email) = ?', [$lower])->first();

            // Name login (exact, case-insensitive) — used by Super Admin / staff.
            if (! $user) {
                $user = User::query()->whereRaw('LOWER(name) = ?', [$lower])->first();
            }

            // Digits typed in the email/name field → treat as mobile.
            if (! $user && $mobileDigits !== '' && preg_match('/^\+?\d[\d\s\-]+$/', $identifier)) {
                $user = User::query()
                    ->where(function ($q) use ($identifier, $mobileDigits) {
                        $q->where('phone', $identifier)
                            ->orWhere('phone', $mobileDigits)
                            ->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), '-', ''), ' ', ''), ' ', '') = ?", [$mobileDigits]);
                    })
                    ->first();
            }
        } elseif ($mobileDigits !== '') {
            $user = User::query()
                ->where(function ($q) use ($mobileRaw, $mobileDigits) {
                    $q->where('phone', $mobileRaw)
                        ->orWhere('phone', $mobileDigits)
                        ->orWhereRaw("REPLACE(REPLACE(REPLACE(REPLACE(phone, '+', ''), '-', ''), ' ', ''), ' ', '') = ?", [$mobileDigits]);
                })
                ->first();
        }

        $loginId = $identifier !== '' ? $identifier : $mobileRaw;

        if (! $user || ! Hash::check($request->password, $user->password)) {
            RateLimiter::hit($key, 900);
            LoginLog::create([
                'school_id' => $user?->school_id ?? 1,
                'user_id' => $user?->id,
                'email' => $loginId,
                'status' => 'failed',
                'ip_address' => $request->ip() ?? '',
                'user_agent' => $request->userAgent() ?? '',
            ]);

            return $this->error('Invalid credentials.', 401);
        }

        // Super Admin must never be blocked by approval/fee flags meant for students/staff.
        if (RegistrationGuard::isSuperAdmin($user)) {
            $hardBlocked = in_array($user->account_status, [
                AccountStatus::SUSPENDED,
                AccountStatus::BANNED,
                AccountStatus::REJECTED,
            ], true);

            if (! $hardBlocked && $user->account_status !== AccountStatus::ACTIVE) {
                $user->forceFill([
                    'account_status' => AccountStatus::ACTIVE,
                    'approval_status' => ApprovalStatus::APPROVED,
                    'fee_cleared' => true,
                ])->save();
            }
        }

        if (! RegistrationGuard::canLogin($user)) {
            LoginLog::create([
                'school_id' => $user->school_id,
                'user_id' => $user->id,
                'email' => $loginId,
                'status' => 'failed',
                'ip_address' => $request->ip() ?? '',
                'user_agent' => $request->userAgent() ?? '',
            ]);

            return $this->error(RegistrationGuard::loginBlockMessage($user), 403);
        }

        RateLimiter::clear($key);
        LoginLog::create([
            'school_id' => $user->school_id,
            'user_id' => $user->id,
            'email' => $user->email ?: $loginId,
            'status' => 'success',
            'ip_address' => $request->ip() ?? '',
            'user_agent' => $request->userAgent() ?? '',
        ]);

        // One active SPA token keeps login fast on shared MySQL/MariaDB.
        $user->tokens()->where('name', 'spa')->delete();
        $token = $user->createToken('spa')->plainTextToken;

        $user->loadMissing('roles', 'school');

        $permissions = [];
        try {
            $permissions = $user->getAllPermissions()->pluck('name')->values()->all();
        } catch (\Throwable) {
            $permissions = [];
        }

        return $this->success([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->primaryRoleName(),
                'school' => $user->school?->only(['id', 'name', 'logo']),
                'permissions' => $permissions,
            ],
        ], 'Login successful');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();
        return $this->success(null, 'Logged out');
    }

    public function sendResetLink(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
        ]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return $this->success(null, __($status));
        }

        return $this->error(__($status), 422);
    }

    public function reset(Request $request): JsonResponse
    {
        $request->validate([
            'token' => 'required|string',
            'email' => 'required|email',
            'password' => 'required|confirmed|min:8',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                    'failed_login_attempts' => 0,
                    'locked_until' => null,
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            return $this->success(null, __($status));
        }

        return $this->error(__($status), 422);
    }
}
