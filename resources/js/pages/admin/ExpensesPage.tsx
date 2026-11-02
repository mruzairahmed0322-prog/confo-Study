import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { DataTable } from '@/components/ui/DataTable';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { ActionButtonGroup, ActionIconButton } from '@/components/ui/ActionIconButton';
import { emptyFilterValues, ListFilters, usePagedList } from '@/lib/listFilters';

const emptyForm = {
    title: '',
    amount: '',
    category: 'General',
    expense_date: new Date().toISOString().split('T')[0],
    description: '',
};

export default function ExpensesPage() {
    const expenseFilters = emptyFilterValues([
        { type: 'name', key: 'name' },
        { type: 'category', key: 'category' },
        { type: 'dateFrom', key: 'from' },
        { type: 'dateTo', key: 'to' },
    ]);
    const { page, setPage, search, setSearch, filters, setFilter, clearFilters, activeFilterCount, apiParams } = usePagedList(expenseFilters);
    const [modalOpen, setModalOpen] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);
    const [form, setForm] = useState(emptyForm);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const canCreate = hasPermission('expenses.create');
    const canEdit = hasPermission('expenses.edit');
    const canDelete = hasPermission('expenses.delete');
    const canManage = canCreate || canEdit;
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['expenses', page, search, filters],
        queryFn: () => apiGet('/expenses', { page, search, ...apiParams }),
        placeholderData: (prev: unknown) => prev,
    });

    const saveMutation = useMutation({
        mutationFn: (body: typeof emptyForm) => {
            const payload = { ...body, amount: Number(body.amount) };
            return editId ? apiPut(`/expenses/${editId}`, payload) : apiPost('/expenses', payload);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            toast(editId ? 'Expense updated' : 'Expense recorded');
            setModalOpen(false);
            setEditId(null);
            setForm(emptyForm);
        },
        onError: () => toast(editId ? 'Failed to update expense' : 'Failed to record expense', 'error'),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: number) => apiDelete(`/expenses/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['expenses'] });
            toast('Expense deleted');
            setDeleteId(null);
        },
        onError: () => toast('Failed to delete expense', 'error'),
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
            amount: String(row.amount ?? ''),
            category: String(row.category ?? 'General'),
            expense_date: String(row.expense_date ?? emptyForm.expense_date),
            description: String(row.description ?? ''),
        });
        setModalOpen(true);
    };

    const columns = [
        { key: 'title', label: 'Title' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount', render: (r: Record<string, unknown>) => formatCurrency(Number(r.amount)) },
        { key: 'expense_date', label: 'Date' },
        { key: 'created_by', label: 'Recorded By' },
        {
            key: 'actions',
            label: 'Actions',
            render: (r: Record<string, unknown>) => (
                (canEdit || canDelete) ? (
                    <ActionButtonGroup>
                        {canEdit && (
                            <ActionIconButton
                                variant="edit"
                                title="Edit expense"
                                onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                            />
                        )}
                        {canDelete && (
                            <ActionIconButton
                                variant="delete"
                                title="Delete expense"
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
                title="Expenses"
                subtitle="Track school expenses"
                actions={canCreate ? (
                    <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> Add Expense</Button>
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
                filters={<ListFilters preset="expenses" values={filters} onChange={setFilter} />}
            />
            <Modal open={modalOpen && canManage} onClose={() => { setModalOpen(false); setEditId(null); }} title={editId ? 'Edit Expense' : 'Record Expense'}>
                <form onSubmit={e => { e.preventDefault(); if (!canManage) return; saveMutation.mutate(form); }} className="space-y-4">
                    <Input label="Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required />
                    <Input label="Amount" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} required />
                    <Input label="Category" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} />
                    <Input label="Date" type="date" value={form.expense_date} onChange={e => setForm(p => ({ ...p, expense_date: e.target.value }))} required />
                    <Input label="Description" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
                    <Button type="submit" loading={saveMutation.isPending} className="w-full">
                        {editId ? 'Save Changes' : 'Save Expense'}
                    </Button>
                </form>
            </Modal>

            <ConfirmDialog
                open={deleteId !== null}
                onCancel={() => setDeleteId(null)}
                onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
                title="Delete Expense?"
                message="This will permanently remove this expense record."
                loading={deleteMutation.isPending}
                type="danger"
            />
        </div>
    );
}
