import { useInstantQuery } from '@/lib/useInstantQuery';
import { apiGet } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

export default function LoginLogsPage() {
    const logFilters = emptyFilterValues([
        { type: 'status', key: 'status' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(logFilters);

    const { data, isInitialLoading } = useInstantQuery({
        queryKey: ['login-logs', page, search, filters],
        queryFn: () => apiGet('/login-logs', { page, search, ...apiParams }),
    });

    const columns = [
        { key: 'email', label: 'Email' },
        { key: 'user', label: 'User', hideOnMobile: true },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => (
            <Badge variant={String(r.status) === 'success' ? 'active' : String(r.status) === 'failed' ? 'inactive' : 'pending'}>
                {String(r.status)}
            </Badge>
        )},
        { key: 'ip_address', label: 'IP', hideOnMobile: true },
        { key: 'created_at', label: 'Date' },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Login Logs" subtitle="Authentication history" badge="Superadmin" />
            <DataTable
                columns={columns}
                data={data as never}
                loading={isInitialLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                emptyMessage="No login logs found"
                filters={<ListFilters preset="loginLogs" values={filters} onChange={setFilter} />}
            />
        </div>
    );
}
