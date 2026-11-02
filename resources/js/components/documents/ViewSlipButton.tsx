import { useState } from 'react';
import type { SlipData } from '@/lib/printSlip';
import { useToast } from '@/contexts/ToastContext';
import { useSlip } from '@/hooks/useSlip';
import { useSlipBranding } from '@/hooks/useSlipBranding';
import { ActionIconButton } from '@/components/ui/ActionIconButton';
import { Modal } from '@/components/ui/Modal';
import { SlipModalContent } from '@/components/documents/SlipModalContent';
import { SlipModalActions } from '@/components/documents/SlipModalActions';

interface ViewSlipButtonProps {
    slipUrl: string;
    label?: string;
    className?: string;
    slip?: SlipData;
}

export function ViewSlipButton({ slipUrl, label = 'View', className, slip: preloadedSlip }: ViewSlipButtonProps) {
    const { toast } = useToast();
    const [open, setOpen] = useState(false);
    const { slip, loading, loadSlip, handlePrefetch, cancelPrefetch } = useSlip(slipUrl, preloadedSlip);
    const { branding, updateBranding } = useSlipBranding(preloadedSlip?.branding ?? slip?.branding);

    const handleView = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(true);
        try {
            await loadSlip();
        } catch {
            toast('Could not load document', 'error');
            setOpen(false);
        }
    };

    return (
        <>
            <ActionIconButton
                variant="view"
                onClick={handleView}
                onMouseEnter={handlePrefetch}
                onMouseLeave={cancelPrefetch}
                onFocus={handlePrefetch}
                className={className}
                title={label}
            />

            <Modal
                open={open}
                onClose={() => setOpen(false)}
                title={slip?.title ?? 'Document Preview'}
                size="2xl"
                fast
                footer={slip ? <SlipModalActions slip={slip} branding={branding} onBrandingChange={updateBranding} onClose={() => setOpen(false)} /> : undefined}
            >
                <SlipModalContent slip={slip} loading={loading} branding={branding} />
            </Modal>
        </>
    );
}
