import { useInstantQuery } from '@/lib/useInstantQuery';
import { apiGet } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

export default function ActivityLogsPage() {
    const logFilters = emptyFilterValues([
        { type: 'action', key: 'action' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(logFilters);

    const { data, isInitialLoading } = useInstantQuery({
        queryKey: ['activity-logs', page, search, filters],
        queryFn: () => apiGet('/activity-logs', { page, search, ...apiParams }),
    });

    const columns = [
        { key: 'action', label: 'Action' },
        { key: 'description', label: 'Description', hideOnMobile: true },
        { key: 'user', label: 'User' },
        { key: 'ip_address', label: 'IP', hideOnMobile: true },
        { key: 'created_at', label: 'Date' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Activity Logs" subtitle="System audit trail" badge="Superadmin" />
            <DataTable
                columns={columns}
                data={data as never}
                loading={isInitialLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                emptyMessage="No activity logs found"
                filters={<ListFilters preset="activityLogs" values={filters} onChange={setFilter} />}
            />
        </div>
    );
}
