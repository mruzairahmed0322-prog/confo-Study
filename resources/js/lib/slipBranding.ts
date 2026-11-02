export interface SlipBrandingSettings {
    primary_color: string;
    accent_color: string;
    bg_color: string;
    text_color: string;
    border_color: string;
    header_style: 'gradient' | 'solid';
    slip_theme: 'light' | 'dark' | 'auto';
    show_qr: boolean;
    show_logo: boolean;
    custom_footer: string;
}

export const SLIP_BRANDING_DEFAULTS: SlipBrandingSettings = {
    primary_color: '#059669',
    accent_color: '#84cc16',
    bg_color: '#ffffff',
    text_color: '#1a2e05',
    border_color: '#a7f3d0',
    header_style: 'gradient',
    slip_theme: 'light',
    show_qr: true,
    show_logo: true,
    custom_footer: '',
};

const STORAGE_KEY = 'slip_branding_v1';

export function mergeBranding(
    partial?: Partial<SlipBrandingSettings> | null,
): SlipBrandingSettings {
    return { ...SLIP_BRANDING_DEFAULTS, ...partial };
}

export function loadSlipBranding(schoolId?: number): SlipBrandingSettings {
    try {
        const key = schoolId ? `${STORAGE_KEY}_${schoolId}` : STORAGE_KEY;
        const raw = localStorage.getItem(key);
        if (raw) return mergeBranding(JSON.parse(raw));
    } catch { /* ignore */ }
    return { ...SLIP_BRANDING_DEFAULTS };
}

export function saveSlipBranding(settings: SlipBrandingSettings, schoolId?: number): void {
    const key = schoolId ? `${STORAGE_KEY}_${schoolId}` : STORAGE_KEY;
    localStorage.setItem(key, JSON.stringify(settings));
}

export function brandingCssVars(
    branding: SlipBrandingSettings,
    appDark: boolean,
): Record<string, string> {
    const isDark = branding.slip_theme === 'dark'
        || (branding.slip_theme === 'auto' && appDark);

    const primary = branding.primary_color;
    const accent = branding.accent_color;

    if (isDark) {
        return {
            '--slip-bg': '#0c1a14',
            '--slip-text': '#ecfdf5',
            '--slip-muted': '#86efac',
            '--slip-border': `${primary}55`,
            '--slip-primary': primary,
            '--slip-accent': accent,
            '--slip-header-bg': branding.header_style === 'gradient'
                ? `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
                : primary,
            '--slip-header-text': '#ffffff',
            '--slip-card-bg': '#0f2419',
            '--slip-row-alt': '#0a1f14',
            '--slip-total-bg': `${primary}22`,
        };
    }

    return {
        '--slip-bg': branding.bg_color,
        '--slip-text': branding.text_color,
        '--slip-muted': primary,
        '--slip-border': branding.border_color,
        '--slip-primary': primary,
        '--slip-accent': accent,
        '--slip-header-bg': branding.header_style === 'gradient'
            ? `linear-gradient(135deg, ${primary} 0%, ${accent} 100%)`
            : primary,
        '--slip-header-text': '#ffffff',
        '--slip-card-bg': branding.bg_color,
        '--slip-row-alt': `${primary}08`,
        '--slip-total-bg': `${primary}12`,
    };
}

export const BRANDING_PRESETS: { id: string; label: string; colors: Partial<SlipBrandingSettings> }[] = [
    { id: 'emerald', label: 'Emerald', colors: { primary_color: '#059669', accent_color: '#84cc16', border_color: '#a7f3d0', text_color: '#1a2e05', bg_color: '#ffffff' } },
    { id: 'ocean', label: 'Ocean Blue', colors: { primary_color: '#0284c7', accent_color: '#06b6d4', border_color: '#bae6fd', text_color: '#0c4a6e', bg_color: '#f0f9ff' } },
    { id: 'royal', label: 'Royal Purple', colors: { primary_color: '#7c3aed', accent_color: '#a855f7', border_color: '#e9d5ff', text_color: '#3b0764', bg_color: '#faf5ff' } },
    { id: 'sunset', label: 'Sunset', colors: { primary_color: '#ea580c', accent_color: '#f43f5e', border_color: '#fed7aa', text_color: '#431407', bg_color: '#fff7ed' } },
    { id: 'midnight', label: 'Midnight', colors: { primary_color: '#0f766e', accent_color: '#0891b2', border_color: '#99f6e4', text_color: '#0f172a', bg_color: '#f8fafc' } },
];
