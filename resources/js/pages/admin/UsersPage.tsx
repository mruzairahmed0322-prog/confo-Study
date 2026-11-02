import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPostForm, apiPutForm } from '@/lib/api';
import { useInstantQuery } from '@/lib/useInstantQuery';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal, ModalForm } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { FormSection, FormGrid } from '@/components/ui/FormSection';
import { useToast } from '@/contexts/ToastContext';
import { Plus } from 'lucide-react';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GENDER_OPTIONS, STAFF_ROLES, buildFormData } from '@/lib/recordFields';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

interface UserRow extends Record<string, unknown> {
    id: number;
    name: string;
    father_name?: string;
    cnic?: string;
    photo?: string;
    email: string;
    phone: string;
    address?: string;
    gender?: string;
    dob?: string;
    role: string;
    login_status: string;
}

interface PaginatedUsers {
    data: UserRow[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

const emptyForm = {
    name: '', father_name: '', cnic: '', email: '', phone: '', password: '',
    address: '', gender: '', dob: '', role: 'reception',
};

export default function UsersPage() {
    const userFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'role', key: 'role' },
        { type: 'loginStatus', key: 'login_status' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(userFilters);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const { toast } = useToast();
    const qc = useQueryClient();

    const { data, isInitialLoading } = useInstantQuery<PaginatedUsers>({
        queryKey: ['users', page, search, filters],
        queryFn: () => apiGet('/users', { page, search, ...apiParams }),
    });

    const resetForm = () => {
        setForm(emptyForm);
        setPhoto(null);
        setPhotoPreview(null);
        setEditingId(null);
    };

    const createMutation = useMutation({
        mutationFn: () => apiPostForm('/users', buildFormData(form, photo)),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            toast('Staff account created');
            setCreateOpen(false);
            resetForm();
        },
        onError: () => toast('Failed to create user', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: () => editingId ? apiPutForm(`/users/${editingId}`, buildFormData(form, photo)) : Promise.reject(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            toast('Staff updated');
            setEditOpen(false);
            resetForm();
        },
        onError: () => toast('Failed to update user', 'error'),
    });

    const blockMutation = useMutation({
        mutationFn: (id: number) => apiPatch(`/users/${id}/block`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('User blocked'); },
        onError: () => toast('Failed to block user', 'error'),
    });

    const unblockMutation = useMutation({
        mutationFn: (id: number) => apiPatch(`/users/${id}/unblock`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast('User unblocked'); },
        onError: () => toast('Failed to unblock user', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/users/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['users'] });
            toast('User deleted');
            setDeleteId(null);
        },
        onError: () => toast('Failed to delete user', 'error'),
    });

    const openEdit = (row: UserRow) => {
        setEditingId(row.id);
        setForm({
            name: row.name,
            father_name: String(row.father_name ?? ''),
            cnic: String(row.cnic ?? ''),
            email: row.email,
            phone: row.phone ?? '',
            password: '',
            address: String(row.address ?? ''),
            gender: String(row.gender ?? ''),
            dob: String(row.dob ?? ''),
            role: row.role,
        });
        setPhoto(null);
        setPhotoPreview(row.photo ?? null);
        setEditOpen(true);
    };

    const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

    const staffForm = (
        <div className="space-y-5">
            <FormSection title="Photo & Personal Info">
                <FormGrid>
                    <div className="sm:col-span-2">
                        <PhotoUpload label="Staff Photo" value={photo} previewUrl={photoPreview} onChange={setPhoto} />
                    </div>
                    <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} required />
                    <Input label="Father's Name" value={form.father_name} onChange={e => set('father_name', e.target.value)} />
                    <Input label="CNIC No" value={form.cnic} onChange={e => set('cnic', e.target.value)} placeholder="42101-1234567-1" />
                    <Select label="Gender" value={form.gender} onChange={v => set('gender', v)} options={GENDER_OPTIONS} placeholder="Select gender" />
                    <Input label="Date of Birth" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                </FormGrid>
            </FormSection>
            <FormSection title="Contact & Account">
                <FormGrid>
                    <Input label="Email (login) *" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
                    <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                    <Input label="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} required={createOpen} minLength={8} placeholder={editOpen ? 'Leave blank to keep current' : ''} />
                    <Select label="Role *" value={form.role} onChange={v => set('role', v)} options={STAFF_ROLES} />
                    <div className="sm:col-span-2">
                        <Textarea label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Home address, Karachi" />
                    </div>
                </FormGrid>
            </FormSection>
        </div>
    );

    const columns = [
        {
            key: 'name', label: 'Staff',
            render: (row: UserRow) => (
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
        { key: 'cnic', label: 'CNIC', render: (r: UserRow) => r.cnic || '—' },
        { key: 'email', label: 'Email' },
        { key: 'phone', label: 'Phone' },
        { key: 'role', label: 'Role', render: (row: UserRow) => <span className="capitalize">{row.role.replace('-', ' ')}</span> },
        { key: 'login_status', label: 'Login', render: (row: UserRow) => <Badge variant={row.login_status === 'blocked' ? 'inactive' : row.login_status}>{row.login_status}</Badge> },
        {
            key: 'actions', label: 'Actions',
            render: (row: UserRow) => (
                <ActionButtonGroup>
                    <ActionIconButton
                        variant="edit"
                        title="Edit staff"
                        onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                    />
                    <ActionIconButton
                        variant={row.login_status === 'blocked' ? 'unblock' : 'block'}
                        title={row.login_status === 'blocked' ? 'Unblock login' : 'Block login'}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (row.login_status === 'blocked') unblockMutation.mutate(row.id);
                            else blockMutation.mutate(row.id);
                        }}
                    />
                    <ActionIconButton
                        variant="delete"
                        title="Delete user"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(row.id); }}
                    />
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Staff & User Accounts"
                subtitle="Manage reception, accountant, admin and parent accounts"
                actions={<Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}><Plus className="h-4 w-4" /> Create Account</Button>}
            />

            <DataTable<UserRow>
                columns={columns}
                data={data}
                loading={isInitialLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                filters={<ListFilters preset="users" values={filters} onChange={setFilter} />}
            />

            <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Staff Account" size="2xl">
                <ModalForm onSubmit={e => { e.preventDefault(); createMutation.mutate(); }} actions={
                    <><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" loading={createMutation.isPending}>Create Account</Button></>
                }>{staffForm}</ModalForm>
            </Modal>

            <Modal open={editOpen} onClose={() => { setEditOpen(false); resetForm(); }} title="Edit Staff Account" size="2xl">
                <ModalForm onSubmit={e => { e.preventDefault(); updateMutation.mutate(); }} actions={
                    <><Button type="button" variant="ghost" onClick={() => { setEditOpen(false); resetForm(); }}>Cancel</Button>
                    <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button></>
                }>{staffForm}</ModalForm>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete User?"
                message="This will permanently remove this staff account."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
