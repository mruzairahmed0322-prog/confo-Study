import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ViewSlipButton } from '@/components/documents/ViewSlipButton';
import { PrintSlipButton } from '@/components/documents/PrintSlipButton';
import { ActionButtonGroup } from '@/components/ui/ActionIconButton';
import { formatCurrency } from '@/lib/utils';
import { ListFilters, usePagedList } from '@/lib/listFilters';

const METHOD_LABELS: Record<string, string> = {
    cash: 'Cash',
    bank_transfer: 'Bank Transfer',
    card: 'Card',
    online: 'Online',
};

export default function FeeReceiptsPage() {
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList({
        name: '', status: 'paid', class_id: '', from: '', to: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['fee-payments', page, search, filters],
        queryFn: () => apiGet('/fees/payments', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const columns = [
        { key: 'receipt_no', label: 'Receipt #' },
        { key: 'student', label: 'Student' },
        { key: 'class', label: 'Class' },
        { key: 'month_label', label: 'Description' },
        {
            key: 'payment_method',
            label: 'Method',
            render: (r: Record<string, unknown>) => METHOD_LABELS[String(r.payment_method ?? '')] ?? String(r.payment_method ?? '—'),
        },
        { key: 'amount', label: 'Amount', render: (r: Record<string, unknown>) => formatCurrency(Number(r.amount)) },
        { key: 'paid_at', label: 'Paid Date' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        {
            key: 'actions',
            label: 'Slip',
            render: (r: Record<string, unknown>) => (
                <ActionButtonGroup>
                    <ViewSlipButton slipUrl={`/fees/payments/${r.id}/slip`} label="View Receipt" />
                    <PrintSlipButton slipUrl={`/fees/payments/${r.id}/slip`} label="Print Receipt" />
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fee Receipts / Paid Slips"
                subtitle="All student fee payment receipts — print paid slip for parents"
            />
            <DataTable
                columns={columns}
                data={data as never}
                loading={isLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                filters={<ListFilters preset="feeReceipts" values={filters} onChange={setFilter} />}
            />
        </div>
    );
}
