<?php

if (! function_exists('school_setting')) {
    /**
     * Retrieve a school-specific setting from cache or database.
     */
    function school_setting(string $key, mixed $default = null, ?int $schoolId = null): mixed
    {
        $schoolId = $schoolId ?? (auth()->user()?->school_id ?? 1);
        $cacheKey = "school_setting_{$schoolId}_{$key}";

        return cache()->remember($cacheKey, 3600, function () use ($key, $default, $schoolId) {
            $setting = \App\Models\SystemSetting::where('school_id', $schoolId)
                ->where('key', $key)
                ->first();

            if (! $setting) {
                return $default;
            }

            return match ($setting->type) {
                'integer' => (int) $setting->value,
                'boolean' => filter_var($setting->value, FILTER_VALIDATE_BOOLEAN),
                'json' => json_decode($setting->value, true),
                default => $setting->value,
            };
        });
    }
}

if (! function_exists('save_school_setting')) {
    /**
     * Persist a school-specific setting and clear its cache.
     */
    function save_school_setting(string $key, mixed $value, string $type = 'string', string $group = 'general', ?int $schoolId = null): void
    {
        $schoolId = $schoolId ?? current_school_id();
        $stored = is_array($value) ? json_encode($value) : (string) $value;

        \App\Models\SystemSetting::updateOrCreate(
            ['school_id' => $schoolId, 'key' => $key],
            ['value' => $stored, 'type' => $type, 'group' => $group]
        );

        cache()->forget("school_setting_{$schoolId}_{$key}");
    }
}

if (! function_exists('theme_settings')) {
    /**
     * Resolved theme/appearance settings for the current school.
     */
    function theme_settings(?int $schoolId = null): array
    {
        return \App\Support\ThemeSettings::resolve($schoolId);
    }
}

if (! function_exists('brand_name')) {
    function brand_name(?int $schoolId = null): string
    {
        return theme_settings($schoolId)['brand_name'] ?? config('app.name');
    }
}

if (! function_exists('school_logo_url')) {
    function school_logo_url(?int $schoolId = null): ?string
    {
        $logo = theme_settings($schoolId)['brand_logo'] ?? null;

        return $logo ? asset('storage/'.$logo) : null;
    }
}

if (! function_exists('format_currency')) {
    /**
     * Format an amount using the school's currency setting.
     */
    function format_currency(float|int|string $amount, ?int $schoolId = null): string
    {
        $schoolId = $schoolId ?? (auth()->user()?->school_id ?? 1);
        $school = \App\Models\School::find($schoolId);
        $currency = $school?->currency ?? 'PKR';

        return $currency.' '.number_format((float) $amount, 2);
    }
}

if (! function_exists('user_avatar')) {
    /**
     * Return the avatar URL for a user or a default placeholder.
     */
    function user_avatar(?\App\Models\User $user = null): string
    {
        $user = $user ?? auth()->user();

        if ($user && $user->avatar) {
            return asset('storage/'.$user->avatar);
        }

        $name = $user?->name ?? 'User';
        $initials = collect(explode(' ', $name))
            ->filter()
            ->take(2)
            ->map(fn ($part) => strtoupper(substr($part, 0, 1)))
            ->implode('');

        return 'https://ui-avatars.com/api/?name='.urlencode($initials ?: 'U').'&background=ca8a04&color=fff&size=128';
    }
}

if (! function_exists('current_school_id')) {
    /**
     * Get the current authenticated user's school ID.
     */
    function current_school_id(): int
    {
        return auth()->user()?->school_id ?? 1;
    }
}

if (! function_exists('role_label')) {
    /**
     * Human-readable role label for the authenticated (or given) user.
     */
    function role_label(?\App\Models\User $user = null): string
    {
        $user = $user ?? auth()->user();
        $role = $user?->primaryRoleName() ?? 'guest';
        $key = 'role_'.str_replace('-', '_', $role);
        $translated = __('ui.'.$key);

        return $translated !== 'ui.'.$key ? $translated : ucwords(str_replace('-', ' ', $role));
    }
}

if (! function_exists('role_badge_color')) {
    /**
     * Tailwind color token for role badge styling.
     */
    function role_badge_color(?\App\Models\User $user = null): string
    {
        $role = ($user ?? auth()->user())?->primaryRoleName() ?? 'guest';

        return match ($role) {
            'school-owner' => 'indigo',
            'admin' => 'violet',
            'teacher' => 'emerald',
            'parent' => 'sky',
            'accountant' => 'amber',
            'student' => 'rose',
            'librarian' => 'teal',
            default => 'slate',
        };
    }
}
