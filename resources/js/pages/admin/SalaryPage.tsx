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
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { PrintSlipButton } from '@/components/documents/PrintSlipButton';
import { ViewSlipButton } from '@/components/documents/ViewSlipButton';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

const emptyForm = {
    employee_name: '',
    basic_salary: '',
    allowances: '0',
    deductions: '0',
    month: 'January',
    year: String(new Date().getFullYear()),
    status: 'pending',
};

export default function SalaryPage() {
    const salaryFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'status', key: 'status' },
        { type: 'month', key: 'month' },
        { type: 'year', key: 'year' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(salaryFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['salaries', page, search, filters],
        queryFn: () => apiGet('/salaries', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const saveMutation = useMutation({
        mutationFn: (body: typeof emptyForm) => {
            const payload = {
                ...body,
                basic_salary: Number(body.basic_salary),
                allowances: Number(body.allowances),
                deductions: Number(body.deductions),
                year: Number(body.year),
            };
            return editId ? apiPut(`/salaries/${editId}`, payload) : apiPost('/salaries', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['salaries'] });
            toast(editId ? 'Salary record updated' : 'Salary record added');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
        },
        onError: () => toast(editId ? 'Failed to update salary' : 'Failed to add salary', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/salaries/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['salaries'] });
            toast('Salary record deleted');
            setDeleteId(null);
        },
        onError: () => toast('Failed to delete salary', 'error'),
    });

    const openCreate = () => {
        setEditId(null);
        setForm(emptyForm);
        setModalOpen(true);
    };

    const openEdit = (row: Record<string, unknown>) => {
        setEditId(Number(row.id));
        setForm({
            employee_name: String(row.employee_name ?? ''),
            basic_salary: String(row.basic_salary ?? ''),
            allowances: String(row.allowances ?? '0'),
            deductions: String(row.deductions ?? '0'),
            month: String(row.month ?? 'January'),
            year: String(row.year ?? new Date().getFullYear()),
            status: String(row.status ?? 'pending'),
        });
        setModalOpen(true);
    };

    const columns = [
        { key: 'employee_name', label: 'Employee' },
        { key: 'month', label: 'Month' },
        { key: 'year', label: 'Year' },
        { key: 'net_salary', label: 'Net Salary', render: (r: Record<string, unknown>) => formatCurrency(Number(r.net_salary)) },
        { key: 'status', label: 'Status', render: (r: Record<string, unknown>) => <Badge variant={String(r.status)}>{String(r.status)}</Badge> },
        {
            key: 'actions',
            label: 'Actions',
            render: (r: Record<string, unknown>) => (
                <ActionButtonGroup>
                    <ViewSlipButton slipUrl={`/salaries/${r.id}/slip`} label="View Salary Slip" />
                    <PrintSlipButton slipUrl={`/salaries/${r.id}/slip`} label="Print Salary Slip" />
                    <ActionIconButton
                        variant="edit"
                        title="Edit salary"
                        onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                    />
                    <ActionIconButton
                        variant="delete"
                        title="Delete salary"
                        onClick={(e) => { e.stopPropagation(); setDeleteId(Number(r.id)); }}
                    />
                </ActionButtonGroup>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Staff Salary Slips"
                subtitle="Teacher and staff salary records — print salary slip"
                actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Salary</Button>}
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
                filters={<ListFilters preset="salary" values={filters} onChange={setFilter} />}
            />
            <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Salary Record' : 'Add Salary Record'}>
                <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }} className="space-y-4">
                    <Input label="Employee Name" value={form.employee_name} onChange={e => setForm(p => ({ ...p, employee_name: e.target.value }))} required />
                    <Input label="Basic Salary" type="number" value={form.basic_salary} onChange={e => setForm(p => ({ ...p, basic_salary: e.target.value }))} required />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Allowances" type="number" value={form.allowances} onChange={e => setForm(p => ({ ...p, allowances: e.target.value }))} />
                        <Input label="Deductions" type="number" value={form.deductions} onChange={e => setForm(p => ({ ...p, deductions: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="Month" value={form.month} onChange={e => setForm(p => ({ ...p, month: e.target.value }))} required />
                        <Input label="Year" type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} required />
                    </div>
                    <div>
                        <label className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">Status</label>
                        <select
                            value={form.status}
                            onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                            className="admin-input w-full px-3 py-2 text-sm"
                        >
                            <option value="pending">Pending</option>
                            <option value="paid">Paid</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">
                        {editId ? 'Save Changes' : 'Save'}
                    </Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Salary Record?"
                message="This will permanently remove this salary record."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
