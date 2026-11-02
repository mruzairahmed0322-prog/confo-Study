import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost, apiPut, apiPatch, apiDelete, apiPostForm, apiPutForm } from '@/lib/api';

import { DataTable, Badge } from '@/components/ui/DataTable';

import { PageHeader } from '@/components/ui/PageHeader';

import { Button } from '@/components/ui/Button';

import { Modal, ModalForm } from '@/components/ui/Modal';
import { useSuccessPopup } from '@/components/ui/SuccessPopup';

import { Input } from '@/components/ui/Input';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

import { CheckCircle, XCircle, Plus, Video, PlayCircle, ArchiveRestore, Radio } from 'lucide-react';

import { formatCurrency } from '@/lib/utils';
import { asList } from '@/lib/listUtils';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { PrintSlipButton } from '@/components/documents/PrintSlipButton';
import { ViewSlipButton } from '@/components/documents/ViewSlipButton';
import { Select } from '@/components/ui/Select';
import { emptyFilterValues, FILTER_PRESETS, ListFilters, usePagedList } from '@/lib/listFilters';
import { Textarea } from '@/components/ui/Textarea';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { FormSection, FormGrid } from '@/components/ui/FormSection';
import { GENDER_OPTIONS, TEACHER_STATUS_OPTIONS, buildFormData } from '@/lib/recordFields';



export function PaymentProofsPage() {

    const proofFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(proofFilters);

    const [confirm, setConfirm] = useState<{ id: number; action: 'approve' | 'reject' } | null>(null);

    const { toast } = useToast();

    const qc = useQueryClient();



    const { data, isLoading } = useQuery({

        queryKey: ['payment-proofs', page, search, filters],

        queryFn: () => apiGet('/fees/payment-proofs', { page, search, ...apiParams }),

        placeholderData: (prev: unknown) => prev,

    });



    const actionMutation = useMutation({

        mutationFn: ({ id, action }: { id: number; action: 'approve' | 'reject' }) =>

            apiPost(`/fees/payment-proofs/${id}/${action}`),

        onSuccess: () => { qc.invalidateQueries({ queryKey: ['payment-proofs'] }); toast('Action completed'); setConfirm(null); },

        onError: () => toast('Action failed', 'error'),

    });



    const columns = [

        { key: 'amount', label: 'Amount', render: (r: Record<string, unknown>) => formatCurrency(Number(r.amount)) },

        { key: 'payment_method', label: 'Method' },

        { key: 'transaction_id', label: 'Transaction ID' },

        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },

        {

            key: 'actions', label: 'Actions',

            render: (r: Record<string, unknown>) => r.status === 'pending' ? (

                <div className="flex gap-2">

                    <Button size="sm" onClick={(e) => { e.stopPropagation(); setConfirm({ id: Number(r.id), action: 'approve' }); }}>

                        <CheckCircle className="h-3.5 w-3.5" /> Approve

                    </Button>

                    <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); setConfirm({ id: Number(r.id), action: 'reject' }); }}>

                        <XCircle className="h-3.5 w-3.5" /> Reject

                    </Button>

                </div>

            ) : null,

        },

    ];



    return (

        <div className="space-y-6">

            <PageHeader title="Payment Proofs" subtitle="Review online payment submissions" />

            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="paymentProofs" values={filters} onChange={setFilter} />} />

            <ConfirmDialog

                open={!!confirm}

                type={confirm?.action === 'reject' ? 'warning' : 'success'}

                title={confirm?.action === 'approve' ? 'Approve Payment?' : 'Reject Payment?'}

                message={confirm?.action === 'approve' ? 'This will mark the payment as approved.' : 'This will reject the payment proof.'}

                confirmText={confirm?.action === 'approve' ? 'Approve' : 'Reject'}

                loading={actionMutation.isPending}

                onConfirm={() => confirm && actionMutation.mutate(confirm)}

                onCancel={() => setConfirm(null)}

            />

        </div>

    );

}



interface ModulePageProps {

    title: string;

    description: string;

    endpoint: string;

    columns: Array<{ key: string; label: string; render?: (row: Record<string, unknown>) => React.ReactNode }>;

    filters?: React.ReactNode;

}



export function createModulePage({ title, description, endpoint, columns, filters }: ModulePageProps) {

    return function ModulePage() {

        const [page, setPage] = useState(1);

        const [search, setSearch] = useState('');



        const { data, isFetching, isLoading } = useQuery({

            queryKey: [endpoint, page, search],

            queryFn: () => apiGet(endpoint, { page, search }),

            placeholderData: (prev: unknown) => prev,

        });



        return (

            <div className="space-y-6">

                <PageHeader title={title} subtitle={description}

                    actions={<Button size="sm"><Plus className="h-4 w-4" /> Add New</Button>} />

                <DataTable

                    columns={columns}

                    data={data as never}

                    loading={isLoading && !data && isFetching}

                    search={search}

                    onSearch={setSearch}

                    onPageChange={setPage}

                    filters={filters}

                />

            </div>

        );

    };

}



