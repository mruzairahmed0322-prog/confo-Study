import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useInstantQuery } from '@/lib/useInstantQuery';
import { apiDelete, apiGet, apiPatch, apiPostForm, apiPutForm } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal, ModalForm } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { PhotoUpload } from '@/components/ui/PhotoUpload';
import { FormSection, FormGrid } from '@/components/ui/FormSection';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { useAuth } from '@/contexts/AuthContext';
import { ViewSlipButton } from '@/components/documents/ViewSlipButton';
import { PrintSlipButton } from '@/components/documents/PrintSlipButton';
import {
    GENDER_OPTIONS, STATUS_OPTIONS, RELIGION_OPTIONS, BLOOD_GROUP_OPTIONS, buildFormData,
} from '@/lib/recordFields';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

interface Student extends Record<string, unknown> {
    id: number;
    name: string;
    father_name?: string;
    mother_name?: string;
    photo?: string;
    roll_no: string;
    gr_no?: string;
    b_form_no?: string;
    class: string;
    class_id?: number;
    section?: string;
    status: string;
    admission_date: string;
    gender: string;
    dob?: string;
    religion?: string;
    blood_group?: string;
    phone?: string;
    emergency_contact?: string;
    father_cnic?: string;
    father_phone?: string;
    address?: string;
    city?: string;
    previous_school?: string;
    parent_id?: number;
    email?: string;
    login_status?: string;
}

