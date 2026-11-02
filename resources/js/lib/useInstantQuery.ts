import {
    useQuery,
    type UseQueryOptions,
    type UseQueryResult,
} from '@tanstack/react-query';

import { getCachedQueryEntry, getCachedQueryData } from './queryPersist';

type InstantQueryOptions<T> = UseQueryOptions<T, Error, T, readonly unknown[]> & {
    queryKey: readonly unknown[];
    /** Skip persisted cache when the payload fails this check (e.g. legacy dashboard without sections). */
    validateCache?: (data: T) => boolean;
};

export function useInstantQuery<T>(
    options: InstantQueryOptions<T>,
): UseQueryResult<T, Error> & { isInitialLoading: boolean } {
    const { validateCache, placeholderData, ...queryOptions } = options;
    const cached = getCachedQueryEntry(options.queryKey);
    const rawCached = cached?.data as T | undefined;
    const cachedData = rawCached && (!validateCache || validateCache(rawCached)) ? rawCached : undefined;

    const resolvedPlaceholder =
        placeholderData ??
        ((prev: T | undefined) => prev ?? getCachedQueryData<T>(options.queryKey));

    const result = useQuery<T, Error, T, readonly unknown[]>({
        staleTime: 10 * 60 * 1000,
        gcTime: 24 * 60 * 60 * 1000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        placeholderData: resolvedPlaceholder as UseQueryOptions<T, Error, T, readonly unknown[]>['placeholderData'],
        initialData: cachedData,
        initialDataUpdatedAt: cachedData ? cached?.updatedAt : undefined,
        ...queryOptions,
    });

    const hasData = result.data !== undefined;
    const isInitialLoading = result.isLoading && !hasData;

    return {
        ...result,
        isLoading: isInitialLoading,
        isInitialLoading,
    } as UseQueryResult<T, Error> & { isInitialLoading: boolean };
}
