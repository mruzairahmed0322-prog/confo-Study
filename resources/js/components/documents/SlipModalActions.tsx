import { useState } from 'react';
import { Palette, Printer, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { defaultPrintOptions, printSlip, type SlipData, type PrintOptions } from '@/lib/printSlip';
import type { SlipBrandingSettings } from '@/lib/slipBranding';
import { SlipBrandingPanel } from '@/components/documents/SlipBrandingPanel';
import { useSaveSlipBranding } from '@/hooks/useSlipBranding';
import { useToast } from '@/contexts/ToastContext';

interface SlipModalActionsProps {
    slip: SlipData;
    branding: SlipBrandingSettings;
    onBrandingChange: (b: SlipBrandingSettings) => void;
    onClose: () => void;
}

export function SlipModalActions({ slip, branding, onBrandingChange, onClose }: SlipModalActionsProps) {
    const { toast } = useToast();
    const defaults = defaultPrintOptions(slip);
    const [copies, setCopies] = useState(String(defaults.copies ?? 1));
    const [size, setSize] = useState<'full' | 'half'>(defaults.size ?? 'full');
    const [showSettings, setShowSettings] = useState(false);
    const [printing, setPrinting] = useState(false);
    const saveBranding = useSaveSlipBranding();

    const handlePrint = async () => {
        const count = Number(copies);
        const labels = defaults.copyLabels ?? ['Copy 1'];
        const options: PrintOptions = {
            copies: count,
            size,
            copyLabels: count === 2 ? labels.slice(0, 2) : labels.slice(0, 1),
            branding,
        };
        setPrinting(true);
        try {
            await printSlip(slip, options);
        } finally {
            setPrinting(false);
        }
    };

    const handleSaveBranding = () => {
        saveBranding.mutate(branding, {
            onSuccess: () => toast('Invoice branding saved as school default', 'success'),
            onError: () => toast('Failed to save branding', 'error'),
        });
    };

    return (
        <div className="space-y-3">
            {showSettings && (
                <SlipBrandingPanel
                    branding={branding}
                    onChange={onBrandingChange}
                    onSave={handleSaveBranding}
                    saving={saveBranding.isPending}
                />
            )}
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div className="flex flex-wrap items-end gap-3">
                    <Select
                        label="Copies"
                        value={copies}
                        onChange={setCopies}
                        options={[
                            { value: '1', label: '1 Copy' },
                            { value: '2', label: '2 Copies (Office + Student)' },
                        ]}
                        className="min-w-[180px]"
                    />
                    <Select
                        label="Print Size"
                        value={size}
                        onChange={(v) => setSize(v as 'full' | 'half')}
                        options={[
                            { value: 'full', label: 'Full Size' },
                            { value: 'half', label: 'Half Size (2 on page)' },
                        ]}
                        className="min-w-[180px]"
                    />
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowSettings((s) => !s)}
                        title="Customize branding"
                    >
                        {showSettings ? <Settings2 className="h-4 w-4" /> : <Palette className="h-4 w-4" />}
                        {showSettings ? 'Hide' : 'Customize'}
                    </Button>
                </div>
                <div className="flex gap-3">
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button onClick={handlePrint} loading={printing}>
                        <Printer className="h-4 w-4" /> Print
                    </Button>
                </div>
            </div>
        </div>
    );
}
