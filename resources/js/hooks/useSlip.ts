import { useCallback, useRef, useState } from 'react';
import type { SlipData } from '@/lib/printSlip';
import { fetchSlip, getCachedSlip, prefetchSlip } from '@/lib/slipCache';

export function useSlip(slipUrl: string, preloadedSlip?: SlipData) {
    const [slip, setSlip] = useState<SlipData | null>(
        () => preloadedSlip ?? getCachedSlip(slipUrl) ?? null,
    );
    const [loading, setLoading] = useState(false);
    const prefetchTimer = useRef<ReturnType<typeof setTimeout>>();

    const loadSlip = useCallback(async (): Promise<SlipData | null> => {
        const cached = preloadedSlip ?? getCachedSlip(slipUrl);
        if (cached) {
            setSlip(cached);
            return cached;
        }

        setLoading(true);
        try {
            const data = await fetchSlip(slipUrl);
            setSlip(data);
            return data;
        } finally {
            setLoading(false);
        }
    }, [slipUrl, preloadedSlip]);

    const handlePrefetch = useCallback(() => {
        if (preloadedSlip || getCachedSlip(slipUrl)) return;
        clearTimeout(prefetchTimer.current);
        prefetchTimer.current = setTimeout(() => prefetchSlip(slipUrl), 60);
    }, [slipUrl, preloadedSlip]);

    const cancelPrefetch = useCallback(() => {
        clearTimeout(prefetchTimer.current);
    }, []);

    return { slip, loading, loadSlip, handlePrefetch, cancelPrefetch };
}
