<?php

namespace App\Support;

use App\ApprovalStatus;
use App\AccountStatus;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class RegistrationGuard
{
    private const MIN_SECONDS = 4;
    private const MAX_PER_IP_HOUR = 3;

    /** @var list<string> */
    private const DISPOSABLE_DOMAINS = [
        'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
        'yopmail.com', '10minutemail.com', 'fakeinbox.com', 'trashmail.com',
    ];

    public static function validateSecurity(Request $request): void
    {
        if ($request->filled('website')) {
            throw ValidationException::withMessages([
                'email' => __('ui.registration_blocked'),
            ]);
        }

        $started = (int) $request->input('_form_started', 0);
        if ($started > 0 && (time() - $started) < self::MIN_SECONDS) {
            throw ValidationException::withMessages([
                'email' => __('ui.registration_too_fast'),
            ]);
        }

        $ipKey = 'register-ip:'.$request->ip();
        if (RateLimiter::tooManyAttempts($ipKey, self::MAX_PER_IP_HOUR)) {
            throw ValidationException::withMessages([
                'email' => __('ui.registration_rate_limit'),
            ]);
        }

        $email = strtolower((string) $request->input('email', ''));
        $domain = substr(strrchr($email, '@') ?: '', 1);
        if (in_array($domain, self::DISPOSABLE_DOMAINS, true)) {
            throw ValidationException::withMessages([
                'email' => __('ui.disposable_email_blocked'),
            ]);
        }

        $phone = preg_replace('/\D/', '', (string) $request->input('phone', ''));
        if ($phone && Cache::has('reg-phone:'.$phone)) {
            throw ValidationException::withMessages([
                'phone' => __('ui.duplicate_phone'),
            ]);
        }
    }

    public static function hit(Request $request): void
    {
        RateLimiter::hit('register-ip:'.$request->ip(), 3600);

        $phone = preg_replace('/\D/', '', (string) $request->input('phone', ''));
        if ($phone) {
            Cache::put('reg-phone:'.$phone, true, 3600);
        }
    }

    /** @return list<string> */
    public static function publicRoles(): array
    {
        return [];
    }

    public static function registrationDisabled(): bool
    {
        return true;
    }

    /** Roles that only Super Admin can create (not self-registration). */
    public static function adminOnlyRoles(): array
    {
        return ['student', 'teacher', 'admin', 'accountant', 'reception', 'school-owner'];
    }

    public static function mapRole(string $role): string
    {
        return match ($role) {
            'staff' => 'reception',
            default => $role,
        };
    }

    public static function isSuperAdmin(?\App\Models\User $user): bool
    {
        return $user?->hasRole('school-owner') ?? false;
    }

    public static function canLogin(\App\Models\User $user): bool
    {
        if (self::isSuperAdmin($user)) {
            // Allow active or unset status; never block Super Admin on fee/approval flags.
            $status = $user->account_status;
            if ($status === null || $status === '') {
                return true;
            }

            return $status === AccountStatus::ACTIVE;
        }

        return $user->account_status === AccountStatus::ACTIVE
            && $user->approval_status === ApprovalStatus::APPROVED
            && $user->fee_cleared;
    }

    public static function loginBlockMessage(\App\Models\User $user): string
    {
        if ($user->approval_status === ApprovalStatus::REJECTED || $user->account_status === AccountStatus::REJECTED) {
            return $user->rejection_reason ?: __('ui.account_rejected');
        }

        if ($user->approval_status === ApprovalStatus::PENDING || $user->account_status === AccountStatus::PENDING) {
            return __('ui.account_pending_approval');
        }

        if ($user->account_status === AccountStatus::FEE_PENDING || ! $user->fee_cleared) {
            return __('ui.account_fee_pending');
        }

        if ($user->account_status === AccountStatus::SUSPENDED) {
            return __('ui.account_suspended');
        }

        if ($user->account_status === AccountStatus::BANNED) {
            return __('ui.account_banned');
        }

        return __('ui.account_not_active');
    }
}
