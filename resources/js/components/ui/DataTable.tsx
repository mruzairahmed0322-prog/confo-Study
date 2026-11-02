import { useState, useEffect, useRef } from 'react';

import { useVirtualizer } from '@tanstack/react-virtual';

import { Search, Filter, X, RotateCcw } from 'lucide-react';

import { Button } from './Button';

import { Badge } from './Badge';

import { Pagination } from './Pagination';

import { cn } from '@/lib/utils';

const ROW_HEIGHT = 48;
const VIRTUAL_THRESHOLD = 50;
const VIRTUAL_MAX_HEIGHT = 600;

interface Column<T> {
    key: string;
    label: string;
    render?: (row: T) => React.ReactNode;
    sortable?: boolean;
    hideOnMobile?: boolean;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data?: PaginatedData<T>;
    loading?: boolean;
    search?: string;
    onSearch?: (q: string) => void;
    onPageChange?: (page: number) => void;
    filters?: React.ReactNode;
    activeFilterCount?: number;
    onClearFilters?: () => void;
    actions?: React.ReactNode;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
    virtualScroll?: boolean;
}

export function DataTable<T extends Record<string, unknown>>({
    columns, data, loading, search, onSearch, onPageChange, filters, activeFilterCount = 0,
    onClearFilters, actions, onRowClick, emptyMessage = 'No data found', virtualScroll,
}: DataTableProps<T>) {
    const [showFilters, setShowFilters] = useState(false);
    const [localSearch, setLocalSearch] = useState(search ?? '');
    const scrollRef = useRef<HTMLDivElement>(null);

    const rows = data?.data ?? [];
    const showLoading = loading && rows.length === 0;
    const shouldVirtualize = virtualScroll ?? (rows.length >= VIRTUAL_THRESHOLD || (data?.total ?? 0) >= 1000);
    const hasActiveFilters = activeFilterCount > 0;

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 8,
        enabled: shouldVirtualize && rows.length > 0,
    });

    useEffect(() => {
        setLocalSearch(search ?? '');
    }, [search]);

    useEffect(() => {
        if (!onSearch) return;
        const timer = setTimeout(() => onSearch(localSearch), 300);
        return () => clearTimeout(timer);
    }, [localSearch, onSearch]);

    useEffect(() => {
        if (hasActiveFilters || filters) setShowFilters(true);
    }, [hasActiveFilters, filters]);

    const renderRow = (row: T, i: number) => (
        <tr
            key={i}
            onClick={() => onRowClick?.(row)}
            className={cn(onRowClick && 'cursor-pointer')}
            style={shouldVirtualize ? { height: ROW_HEIGHT } : undefined}
        >
            {columns.map(col => (
                <td
                    key={col.key}
                    className={cn(
                        'px-4 py-3 text-sm font-medium',
                        col.hideOnMobile && 'hidden sm:table-cell',
                    )}
                >
                    {col.render ? col.render(row) : String(row[col.key] ?? '—')}
                </td>
            ))}
        </tr>
    );

    const renderBody = () => {
        if (showLoading) {
            return Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                    {columns.map(col => (
                        <td key={col.key} className={cn('px-4 py-3', col.hideOnMobile && 'hidden sm:table-cell')}>
                            <div className="h-4 animate-pulse rounded bg-emerald-500/10" />
                        </td>
                    ))}
                </tr>
            ));
        }

        if (!rows.length) {
            return (
                <tr><td colSpan={columns.length}>
                    <div className="admin-empty-state">
                        <p className="text-sm font-medium">{emptyMessage}</p>
                    </div>
                </td></tr>
            );
        }

        if (shouldVirtualize) {
            const virtualRows = virtualizer.getVirtualItems();
            const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
            const paddingBottom = virtualRows.length > 0
                ? virtualizer.getTotalSize() - virtualRows[virtualRows.length - 1].end
                : 0;

            return (
                <>
                    {paddingTop > 0 && (
                        <tr><td colSpan={columns.length} style={{ height: paddingTop, padding: 0, border: 0 }} /></tr>
                    )}
                    {virtualRows.map(vRow => renderRow(rows[vRow.index], vRow.index))}
                    {paddingBottom > 0 && (
                        <tr><td colSpan={columns.length} style={{ height: paddingBottom, padding: 0, border: 0 }} /></tr>
                    )}
                </>
            );
        }

        return rows.map((row, i) => renderRow(row, i));
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
                    {onSearch && (
                        <div className="relative flex-1 sm:max-w-md">
                            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 admin-page-sub" />
                            <input
                                type="search"
                                value={localSearch}
                                onChange={e => setLocalSearch(e.target.value)}
                                placeholder="Search live..."
                                className="admin-input w-full py-2.5 ps-10 pe-10 text-sm"
                            />
                            {localSearch && (
                                <button
                                    type="button"
                                    onClick={() => setLocalSearch('')}
                                    className="absolute end-3 top-1/2 -translate-y-1/2 rounded-md p-0.5 admin-page-sub hover:admin-page-title transition-colors"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        {filters && (
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className="relative"
                            >
                                <Filter className="h-4 w-4" />
                                Filters
                                {hasActiveFilters && (
                                    <span className="admin-filter-badge ms-1">{activeFilterCount}</span>
                                )}
                            </Button>
                        )}
                        {hasActiveFilters && onClearFilters && (
                            <Button variant="ghost" size="sm" onClick={onClearFilters}>
                                <RotateCcw className="h-3.5 w-3.5" />
                                Clear
                            </Button>
                        )}
                    </div>
                </div>

                {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>

            {showFilters && filters && (
                <div className="admin-filter-panel animate-fade-in-up">
                    {filters}
                </div>
            )}

            <div className="admin-table-wrap">
                <div
                    ref={shouldVirtualize ? scrollRef : undefined}
                    className={cn('admin-table-scroll', shouldVirtualize && 'admin-table-sticky')}
                    style={shouldVirtualize ? { maxHeight: VIRTUAL_MAX_HEIGHT, overflowY: 'auto' } : undefined}
                >
                    <table className="admin-table min-w-full">
                        <thead>
                            <tr>
                                {columns.map(col => (
                                    <th
                                        key={col.key}
                                        className={cn(
                                            'px-4 py-3 text-start text-xs font-bold uppercase tracking-wider',
                                            col.hideOnMobile && 'hidden sm:table-cell',
                                        )}
                                    >
                                        {col.label}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-500/8">
                            {renderBody()}
                        </tbody>
                    </table>
                </div>

                {data && onPageChange && (
                    <div className="border-t border-emerald-500/10 px-4 py-3">
                        <Pagination meta={data} onPageChange={onPageChange} />
                    </div>
                )}
            </div>
        </div>
    );
}

export { Badge };
