import { useInstantQuery } from '@/lib/useInstantQuery';
import { apiGet } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

export default function AuditLogsPage() {
    const logFilters = emptyFilterValues([
        { type: 'event', key: 'event' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(logFilters);

    const { data, isInitialLoading } = useInstantQuery({
        queryKey: ['audit-logs', page, search, filters],
        queryFn: () => apiGet('/audit-logs', { page, search, ...apiParams }),
    });

    const columns = [
        { key: 'event', label: 'Event', render: (r: Record<string, unknown>) => (
            <Badge variant={String(r.event) === 'created' ? 'active' : String(r.event) === 'deleted' ? 'inactive' : 'pending'}>
                {String(r.event)}
            </Badge>
        )},
        { key: 'model', label: 'Model' },
        { key: 'model_id', label: 'ID', hideOnMobile: true },
        { key: 'user', label: 'User' },
        { key: 'ip_address', label: 'IP', hideOnMobile: true },
        { key: 'created_at', label: 'Date' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Audit Logs" subtitle="Data change history" badge="Superadmin" />
            <DataTable
                columns={columns}
                data={data as never}
                loading={isInitialLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                emptyMessage="No audit logs found"
                filters={<ListFilters preset="auditLogs" values={filters} onChange={setFilter} />}
            />
        </div>
    );
}
