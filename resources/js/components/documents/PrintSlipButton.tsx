import { useState } from 'react';
import type { SlipData } from '@/lib/printSlip';
import { useToast } from '@/contexts/ToastContext';
import { useSlip } from '@/hooks/useSlip';
import { useSlipBranding } from '@/hooks/useSlipBranding';
import { ActionIconButton } from '@/components/ui/ActionIconButton';
import { Modal } from '@/components/ui/Modal';
import { SlipModalContent } from '@/components/documents/SlipModalContent';
import { SlipModalActions } from '@/components/documents/SlipModalActions';

interface PrintSlipButtonProps {
    slipUrl: string;
    label?: string;
    className?: string;
    slip?: SlipData;
}

export function PrintSlipButton({ slipUrl, label = 'Print', className, slip: preloadedSlip }: PrintSlipButtonProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const { slip, loading, loadSlip, handlePrefetch, cancelPrefetch } = useSlip(slipUrl, preloadedSlip);
    const { branding, updateBranding } = useSlipBranding(preloadedSlip?.branding ?? slip?.branding);

    const handlePrint = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(true);
        try {
            await loadSlip();
        } catch {
            toast('Could not load slip for printing', 'error');
            setOpen(false);
        }
    };

    return (
        <>
            <ActionIconButton
                variant="print"
                onClick={handlePrint}
                onMouseEnter={handlePrefetch}
                onMouseLeave={cancelPrefetch}
                onFocus={handlePrefetch}
                className={className}
                title={label}
            />

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={slip ? `Print — ${slip.title}` : 'Print Document'}
                size="2xl"
                fast
                footer={slip ? <SlipModalActions slip={slip} branding={branding} onBrandingChange={updateBranding} onClose={() => setOpen(false)} /> : undefined}
            >
                <SlipModalContent slip={slip} loading={loading} branding={branding} />
            </Modal>
        </>
    );
}
