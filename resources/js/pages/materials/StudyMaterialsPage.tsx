import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPostForm, apiPutForm, apiDelete } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal, ModalForm } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Download, FileText, Upload, ExternalLink } from 'lucide-react';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { asList } from '@/lib/listUtils';
import { emptyFilterValues, FILTER_PRESETS, ListFilters, usePagedList } from '@/lib/listFilters';
import { Textarea } from '@/components/ui/Textarea';

const TYPE_OPTIONS = [
    { value: 'notes', label: 'Notes' },
    { value: 'pdf', label: 'PDF' },
    { value: 'book', label: 'Book' },
    { value: 'magazine', label: 'Magazine' },
    { value: 'document', label: 'Document' },
    { value: 'study_material', label: 'Study Material' },
    { value: 'image', label: 'Image' },
    { value: 'other', label: 'Other' },
];

const SCHOOL_WIDE_TYPES = new Set(['notes', 'book', 'magazine']);

function isSchoolWideType(type: string) {
    return SCHOOL_WIDE_TYPES.has(type);
}

interface MaterialForm {
    title: string;
    description: string;
    type: string;
    school_class_id: string;
    subject_id: string;
    live_class_id: string;
    download_allowed: boolean;
    status: string;
}

const emptyForm: MaterialForm = {
    title: '', description: '', type: 'pdf',
    school_class_id: '', subject_id: '', live_class_id: '',
    download_allowed: true, status: 'published',
};

function formatFileSize(bytes?: number | null): string {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function authFetchBlob(url: string): Promise<Blob> {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
    });
    if (!res.ok) throw new Error('Request failed');
    return res.blob();
}

async function downloadMaterial(url: string, fileName: string) {
    const blob = await authFetchBlob(url);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName || 'download';
    link.click();
    URL.revokeObjectURL(link.href);
}

