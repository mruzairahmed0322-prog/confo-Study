import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Upload } from 'lucide-react';

import { apiDelete, apiGet, apiPostForm } from '@/lib/api';
import { DataTable, Badge } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

interface BookForm {
    title: string;
    author: string;
    isbn: string;
    category: string;
    total_copies: string;
    shelf_location: string;
    status: string;
}

const emptyForm: BookForm = {
    title: '',
    author: '',
    isbn: '',
    category: '',
    total_copies: '1',
    shelf_location: '',
    status: 'available',
};

async function authFetchBlob(url: string): Promise<Blob> {
    const token = localStorage.getItem('auth_token');
    const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include',
    });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
}

async function downloadFile(url: string, fileName: string) {
    const blob = await authFetchBlob(url);
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName || 'book.pdf';
    link.click();
    URL.revokeObjectURL(link.href);
}

export default function LibraryPage() {
    const libraryFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'category', key: 'category' },
    ]);
    const {
        page, setPage, search, setSearch, filters, setFilter,
        clearFilters, activeFilterCount, apiParams,
    } = usePagedList(libraryFilters);

    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState<BookForm>(emptyForm);
    const [file, setFile] = useState<File | null>(null);
    const [existingFileName, setExistingFileName] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('library.create');
    const canEdit = hasPermission('library.edit');
    const canDelete = hasPermission('library.delete');
    const canManage = canCreate || canEdit;
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['library', page, search, filters],
        queryFn: () => apiGet('/library', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const buildFormData = () => {
        const fd = new FormData();
        fd.append('title', form.title);
        if (form.author) fd.append('author', form.author);
        if (form.isbn) fd.append('isbn', form.isbn);
        if (form.category) fd.append('category', form.category);
        fd.append('total_copies', form.total_copies);
        if (form.shelf_location) fd.append('shelf_location', form.shelf_location);
        fd.append('status', form.status);
        if (file) fd.append('file', file);
        return fd;
    };

    const saveMutation = useMutation({
        mutationFn: () => {
            const fd = buildFormData();
            // POST for create + update (multipart file uploads are unreliable over PUT)
            return editId ? apiPostForm(`/library/${editId}`, fd) : apiPostForm('/library', fd);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['library'] });
            toast(editId ? 'Book updated' : 'Book added to library');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
            setFile(null);
            setExistingFileName(null);
        },
        onError: () => toast('Save failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/library/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['library'] });
            toast('Book removed');
            setDeleteId(null);
        },
        onError: () => toast('Delete failed', 'error'),
    });

    const openEdit = (row: Record<string, unknown>) => {
        if (!canEdit) return;
        setEditId(Number(row.id));
        setForm({
            title: String(row.title),
            author: row.author === '—' ? '' : String(row.author),
            isbn: row.isbn === '—' ? '' : String(row.isbn),
            category: row.category === 'General' ? '' : String(row.category),
            total_copies: String(row.total_copies),
            shelf_location: row.shelf_location === '—' ? '' : String(row.shelf_location),
            status: String(row.status),
        });
        setExistingFileName(row.file_name ? String(row.file_name) : null);
        setFile(null);
        setModalOpen(true);
    };

    const handleDownload = async (row: Record<string, unknown>) => {
        if (!row.download_url) {
            toast('No PDF attached for this book', 'error');
            return;
        }
        try {
            await downloadFile(String(row.download_url), String(row.file_name ?? `${row.title}.pdf`));
        } catch {
            toast('Download failed', 'error');
        }
    };

    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'author', label: 'Author' },
        { key: 'isbn', label: 'ISBN' },
        { key: 'category', label: 'Category' },
        {
            key: 'available_copies',
            label: 'Available',
            render: (r: Record<string, unknown>) => `${r.available_copies}/${r.total_copies}`,
        },
        {
            key: 'file',
            label: 'PDF',
            render: (r: Record<string, unknown>) => (
                r.has_file
                    ? <Badge variant="available">PDF</Badge>
                    : <span className="text-xs text-muted-foreground">—</span>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (r: Record<string, unknown>) => (
                <ActionButtonGroup>
                    {Boolean(r.has_file) && (
                        <ActionIconButton
                            variant="view"
                            title="Download PDF"
                            icon={Download}
                            onClick={(e) => { e.stopPropagation(); void handleDownload(r); }}
                        />
                    )}
                    {canEdit && (
                        <ActionIconButton
                            variant="edit"
                            title="Edit book"
                            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                        />
                    )}
                    {canDelete && (
                        <ActionIconButton
                            variant="delete"
                            title="Delete book"
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
                title="Library"
                subtitle={canManage ? 'Manage books + PDF downloads' : 'Browse and download school books'}
                badge="Academics"
                actions={canCreate ? (
                    <Button
                        size="sm"
                        onClick={() => {
                            setEditId(null);
                            setForm(emptyForm);
                            setFile(null);
                            setExistingFileName(null);
                            setModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> Add Book
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
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
                filters={<ListFilters preset="library" values={filters} onChange={setFilter} />}
            />

            <Modal
                open={modalOpen && canManage}
                onClose={() => setModalOpen(false)}
                title={editId ? 'Edit Book' : 'Add Book'}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (!canManage) return;
                        saveMutation.mutate();
                    }}
                    className="space-y-4"
                >
                    <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
                    <Input label="Author" value={form.author} onChange={(e) => setForm((p) => ({ ...p, author: e.target.value }))} />
                    <Input label="ISBN" value={form.isbn} onChange={(e) => setForm((p) => ({ ...p, isbn: e.target.value }))} />
                    <Input label="Category" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} />
                    <Input label="Total Copies" type="number" value={form.total_copies} onChange={(e) => setForm((p) => ({ ...p, total_copies: e.target.value }))} required />
                    <Input label="Shelf Location" value={form.shelf_location} onChange={(e) => setForm((p) => ({ ...p, shelf_location: e.target.value }))} />
                    <select
                        value={form.status}
                        onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                        className="admin-input w-full px-3 py-2 text-sm"
                    >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                    </select>

                    <div className="space-y-2">
                        <p className="text-sm font-medium">Book PDF / File (optional)</p>
                        {existingFileName && !file ? (
                            <p className="text-xs text-muted-foreground">Current: {existingFileName}</p>
                        ) : null}
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".pdf,.doc,.docx,.ppt,.pptx,.epub,.txt,.zip"
                            className="hidden"
                            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                        <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>
                            <Upload className="h-4 w-4" /> {file ? file.name : 'Choose PDF / file'}
                        </Button>
                    </div>

                    <Button type="submit" loading={saveMutation.isPending} className="w-full">
                        {editId ? 'Update Book' : 'Add Book'}
                    </Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Remove Book"
                message="Are you sure you want to remove this book from the library?"
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