interface PaginatedStudents {
    data: Student[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

const emptyForm = {
    name: '', father_name: '', mother_name: '', roll_no: '', gr_no: '', b_form_no: '',
    school_class_id: '', section: '', gender: 'male', dob: '', religion: '', blood_group: '',
    admission_date: new Date().toISOString().split('T')[0], status: 'active',
    phone: '', emergency_contact: '', father_cnic: '', father_phone: '',
    address: '', city: 'Karachi', previous_school: '', parent_id: '',
    email: '', password: '',
};

export default function StudentsPage() {
    const studentFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'class', key: 'class_id' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(studentFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [archiveId, setArchiveId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const [photo, setPhoto] = useState<File | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const { toast } = useToast();
    const { isSuperAdmin, hasPermission } = useAuth();
    const canCreate = hasPermission('students.create');
    const canEdit = hasPermission('students.edit');
    const qc = useQueryClient();

    const { data, isInitialLoading } = useInstantQuery<PaginatedStudents>({
        queryKey: ['students', page, search, filters],
        queryFn: () => apiGet('/students', { page, search, ...apiParams }),
    });

    const { data: classes = [] } = useQuery<Array<{ id: number; name: string }>>({
        queryKey: ['student-classes'],
        queryFn: () => apiGet('/students/classes'),
    });

    const { data: parentsData } = useQuery({
        queryKey: ['parents-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/parents', { per_page: 100 }),
    });
    const parents = parentsData?.data ?? [];

    const resetForm = () => {
        setForm(emptyForm);
        setPhoto(null);
        setPhotoPreview(null);
        setEditingId(null);
    };

    const toggleMutation = useMutation({
        mutationFn: (id: number) => apiPatch(`/students/${id}/toggle-status`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['students'] }); toast('Status updated'); },
    });

    const archiveMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/students/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['students'] });
            qc.invalidateQueries({ queryKey: ['students-archived'] });
            toast('Student moved to archives');
            setArchiveId(null);
        },
        onError: () => toast('Failed to archive student', 'error'),
    });

    const createMutation = useMutation({
        mutationFn: () => apiPostForm('/students', buildFormData(form, photo)),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['students'] });
            toast('Student added successfully');
            setModalOpen(false);
            resetForm();
        },
        onError: () => toast('Failed to add student', 'error'),
    });

    const updateMutation = useMutation({
        mutationFn: () => editingId ? apiPutForm(`/students/${editingId}`, buildFormData(form, photo)) : Promise.reject(),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['students'] });
            toast('Student updated');
            setEditOpen(false);
            resetForm();
        },
        onError: () => toast('Failed to update student', 'error'),
    });

    const openEdit = (row: Student) => {
        setEditingId(row.id);
        setForm({
            name: row.name ?? '',
            father_name: String(row.father_name ?? ''),
            mother_name: String(row.mother_name ?? ''),
            roll_no: row.roll_no ?? '',
            gr_no: String(row.gr_no ?? ''),
            b_form_no: String(row.b_form_no ?? ''),
            school_class_id: row.class_id ? String(row.class_id) : '',
            section: String(row.section ?? ''),
            gender: row.gender ?? 'male',
            dob: String(row.dob ?? ''),
            religion: String(row.religion ?? ''),
            blood_group: String(row.blood_group ?? ''),
            admission_date: row.admission_date ?? '',
            status: row.status ?? 'active',
            phone: String(row.phone ?? ''),
            emergency_contact: String(row.emergency_contact ?? ''),
            father_cnic: String(row.father_cnic ?? ''),
            father_phone: String(row.father_phone ?? ''),
            address: String(row.address ?? ''),
            city: String(row.city ?? 'Karachi'),
            previous_school: String(row.previous_school ?? ''),
            parent_id: row.parent_id ? String(row.parent_id) : '',
            email: String(row.email ?? ''),
            password: '',
        });
        setPhoto(null);
        setPhotoPreview(row.photo ?? null);
        setEditOpen(true);
    };

    const set = (key: string, val: string) => setForm(p => ({ ...p, [key]: val }));

    const studentForm = (
        <div className="space-y-5">
            <FormSection title="Student Photo & Basic Info" description="Name, father's name, and personal details">
                <FormGrid>
                    <div className="sm:col-span-2">
                        <PhotoUpload
                            label="Student Photo"
                            value={photo}
                            previewUrl={photoPreview}
                            onChange={setPhoto}
                        />
                    </div>
                    <Input label="Full Name *" value={form.name} onChange={e => set('name', e.target.value)} required placeholder="Student full name" />
                    <Input label="Father's Name *" value={form.father_name} onChange={e => set('father_name', e.target.value)} required placeholder="Father / Guardian name" />
                    <Input label="Mother's Name" value={form.mother_name} onChange={e => set('mother_name', e.target.value)} placeholder="Mother name (optional)" />
                    <Select label="Gender" value={form.gender} onChange={v => set('gender', v)} options={GENDER_OPTIONS} />
                    <Input label="Date of Birth" type="date" value={form.dob} onChange={e => set('dob', e.target.value)} />
                    <Select label="Religion" value={form.religion} onChange={v => set('religion', v)} options={RELIGION_OPTIONS} placeholder="Select religion" />
                    <Select label="Blood Group" value={form.blood_group} onChange={v => set('blood_group', v)} options={BLOOD_GROUP_OPTIONS} placeholder="Select blood group" />
                </FormGrid>
            </FormSection>

            <FormSection title="School Details" description="Class, roll number, GR number and admission info">
                <FormGrid>
                    <Input label="GR No / Student ID" value={form.gr_no} onChange={e => set('gr_no', e.target.value)} placeholder="General Register number" />
                    <Input label="Roll No *" value={form.roll_no} onChange={e => set('roll_no', e.target.value)} required placeholder="Class roll number" />
                    <Select
                        label="Class"
                        value={form.school_class_id}
                        onChange={v => set('school_class_id', v)}
                        options={classes.map(c => ({ value: String(c.id), label: c.name }))}
                        placeholder="Select class"
                    />
                    <Input label="Section" value={form.section} onChange={e => set('section', e.target.value)} placeholder="e.g. A, B, C" />
                    <Input label="Admission Date" type="date" value={form.admission_date} onChange={e => set('admission_date', e.target.value)} />
                    <Select label="Status" value={form.status} onChange={v => set('status', v)} options={STATUS_OPTIONS} />
                    <Input label="Previous School" value={form.previous_school} onChange={e => set('previous_school', e.target.value)} placeholder="Last school attended" className="sm:col-span-2" />
                </FormGrid>
            </FormSection>

            <FormSection title="ID & Contact" description="B-Form, CNIC, phone and Karachi address">
                <FormGrid>
                    <Input label="B-Form / CNIC No" value={form.b_form_no} onChange={e => set('b_form_no', e.target.value)} placeholder="42101-1234567-1" />
                    <Input label="Father CNIC" value={form.father_cnic} onChange={e => set('father_cnic', e.target.value)} placeholder="Father's CNIC number" />
                    <Input label="Student Phone" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="03XX-XXXXXXX" />
                    <Input label="Father Phone" value={form.father_phone} onChange={e => set('father_phone', e.target.value)} placeholder="Father's mobile" />
                    <Input label="Emergency Contact" value={form.emergency_contact} onChange={e => set('emergency_contact', e.target.value)} placeholder="Emergency number" />
                    <Input label="City" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Karachi" />
                    <div className="sm:col-span-2">
                        <Textarea label="Home Address" value={form.address} onChange={e => set('address', e.target.value)} placeholder="House no, street, area, Karachi" />
                    </div>
                </FormGrid>
            </FormSection>

            <FormSection title="Parent & Student Fresh Login Credentials" description="Har student ke liye hamesha fresh Gmail aur password enter karein">
                {/* Trap browser autofill to prevent old/admin credentials from appearing */}
                <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" readOnly />
                <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" readOnly />

                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200 mb-3">
                    ⚠ <strong>Fresh Student Credentials:</strong> Purane ya saved email/password use na karein. Student ke liye hamesha fresh unique Gmail aur naya password enter karein.
                </div>

                <FormGrid>
                    <Select
                        label="Parent Account"
                        value={form.parent_id}
                        onChange={v => set('parent_id', v)}
                        options={parents.map(p => ({ value: String(p.id), label: p.name }))}
                        placeholder="Select parent (optional)"
                    />
                    <div>
                        <Input
                            label="Student Fresh Gmail / Login Email"
                            type="email"
                            name="student_fresh_email_field"
                            autoComplete="new-student-email"
                            value={form.email}
                            onChange={e => set('email', e.target.value)}
                            placeholder="Enter fresh student Gmail (e.g. student@gmail.com)"
                        />
                        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">Hamesha fresh Gmail add karein (purani email show na ho)</p>
                    </div>
                    <div>
                        <Input
                            label="Student Fresh Password"
                            type="password"
                            name="student_fresh_password_field"
                            autoComplete="new-password"
                            value={form.password}
                            onChange={e => set('password', e.target.value)}
                            placeholder={editOpen ? 'Leave blank to keep current' : 'Enter fresh password (min 8 chars)'}
                            minLength={8}
                        />
                        <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-medium">Fresh password jo student login ke liye use karega</p>
                    </div>
                </FormGrid>
            </FormSection>
        </div>
    );

    const columns = [
        {
            key: 'name', label: 'Student',
            render: (row: Student) => (
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
        { key: 'gr_no', label: 'GR No', render: (r: Student) => r.gr_no || '—' },
        { key: 'roll_no', label: 'Roll No' },
        { key: 'class', label: 'Class', render: (r: Student) => r.section ? `${r.class} (${r.section})` : r.class },
        { key: 'phone', label: 'Phone', render: (r: Student) => r.phone || r.father_phone || '—' },
        { key: 'admission_date', label: 'Admitted' },
        { key: 'status', label: 'Status', render: (row: Student) => <Badge variant={row.status}>{row.status}</Badge> },
        {
            key: 'login_status', label: 'Login',
            render: (row: Student) => row.login_status && row.login_status !== 'none'
                ? <Badge variant={row.login_status === 'blocked' ? 'inactive' : row.login_status}>{row.login_status}</Badge>
                : <span className="text-xs text-emerald-600/60">No login</span>,
        },
        {
            key: 'actions', label: 'Actions',
            render: (row: Student) => (
                <ActionButtonGroup>
                    {canEdit && (
                        <ActionIconButton
                            variant="edit"
                            title="Edit student"
                            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                        />
                    )}
                    <ViewSlipButton slipUrl={`/students/${row.id}/slip`} label="View Admission Slip" />
                    <PrintSlipButton slipUrl={`/students/${row.id}/slip`} label="Print Admission Slip" />
                    {isSuperAdmin ? (
                        <ActionIconButton
                            variant="toggle"
                            title={row.login_status === 'blocked' ? 'Unblock login' : 'Block / deactivate'}
                            onClick={(e) => { e.stopPropagation(); toggleMutation.mutate(row.id); }}
                        >
                            {row.status === 'active' && row.login_status !== 'blocked'
                                ? <ToggleRight className="h-4 w-4" strokeWidth={2.25} />
                                : <ToggleLeft className="h-4 w-4" strokeWidth={2.25} />}
                        </ActionIconButton>
                    ) : null}
                    {isSuperAdmin ? (
                        <ActionIconButton
                            variant="delete"
                            title="Move to archives"
                            onClick={(e) => { e.stopPropagation(); setArchiveId(row.id); }}
                        />
                    ) : null}
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader title="Students" subtitle={canCreate || canEdit ? 'Manage student records — Karachi school admission' : 'View student records'}
                actions={canCreate ? <Button size="sm" onClick={() => { resetForm(); setModalOpen(true); }}><Plus className="h-4 w-4" /> Add Student</Button> : undefined} />

            <DataTable<Student>
                columns={columns}
                data={data}
                loading={isInitialLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                filters={<ListFilters preset="students" values={filters} onChange={setFilter} />}
            />

            <Modal open={modalOpen && canCreate} onClose={() => setModalOpen(false)} title="Add Student" size="2xl">
                <ModalForm
                    onSubmit={e => { e.preventDefault(); if (!canCreate) return; createMutation.mutate(); }}
                    actions={
                        <>
                            <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                            <Button type="submit" loading={createMutation.isPending}>Add Student</Button>
                        </>
                    }
                >
                    {studentForm}
                </ModalForm>
            </Modal>

            <Modal open={editOpen && canEdit} onClose={() => { setEditOpen(false); resetForm(); }} title="Edit Student" size="2xl">
                <ModalForm
                    onSubmit={e => { e.preventDefault(); if (!canEdit) return; updateMutation.mutate(); }}
                    actions={
                        <>
                            <Button type="button" variant="ghost" onClick={() => { setEditOpen(false); resetForm(); }}>Cancel</Button>
                            <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
                        </>
                    }
                >
                    {studentForm}
                </ModalForm>
            </Modal>

            <ConfirmDialog
                open={archiveId !== null}
                type="warning"
                title="Move to archives?"
                message="Student will be removed from the active list and moved to Archives. Only superadmin can permanently delete from Archives."
                confirmText="Archive"
                loading={archiveMutation.isPending}
                onConfirm={() => archiveId && archiveMutation.mutate(archiveId)}
                onCancel={() => setArchiveId(null)}
            />
        </div>
    );
}