export function TeachersPage() {
    const teacherFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(teacherFilters);
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const emptyForm = {
        name: '', father_name: '', cnic: '', email: '', phone: '', password: '',
        employee_id: '', gender: 'male', joining_date: '', salary: '', qualification: '',
        address: '', status: 'active', subject_ids: [] as number[],
    };
    const [form, setForm] = useState(emptyForm);
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const { toast } = useToast();
    const { isSuperAdmin, hasPermission } = useAuth();
    const canCreateTeachers = hasPermission('teachers.create');
    const canEditTeachers = hasPermission('teachers.edit');
    const canDeleteTeachers = hasPermission('teachers.delete');
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['teachers', page, search, filters],
        queryFn: () => apiGet('/teachers', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const { data: subjectsData } = useQuery({
        queryKey: ['subjects-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/subjects', { per_page: 100 }),
    });

    const subjects = subjectsData?.data ?? [];

    const resetForm = () => {
        setForm(emptyForm);
        setPhoto(null);
        setPhotoPreview(null);
        setEditingId(null);
    };

    const submitFormData = () => {
        const fd = buildFormData({ ...form, salary: form.salary || undefined }, photo);
        form.subject_ids.forEach(id => fd.append('subject_ids[]', String(id)));
        return fd;
    };

    const createMutation = useMutation({
        mutationFn: () => apiPostForm('/teachers', submitFormData()),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['teachers'] });
            toast('Teacher added');
            setCreateOpen(false);
            resetForm();
        },
        onError: () => toast('Failed to add teacher', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: () => editingId ? apiPutForm(`/teachers/${editingId}`, submitFormData()) : Promise.reject(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['teachers'] });
            toast('Teacher updated');
            setEditOpen(false);
            resetForm();
        },
        onError: () => toast('Failed to update teacher', 'error'),
    });

    const blockMutation = useMutation({
        mutationFn: (id: number) => apiPatch(`/teachers/${id}/toggle-block`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['teachers'] }); toast('Login status updated'); },
        onError: () => toast('Failed to update login status', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/teachers/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['teachers'] });
            toast('Teacher deleted');
            setDeleteId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const openEdit = (row: Record<string, unknown>) => {
        setEditingId(Number(row.id));
        setForm({
            name: String(row.name ?? ''),
            father_name: String(row.father_name ?? ''),
            cnic: String(row.cnic ?? ''),
            email: String(row.email ?? ''),
            phone: String(row.phone ?? ''),
            password: '',
            employee_id: String(row.employee_id ?? ''),
            gender: String(row.gender ?? 'male'),
            joining_date: String(row.joining_date ?? ''),
            salary: row.salary != null ? String(row.salary) : '',
            qualification: String(row.qualification ?? ''),
            address: String(row.address ?? ''),
            status: String(row.status ?? 'active'),
            subject_ids: Array.isArray(row.subject_ids) ? row.subject_ids as number[] : [],
        });
        setPhoto(null);
        setPhotoPreview(row.photo ? String(row.photo) : null);
        setEditOpen(true);
    };

    const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

    const toggleSubject = (id: number) => {
        setForm(p => ({
            ...p,
            subject_ids: p.subject_ids.includes(id) ? p.subject_ids.filter(s => s !== id) : [...p.subject_ids, id],
        }));
    };

    const subjectPicker = (
        <div>
            <label className="mb-1.5 block text-sm font-medium admin-page-title">Subjects</label>
            <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                    <button key={s.id} type="button" onClick={() => toggleSubject(s.id)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${form.subject_ids.includes(s.id) ? 'bg-emerald-600 text-white' : 'admin-input text-emerald-800 dark:text-lime-200'}`}>
                        {s.name}
                    </button>
                ))}
                {!subjects.length && <span className="text-sm text-emerald-600/60">No subjects available</span>}
            </div>
        </div>
    );

    const teacherForm = (
        <div className="space-y-5">
            <FormSection title="Photo & Personal Info">
                <FormGrid>
                    <div className="sm:col-span-2">
                        <PhotoUpload label="Teacher Photo" value={photo} previewUrl={photoPreview} onChange={setPhoto} />
                    </div>
                    <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} required />
                    <Input label="Father's Name" value={form.father_name} onChange={e => set('father_name', e.target.value)} />
                    <Input label="CNIC No" value={form.cnic} onChange={e => set('cnic', e.target.value)} placeholder="42101-1234567-1" />
                    <Select label="Gender" value={form.gender} onChange={v => set('gender', v)} options={GENDER_OPTIONS} />
                </FormGrid>
            </FormSection>
            <FormSection title="Employment Details">
                <FormGrid>
                    <Input label="Employee ID" value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="EMP-001" />
                    <Input label="Qualification" value={form.qualification} onChange={e => set('qualification', e.target.value)} placeholder="B.Ed, M.A etc." />
                    <Input label="Joining Date" type="date" value={form.joining_date} onChange={e => set('joining_date', e.target.value)} />
                    <Input label="Monthly Salary (Rs)" type="number" value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="0" />
                    <Select label="Status" value={form.status} onChange={v => set('status', v)} options={TEACHER_STATUS_OPTIONS} />
                    <div className="sm:col-span-2">{subjectPicker}</div>
                </FormGrid>
            </FormSection>
            <FormSection title="Contact & Login">
                <FormGrid>
                    <Input label="Email (login) *" type="email" value={form.email} onChange={e => set('email', e.target.value)} required />
                    <Input label="Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                    <Input label="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} required={createOpen} minLength={8} placeholder={editOpen ? 'Leave blank to keep current' : ''} />
                    <div className="sm:col-span-2">
                        <Textarea label="Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="Home address, Karachi" />
                    </div>
                </FormGrid>
            </FormSection>
        </div>
    );

    const columns = [
        {
            key: 'name', label: 'Teacher',
            render: (r: Record<string, unknown>) => (
                <div className="flex items-center gap-3">
                    {r.photo ? (
                        <img src={String(r.photo)} alt={String(r.name)} className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-500/20" />
                    ) : (
                        <div className="admin-stat-icon flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white">
                            {String(r.name).charAt(0)}
                        </div>
                    )}
                    <div>
                        <span className="font-semibold">{String(r.name)}</span>
                        {Boolean(r.father_name) && <p className="text-xs admin-page-sub">S/O {String(r.father_name)}</p>}
                    </div>
                </div>
            ),
        },
        { key: 'employee_id', label: 'Emp ID', render: (r: Record<string, unknown>) => String(r.employee_id || '—') },
        { key: 'cnic', label: 'CNIC', render: (r: Record<string, unknown>) => String(r.cnic || '—') },
        { key: 'phone', label: 'Phone' },
        { key: 'subjects', label: 'Subjects' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status).replace('_', ' ')}</Badge> },
        { key: 'login_status', label: 'Login', render: (r: Record<string, unknown>) => {
            const status = String(r.login_status ?? 'none');
            return status === 'none' ? <span className="text-xs text-emerald-600/60">No login</span>
                : <Badge variant={status === 'blocked' ? 'inactive' : status}>{status}</Badge>;
        }},
        {
            key: 'actions', label: 'Actions',
            render: (r: Record<string, unknown>) => (
                <ActionButtonGroup>
                    {canEditTeachers && (
                        <ActionIconButton
                            variant="edit"
                            title="Edit teacher"
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        />
                    )}
                    <ViewSlipButton slipUrl={`/teachers/${r.id}/slip`} label="View Employee Slip" />
                    <PrintSlipButton slipUrl={`/teachers/${r.id}/slip`} label="Print Employee Slip" />
                    {isSuperAdmin && Boolean(r.user_id) && (
                        <ActionIconButton
                            variant={r.login_status === 'blocked' ? 'unblock' : 'block'}
                            title={r.login_status === 'blocked' ? 'Unblock login' : 'Block login'}
                            onClick={(e) => { e.stopPropagation(); blockMutation.mutate(Number(r.id)); }}
                        />
                    )}
                    {canDeleteTeachers && (
                        <ActionIconButton
                            variant="delete"
                            title="Delete teacher"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(Number(r.id)); }}
                        />
                    )}
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Teachers" subtitle={canCreateTeachers || canEditTeachers ? 'Manage teaching staff records' : 'View teaching staff'}
                actions={canCreateTeachers ? <Button size="sm" onClick={() => { resetForm(); setCreateOpen(true); }}><Plus className="h-4 w-4" /> Add Teacher</Button> : undefined} />
            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="teachers" values={filters} onChange={setFilter} />} />

            <Modal open={createOpen && canCreateTeachers} onClose={() => setCreateOpen(false)} title="Add Teacher" size="2xl">
                <ModalForm onSubmit={e => { e.preventDefault(); if (!canCreateTeachers) return; createMutation.mutate(); }} actions={
                    <><Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                    <Button type="submit" variant="success" loading={createMutation.isPending}>Add Teacher</Button></>
                }>{teacherForm}</ModalForm>
            </Modal>

            <Modal open={editOpen && canEditTeachers} onClose={() => { setEditOpen(false); resetForm(); }} title="Edit Teacher" size="2xl">
                <ModalForm onSubmit={e => { e.preventDefault(); if (!canEditTeachers) return; updateMutation.mutate(); }} actions={
                    <><Button type="button" variant="ghost" onClick={() => { setEditOpen(false); resetForm(); }}>Cancel</Button>
                    <Button type="submit" variant="success" loading={updateMutation.isPending}>Save Changes</Button></>
                }>{teacherForm}</ModalForm>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Teacher?"
                message="This will permanently remove this teacher record."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}



export function SubjectsPage() {
    const subjectFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'class', key: 'class_id' },
        { type: 'status', key: 'status' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(subjectFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const emptyForm = { name: '', code: '', school_class_id: '', type: 'theory', total_marks: '100', status: 'active' };
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('subjects.create');
    const canEdit = hasPermission('subjects.edit');
    const canDelete = hasPermission('subjects.delete');
    const canManage = canCreate || canEdit;
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['subjects', page, search, filters],
        queryFn: () => apiGet('/subjects', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['classes-list'],
        queryFn: () => apiGet('/students/classes'),
        staleTime: 60_000,
        select: asList<{ id: number; name: string }>,
    });

    const saveMutation = useMutation({
        mutationFn: (body: typeof emptyForm) => {
            const payload = { ...body, total_marks: Number(body.total_marks), school_class_id: body.school_class_id ? Number(body.school_class_id) : null };
            return editId ? apiPut(`/subjects/${editId}`, payload) : apiPost('/subjects', payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['subjects'] }); toast(editId ? 'Subject updated' : 'Subject created'); setModalOpen(false); setEditId(null); setForm(emptyForm); },
        onError: () => toast('Save failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/subjects/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['subjects'] });
            toast('Subject deleted');
            setDeleteId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({ name: String(row.name ?? ''), code: String(row.code ?? ''), school_class_id: row.school_class_id ? String(row.school_class_id) : '', type: String(row.type ?? 'theory'), total_marks: String(row.total_marks ?? '100'), status: String(row.status ?? 'active') });
        setModalOpen(true);
    };

    const columns = [
        { key: 'name', label: 'Subject' },
        { key: 'code', label: 'Code' },
        { key: 'type', label: 'Type' },
        { key: 'total_marks', label: 'Marks' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        { key: 'actions', label: 'Actions', render: (r: Record<string, unknown>) => (
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
        )},
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Subjects" subtitle={canManage ? 'Manage subjects and curriculum' : 'View subjects'} actions={canCreate ? <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }}><Plus className="h-4 w-4" /> Add Subject</Button> : undefined} />
            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="subjects" values={filters} onChange={setFilter} />} />
            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Subject' : 'Add Subject'}>
                <form onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }} className="space-y-4">
                    <Input label="Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Code" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} />
                        <Input label="Total Marks" type="number" value={form.total_marks} onChange={e => setForm(p => ({ ...p, total_marks: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Class</label>
                            <select value={form.school_class_id} onChange={e => setForm(p => ({ ...p, school_class_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                <option value="">All classes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Type</label>
                            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                <option value="theory">Theory</option>
                                <option value="practical">Practical</option>
                                <option value="both">Both</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Status</label>
                        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">{editId ? 'Save Changes' : 'Create Subject'}</Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Subject?"
                message="This will permanently remove this subject."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}



export function AssignmentsPage() {
    const assignmentFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(assignmentFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const emptyForm = { title: '', description: '', due_date: '', total_marks: '100', status: 'draft', school_class_id: '', subject_id: '' };
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('assignments.create');
    const canEdit = hasPermission('assignments.edit');
    const canDelete = hasPermission('assignments.delete');
    const canManage = canCreate || canEdit;
    const [deleteId, setDeleteId] = useState<number | null>(null);
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
        mutationFn: (body: typeof emptyForm) => {
            const payload = { ...body, total_marks: Number(body.total_marks), school_class_id: body.school_class_id ? Number(body.school_class_id) : null, subject_id: body.subject_id ? Number(body.subject_id) : null };
            return editId ? apiPut(`/assignments/${editId}`, payload) : apiPost('/assignments', payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['assignments'] }); toast(editId ? 'Assignment updated' : 'Assignment created'); setModalOpen(false); setEditId(null); setForm(emptyForm); },
        onError: () => toast('Save failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/assignments/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['assignments'] });
            toast('Assignment deleted');
            setDeleteId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({ title: String(row.title ?? ''), description: String(row.description ?? ''), due_date: String(row.due_date ?? ''), total_marks: String(row.total_marks ?? '100'), status: String(row.status ?? 'draft'), school_class_id: row.school_class_id ? String(row.school_class_id) : '', subject_id: row.subject_id ? String(row.subject_id) : '' });
        setModalOpen(true);
    };

    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'class', label: 'Class' },
        { key: 'subject', label: 'Subject' },
        { key: 'due_date', label: 'Due Date' },
        { key: 'total_marks', label: 'Marks' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        { key: 'actions', label: 'Actions', render: (r: Record<string, unknown>) => (
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
        )},
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Assignments" subtitle={canManage ? 'Manage student assignments' : 'View your assignments'} actions={canCreate ? <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }}><Plus className="h-4 w-4" /> Add Assignment</Button> : undefined} />
            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="assignments" values={filters} onChange={setFilter} />}
            />
            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Assignment' : 'Add Assignment'}>
                <form onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }} className="space-y-4">
                    <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Description</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} className="admin-input w-full px-3 py-2 text-sm" />
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
                            <option value="draft">Draft</option><option value="published">Published</option><option value="closed">Closed</option>
                        </select>
                    </div>
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">{editId ? 'Save Changes' : 'Create Assignment'}</Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Assignment?"
                message="This will permanently remove this assignment."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}



export function QuizzesListPage() {
    const navigate = useNavigate();
    const quizFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(quizFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const emptyForm = { title: '', description: '', duration_minutes: '30', total_marks: '100', status: 'draft', school_class_id: '', subject_id: '' };
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('exams.create') || hasPermission('assignments.create');
    const canEdit = hasPermission('exams.edit') || hasPermission('assignments.edit');
    const canDelete = hasPermission('exams.delete');
    const canManage = canCreate || canEdit;
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const qc = useQueryClient();

    const { data, isFetching, isLoading } = useQuery({
        queryKey: ['quizzes', page, search, filters],
        queryFn: () => apiGet('/quizzes', { page, search, ...apiParams }),
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
        mutationFn: (body: typeof emptyForm) => {
            const payload = {
                ...body,
                duration_minutes: Number(body.duration_minutes),
                total_marks: Number(body.total_marks),
                school_class_id: body.school_class_id ? Number(body.school_class_id) : null,
                subject_id: body.subject_id ? Number(body.subject_id) : null,
            };
            return editId ? apiPut(`/quizzes/${editId}`, payload) : apiPost('/quizzes', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quizzes'] });
            toast(editId ? 'Quiz updated' : 'Quiz created');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
        },
        onError: () => toast(editId ? 'Update failed' : 'Create failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/quizzes/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['quizzes'] });
            toast('Quiz deleted');
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
            duration_minutes: String(row.duration_minutes ?? '30'),
            total_marks: String(row.total_marks ?? '100'),
            status: String(row.status ?? 'draft'),
            school_class_id: row.school_class_id ? String(row.school_class_id) : '',
            subject_id: row.subject_id ? String(row.subject_id) : '',
        });
        setModalOpen(true);
    };

    const columns = [
        { key: 'title', label: 'Quiz' },
        { key: 'duration_minutes', label: 'Duration (min)' },
        { key: 'total_marks', label: 'Marks' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        {
            key: 'actions', label: 'Actions',
            render: (r: Record<string, unknown>) => (
                <ActionButtonGroup>
                    {r.status === 'active' && (
                        <ActionIconButton
                            variant="attempt"
                            title="Attempt quiz"
                            onClick={(e) => { e.stopPropagation(); navigate(`/app/quizzes/${r.id}/attempt`); }}
                        />
                    )}
                    {canEdit && (
                        <ActionIconButton
                            variant="edit"
                            title="Edit quiz"
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        />
                    )}
                    {canDelete && (
                        <ActionIconButton
                            variant="delete"
                            title="Delete quiz"
                            onClick={(e) => { e.stopPropagation(); setDeleteId(Number(r.id)); }}
                        />
                    )}
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Quizzes" subtitle="Online quiz management" actions={canCreate ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Create Quiz</Button> : undefined} />
            <DataTable columns={columns} data={data as never} loading={isLoading && !data && isFetching} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="quizzes" values={filters} onChange={setFilter} />} />
            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Quiz' : 'Create Quiz'}>
                <form onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }} className="space-y-4">
                    <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Description</label>
                        <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} className="admin-input w-full px-3 py-2 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Duration (min)" type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
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
                            <option value="draft">Draft</option><option value="active">Active</option><option value="closed">Closed</option>
                        </select>
                    </div>
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">{editId ? 'Save Changes' : 'Create Quiz'}</Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Quiz?"
                message="This will permanently remove this quiz."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}



export function LiveClassesPage() {
    const liveClassFilters = emptyFilterValues(FILTER_PRESETS.liveClasses);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(liveClassFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [listMode, setListMode] = useState<'active' | 'archived'>('active');
    const [archiveId, setArchiveId] = useState<number | null>(null);
    const [restoreId, setRestoreId] = useState<number | null>(null);
    const [forceId, setForceId] = useState<number | null>(null);
        const getNowIso = () => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };
    const getEndIso = (mins = 60) => {
        const d = new Date(Date.now() + mins * 60 * 1000);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };
    const emptyForm = {
        title: '', description: '', scheduled_at: getNowIso(), ends_at: getEndIso(60), duration_minutes: '60',
        meeting_url: '', youtube_url: '', recording_url: '',
        platform: 'youtube', status: 'live', school_class_id: '', subject_id: '', subject_ids: [] as number[],
    };
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('live-classes.create') || hasPermission('live-classes.edit');
    const canDelete = hasPermission('live-classes.delete') || hasPermission('live-classes.edit');
    const canForceDelete = hasPermission('live-classes.delete');
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['live-classes', listMode, page, search, filters],
        queryFn: () => apiGet(listMode === 'archived' ? '/live-classes/archived' : '/live-classes', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['classes-list'],
        queryFn: () => apiGet('/students/classes'),
        staleTime: 60_000,
        select: asList<{ id: number; name: string }>,
        enabled: canManage,
    });

    const { data: subjectsData } = useQuery({
        queryKey: ['subjects-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string; school_class_id?: number | null }> }>('/subjects', { per_page: 100 }),
        staleTime: 60_000,
        enabled: canManage,
    });
    const subjects = subjectsData?.data ?? [];

    const { data: youtubeStatus } = useQuery({
        queryKey: ['youtube-status'],
        queryFn: () => apiGet<{
            connected: boolean;
            auto_stream_enabled: boolean;
            multiple_live_class_mode?: boolean;
        }>('/integrations/youtube/status'),
        enabled: canManage,
        staleTime: 60_000,
    });

    const multipleMode = youtubeStatus?.multiple_live_class_mode ?? false;
    const classSubjects = subjects.filter(s =>
        !form.school_class_id || !s.school_class_id || String(s.school_class_id) === form.school_class_id
    );

    const toggleSubject = (id: number) => {
        setForm(p => {
            const ids = p.subject_ids.includes(id)
                ? p.subject_ids.filter(x => x !== id)
                : [...p.subject_ids, id];
            return { ...p, subject_ids: ids, subject_id: ids[0] ? String(ids[0]) : '' };
        });
    };

    const saveMutation = useMutation({
        mutationFn: async (body: typeof emptyForm) => {
            const subjectIds = body.subject_ids.length
                ? body.subject_ids
                : body.subject_id ? [Number(body.subject_id)] : [];
            const payload = {
                ...body,
                platform: 'youtube',
                duration_minutes: Number(body.duration_minutes),
                school_class_id: body.school_class_id ? Number(body.school_class_id) : null,
                subject_id: subjectIds[0] ?? null,
                subject_ids: subjectIds,
                ends_at: body.ends_at || null,
            };
            return (editId ? apiPut(`/live-classes/${editId}`, payload) : apiPost('/live-classes', payload)) as Promise<{ created_count?: number }>;
        },
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ['live-classes'] });
            qc.invalidateQueries({ queryKey: ['recordings'] });
            const msg = editId
                ? 'Class updated — stream auto-checked'
                : res?.created_count && res.created_count > 1
                    ? `${res.created_count} live sessions scheduled`
                    : 'YouTube class scheduled — link & recording automatic';
            toast(msg);
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
        },
        onError: () => toast('Save failed', 'error'),
    });

    const archiveMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/live-classes/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['live-classes'] });
            toast('Moved to archive');
            setArchiveId(null);
        },
        onError: () => toast('Archive failed', 'error'),
    });

    const restoreMutation = useMutation({
        mutationFn: (id: number) => apiPost(`/live-classes/${id}/restore`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['live-classes'] });
            toast('Live class restored');
            setRestoreId(null);
        },
        onError: () => toast('Restore failed', 'error'),
    });

    const forceMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/live-classes/${id}/force`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['live-classes'] });
            toast('Permanently deleted');
            setForceId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const provisionMutation = useMutation({
        mutationFn: (id: number) => apiPost(`/live-classes/${id}/provision-youtube`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['live-classes'] });
            toast('YouTube stream + OBS key ready');
        },
        onError: (err: Error) => toast(err.message || 'Stream create failed — Connect YouTube first', 'error'),
    });

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        const scheduled = row.scheduled_at ? String(row.scheduled_at).replace(' ', 'T').slice(0, 16) : '';
        const ends = row.ends_at ? String(row.ends_at).replace(' ', 'T').slice(0, 16) : '';
        const rowSubjects = Array.isArray(row.subjects)
            ? (row.subjects as Array<{ id: number }>).map(s => s.id)
            : row.subject_id ? [Number(row.subject_id)] : [];
        setForm({
            title: String(row.title ?? ''),
            description: String(row.description ?? ''),
            scheduled_at: scheduled,
            ends_at: ends,
            duration_minutes: String(row.duration_minutes ?? '60'),
            meeting_url: String(row.meeting_url ?? ''),
            youtube_url: String(row.youtube_url ?? ''),
            recording_url: String(row.recording_url ?? ''),
            platform: String(row.platform ?? 'youtube'),
            status: String(row.status ?? 'scheduled'),
            school_class_id: row.school_class_id ? String(row.school_class_id) : '',
            subject_id: row.subject_id ? String(row.subject_id) : '',
            subject_ids: rowSubjects,
        });
        setModalOpen(true);
    };

    const columns = [
        { key: 'title', label: 'Class', render: (r: Record<string, unknown>) => (
            <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">
                    {String(r.title)}
                    {r.auto_created ? <span className="ms-2 rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">AUTO</span> : null}
                </p>
                {r.subject_name ? <p className="text-xs text-stone-500">
                    {Array.isArray(r.subjects) && (r.subjects as Array<{ name: string }>).length > 1
                        ? (r.subjects as Array<{ name: string }>).map(s => s.name).join(', ')
                        : String(r.subject_name)} · {String(r.class_name ?? '')}
                    {r.ends_at ? ` · ends ${String(r.ends_at)}` : ''}
                </p> : null}
            </div>
        )},
        { key: 'scheduled_at', label: 'Scheduled' },
        { key: 'platform', label: 'Platform' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        {
            key: 'actions',
            label: 'Actions',
            render: (r: Record<string, unknown>) => (
                <ActionButtonGroup>
                    {listMode === 'archived' ? (
                        <>
                            {canDelete && (
                                <ActionIconButton
                                    variant="unblock"
                                    title="Restore"
                                    icon={ArchiveRestore}
                                    onClick={(e) => { e.stopPropagation(); setRestoreId(Number(r.id)); }}
                                />
                            )}
                            {canForceDelete && (
                                <ActionIconButton
                                    variant="delete"
                                    title="Delete forever"
                                    onClick={(e) => { e.stopPropagation(); setForceId(Number(r.id)); }}
                                />
                            )}
                        </>
                    ) : (
                        <>
                            {r.can_manage && r.youtube_studio_url && ['scheduled', 'live'].includes(String(r.status)) ? (
                                <a
                                    href={String(r.youtube_studio_url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700"
                                >
                                    <Video className="h-3.5 w-3.5" /> Go Live
                                </a>
                            ) : null}
                            {r.can_join && r.join_url ? (
                                <Link
                                    to={String(r.join_url)}
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                                >
                                    <Video className="h-3.5 w-3.5" /> {r.can_manage ? 'Open Class' : 'Join'}
                                </Link>
                            ) : r.access_denied ? (
                                <span className="text-xs text-amber-600 dark:text-amber-400">Fee required</span>
                            ) : r.can_watch && r.watch_url ? (
                                <Link
                                    to={String(r.watch_url)}
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
                                >
                                    <PlayCircle className="h-3.5 w-3.5" /> Watch
                                </Link>
                            ) : r.needs_stream_setup ? (
                                canManage && youtubeStatus?.connected ? (
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); provisionMutation.mutate(Number(r.id)); }}
                                        disabled={provisionMutation.isPending}
                                        className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                                    >
                                        <Radio className="h-3.5 w-3.5" /> Create Stream
                                    </button>
                                ) : (
                                    <span className="text-xs text-amber-600 dark:text-amber-400">Connect YouTube first</span>
                                )
                            ) : (
                                <span className="text-xs text-stone-400">No class yet</span>
                            )}
                            {canManage && r.can_manage !== false ? (
                                <ActionIconButton
                                    variant="edit"
                                    title="Edit"
                                    onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                                />
                            ) : null}
                            {canDelete && r.can_manage !== false ? (
                                <ActionIconButton
                                    variant="delete"
                                    title="Archive"
                                    onClick={(e) => { e.stopPropagation(); setArchiveId(Number(r.id)); }}
                                />
                            ) : null}
                        </>
                    )}
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Live Classes"
                subtitle={canManage
                    ? (youtubeStatus?.connected
                        ? 'YouTube Auto Mode — stream + recording fully automatic (Unlisted)'
                        : 'Connect YouTube in System Settings for automatic live classes & recording')
                    : 'Join your scheduled live classes'}
                actions={canManage && listMode === 'active' ? (
                    <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }}>
                        <Video className="h-4 w-4" /> Start Direct Live Class
                    </Button>
                ) : undefined}
            />
            {canManage && (
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => { setListMode('active'); setPage(1); }}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${listMode === 'active' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200'}`}
                    >
                        Active
                    </button>
                    <button
                        type="button"
                        onClick={() => { setListMode('archived'); setPage(1); }}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium ${listMode === 'archived' ? 'bg-emerald-600 text-white' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200'}`}
                    >
                        Archive
                    </button>
                </div>
            )}
            {canManage && listMode === 'active' && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-900/20 dark:text-red-100">
                    <p className="font-semibold">YouTube Auto — Teacher:</p>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-red-800 dark:text-red-200">
                        <li>{multipleMode
                            ? 'Multiple subjects = alag alag live sessions (har subject ka apna stream + OBS key)'
                            : 'Multiple subjects = ek hi live session — class ke dauran subject switch; ek hi OBS key'}</li>
                        <li><strong>Create Stream</strong> button table ke <strong>Actions</strong> column me hota hai (har class row ke right side — orange button). Pehle neeche class list dikhni chahiye — empty ho to Filters clear karo ya naya <strong>Schedule Class</strong> banao</li>
                        <li>Success ke baad <strong>Go Live</strong> / <strong>Open Class</strong> → OBS tab me RTMP + Stream Key</li>
                        <li>Students sirf <strong>Join</strong> dabate hain — YouTube link unhe nahi milta</li>
                    </ol>
                    <p className="mt-2 text-xs opacity-80">Trash = Archive. Archive tab se Restore. Recording portal me Watch button se.</p>
                    {!youtubeStatus?.connected && (
                        <p className="mt-2 font-medium text-amber-700 dark:text-amber-300">⚠ Pehle System Settings → YouTube Connect karo (ek dafa)</p>
                    )}
                </div>
            )}
            {!canManage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                    Sirf fee-paid students Join / Watch kar sakte hain. Link copy nahi hota — class portal ke andar chalti hai.
                </div>
            )}
            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={listMode === 'active' ? <ListFilters preset="liveClasses" values={filters} onChange={setFilter} /> : undefined} />
            {canManage && (
                <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Live Class' : 'Start Direct Live Class (On Time)'}>
                    <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                        {!editId && (
                            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-300">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600"></span>
                                </span>
                                <span>Direct Live Mode: Schedule ki zaroorat nahi — class on-time foran live start ho jayegi.</span>
                            </div>
                        )}
                        <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Urdu Class — 6 PM" />
                        <Input label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional class notes" />
                        <Input label="Start" type="datetime-local" value={form.scheduled_at} onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))} required />
                        <Input label="End" type="datetime-local" value={form.ends_at} onChange={e => setForm(p => ({ ...p, ends_at: e.target.value }))} required />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Duration (min)" type="number" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))} />
                            <input type="hidden" value="youtube" />
                        </div>
                        {youtubeStatus?.connected ? (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                                <strong>Automatic:</strong> YouTube Unlisted stream ban jayega + recording auto-save hogi. Koi URL paste nahi karna.
                            </div>
                        ) : (
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                                YouTube connect nahi hai. System Settings → YouTube Connect karo, phir sab automatic hoga.
                            </div>
                        )}
                        <input type="hidden" name="platform" value="youtube" />
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Class / Batch</label>
                                <select value={form.school_class_id} onChange={e => setForm(p => ({ ...p, school_class_id: e.target.value, subject_ids: [], subject_id: '' }))} className="admin-input w-full px-3 py-2 text-sm" required>
                                    <option value="">Select class</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
                                    Subjects {multipleMode ? '(har subject = alag session)' : '(sab ek session mein)'}
                                </label>
                                <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-stone-200 p-2 dark:border-stone-700">
                                    {classSubjects.length === 0 ? (
                                        <p className="text-xs text-stone-500">Pehle class select karo</p>
                                    ) : classSubjects.map(s => (
                                        <label key={s.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={form.subject_ids.includes(s.id)}
                                                onChange={() => toggleSubject(s.id)}
                                            />
                                            {s.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Status</label>
                            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                <option value="live">Live Now (Direct Live)</option>
                                <option value="scheduled">Scheduled</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>
                        <p className="text-xs text-stone-500">Fee-paid students in the selected class will receive a notification automatically.</p>
                        <Button type="submit" loading={saveMutation.isPending} className="w-full" disabled={form.subject_ids.length === 0}>
                            {editId ? 'Save & Notify' : 'Schedule & Notify Students'}
                        </Button>
                    </form>
                </Modal>
            )}
            <ConfirmDialog
                open={archiveId !== null}
                onCancel={() => setArchiveId(null)}
                onConfirm={() => archiveId && archiveMutation.mutate(archiveId)}
                title="Archive live class?"
                message="Class Archive tab me chali jayegi. Baad me Restore kar sakte ho."
                confirmText="Archive"
                loading={archiveMutation.isPending}
                type="warning"
            />
            <ConfirmDialog
                open={restoreId !== null}
                onCancel={() => setRestoreId(null)}
                onConfirm={() => restoreId && restoreMutation.mutate(restoreId)}
                title="Restore live class?"
                message="Class Active list me wapas aa jayegi."
                confirmText="Restore"
                loading={restoreMutation.isPending}
                type="success"
            />
            <ConfirmDialog
                open={forceId !== null}
                onCancel={() => setForceId(null)}
                onConfirm={() => forceId && forceMutation.mutate(forceId)}
                title="Delete forever?"
                message="Ye permanent delete hai — wapas nahi aayegi."
                confirmText="Delete forever"
                loading={forceMutation.isPending}
                type="danger"
            />
        </div>
    );
}


export function RecordingsPage() {
    const recordingFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(recordingFilters);

    const { data, isLoading } = useQuery({
        queryKey: ['recordings', page, search, filters],
        queryFn: () => apiGet('/recordings', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const columns = [
        { key: 'title', label: 'Class', render: (r: Record<string, unknown>) => (
            <div>
                <p className="font-medium text-stone-900 dark:text-stone-100">{String(r.title)}</p>
                <p className="text-xs text-stone-500">{String(r.subject_name ?? '')} · {String(r.class_name ?? '')}</p>
            </div>
        )},
        { key: 'scheduled_at', label: 'Date' },
        { key: 'teacher_name', label: 'Teacher', render: (r: Record<string, unknown>) => String(r.teacher_name ?? '—') },
        {
            key: 'actions',
            label: 'Watch',
            render: (r: Record<string, unknown>) => (
                r.access_denied ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Fee required</span>
                ) : r.can_watch && r.watch_url ? (
                    <Link
                        to={String(r.watch_url)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                        <PlayCircle className="h-3.5 w-3.5" /> Watch
                    </Link>
                ) : (
                    <span className="text-xs text-stone-400">Not available</span>
                )
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Class Recordings" subtitle="Auto-recorded live class videos — fee-paid students only" />
            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="recordings" values={filters} onChange={setFilter} />} />
        </div>
    );
}



export function ExamsPage() {
    const examFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'class', key: 'class_id' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(examFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const emptyForm = { name: '', type: 'midterm', start_date: '', end_date: '', school_class_id: '', status: 'upcoming' };
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('exams.create');
    const canEdit = hasPermission('exams.edit');
    const canDelete = hasPermission('exams.delete');
    const canManage = canCreate || canEdit;
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['exams', page, search, filters],
        queryFn: () => apiGet('/exams', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const { data: classes = [] } = useQuery({
        queryKey: ['classes-list'],
        queryFn: () => apiGet('/students/classes'),
        staleTime: 60_000,
        select: asList<{ id: number; name: string }>,
    });

    const saveMutation = useMutation({
        mutationFn: (body: typeof emptyForm) => {
            const payload = { ...body, school_class_id: body.school_class_id ? Number(body.school_class_id) : null };
            return editId ? apiPut(`/exams/${editId}`, payload) : apiPost('/exams', payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['exams'] }); toast(editId ? 'Exam updated' : 'Exam created'); setModalOpen(false); setEditId(null); setForm(emptyForm); },
        onError: () => toast('Save failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/exams/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['exams'] });
            toast('Exam deleted');
            setDeleteId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({ name: String(row.name ?? ''), type: String(row.type ?? 'midterm'), start_date: String(row.start_date ?? '').slice(0, 10), end_date: String(row.end_date ?? '').slice(0, 10), school_class_id: row.school_class_id ? String(row.school_class_id) : '', status: String(row.status ?? 'upcoming') });
        setModalOpen(true);
    };

    const columns = [
        { key: 'name', label: 'Exam' },
        { key: 'type', label: 'Type' },
        { key: 'start_date', label: 'Start' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        { key: 'actions', label: 'Actions', render: (r: Record<string, unknown>) => (
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
        )},
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Exams" subtitle={canManage ? 'Exam schedule and management' : 'View exam schedule'} actions={canCreate ? <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }}><Plus className="h-4 w-4" /> Add Exam</Button> : undefined} />
            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="exams" values={filters} onChange={setFilter} />} />
            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Exam' : 'Add Exam'}>
                <form onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }} className="space-y-4">
                    <Input label="Exam Name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Type</label>
                            <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                <option value="midterm">Midterm</option><option value="final">Final</option><option value="quiz">Quiz</option><option value="test">Test</option>
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Class</label>
                            <select value={form.school_class_id} onChange={e => setForm(p => ({ ...p, school_class_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                <option value="">All classes</option>
                                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} required />
                        <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Status</label>
                        <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                            <option value="upcoming">Upcoming</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">{editId ? 'Save Changes' : 'Create Exam'}</Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Exam?"
                message="This will permanently remove this exam."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}



export function ResultsPage() {
    const resultFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'exam', key: 'exam_id' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
        { type: 'student', key: 'student_id' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(resultFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const emptyForm = { exam_id: '', student_id: '', subject_id: '', marks_obtained: '', total_marks: '100', grade: '', remarks: '' };
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('results.create');
    const canEdit = hasPermission('results.edit');
    const canDelete = hasPermission('results.edit');
    const canManage = canCreate || canEdit;
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['results', page, search, filters],
        queryFn: () => apiGet('/results', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const { data: examsData } = useQuery({
        queryKey: ['exams-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/exams', { per_page: 100 }),
        staleTime: 60_000,
    });
    const exams = examsData?.data ?? [];

    const { data: studentsData } = useQuery({
        queryKey: ['students-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/students', { per_page: 100 }),
        staleTime: 60_000,
    });
    const students = studentsData?.data ?? [];

    const { data: subjectsData } = useQuery({
        queryKey: ['subjects-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/subjects', { per_page: 100 }),
        staleTime: 60_000,
    });
    const subjects = subjectsData?.data ?? [];

    const saveMutation = useMutation({
        mutationFn: (body: typeof emptyForm) => {
            const payload = { exam_id: Number(body.exam_id), student_id: Number(body.student_id), subject_id: body.subject_id ? Number(body.subject_id) : null, marks_obtained: Number(body.marks_obtained), total_marks: Number(body.total_marks), grade: body.grade || null, remarks: body.remarks || null };
            return editId ? apiPut(`/results/${editId}`, payload) : apiPost('/results', payload);
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['results'] }); toast(editId ? 'Result updated' : 'Result recorded'); setModalOpen(false); setEditId(null); setForm(emptyForm); },
        onError: () => toast('Save failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/results/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['results'] });
            toast('Result deleted');
            setDeleteId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({ exam_id: row.exam_id ? String(row.exam_id) : '', student_id: row.student_id ? String(row.student_id) : '', subject_id: row.subject_id ? String(row.subject_id) : '', marks_obtained: String(row.marks_obtained ?? ''), total_marks: String(row.total_marks ?? '100'), grade: String(row.grade ?? ''), remarks: String(row.remarks ?? '') });
        setModalOpen(true);
    };

    const columns = [
        { key: 'student', label: 'Student', render: (r: Record<string, unknown>) => String((r.student as { name?: string })?.name ?? r.student ?? '—') },
        { key: 'marks_obtained', label: 'Marks' },
        { key: 'grade', label: 'Grade' },
        { key: 'actions', label: 'Actions', render: (r: Record<string, unknown>) => (
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
        )},
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Results" subtitle={canManage ? 'Student exam results and report cards' : 'View exam results'} actions={canCreate ? <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }}><Plus className="h-4 w-4" /> Add Result</Button> : undefined} />
            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="results" values={filters} onChange={setFilter} />} />
            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Result' : 'Add Result'}>
                <form onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Exam</label>
                            <select value={form.exam_id} onChange={e => setForm(p => ({ ...p, exam_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm" required>
                                <option value="">Select exam</option>
                                {exams.map(ex => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Student</label>
                            <select value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm" required>
                                <option value="">Select student</option>
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Subject</label>
                        <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                            <option value="">Select subject</option>
                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Marks Obtained" type="number" value={form.marks_obtained} onChange={e => setForm(p => ({ ...p, marks_obtained: e.target.value }))} required />
                        <Input label="Total Marks" type="number" value={form.total_marks} onChange={e => setForm(p => ({ ...p, total_marks: e.target.value }))} />
                        <Input label="Grade" value={form.grade} onChange={e => setForm(p => ({ ...p, grade: e.target.value }))} />
                    </div>
                    <Input label="Remarks" value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">{editId ? 'Save Changes' : 'Record Result'}</Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Result?"
                message="This will permanently remove this result record."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}



export function FeesPage() {
    const feeFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'class', key: 'class_id' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(feeFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const emptyForm = { student_id: '', invoice_no: '', amount: '', paid_amount: '0', discount: '0', due_date: '', status: 'pending', notes: '' };
    const [form, setForm] = useState(emptyForm);
    const { error: toastError } = useToast();
    const { showSuccess } = useSuccessPopup();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('fees.create');
    const canEdit = hasPermission('fees.edit');
    const canDelete = hasPermission('fees.delete');
    const canManage = canCreate || canEdit;
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['fee-invoices', page, search, filters],
        queryFn: () => apiGet('/fees/invoices', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const { data: studentsData } = useQuery({
        queryKey: ['students-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/students', { per_page: 100 }),
        staleTime: 60_000,
        enabled: canManage,
    });
    const students = studentsData?.data ?? [];

    const saveMutation = useMutation({
        mutationFn: (body: typeof emptyForm) => {
            const payload = { student_id: Number(body.student_id), invoice_no: body.invoice_no || undefined, amount: Number(body.amount), paid_amount: Number(body.paid_amount), discount: Number(body.discount), due_date: body.due_date, status: body.status, notes: body.notes || null };
            return editId ? apiPut(`/fees/invoices/${editId}`, payload) : apiPost('/fees/invoices', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['fee-invoices'] });
            showSuccess(editId ? 'Invoice Updated' : 'Invoice Created', editId ? 'Changes saved successfully' : 'Fee invoice has been created');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toastError(err?.response?.data?.message ?? 'Save failed — check for duplicate invoice number');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/fees/invoices/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['fee-invoices'] });
            showSuccess('Invoice Deleted', 'Fee invoice has been removed');
            setDeleteId(null);
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toastError(err?.response?.data?.message ?? 'Delete failed');
        },
    });

    const openEdit = (row: Record<string, unknown>) => {
        if (!canEdit) return;
        setEditId(Number(row.id));
        setForm({ student_id: row.student_id ? String(row.student_id) : '', invoice_no: String(row.invoice_no ?? ''), amount: String(row.amount ?? ''), paid_amount: String(row.paid_amount ?? '0'), discount: String(row.discount ?? '0'), due_date: String(row.due_date ?? '').slice(0, 10), status: String(row.status ?? 'pending'), notes: String(row.notes ?? '') });
        setModalOpen(true);
    };

    const columns = [
        { key: 'invoice_no', label: 'Invoice #' },
        { key: 'student', label: 'Student' },
        { key: 'amount', label: 'Amount', render: (r: Record<string, unknown>) => formatCurrency(Number(r.amount)) },
        { key: 'due_date', label: 'Due Date' },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        { key: 'actions', label: 'Actions', render: (r: Record<string, unknown>) => (
            <ActionButtonGroup>
                <ViewSlipButton slipUrl={`/fees/invoices/${r.id}/slip`} label="View Invoice" />
                <PrintSlipButton slipUrl={`/fees/invoices/${r.id}/slip`} label="Print Invoice" />
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
        )},
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Fee Invoices"
                subtitle={canManage ? 'Create and print student fee invoices' : 'View and print your fee invoices'}
                actions={canCreate ? (
                    <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }}>
                        <Plus className="h-4 w-4" /> Create Invoice
                    </Button>
                ) : undefined}
            />
            <DataTable columns={columns} data={data as never} loading={isLoading} search={search} onSearch={setSearch} onPageChange={setPage}
                activeFilterCount={activeFilterCount} onClearFilters={clearFilters}
                filters={<ListFilters preset="fees" values={filters} onChange={setFilter} />}
            />
            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Invoice' : 'Create Invoice'} size="xl">
                <ModalForm
                    onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }}
                    actions={
                        <>
                            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); setEditId(null); }}>Cancel</Button>
                            <Button type="submit" loading={saveMutation.isPending}>{editId ? 'Save Changes' : 'Create Invoice'}</Button>
                        </>
                    }
                >
                    <div className="grid grid-cols-2 gap-4">
                        <Select
                            label="Student"
                            value={form.student_id}
                            onChange={v => setForm(p => ({ ...p, student_id: v }))}
                            placeholder="Select student"
                            options={students.map(s => ({ value: String(s.id), label: s.name }))}
                        />
                        <Input label="Invoice No (optional)" value={form.invoice_no} onChange={e => setForm(p => ({ ...p, invoice_no: e.target.value }))} placeholder="Auto-generated if empty" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="Amount" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
                        <Input label="Paid" type="number" value={form.paid_amount} onChange={e => setForm(p => ({ ...p, paid_amount: e.target.value }))} />
                        <Input label="Discount" type="number" value={form.discount} onChange={e => setForm(p => ({ ...p, discount: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Due Date" type="date" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} required />
                        <Select
                            label="Status"
                            value={form.status}
                            onChange={v => setForm(p => ({ ...p, status: v }))}
                            options={[
                                { value: 'pending', label: 'Pending' },
                                { value: 'paid', label: 'Paid' },
                                { value: 'partial', label: 'Partial' },
                                { value: 'overdue', label: 'Overdue' },
                            ]}
                        />
                    </div>
                    <Input label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                </ModalForm>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Invoice?"
                message="This will permanently remove this fee invoice. Invoices with recorded payments cannot be deleted."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}

