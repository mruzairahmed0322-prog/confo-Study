import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useInstantQuery } from '@/lib/useInstantQuery';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { ArchiveRestore } from 'lucide-react';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { usePagedList } from '@/lib/listFilters';

interface ArchivedStudent extends Record<string, unknown> {
    id: number;
    name: string;
    father_name?: string;
    photo?: string;
    roll_no: string;
    gr_no?: string;
    class: string;
    section?: string;
    phone?: string;
    father_phone?: string;
    deleted_at?: string;
    status: string;
}

interface PaginatedArchived {
    data: ArchivedStudent[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export default function ArchivesPage() {
    const { page, setPage, search, setSearch, apiParams } = usePagedList({} as Record<string, string>);
    const [restoreId, setRestoreId] = useState<number | null>(null);
    const [forceId, setForceId] = useState<number | null>(null);
    const { toast } = useToast();
    const qc = useQueryClient();

    const { data, isInitialLoading } = useInstantQuery<PaginatedArchived>({
        queryKey: ['students-archived', page, search],
        queryFn: () => apiGet('/students/archived', { page, search, ...apiParams }),
    });

    const restoreMutation = useMutation({
        mutationFn: (id: number) => apiPost(`/students/${id}/restore`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['students-archived'] });
            qc.invalidateQueries({ queryKey: ['students'] });
            toast('Student restored');
            setRestoreId(null);
        },
        onError: () => toast('Restore failed', 'error'),
    });

    const forceMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/students/${id}/force`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['students-archived'] });
            toast('Student permanently deleted');
            setForceId(null);
        },
        onError: () => toast('Permanent delete failed', 'error'),
    });

    const formatDeletedAt = (value?: string) => {
        if (!value) return '—';
        try {
            return new Date(value).toLocaleString();
        } catch {
            return value;
        }
    };

    const columns = [
        {
            key: 'name', label: 'Student',
            render: (row: ArchivedStudent) => (
                <div className="flex items-center gap-3">
                    {row.photo ? (
                        <img src={row.photo} alt={row.name} className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-500/20" />
                    ) : (
                        <div className="admin-stat-icon flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">
                            {row.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <span className="font-semibold">{row.name}</span>
                        {row.father_name && <p className="text-xs admin-page-sub">S/O {row.father_name}</p>}
                    </div>
                </div>
            ),
        },
        { key: 'gr_no', label: 'GR No', render: (r: ArchivedStudent) => r.gr_no || '—' },
        { key: 'roll_no', label: 'Roll No' },
        { key: 'class', label: 'Class', render: (r: ArchivedStudent) => r.section ? `${r.class} (${r.section})` : r.class },
        { key: 'phone', label: 'Phone', render: (r: ArchivedStudent) => r.phone || r.father_phone || '—' },
        {
            key: 'deleted_at', label: 'Archived',
            render: (r: ArchivedStudent) => <span className="text-sm">{formatDeletedAt(r.deleted_at)}</span>,
        },
        {
            key: 'status', label: 'Status',
            render: () => <Badge variant="inactive">Archived</Badge>,
        },
        {
            key: 'actions', label: 'Actions',
            render: (row: ArchivedStudent) => (
                <ActionButtonGroup>
                    <ActionIconButton
                        variant="approve"
                        title="Restore student"
                        icon={ArchiveRestore}
                        onClick={(e) => { e.stopPropagation(); setRestoreId(row.id); }}
                    />
                    <ActionIconButton
                        variant="delete"
                        title="Delete permanently"
                        onClick={(e) => { e.stopPropagation(); setForceId(row.id); }}
                    />
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Archives"
                subtitle="Deleted students — restore or permanently remove"
            />

            <DataTable<ArchivedStudent>
                columns={columns}
                data={data}
                loading={isInitialLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
            />

            <ConfirmDialog
                open={restoreId !== null}
                type="info"
                title="Restore student?"
                message="This student will return to the Students list."
                confirmText="Restore"
                loading={restoreMutation.isPending}
                onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
                onCancel={() => setRestoreId(null)}
            />

            <ConfirmDialog
                open={forceId !== null}
                type="danger"
                title="Delete permanently?"
                message="This cannot be undone. Attendance, fees, and related records for this student will also be removed."
                confirmText="Delete Forever"
                loading={forceMutation.isPending}
                onConfirm={() => forceId && forceMutation.mutate(forceId)}
                onCancel={() => setForceId(null)}
            />
        </div>
    );
}
