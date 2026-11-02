import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { asList } from '@/lib/listUtils';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

const DAYS = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' },
];

const emptyForm = {
    day: 'monday',
    start_time: '08:00',
    end_time: '09:00',
    school_class_id: '',
    subject_id: '',
    teacher_id: '',
    room: '',
};

type TimetableForm = typeof emptyForm;

export default function TimetablePage() {
    const location = useLocation();
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const { isSuperAdmin } = useAuth();

    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState<TimetableForm>(emptyForm);

    const timetableFilters = emptyFilterValues([
        { type: 'day', key: 'day' },
        { type: 'class', key: 'class_id' },
        { type: 'subject', key: 'subject_id' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(timetableFilters);

    const { data, isLoading } = useQuery({
        queryKey: ['timetable', page, search, filters],
        queryFn: () => apiGet('/timetable', { page, search, ...apiParams }),
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

    const { data: teachersData } = useQuery({
        queryKey: ['teachers-list'],
        queryFn: () => apiGet<{ data: Array<{ id: number; name: string }> }>('/teachers', { per_page: 100, status: 'active' }),
        staleTime: 60_000,
    });
    const teachers = teachersData?.data ?? [];

    const saveMutation = useMutation({
        mutationFn: (body: TimetableForm) => {
            const payload = {
                day: body.day,
                start_time: body.start_time,
                end_time: body.end_time,
                school_class_id: Number(body.school_class_id),
                subject_id: body.subject_id ? Number(body.subject_id) : null,
                teacher_id: body.teacher_id ? Number(body.teacher_id) : null,
                room: body.room || null,
            };
            return editId ? apiPut(`/timetable/${editId}`, payload) : apiPost('/timetable', payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast(editId ? 'Timetable slot updated' : 'Timetable slot created');
            closeModal();
        },
        onError: (err: Error) => toast(err.message || 'Save failed', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/timetable/${id}`),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            toast('Timetable slot deleted');
            setDeleteId(null);
        },
        onError: (err: Error) => toast(err.message || 'Delete failed', 'error'),
    });

    const closeModal = () => {
        setModalOpen(false);
        setEditId(null);
        setForm(emptyForm);
    };

    const openCreate = () => {
        setEditId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({
            day: String(row.day_value ?? row.day ?? 'monday').toLowerCase(),
            start_time: String(row.start_time ?? '08:00'),
            end_time: String(row.end_time ?? '09:00'),
            school_class_id: row.school_class_id ? String(row.school_class_id) : '',
            subject_id: row.subject_id ? String(row.subject_id) : '',
            teacher_id: row.teacher_id ? String(row.teacher_id) : '',
            room: String(row.room ?? ''),
        });
        setModalOpen(true);
    };

    useEffect(() => {
        const state = location.state as { openForm?: boolean; editId?: number } | null;
        if (!isSuperAdmin || !state) return;

        if (state.openForm) {
            openCreate();
        } else if (state.editId) {
            const rows = (data as { data?: Record<string, unknown>[] } | undefined)?.data ?? [];
            const row = rows.find(r => Number(r.id) === state.editId);
            if (row) openEdit(row);
        }

        window.history.replaceState({}, document.title);
    }, [location.state, isSuperAdmin, data]);

    const columns = [
        { key: 'day', label: 'Day' },
        { key: 'start_time', label: 'Start' },
        { key: 'end_time', label: 'End' },
        { key: 'class', label: 'Class' },
        { key: 'subject', label: 'Subject' },
        { key: 'teacher', label: 'Teacher' },
        { key: 'room', label: 'Room' },
        ...(isSuperAdmin ? [{
            key: 'actions',
            label: 'Actions',
            render: (row: Record<string, unknown>) => (
                <ActionButtonGroup>
                    <ActionIconButton
                        variant="edit"
                        title="Edit slot"
                        onClick={(e) => { e.stopPropagation(); openEdit(row); }}
                    />
                    <ActionIconButton
                        variant="delete"
                        title="Delete slot"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(Number(row.id)); }}
                    />
                </ActionButtonGroup>
            ),
        }] : []),
    ];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.school_class_id) {
            toast('Please select a class', 'error');
            return;
        }
        saveMutation.mutate(form);
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Timetable"
                subtitle="Weekly class schedule"
                badge={isSuperAdmin ? 'Superadmin' : undefined}
                actions={isSuperAdmin ? (
                    <Button size="sm" onClick={openCreate}>
                        <Plus className="h-4 w-4" /> Add New
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
                filters={<ListFilters preset="timetable" values={filters} onChange={setFilter} />}
            />

            {isSuperAdmin && (
                <>
                    <Modal open={modalOpen} onClose={closeModal} title={editId ? 'Edit Timetable Slot' : 'Add Timetable Slot'}>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Select
                                label="Day"
                                value={form.day}
                                onChange={v => setForm(p => ({ ...p, day: v }))}
                                options={DAYS}
                            />
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Input
                                    label="Start Time"
                                    type="time"
                                    value={form.start_time}
                                    onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
                                    required
                                />
                                <Input
                                    label="End Time"
                                    type="time"
                                    value={form.end_time}
                                    onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
                                    required
                                />
                            </div>
                            <Select
                                label="Class"
                                value={form.school_class_id}
                                onChange={v => setForm(p => ({ ...p, school_class_id: v }))}
                                placeholder="Select class…"
                                options={classes.map(c => ({ value: String(c.id), label: c.name }))}
                            />
                            <Select
                                label="Subject"
                                value={form.subject_id}
                                onChange={v => setForm(p => ({ ...p, subject_id: v }))}
                                placeholder="Select subject (optional)…"
                                options={subjects.map(s => ({ value: String(s.id), label: s.name }))}
                            />
                            <Select
                                label="Teacher"
                                value={form.teacher_id}
                                onChange={v => setForm(p => ({ ...p, teacher_id: v }))}
                                placeholder="Select teacher (optional)…"
                                options={teachers.map(t => ({ value: String(t.id), label: t.name }))}
                            />
                            <Input
                                label="Room"
                                value={form.room}
                                onChange={e => setForm(p => ({ ...p, room: e.target.value }))}
                                placeholder="e.g. Room 101"
                            />
                            <Button type="submit" loading={saveMutation.isPending} className="w-full">
                                {editId ? 'Save Changes' : 'Create Slot'}
                            </Button>
                        </form>
                    </Modal>

                    <ConfirmDialog
                        open={deleteId !== null}
                        onCancel={() => setDeleteId(null)}
                        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                        title="Delete Timetable Slot?"
                        message="This will permanently remove this schedule entry."
                        loading={deleteMutation.isPending}
                        type="danger"
                    />
                </>
            )}
        </div>
    );
}
