import { memo, useEffect, useState } from 'react';
import { generateQrDataUrl } from '@/lib/slipQr';

interface SlipQrCodeProps {
    payload: string;
    size?: number;
    className?: string;
}

export const SlipQrCode = memo(function SlipQrCode({ payload, size = 72, className }: SlipQrCodeProps) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        generateQrDataUrl(payload, size).then((url) => {
            if (active) setSrc(url);
        });
        return () => { active = false; };
    }, [payload, size]);

    if (!src) {
        return (
            <div
                className={className}
                style={{ width: size, height: size }}
                aria-hidden
            >
                <div className="h-full w-full animate-pulse rounded-md bg-[var(--slip-border)]" />
            </div>
        );
    }

    return (
        <img
            src={src}
            alt="Verification QR Code"
            width={size}
            height={size}
            className={`rounded-md border border-[var(--slip-border)] bg-white p-0.5 ${className ?? ''}`}
            loading="lazy"
            decoding="async"
        />
    );
});
