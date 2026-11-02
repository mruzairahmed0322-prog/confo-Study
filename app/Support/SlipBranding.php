<?php

namespace App\Support;

class SlipBranding
{
    public static function defaults(): array
    {
        return [
            'primary_color' => '#059669',
            'accent_color' => '#84cc16',
            'bg_color' => '#ffffff',
            'text_color' => '#1a2e05',
            'border_color' => '#a7f3d0',
            'header_style' => 'gradient',
            'slip_theme' => 'light',
            'show_qr' => true,
            'show_logo' => true,
            'custom_footer' => '',
        ];
    }

    public static function resolve(?int $schoolId = null): array
    {
        $defaults = self::defaults();
        $stored = school_setting('slip_branding', null, $schoolId);

        if (! is_array($stored)) {
            return $defaults;
        }

        return array_merge($defaults, array_intersect_key($stored, $defaults));
    }
}
