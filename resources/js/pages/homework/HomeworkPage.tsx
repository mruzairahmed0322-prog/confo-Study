import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
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
import { asList } from '@/lib/listUtils';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

interface HomeworkForm {
    title: string;
    description: string;
    due_date: string;
    total_marks: string;
    status: string;
    school_class_id: string;
    subject_id: string;
}

const emptyForm: HomeworkForm = {
    title: '', description: '', due_date: '', total_marks: '100',
    status: 'draft', school_class_id: '', subject_id: '',
};

export default function HomeworkPage() {
    const homeworkFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(homeworkFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState<HomeworkForm>(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('homework.create');
    const canEdit = hasPermission('homework.edit');
    const canDelete = hasPermission('homework.delete');
    const canManage = canCreate || canEdit;
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['assignments', page, search, filters],
        queryFn: () => apiGet('/assignments', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['classes-list'],
        queryFn: () => apiGet('/students/classes'),
        staleTime: 60_000,
        select: asList<{ id: number; name: string }>,
    });

    const { data: subjectsData } = useQuery({
        queryKey: ['subjects-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/subjects', { per_page: 100 }),
        staleTime: 60_000,
    });
    const subjects = subjectsData?.data ?? [];

    const saveMutation = useMutation({
        mutationFn: (body: HomeworkForm) => {
            const payload = {
                ...body,
                total_marks: Number(body.total_marks),
                school_class_id: body.school_class_id ? Number(body.school_class_id) : null,
                subject_id: body.subject_id ? Number(body.subject_id) : null,
            };
            return editId
                ? apiPut(`/assignments/${editId}`, payload)
                : apiPost('/assignments', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['assignments'] });
            toast(editId ? 'Homework updated' : 'Homework created');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
        },
        onError: () => toast('Save failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/assignments/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['assignments'] });
            toast('Homework deleted');
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
            title: String(row.title ?? ''),
            description: String(row.description ?? ''),
            due_date: String(row.due_date ?? ''),
            total_marks: String(row.total_marks ?? '100'),
            status: String(row.status ?? 'draft'),
            school_class_id: row.school_class_id ? String(row.school_class_id) : '',
            subject_id: row.subject_id ? String(row.subject_id) : '',
        });
        setModalOpen(true);
    };

    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'class', label: 'Class' },
        { key: 'subject', label: 'Subject' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'total_marks', label: 'Marks' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        {
            key: 'actions', label: 'Actions',
            render: (r: Record<string, unknown>) => (
                (canEdit || canDelete) ? (
                <ActionButtonGroup>
                    {canEdit && (
                        <ActionIconButton
                            variant="edit"
                            title="Edit"
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        />
                    )}
                    {canDelete && (
                        <ActionIconButton
                            variant="delete"
                            title="Delete"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(Number(r.id)); }}
                        />
                    )}
                </ActionButtonGroup>
                ) : null
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Homework"
                subtitle={canManage ? 'Create and manage homework assignments' : 'View homework assignments'}
                actions={canCreate ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Homework</Button> : undefined}
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
                filters={<ListFilters preset="homework" values={filters} onChange={setFilter} />}
            />

            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Homework' : 'Add Homework'}>
                <form onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }} className="space-y-4">
                    <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Description</label>
                        <textarea
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            rows={3}
                            className="admin-input w-full px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                        <Input label="Total Marks" type="number" value={form.total_marks} onChange={e => setForm(p => ({ ...p, total_marks: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Class</label>
                            <select value={form.school_class_id} onChange={e => setForm(p => ({ ...p, school_class_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                <option value="">Select class</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Subject</label>
                            <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                <option value="">Select subject</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Status</label>
                        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                            <option value="closed">Closed</option>
                        </select>
                    </div>
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">
                        {editId ? 'Save Changes' : 'Create Homework'}
                    </Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={!!deleteId}
                type="warning"
                title="Delete Homework?"
                message="This homework assignment will be permanently deleted."
                confirmText="Delete"
                loading={deleteMutation.isPending}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                onCancel={() => setDeleteId(null)}
            />
        </div>
    );
}
