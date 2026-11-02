import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '@/lib/api';
import { asList } from '@/lib/listUtils';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/contexts/ToastContext';
import { defaultPrintOptions, type SlipData } from '@/lib/printSlip';
import { Select } from '@/components/ui/Select';
import { SlipPreview } from '@/components/documents/SlipPreview';
import { SlipModalActions } from '@/components/documents/SlipModalActions';
import { useSlipBranding } from '@/hooks/useSlipBranding';
import { Wallet } from 'lucide-react';

interface StudentOption {
    id: number;
    name: string;
    roll_no: string;
    class: string;
    status?: string;
}

interface CollectResponse {
    payment: { id: number; receipt_no?: string };
    slip: SlipData;
}

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'card', label: 'Card' },
    { value: 'online', label: 'Online' },
];

export default function FeesCollectPage() {
    const today = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({
        student_id: '',
        amount: '',
        payment_method: 'cash',
        payment_date: today,
        month_label: '',
    });
    const [lastSlip, setLastSlip] = useState<SlipData | null>(null);
    const [slipModalOpen, setSlipModalOpen] = useState(false);
    const { branding, updateBranding } = useSlipBranding();
    const { toast } = useToast();
    const qc = useQueryClient();

    const { data: studentsRaw, isLoading: studentsLoading, isError: studentsError, refetch: refetchStudents } = useQuery({
        queryKey: ['students-select'],
        queryFn: () => apiGet('/students', { per_page: 100, status: 'active' }),
    });

    const students = asList<StudentOption>(studentsRaw);

    const collectMutation = useMutation({
        mutationFn: (body: typeof form) => apiPost<CollectResponse>('/fees/collect', {
            student_id: Number(body.student_id),
            amount: Number(body.amount),
            payment_method: body.payment_method,
            payment_date: body.payment_date,
            month_label: body.month_label || undefined,
        }),
        onSuccess: (res) => {
            toast('Fee collected — receipt ready to print');
            setLastSlip(res.slip);
            setSlipModalOpen(true);
            setForm({ student_id: '', amount: '', payment_method: 'cash', payment_date: today, month_label: '' });
            qc.invalidateQueries({ queryKey: ['fee-payments'] });
            qc.invalidateQueries({ queryKey: ['fees'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
        },
        onError: (err: Error) => toast(err.message || 'Failed to collect fee', 'error'),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.student_id) {
            toast('Please select a student', 'error');
            return;
        }
        if (!form.amount || Number(form.amount) <= 0) {
            toast('Please enter a valid amount', 'error');
            return;
        }
        collectMutation.mutate(form);
    };

    const printDefaults = lastSlip ? defaultPrintOptions(lastSlip) : null;
    const previewSize = printDefaults?.size ?? 'full';
    const showDualPreview = printDefaults?.copies === 2;
    const canSubmit = !studentsLoading && students.length > 0 && !collectMutation.isPending;

    return (
        <div className="space-y-6">
            <PageHeader title="Collect Fees" subtitle="Record payment and print paid slip for student/parent" />

            <div className="admin-card mx-auto max-w-lg p-6">
                {studentsError && (
                    <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
                        <p>Could not load students.</p>
                        <button
                            type="button"
                            className="mt-1 font-semibold underline"
                            onClick={() => void refetchStudents()}
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!studentsLoading && !studentsError && students.length === 0 && (
                    <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">
                        No active students found. Add or activate a student first, then collect fees.
                    </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Select
                        label="Student"
                        value={form.student_id}
                        onChange={v => setForm(p => ({ ...p, student_id: v }))}
                        placeholder={studentsLoading ? 'Loading students…' : 'Select student…'}
                        disabled={studentsLoading || students.length === 0}
                        options={students.map(s => ({
                            value: String(s.id),
                            label: `${s.name} — ${s.roll_no || '—'} (${s.class || '—'})`,
                        }))}
                    />

                    <Input
                        label="Amount"
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={form.amount}
                        onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                        required
                        placeholder="0.00"
                    />

                    <Input
                        label="Description (e.g. March 2026 Tuition)"
                        value={form.month_label}
                        onChange={e => setForm(p => ({ ...p, month_label: e.target.value }))}
                        placeholder="School Fee — month/year"
                    />

                    <Select
                        label="Payment Method"
                        value={form.payment_method}
                        onChange={v => setForm(p => ({ ...p, payment_method: v }))}
                        options={PAYMENT_METHODS}
                    />

                    <Input
                        label="Payment Date"
                        type="date"
                        value={form.payment_date}
                        onChange={e => setForm(p => ({ ...p, payment_date: e.target.value }))}
                        required
                    />

                    <Button
                        type="submit"
                        variant="success"
                        loading={collectMutation.isPending}
                        disabled={!canSubmit}
                        className="w-full"
                    >
                        <Wallet className="h-4 w-4" /> Collect Fee &amp; Generate Slip
                    </Button>
                </form>
            </div>

            <Modal
                open={slipModalOpen}
                onClose={() => setSlipModalOpen(false)}
                title="Payment Receipt Generated"
                size="2xl"
                footer={lastSlip ? <SlipModalActions slip={lastSlip} branding={branding} onBrandingChange={updateBranding} onClose={() => setSlipModalOpen(false)} /> : undefined}
            >
                <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
                    Fee collected successfully. Review the receipt below — 2 copies (Office + Student) are ready to print.
                </p>
                {lastSlip && (
                    <div className="space-y-4">
                        {showDualPreview ? (
                            <div className="grid gap-4 lg:grid-cols-2">
                                <SlipPreview slip={lastSlip} copyLabel="Office Copy" size={previewSize} branding={branding} />
                                <SlipPreview slip={lastSlip} copyLabel="Student Copy" size={previewSize} branding={branding} />
                            </div>
                        ) : (
                            <SlipPreview slip={lastSlip} size={previewSize} branding={branding} />
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
}
