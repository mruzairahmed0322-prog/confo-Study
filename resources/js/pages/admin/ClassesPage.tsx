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

const emptyForm = { name: '', section: '', capacity: '40', status: 'active' };

export default function ClassesPage() {
    const classFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(classFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('classes.create');
    const canEdit = hasPermission('classes.edit');
    const canDelete = hasPermission('classes.delete');
    const canManage = canCreate || canEdit;
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['classes', page, search, filters],
        queryFn: () => apiGet('/classes', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const saveMutation = useMutation({
        mutationFn: (body: typeof emptyForm) => {
            const payload = { ...body, capacity: Number(body.capacity) };
            return editId ? apiPut(`/classes/${editId}`, payload) : apiPost('/classes', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['classes'] });
            qc.invalidateQueries({ queryKey: ['classes-list'] });
            toast(editId ? 'Class updated' : 'Class created');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
        },
        onError: () => toast(editId ? 'Failed to update class' : 'Failed to create class', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/classes/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['classes'] });
            qc.invalidateQueries({ queryKey: ['classes-list'] });
            toast('Class deleted');
            setDeleteId(null);
        },
        onError: () => toast('Failed to delete class', 'error'),
    });

    const openCreate = () => {
        setEditId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({
            name: String(row.class_name ?? row.name ?? ''),
            section: String(row.section ?? ''),
            capacity: String(row.capacity ?? '40'),
            status: String(row.status ?? 'active'),
        });
        setModalOpen(true);
    };

    const columns = [
        { key: 'name', label: 'Class' },
        { key: 'capacity', label: 'Capacity' },
        { key: 'students_count', label: 'Students' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        {
            key: 'actions',
            label: 'Actions',
            render: (r: Record<string, unknown>) => (
                (canEdit || canDelete) ? (
                    <ActionButtonGroup>
                        {canEdit && (
                            <ActionIconButton
                                variant="edit"
                                title="Edit class"
                                onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                            />
                        )}
                        {canDelete && (
                            <ActionIconButton
                                variant="delete"
                                title="Delete class"
                                onClick={(e) => { e.stopPropagation(); setDeleteId(Number(r.id)); }}
                            />
                        )}
                    </ActionButtonGroup>
                ) : null
            ),
        },
    ];

    const formFields = (
        <>
            <Input label="Class Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g. Grade 10" />
            <Input label="Section" value={form.section} onChange={e => setForm(p => ({ ...p, section: e.target.value }))} placeholder="e.g. A" />
            <Input label="Capacity" type="number" value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} />
            <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                className="admin-input w-full px-3 py-2 text-sm"
            >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>
        </>
    );

    return (
        <div className="space-y-6">
            <PageHeader
                title="Classes"
                subtitle="Manage school classes and sections"
                actions={canCreate ? (
                    <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Class</Button>
                ) : undefined}
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
                filters={<ListFilters preset="classes" values={filters} onChange={setFilter} />}
            />

            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Class' : 'Add Class'}>
                <form onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }} className="space-y-4">
                    {formFields}
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">
                        {editId ? 'Save Changes' : 'Create Class'}
                    </Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Class?"
                message="This will permanently remove this class. Classes with enrolled students cannot be deleted."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
