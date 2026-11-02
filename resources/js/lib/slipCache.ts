import { apiGet } from '@/lib/api';
import type { SlipData } from '@/lib/printSlip';

const cache = new Map<string, SlipData>();
const inflight = new Map<string, Promise<SlipData>>();

export function getCachedSlip(url: string): SlipData | undefined {
    return cache.get(url);
}

export function fetchSlip(url: string): Promise<SlipData> {
    const cached = cache.get(url);
    if (cached) return Promise.resolve(cached);

    const pending = inflight.get(url);
    if (pending) return pending;

    const promise = apiGet<SlipData>(url)
        .then((data) => {
            cache.set(url, data);
            inflight.delete(url);
            return data;
        })
        .catch((err) => {
            inflight.delete(url);
            throw err;
        });

    inflight.set(url, promise);
    return promise;
}

export function prefetchSlip(url: string): void {
    if (!cache.has(url) && !inflight.has(url)) {
        void fetchSlip(url).catch(() => {});
    }
}
