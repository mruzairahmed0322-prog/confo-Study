import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

interface CertForm {
    student_id: string;
    title: string;
    type: string;
    issue_date: string;
    notes: string;
}

const emptyForm: CertForm = {
    student_id: '', title: '', type: 'completion', issue_date: '', notes: '',
};

export default function CertificatesPage() {
    const certFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'class', key: 'class_id' },
        { type: 'select', key: 'type' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(certFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [approveId, setApproveId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState<CertForm>(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('certificates.create');
    const canApprove = hasPermission('certificates.approve');
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['certificates', page, search, filters],
        queryFn: () => apiGet('/certificates', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const { data: studentsData } = useQuery({
        queryKey: ['students-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/students', { per_page: 100 }),
        staleTime: 60_000,
    });
    const students = studentsData?.data ?? [];

    const saveMutation = useMutation({
        mutationFn: (body: CertForm) => {
            const payload = {
                student_id: Number(body.student_id),
                title: body.title,
                type: body.type,
                issue_date: body.issue_date || null,
                notes: body.notes || null,
            };
            return editId ? apiPut(`/certificates/${editId}`, payload) : apiPost('/certificates', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['certificates'] });
            toast(editId ? 'Certificate updated' : 'Certificate created');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
        },
        onError: () => toast(editId ? 'Update failed' : 'Create failed', 'error'),
    });

    const approveMutation = useMutation({
        mutationFn: (id: number) => apiPut(`/certificates/${id}/approve`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['certificates'] });
            toast('Certificate approved');
            setApproveId(null);
        },
        onError: () => toast('Approval failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/certificates/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['certificates'] });
            toast('Certificate deleted');
            setDeleteId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const openCreate = () => {
        setEditId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({
            student_id: row.student_id ? String(row.student_id) : '',
            title: String(row.title ?? ''),
            type: String(row.type ?? 'completion'),
            issue_date: row.issue_date && row.issue_date !== '—' ? String(row.issue_date) : '',
            notes: String(row.notes ?? ''),
        });
        setModalOpen(true);
    };

    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'type', label: 'Type' },
        { key: 'student', label: 'Student' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => (
            <Badge variant={String(r.status) === 'approved' ? 'active' : String(r.status) === 'draft' ? 'inactive' : 'pending'}>
                {String(r.status)}
            </Badge>
        )},
        { key: 'issue_date', label: 'Issue Date' },
        { key: 'issued_by', label: 'Issued By' },
        {
            key: 'actions', label: 'Actions',
            render: (r: Record<string, unknown>) => (
                <ActionButtonGroup>
                    {canApprove && ['draft', 'pending'].includes(String(r.status)) && (
                        <ActionIconButton
                            variant="approve"
                            title="Approve certificate"
                            onClick={(e) => { e.stopPropagation(); setApproveId(Number(r.id)); }}
                        />
                    )}
                    {canCreate && (
                        <ActionIconButton
                            variant="edit"
                            title="Edit certificate"
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        />
                    )}
                    {canCreate && (
                        <ActionIconButton
                            variant="delete"
                            title="Delete certificate"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(Number(r.id)); }}
                        />
                    )}
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Certificates"
                subtitle="Student certificates management"
                actions={canCreate ? (
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="h-4 w-4" /> Create Certificate
                    </Button>
                ) : undefined}
            />
            <DataTable
                columns={columns}
                data={data as never}
                loading={isLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                emptyMessage="No certificates yet"
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                filters={<ListFilters preset="certificates" values={filters} onChange={setFilter} />}
            />

            <Modal open={modalOpen && canCreate} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Certificate' : 'Create Certificate'}>
                <form onSubmit={e => { e.preventDefault(); if (!canCreate) return; saveMutation.mutate(form); }} className="space-y-4">
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Student</label>
                        <select value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm" required>
                            <option value="">Select student</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Type</label>
                            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                <option value="completion">Completion</option>
                                <option value="achievement">Achievement</option>
                                <option value="participation">Participation</option>
                                <option value="merit">Merit</option>
                            </select>
                        </div>
                        <Input label="Issue Date" type="date" value={form.issue_date} onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} />
                    </div>
                    <Input label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">
                        {editId ? 'Save Changes' : 'Create Certificate'}
                    </Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!approveId}
                type="success"
                title="Approve Certificate?"
                message="This will mark the certificate as approved and issue it to the student."
                confirmText="Approve"
                loading={approveMutation.isPending}
                onConfirm={() => approveId && approveMutation.mutate(approveId)}
                onCancel={() => setApproveId(null)}
            />

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Certificate?"
                message="This will permanently remove this certificate."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
