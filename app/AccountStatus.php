<?php

namespace App;

class AccountStatus
{
    public const PENDING = 'pending';
    public const FEE_PENDING = 'fee_pending';
    public const ACTIVE = 'active';
    public const SUSPENDED = 'suspended';
    public const BANNED = 'banned';
    public const REJECTED = 'rejected';

    public static function all(): array
    {
        return [
            self::PENDING,
            self::FEE_PENDING,
            self::ACTIVE,
            self::SUSPENDED,
            self::BANNED,
            self::REJECTED,
        ];
    }

    public static function label(string $status): string
    {
        return match ($status) {
            self::PENDING => __('ui.status_pending'),
            self::FEE_PENDING => __('ui.status_fee_pending'),
            self::ACTIVE => __('ui.active'),
            self::SUSPENDED => __('ui.status_suspended'),
            self::BANNED => __('ui.status_banned'),
            self::REJECTED => __('ui.status_rejected'),
            default => $status,
        };
    }
}