async function openMaterial(url: string) {
    const blob = await authFetchBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

export default function StudyMaterialsPage() {
    const materialFilters = emptyFilterValues(FILTER_PRESETS.materials);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(materialFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState<MaterialForm>(emptyForm);
    const [file, setFile] = useState<File | null>(null);
    const [files, setFiles] = useState<File[]>([]);
    const fileRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canManage = hasPermission('materials.create') || hasPermission('materials.edit');
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['materials', page, search, filters],
        queryFn: () => apiGet('/materials', { page, search, ...apiParams }),
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

    const { data: liveClassesData } = useQuery({
        queryKey: ['live-classes-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; title: string; school_class_id?: number | null }> }>('/live-classes', { per_page: 50 }),
        staleTime: 60_000,
        enabled: canManage,
    });
    const liveClasses = liveClassesData?.data ?? [];

    const buildFormData = () => {
        const fd = new FormData();
        fd.append('title', form.title);
        fd.append('description', form.description);
        fd.append('type', form.type);
        if (form.school_class_id) fd.append('school_class_id', form.school_class_id);
        if (form.subject_id) fd.append('subject_id', form.subject_id);
        if (form.live_class_id) fd.append('live_class_id', form.live_class_id);
        fd.append('download_allowed', form.download_allowed ? '1' : '0');
        fd.append('status', form.status);
        if (files.length > 0) {
            files.forEach(f => fd.append('files[]', f));
            if (files[0]) fd.append('file', files[0]);
        } else if (file) {
            fd.append('file', file);
        }
        return fd;
    };

    const saveMutation = useMutation({
        mutationFn: () => {
            const fd = buildFormData();
            return editId
                ? apiPutForm(`/materials/${editId}`, fd)
                : apiPostForm('/materials', fd);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['materials'] });
            toast(editId ? 'Material updated' : 'Material uploaded — fee-paid students notified');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
            setFile(null); setFiles([]);
        },
        onError: (err: Error & { response?: { data?: { message?: string } } }) => {
            toast(err?.response?.data?.message ?? 'Upload failed', 'error');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/materials/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['materials'] });
            toast('Material removed');
            setDeleteId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({
            title: String(row.title ?? ''),
            description: String(row.description ?? ''),
            type: String(row.type ?? 'pdf'),
            school_class_id: row.school_class_id ? String(row.school_class_id) : '',
            subject_id: row.subject_id ? String(row.subject_id) : '',
            live_class_id: row.live_class_id ? String(row.live_class_id) : '',
            download_allowed: row.download_allowed !== false,
            status: String(row.status ?? 'published'),
        });
        setFile(null); setFiles([]);
        setModalOpen(true);
    };

    const typeLabel = (t: string) => TYPE_OPTIONS.find(o => o.value === t)?.label ?? t;

    const columns = [
        {
            key: 'title', label: 'Title',
            render: (r: Record<string, unknown>) => (
                <div className="flex items-start gap-2">
                    <FileText className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <div>
                        <p className="font-medium">{String(r.title)}</p>
                        {r.subject_name ? (
                            <p className="text-xs text-stone-500">
                                {String(r.subject_name)} · {String(r.class_name ?? '')}
                                {r.batch_name ? ` · Batch ${String(r.batch_name)}` : ''}
                            </p>
                        ) : null}
                    </div>
                </div>
            ),
        },
        { key: 'type', label: 'Type', render: (r: Record<string, unknown>) => typeLabel(String(r.type)) },
        { key: 'file_name', label: 'File', render: (r: Record<string, unknown>) => String(r.file_name ?? '—') },
        { key: 'file_size', label: 'Size', render: (r: Record<string, unknown>) => formatFileSize(Number(r.file_size)) },
        { key: 'teacher_name', label: 'Teacher', render: (r: Record<string, unknown>) => String(r.teacher_name ?? '—') },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        {
            key: 'actions', label: 'Actions',
            render: (r: Record<string, unknown>) => (
                <ActionButtonGroup>
                    {r.access_denied ? (
                        <span className="text-xs text-amber-600 dark:text-amber-400">Access denied</span>
                    ) : (
                        <>
                            {r.can_open && r.view_url ? (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await openMaterial(String(r.view_url));
                                        } catch {
                                            toast('Could not open file', 'error');
                                        }
                                    }}
                                >
                                    <ExternalLink className="h-3.5 w-3.5" /> Open
                                </Button>
                            ) : null}
                            {r.can_download && r.download_url ? (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            await downloadMaterial(String(r.download_url), String(r.file_name ?? 'material'));
                                        } catch {
                                            toast('Download failed', 'error');
                                        }
                                    }}
                                >
                                    <Download className="h-3.5 w-3.5" /> Download
                                </Button>
                            ) : r.can_view && !r.download_allowed ? (
                                <span className="text-xs text-stone-500">View only</span>
                            ) : null}
                        </>
                    )}
                    {Boolean(r.can_manage) && hasPermission('materials.edit') && (
                        <ActionIconButton variant="edit" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(r); }} />
                    )}
                    {Boolean(r.can_manage) && hasPermission('materials.delete') && (
                        <ActionIconButton variant="delete" title="Delete" onClick={(e) => { e.stopPropagation(); setDeleteId(Number(r.id)); }} />
                    )}
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Study Materials"
                subtitle={canManage
                    ? 'Upload PDF, notes, books & magazines. Notes/books/magazines download for all fee-paid students.'
                    : 'Notes, PDFs, books & magazines — fee-paid students only'}
                badge="Academics"
                actions={hasPermission('materials.create') && (
                    <Button size="sm" onClick={() => { setEditId(null); setForm(emptyForm); setFile(null); setFiles([]); setModalOpen(true); }}>
                        <Plus className="h-4 w-4" /> Upload Material
                    </Button>
                )}
            />
            {!canManage && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
                    Fee-paid enrolled students notes, books aur magazines download kar sakte hain (saari classes). PDF/documents apni class ke hain.
                </div>
            )}
            <DataTable
                columns={columns}
                data={data as never}
                loading={isLoading}
                search={search}
                onSearch={setSearch}
                onPageChange={setPage}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                filters={<ListFilters preset="materials" values={filters} onChange={setFilter} />}
            />
            {hasPermission('materials.create') && (
                <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Material' : 'Upload Study Material'} size="lg">
                    <ModalForm
                        onSubmit={e => {
                            e.preventDefault();
                            if (!editId && !file) {
                                toast('Please select a file', 'error');
                                return;
                            }
                            if (!isSchoolWideType(form.type) && !form.school_class_id) {
                                toast('Please select a class', 'error');
                                return;
                            }
                            saveMutation.mutate();
                        }}
                        actions={
                            <>
                                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
                                <Button type="submit" loading={saveMutation.isPending}>
                                    {editId ? 'Save Changes' : 'Upload & Notify Students'}
                                </Button>
                            </>
                        }
                    >
                        <div className="space-y-4">
                            <Input label="Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g. Chapter 5 Notes" />
                            <Textarea label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional details" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Type</label>
                                    <select
                                        value={form.type}
                                        onChange={e => {
                                            const type = e.target.value;
                                            setForm(p => ({
                                                ...p,
                                                type,
                                                download_allowed: true,
                                                ...(isSchoolWideType(type) ? { school_class_id: '', subject_id: '', live_class_id: '' } : {}),
                                            }));
                                        }}
                                        className="admin-input w-full px-3 py-2 text-sm"
                                    >
                                        {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Status</label>
                                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                        <option value="published">Published</option>
                                        <option value="draft">Draft</option>
                                    </select>
                                </div>
                            </div>
                            {!isSchoolWideType(form.type) && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Class / Batch *</label>
                                        <select value={form.school_class_id} onChange={e => setForm(p => ({ ...p, school_class_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm" required>
                                            <option value="">Select class</option>
                                            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Subject / Course</label>
                                        <select value={form.subject_id} onChange={e => setForm(p => ({ ...p, subject_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                            <option value="">All subjects</option>
                                            {subjects
                                                .filter(s => !form.school_class_id || !s.school_class_id || String(s.school_class_id) === form.school_class_id)
                                                .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            {isSchoolWideType(form.type) && (
                                <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800 dark:border-sky-800 dark:bg-sky-900/20 dark:text-sky-200">
                                    Notes / books / magazines school-wide hain — har fee-paid enrolled student download kar sakta hai.
                                </p>
                            )}
                            {!isSchoolWideType(form.type) && (
                                <div>
                                    <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Link to Live Class (optional)</label>
                                    <select value={form.live_class_id} onChange={e => setForm(p => ({ ...p, live_class_id: e.target.value }))} className="admin-input w-full px-3 py-2 text-sm">
                                        <option value="">Not linked to a live class</option>
                                        {liveClasses
                                            .filter(lc => !form.school_class_id || !lc.school_class_id || String(lc.school_class_id) === form.school_class_id)
                                            .map(lc => <option key={lc.id} value={lc.id}>{lc.title}</option>)}
                                    </select>
                                </div>
                            )}
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={form.download_allowed} onChange={e => setForm(p => ({ ...p, download_allowed: e.target.checked }))} className="rounded" />
                                Allow download (all fee-paid students for notes/books/magazines)
                            </label>
                            <div>
                                <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
                                    File {editId ? '(leave empty to keep current)' : '*'}
                                </label>
                                <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
                                <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                                    <Upload className="h-4 w-4" /> {file ? file.name : 'Choose file (PDF, Word, etc.)'}
                                </Button>
                                <p className="mt-1 text-xs text-stone-500">Max 20 MB. PDF, notes, books, magazines, documents supported.</p>
                            </div>
                        </div>
                    </ModalForm>
                </Modal>
            )}
            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Remove Material"
                message="Delete this study material? Students will lose access."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
