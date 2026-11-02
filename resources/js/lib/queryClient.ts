import { QueryClient } from '@tanstack/react-query';

import { clearQueryCache, hydrateQueryCache, setCachedQueryData } from './queryPersist';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 10 * 60 * 1000,
            gcTime: 24 * 60 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: false,
            placeholderData: (prev: unknown) => prev,
        },
    },
});

hydrateQueryCache((key, data) => {
    queryClient.setQueryData(key, data);
});

queryClient.getQueryCache().subscribe((event) => {
    if (event.type !== 'updated') return;
    const { query } = event;
    if (query.state.data === undefined || query.state.status !== 'success') return;
    setCachedQueryData(query.queryKey, query.state.data);
});

/** Drop in-memory + persisted query data (call on login/logout so roles never share caches). */
export function resetAppQueries() {
    queryClient.clear();
    clearQueryCache();
}

interface PrefetchItem {
    queryKey: readonly unknown[];
    url: string;
    params?: Record<string, unknown>;
}

function immediatePrefetch(userId: number, role?: string): PrefetchItem[] {
    return [{ queryKey: ['dashboard', userId, role ?? 'guest'], url: '/dashboard' }];
}

const IDLE_PREFETCH: PrefetchItem[] = [
    { queryKey: ['approvals'], url: '/approvals' },
    { queryKey: ['roles'], url: '/roles' },
    { queryKey: ['settings'], url: '/settings' },
    { queryKey: ['system-settings'], url: '/system-settings' },
];

function prefetchQueryItem({ queryKey, url, params }: PrefetchItem) {
    return queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
            const { apiGet } = await import('./api');
            return apiGet(url, params);
        },
    }).catch(() => {});
}

/** Warm dashboard immediately; defer other caches until the browser is idle. */
export function prefetchEssentialData(userId?: number, role?: string) {
    if (userId != null) {
        immediatePrefetch(userId, role).forEach(prefetchQueryItem);
    }

    const scheduleIdle = () => {
        IDLE_PREFETCH.forEach(prefetchQueryItem);
    };

    if ('requestIdleCallback' in window) {
        window.requestIdleCallback(scheduleIdle, { timeout: 4000 });
    } else {
        setTimeout(scheduleIdle, 1500);
    }
}
