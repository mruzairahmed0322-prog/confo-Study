import { memo } from 'react';
import { defaultPrintOptions, type SlipData } from '@/lib/printSlip';
import type { SlipBrandingSettings } from '@/lib/slipBranding';
import { SlipPreview } from '@/components/documents/SlipPreview';
import { SlipPreviewSkeleton } from '@/components/documents/SlipPreviewSkeleton';

interface SlipModalContentProps {
    slip: SlipData | null;
    loading: boolean;
    branding: SlipBrandingSettings;
}

export const SlipModalContent = memo(function SlipModalContent({
    slip,
    loading,
    branding,
}: SlipModalContentProps) {
    const printDefaults = slip ? defaultPrintOptions(slip) : null;
    const previewSize = printDefaults?.size ?? 'full';
    const showDualPreview = printDefaults?.copies === 2;

    if (loading && !slip) {
        return <SlipPreviewSkeleton dual={showDualPreview} />;
    }

    if (!slip) return null;

    if (showDualPreview) {
        return (
            <div className="grid gap-4 lg:grid-cols-2">
                <SlipPreview slip={slip} copyLabel="Office Copy" size={previewSize} branding={branding} />
                <SlipPreview slip={slip} copyLabel="Student Copy" size={previewSize} branding={branding} />
            </div>
        );
    }

    return <SlipPreview slip={slip} size={previewSize} branding={branding} />;
});
