import { useCallback, useMemo, useState } from 'react';

export function usePagedList<T extends Record<string, string>>(filterDefaults: T) {
    const [page, setPage] = useState(1);
    const [search, setSearchRaw] = useState('');
    const [filters, setFilters] = useState<T>(filterDefaults);

    const setSearch = useCallback((q: string) => {
        setSearchRaw(q);
        setPage(1);
    }, []);

    const setFilter = useCallback((key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }));
        setPage(1);
    }, []);

    const clearFilters = useCallback(() => {
        setFilters({ ...filterDefaults });
        setPage(1);
    }, []);

    const activeFilterCount = useMemo(
        () => Object.values(filters).filter(v => v !== '').length,
        [filters],
    );

    const apiParams = useMemo(
        () => Object.fromEntries(
            Object.entries(filters).filter(([, v]) => v !== ''),
        ) as Partial<T>,
        [filters],
    );

    return {
        page,
        setPage,
        search,
        setSearch,
        filters,
        setFilter,
        clearFilters,
        activeFilterCount,
        apiParams,
    };
}
