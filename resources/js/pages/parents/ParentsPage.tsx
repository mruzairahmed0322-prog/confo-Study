import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost, apiPut, apiPatch } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus } from 'lucide-react';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

interface Parent extends Record<string, unknown> {
    id: number;
    name: string;
    email: string;
    phone: string;
    children_count: number;
    status: string;
    login_status: string;
}

interface PaginatedParents {
    data: Parent[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

export default function ParentsPage() {
    const parentFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'loginStatus', key: 'login_status' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(parentFilters);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const emptyForm = { name: '', email: '', phone: '', password: '' };
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { isSuperAdmin, hasPermission } = useAuth();
    const canDelete = hasPermission('parents.delete');
    const qc = useQueryClient();

    const { data, isLoading } = useQuery<PaginatedParents>({
        queryKey: ['parents', page, search, filters],
        queryFn: () => apiGet('/parents', { page, search, ...apiParams }),
        placeholderData: (prev) => prev,
    });

    const createMutation = useMutation({
        mutationFn: (body: typeof form) => apiPost('/parents', body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['parents'] });
            toast('Parent added');
            setCreateOpen(false);
            setForm(emptyForm);
        },
        onError: () => toast('Failed to add parent', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, body }: { id: number; body: typeof form }) => apiPut(`/parents/${id}`, body),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['parents'] });
            toast('Parent updated');
            setEditOpen(false);
            setEditingId(null);
            setForm(emptyForm);
        },
        onError: () => toast('Failed to update parent', 'error'),
    });

    const blockMutation = useMutation({
        mutationFn: (id: number) => apiPatch(`/parents/${id}/toggle-block`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['parents'] }); toast('Login status updated'); },
        onError: () => toast('Failed to update login status', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/parents/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['parents'] });
            toast('Parent deleted');
            setDeleteId(null);
        },
        onError: () => toast('Failed to delete parent', 'error'),
    });

    const openEdit = (row: Parent) => {
        setEditingId(row.id);
        setForm({ name: row.name, email: row.email, phone: row.phone ?? '', password: '' });
        setEditOpen(true);
    };

    const columns = [
        {
            key: 'name', label: 'Name',
            render: (row: Parent) => (
                <div className="flex items-center gap-3">
                    <div className="admin-stat-icon flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
                        {row.name.charAt(0)}
                    </div>
                    <span className="font-semibold">{row.name}</span>
                </div>
            ),
        },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'children_count', label: 'Children' },
        { key: 'login_status', label: 'Login', render: (row: Parent) => <Badge variant={row.login_status === 'blocked' ? 'inactive' : row.login_status}>{row.login_status}</Badge> },
        {
            key: 'actions', label: 'Actions',
            render: (row: Parent) => (
                <ActionButtonGroup>
                    <ActionIconButton
                        variant="edit"
                        title="Edit parent"
                        onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                    />
                    {isSuperAdmin && (
                        <ActionIconButton
                            variant={row.login_status === 'blocked' ? 'unblock' : 'block'}
                            title={row.login_status === 'blocked' ? 'Unblock login' : 'Block login'}
                            onClick={(e) => { e.stopPropagation(); blockMutation.mutate(row.id); }}
                        />
                    )}
                    {canDelete && (
                        <ActionIconButton
                            variant="delete"
                            title="Delete parent"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}
                        />
                    )}
                </ActionButtonGroup>
            ),
        },
    ];

    const formFields = (
        <>
            <Input label="Full Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
            <Input label="Email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            <Input label="Password" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required={createOpen} minLength={8} placeholder={editOpen ? 'Leave blank to keep current' : ''} />
            <Input label="Phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
        </>
    );

    return (
        <div className="space-y-6">
            <PageHeader title="Parents" subtitle="Manage parent accounts"
                actions={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Parent</Button>} />

            <DataTable<Parent>
                columns={columns}
                data={data}
                loading={isLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                filters={<ListFilters preset="parents" values={filters} onChange={setFilter} />}
            />

            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Parent">
                <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
                    {formFields}
                    <Button type="submit" variant="success" loading={createMutation.isPending} className="w-full">Add Parent</Button>
                </form>
            </Modal>

            <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditingId(null); }} title="Edit Parent">
                <form onSubmit={e => { e.preventDefault(); editingId && updateMutation.mutate({ id: editingId, body: form }); }} className="space-y-4">
                    {formFields}
                    <Button type="submit" variant="success" loading={updateMutation.isPending} className="w-full">Save Changes</Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Parent?"
                message="This will permanently remove this parent account."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
