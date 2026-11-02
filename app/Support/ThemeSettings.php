<?php

namespace App\Support;

class ThemeSettings
{
    public const PALETTES = [
        'emerald' => [
            'label' => 'Emerald Gold',
            'primary_from' => '#059669',
            'primary_to' => '#ca8a04',
            'accent_lime' => '#84cc16',
            'accent_yellow' => '#eab308',
            'bg' => '#f7fee7',
            'card' => 'rgba(255, 255, 255, 0.88)',
            'card_border' => 'rgba(5, 150, 105, 0.14)',
            'border' => '#d9f99d',
            'text' => '#1a2e05',
            'muted' => '#4d7c0f',
            'sidebar_from' => '#022c22',
            'sidebar_mid' => '#064e3b',
            'sidebar_to' => '#1c1917',
        ],
        'ocean' => [
            'label' => 'Ocean Blue',
            'primary_from' => '#0284c7',
            'primary_to' => '#06b6d4',
            'accent_lime' => '#22d3ee',
            'accent_yellow' => '#38bdf8',
            'bg' => '#f0f9ff',
            'card' => 'rgba(255, 255, 255, 0.9)',
            'card_border' => 'rgba(2, 132, 199, 0.14)',
            'border' => '#bae6fd',
            'text' => '#0c4a6e',
            'muted' => '#0369a1',
            'sidebar_from' => '#0c4a6e',
            'sidebar_mid' => '#075985',
            'sidebar_to' => '#082f49',
        ],
        'royal' => [
            'label' => 'Royal Purple',
            'primary_from' => '#7c3aed',
            'primary_to' => '#a855f7',
            'accent_lime' => '#c084fc',
            'accent_yellow' => '#e879f9',
            'bg' => '#faf5ff',
            'card' => 'rgba(255, 255, 255, 0.9)',
            'card_border' => 'rgba(124, 58, 237, 0.14)',
            'border' => '#e9d5ff',
            'text' => '#3b0764',
            'muted' => '#7e22ce',
            'sidebar_from' => '#2e1065',
            'sidebar_mid' => '#4c1d95',
            'sidebar_to' => '#1e1b4b',
        ],
        'sunset' => [
            'label' => 'Sunset Rose',
            'primary_from' => '#ea580c',
            'primary_to' => '#f43f5e',
            'accent_lime' => '#fb923c',
            'accent_yellow' => '#fbbf24',
            'bg' => '#fff7ed',
            'card' => 'rgba(255, 255, 255, 0.9)',
            'card_border' => 'rgba(234, 88, 12, 0.14)',
            'border' => '#fed7aa',
            'text' => '#431407',
            'muted' => '#c2410c',
            'sidebar_from' => '#431407',
            'sidebar_mid' => '#7c2d12',
            'sidebar_to' => '#1c1917',
        ],
        'midnight' => [
            'label' => 'Midnight Slate',
            'primary_from' => '#0f766e',
            'primary_to' => '#0891b2',
            'accent_lime' => '#2dd4bf',
            'accent_yellow' => '#22d3ee',
            'bg' => '#f8fafc',
            'card' => 'rgba(255, 255, 255, 0.92)',
            'card_border' => 'rgba(15, 118, 110, 0.12)',
            'border' => '#cbd5e1',
            'text' => '#0f172a',
            'muted' => '#475569',
            'sidebar_from' => '#0f172a',
            'sidebar_mid' => '#1e293b',
            'sidebar_to' => '#020617',
        ],
    ];

    public const FONT_SIZES = [
        'sm' => ['base' => '14px', 'scale' => '0.95'],
        'md' => ['base' => '16px', 'scale' => '1'],
        'lg' => ['base' => '18px', 'scale' => '1.08'],
        'xl' => ['base' => '20px', 'scale' => '1.15'],
    ];

    public static function defaults(): array
    {
        $palette = self::PALETTES['emerald'];

        return [
            'palette' => 'emerald',
            'primary_from' => $palette['primary_from'],
            'primary_to' => $palette['primary_to'],
            'accent_lime' => $palette['accent_lime'],
            'accent_yellow' => $palette['accent_yellow'],
            'bg_color' => $palette['bg'],
            'card_color' => $palette['card'],
            'card_border' => $palette['card_border'],
            'border_color' => $palette['border'],
            'text_color' => $palette['text'],
            'muted_color' => $palette['muted'],
            'sidebar_from' => $palette['sidebar_from'],
            'sidebar_mid' => $palette['sidebar_mid'],
            'sidebar_to' => $palette['sidebar_to'],
            'font_size' => 'md',
            'brand_name' => null,
            'brand_logo' => null,
            'header_style' => 'glass',
            'sidebar_style' => 'gradient',
        ];
    }

    public static function resolve(?int $schoolId = null): array
    {
        $defaults = self::defaults();
        $keys = array_keys($defaults);
        $resolved = [];

        foreach ($keys as $key) {
            $resolved[$key] = school_setting("theme_{$key}", $defaults[$key], $schoolId);
        }

        if (empty($resolved['brand_name'])) {
            $school = \App\Models\School::find($schoolId ?? current_school_id());
            $resolved['brand_name'] = $school?->name ?? 'ConfoStudy';
        }

        return $resolved;
    }

    public static function cssVariables(array $theme): array
    {
        $font = self::FONT_SIZES[$theme['font_size'] ?? 'md'] ?? self::FONT_SIZES['md'];

        return [
            '--color-primary-from' => $theme['primary_from'],
            '--color-primary-to' => $theme['primary_to'],
            '--color-accent-lime' => $theme['accent_lime'],
            '--color-accent-yellow' => $theme['accent_yellow'],
            '--color-bg' => $theme['bg_color'],
            '--color-card' => $theme['card_color'],
            '--color-card-border' => $theme['card_border'],
            '--color-border' => $theme['border_color'],
            '--color-text' => $theme['text_color'],
            '--color-muted' => $theme['muted_color'],
            '--sidebar-from' => $theme['sidebar_from'],
            '--sidebar-mid' => $theme['sidebar_mid'],
            '--sidebar-to' => $theme['sidebar_to'],
            '--font-size-base' => $font['base'],
            '--font-scale' => $font['scale'],
        ];
    }

    public static function paletteKeys(): array
    {
        return array_keys(self::PALETTES);
    }
}
