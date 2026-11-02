import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiGet, apiPost } from '@/lib/api';
import { useInstantQuery } from '@/lib/useInstantQuery';

import { Card, CardBody } from '@/components/ui/Card';

import { Button } from '@/components/ui/Button';

import { Badge } from '@/components/ui/Badge';

import { PageHeader } from '@/components/ui/PageHeader';

import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

import { useToast } from '@/contexts/ToastContext';

import { useState } from 'react';

import { ShieldCheck, UserCheck, Banknote, Users, CheckCircle, XCircle } from 'lucide-react';

import { TableSkeleton } from '@/components/dashboard/DashboardSkeleton';

import { cn } from '@/lib/utils';

interface ApprovalUser {
    id: number;
    name: string;
    email: string;
    phone?: string;
    role: string;
}

interface ApprovalsData {
    pending: ApprovalUser[];
    fee_pending: ApprovalUser[];
}

function StatCard({ label, count, icon: Icon, accent }: {
    label: string; count: number; icon: React.ElementType; accent: string;
}) {
    return (
        <div className="admin-stat-card">
            <div className="flex items-center gap-3">
                <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', accent)}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                    <p className="text-2xl font-extrabold admin-page-title">{count}</p>
                    <p className="text-xs font-semibold admin-page-sub">{label}</p>
                </div>
            </div>
        </div>
    );
}

export default function ApprovalsPage() {
    const { toast } = useToast();
    const qc = useQueryClient();
    const [confirm, setConfirm] = useState<{ id: number; action: 'approve' | 'reject' | 'fee'; name?: string } | null>(null);

    const { data, isInitialLoading } = useInstantQuery<ApprovalsData>({
        queryKey: ['approvals'],
        queryFn: () => apiGet('/approvals'),
    });

    const invalidate = () => qc.invalidateQueries({ queryKey: ['approvals'] });

    const actionMutation = useMutation({
        mutationFn: ({ id, action }: { id: number; action: string }) => {
            if (action === 'approve') return apiPost(`/approvals/${id}/approve`);
            if (action === 'reject') return apiPost(`/approvals/${id}/reject`, { reason: 'Registration rejected.' });
            return apiPost(`/approvals/${id}/fee-paid`);
        },
        onSuccess: (_, vars) => {
            invalidate();
            const msg = vars.action === 'approve' ? 'User approved successfully' :
                vars.action === 'reject' ? 'User rejected' : 'Fee marked as paid';
            toast(msg, 'success');
            setConfirm(null);
        },
        onError: () => toast('Action failed. Please try again.', 'error'),
    });

    const pending = data?.pending ?? [];
    const feePending = data?.fee_pending ?? [];

    const TableSection = ({ title, icon: Icon, users, actions }: {
        title: string; icon: React.ElementType; users: ApprovalUser[];
        actions: (u: ApprovalUser) => React.ReactNode;
    }) => (
        <Card>
            <CardBody className="p-4 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-emerald-600 dark:text-lime-400" />
                    <h2 className="text-lg font-bold admin-page-title">{title}</h2>
                    <Badge variant="pending">{users.length}</Badge>
                </div>

                {users.length === 0 ? (
                    <div className="admin-empty-state rounded-xl border border-dashed border-emerald-500/20 py-8">
                        <p className="text-sm font-medium">No records in this queue.</p>
                    </div>
                ) : (
                    <div className="admin-table-wrap">
                        <div className="admin-table-scroll">
                            <table className="admin-table min-w-full">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-3 text-start text-xs font-bold uppercase">Name</th>
                                        <th className="hidden px-4 py-3 text-start text-xs font-bold uppercase sm:table-cell">Email</th>
                                        <th className="px-4 py-3 text-start text-xs font-bold uppercase">Role</th>
                                        <th className="px-4 py-3 text-start text-xs font-bold uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-emerald-500/8">
                                    {users.map(u => (
                                        <tr key={u.id} className="transition-colors">
                                            <td className="px-4 py-3">
                                                <p className="font-semibold">{u.name}</p>
                                                <p className="text-xs admin-page-sub sm:hidden">{u.email}</p>
                                            </td>
                                            <td className="hidden px-4 py-3 admin-page-sub sm:table-cell">{u.email}</td>
                                            <td className="px-4 py-3">
                                                <Badge variant="pending">{u.role.replace('-', ' ')}</Badge>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-wrap gap-2">{actions(u)}</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );

    if (isInitialLoading && !data) {
        return (
            <div className="space-y-6">
                <PageHeader title="User Approvals" subtitle="Approve registrations and fee payments" badge="Superadmin Panel" />
                <TableSkeleton />
            </div>
        );
    }

    const confirmMessages = {
        approve: { title: 'Approve User?', message: `Approve ${confirm?.name ?? 'this user'} registration?`, text: 'Approve', type: 'success' as const },
        reject: { title: 'Reject User?', message: `Reject ${confirm?.name ?? 'this user'}? This cannot be undone.`, text: 'Reject', type: 'warning' as const },
        fee: { title: 'Mark Fee Paid?', message: `Confirm fee payment for ${confirm?.name ?? 'this user'}?`, text: 'Confirm', type: 'success' as const },
    };

    const confirmCfg = confirm ? confirmMessages[confirm.action] : null;

    return (
        <div className="space-y-6">
            <PageHeader title="User Approvals" subtitle="Approve registrations and fee payments" badge="Superadmin Panel" />

            <div className="grid gap-4 sm:grid-cols-3">
                <StatCard label="Pending Approval" count={pending.length} icon={UserCheck} accent="bg-gradient-to-br from-emerald-600 to-lime-500" />
                <StatCard label="Awaiting Fee" count={feePending.length} icon={Banknote} accent="bg-gradient-to-br from-yellow-500 to-yellow-600" />
                <StatCard label="Total Queue" count={pending.length + feePending.length} icon={Users} accent="bg-gradient-to-br from-emerald-700 to-emerald-500" />
            </div>

            <TableSection
                title="Pending Approval"
                icon={UserCheck}
                users={pending}
                actions={u => (
                    <>
                        <Button size="sm" onClick={() => setConfirm({ id: u.id, action: 'approve', name: u.name })}>
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirm({ id: u.id, action: 'reject', name: u.name })}>
                            <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                    </>
                )}
            />

            <TableSection
                title="Awaiting Fee"
                icon={Banknote}
                users={feePending}
                actions={u => (
                    <Button size="sm" onClick={() => setConfirm({ id: u.id, action: 'fee', name: u.name })}>
                        <ShieldCheck className="h-4 w-4" /> Mark Fee Paid
                    </Button>
                )}
            />

            <ConfirmDialog
                open={!!confirm}
                type={confirmCfg?.type ?? 'info'}
                title={confirmCfg?.title ?? ''}
                message={confirmCfg?.message}
                confirmText={confirmCfg?.text}
                loading={actionMutation.isPending}
                onConfirm={() => confirm && actionMutation.mutate({ id: confirm.id, action: confirm.action })}
                onCancel={() => setConfirm(null)}
            />
        </div>
    );
}
