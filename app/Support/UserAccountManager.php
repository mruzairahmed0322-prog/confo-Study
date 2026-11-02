<?php

namespace App\Support;

use App\AccountStatus;
use App\Models\ActivityLog;
use App\Models\User;

class UserAccountManager
{
    public static function isBlocked(User $user): bool
    {
        return in_array($user->account_status, [AccountStatus::SUSPENDED, AccountStatus::BANNED], true);
    }

    public static function block(User $user): void
    {
        if (RegistrationGuard::isSuperAdmin($user)) {
            abort(403, 'Cannot block a super admin account.');
        }

        abort_unless($user->school_id === auth()->user()?->school_id, 403);

        $user->update(['account_status' => AccountStatus::SUSPENDED]);
        $user->tokens()->delete();

        ActivityLog::create([
            'school_id' => $user->school_id,
            'user_id' => auth()->id(),
            'action' => 'block_user',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => auth()->user()?->name.' blocked '.$user->name.' ('.$user->email.').',
            'properties' => ['blocked_user_id' => $user->id],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    public static function unblock(User $user): void
    {
        if (RegistrationGuard::isSuperAdmin($user)) {
            return;
        }

        abort_unless($user->school_id === auth()->user()?->school_id, 403);

        $user->update(['account_status' => AccountStatus::ACTIVE]);

        ActivityLog::create([
            'school_id' => $user->school_id,
            'user_id' => auth()->id(),
            'action' => 'unblock_user',
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => auth()->user()?->name.' unblocked '.$user->name.' ('.$user->email.').',
            'properties' => ['unblocked_user_id' => $user->id],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }

    public static function loginStatusLabel(User $user): string
    {
        if (self::isBlocked($user)) {
            return 'blocked';
        }

        if (RegistrationGuard::canLogin($user)) {
            return 'active';
        }

        return $user->account_status;
    }
}
