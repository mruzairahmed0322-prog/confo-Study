import { memo } from 'react';
import { Palette, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Toggle';
import {
    BRANDING_PRESETS,
    SLIP_BRANDING_DEFAULTS,
    type SlipBrandingSettings,
} from '@/lib/slipBranding';

interface SlipBrandingPanelProps {
    branding: SlipBrandingSettings;
    onChange: (b: SlipBrandingSettings) => void;
    onSave?: () => void;
    saving?: boolean;
}

export const SlipBrandingPanel = memo(function SlipBrandingPanel({
    branding,
    onChange,
    onSave,
    saving,
}: SlipBrandingPanelProps) {
    const set = <K extends keyof SlipBrandingSettings>(key: K, value: SlipBrandingSettings[K]) => {
        onChange({ ...branding, [key]: value });
    };

    return (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-50/30 p-4 dark:border-emerald-700/30 dark:bg-emerald-950/20">
            <div className="mb-3 flex items-center justify-between">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-lime-300">
                    <Palette className="h-4 w-4" /> Invoice Branding
                </p>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onChange({ ...SLIP_BRANDING_DEFAULTS })}
                    title="Reset to defaults"
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Color presets */}
            <div className="mb-4 flex flex-wrap gap-2">
                {BRANDING_PRESETS.map((preset) => (
                    <button
                        key={preset.id}
                        type="button"
                        onClick={() => onChange({ ...branding, ...preset.colors })}
                        className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold transition hover:border-emerald-500/50 dark:border-emerald-700/40"
                        title={preset.label}
                    >
                        <span
                            className="h-3 w-3 rounded-full"
                            style={{ background: `linear-gradient(135deg, ${preset.colors.primary_color}, ${preset.colors.accent_color})` }}
                        />
                        {preset.label}
                    </button>
                ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ColorInput label="Primary Color" value={branding.primary_color} onChange={(v) => set('primary_color', v)} />
                <ColorInput label="Accent Color" value={branding.accent_color} onChange={(v) => set('accent_color', v)} />
                <ColorInput label="Background" value={branding.bg_color} onChange={(v) => set('bg_color', v)} />
                <ColorInput label="Text Color" value={branding.text_color} onChange={(v) => set('text_color', v)} />
                <ColorInput label="Border Color" value={branding.border_color} onChange={(v) => set('border_color', v)} />

                <Select
                    label="Header Style"
                    value={branding.header_style}
                    onChange={(v) => set('header_style', v as 'gradient' | 'solid')}
                    options={[
                        { value: 'gradient', label: 'Gradient' },
                        { value: 'solid', label: 'Solid' },
                    ]}
                />
                <Select
                    label="Slip Theme"
                    value={branding.slip_theme}
                    onChange={(v) => set('slip_theme', v as 'light' | 'dark' | 'auto')}
                    options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'auto', label: 'Auto (match app)' },
                    ]}
                />
            </div>

            <div className="mt-3 flex flex-wrap gap-4">
                <Toggle
                    label="Show QR Code"
                    checked={branding.show_qr}
                    onChange={(v) => set('show_qr', v)}
                />
                <Toggle
                    label="Show School Logo"
                    checked={branding.show_logo}
                    onChange={(v) => set('show_logo', v)}
                />
            </div>

            <div className="mt-3">
                <Input
                    label="Custom Footer Text"
                    value={branding.custom_footer}
                    onChange={(e) => set('custom_footer', e.target.value)}
                    placeholder="Optional custom footer message..."
                />
            </div>

            {onSave && (
                <div className="mt-3 flex justify-end">
                    <Button type="button" size="sm" onClick={onSave} loading={saving}>
                        Save as School Default
                    </Button>
                </div>
            )}
        </div>
    );
});

function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
    return (
        <div className="flex items-end gap-2">
            <Input label={label} value={value} onChange={(e) => onChange(e.target.value)} className="flex-1" />
            <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="mb-0.5 h-9 w-9 shrink-0 cursor-pointer rounded-lg border border-emerald-500/20 bg-transparent"
                title={label}
            />
        </div>
    );
}
