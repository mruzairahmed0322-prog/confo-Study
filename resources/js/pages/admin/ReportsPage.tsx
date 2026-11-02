import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { apiGet } from '@/lib/api';
import { Card, CardBody } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Download, Users, BookOpen, Wallet, TrendingUp, Layers } from 'lucide-react';
import { DashboardWidgetHeader } from '@/components/dashboard/DashboardWidgetHeader';
import { useChartTheme } from '@/components/dashboard/useChartTheme';
import { cn } from '@/lib/utils';

const OVERVIEW_ICONS: Record<string, { icon: React.ElementType; gradient: string; glow: string }> = {
    total_students: { icon: Users, gradient: 'from-emerald-500 to-teal-400', glow: 'bg-emerald-400/20' },
    total_teachers: { icon: BookOpen, gradient: 'from-blue-500 to-cyan-400', glow: 'bg-blue-400/20' },
    fee_collected: { icon: Wallet, gradient: 'from-emerald-600 to-lime-500', glow: 'bg-emerald-400/20' },
    total_classes: { icon: Layers, gradient: 'from-violet-500 to-purple-400', glow: 'bg-violet-400/20' },
};

const COLORS = ['#059669', '#84cc16', '#eab308', '#65a30d', '#a3e635'];
const REPORT_TYPES = [
    { id: 'overview', label: 'Overview' },
    { id: 'financial', label: 'Financial' },
    { id: 'academic', label: 'Academic' },
    { id: 'attendance', label: 'Attendance' },
] as const;

type ReportType = typeof REPORT_TYPES[number]['id'];

interface ReportData {
    stats?: Record<string, number>;
    classStrength?: Array<{ class?: string; name?: string; count: number }>;
    genderData?: Array<{ name: string; value: number }> | { male: number; female: number };
    financial?: { fee_collected: number; expenses: number; pending_fees: number };
    academic?: { total_students: number; total_classes: number; class_strength: Array<{ class?: string; name?: string; count: number }> };
    attendance?: { total_records: number; present: number; absent: number; rate: number };
}

export default function ReportsPage() {
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const [type, setType] = useState<ReportType>('overview');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['reports', type, from, to],
        queryFn: () => apiGet<ReportData>('/reports', { type, from: from || undefined, to: to || undefined }),
        placeholderData: (prev) => prev,
    });

    const stats = data?.stats ?? {};
    const { tick, grid, tooltip } = useChartTheme();
    const classStrength = (data?.classStrength ?? []).map((row) => ({
        name: row.class ?? row.name ?? '—',
        count: row.count,
    }));
    const genderData = Array.isArray(data?.genderData)
        ? data.genderData
        : [
            { name: 'Male', value: data?.genderData?.male ?? 0 },
            { name: 'Female', value: data?.genderData?.female ?? 0 },
        ].filter((g) => g.value > 0);

    const handleExport = async () => {
        if (!hasPermission('reports.export')) {
            toast('You do not have export permission', 'error');
            return;
        }
        try {
            const res = await api.get('/reports/export', {
                params: { type, from: from || undefined, to: to || undefined },
                responseType: 'blob',
            });
            const url = URL.createObjectURL(res.data as Blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `report-${type}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast('Report exported');
        } catch {
            if (type === 'overview' && data?.stats) {
                downloadCsv('report-overview.csv', ['Metric', 'Value'],
                    Object.entries(stats).map(([k, v]) => [k.replace(/_/g, ' '), v]));
                toast('Report exported');
            } else {
                toast('Export failed', 'error');
            }
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Reports"
                subtitle="School analytics and insights"
                badge="Analytics"
                actions={hasPermission('reports.export') && (
                    <Button size="sm" variant="secondary" onClick={handleExport}>
                        <Download className="h-4 w-4" /> Export CSV
                    </Button>
                )}
            />

            <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-wrap gap-2">
                    {REPORT_TYPES.map(t => (
                        <button
                            key={t.id}
                            onClick={() => setType(t.id)}
                            className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                                type === t.id ? 'admin-nav-active' : 'admin-input hover:bg-emerald-50'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>
                <Input type="date" label="From" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
                <Input type="date" label="To" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
            </div>

            {type === 'overview' && (
                <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {Object.entries(stats).slice(0, 4).map(([key, val]) => {
                            const meta = OVERVIEW_ICONS[key] ?? { icon: TrendingUp, gradient: 'from-emerald-500 to-lime-500', glow: 'bg-emerald-400/20' };
                            const Icon = meta.icon;
                            return (
                                <div key={key} className="admin-stat-card-modern group relative overflow-hidden">
                                    <div className={cn('pointer-events-none absolute -end-6 -top-6 h-24 w-24 rounded-full blur-2xl admin-stat-glow', meta.glow)} />
                                    <div className="relative flex items-center gap-3.5">
                                        <div className={cn('admin-dash-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br', meta.gradient)}>
                                            <Icon className="h-5 w-5 text-white" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-bold uppercase tracking-wider admin-page-sub truncate">
                                                {key.replace(/_/g, ' ')}
                                            </p>
                                            <p className="mt-1 text-xl font-extrabold tabular-nums admin-page-title">
                                                {isLoading ? '...' : key.includes('fee') ? formatCurrency(Number(val)) : val}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="grid gap-6 lg:grid-cols-2">
                        <Card className="admin-chart-card">
                            <CardBody>
                                <DashboardWidgetHeader
                                    icon={Layers}
                                    title="Class Strength"
                                    subtitle="Enrollment per class"
                                    accent="from-violet-500 to-purple-400"
                                />
                                <ResponsiveContainer width="100%" height={220}>
                                    <BarChart data={classStrength}>
                                        <defs>
                                            <linearGradient id="reportGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="0%" stopColor="#059669" /><stop offset="100%" stopColor="#eab308" />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                                        <XAxis dataKey="name" tick={tick} axisLine={false} tickLine={false} />
                                        <YAxis tick={tick} axisLine={false} tickLine={false} width={32} />
                                        <Tooltip contentStyle={tooltip} />
                                        <Bar dataKey="count" fill="url(#reportGrad)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardBody>
                        </Card>
                        <Card className="admin-chart-card">
                            <CardBody>
                                <DashboardWidgetHeader
                                    icon={Users}
                                    title="Gender Ratio"
                                    subtitle="Student distribution"
                                    accent="from-teal-500 to-cyan-400"
                                />
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={genderData}
                                            dataKey="value"
                                            nameKey="name"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={52}
                                            outerRadius={78}
                                            paddingAngle={3}
                                            label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                        >
                                            {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />)}
                                        </Pie>
                                        <Tooltip contentStyle={tooltip} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardBody>
                        </Card>
                    </div>
                </>
            )}

            {type === 'financial' && data?.financial && (
                <div className="grid gap-4 sm:grid-cols-3">
                    {[
                        { label: 'Fee Collected', value: formatCurrency(data.financial.fee_collected) },
                        { label: 'Expenses', value: formatCurrency(data.financial.expenses) },
                        { label: 'Pending Fees', value: formatCurrency(data.financial.pending_fees) },
                    ].map(item => (
                        <Card key={item.label} hover>
                            <CardBody className="p-4">
                                <p className="text-xs font-bold uppercase admin-page-sub">{item.label}</p>
                                <p className="mt-1 text-xl font-extrabold admin-page-title">{isLoading ? '...' : item.value}</p>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}

            {type === 'academic' && data?.academic && (
                <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Card hover><CardBody className="p-4">
                            <p className="text-xs font-bold uppercase admin-page-sub">Total Students</p>
                            <p className="mt-1 text-xl font-extrabold admin-page-title">{data.academic.total_students}</p>
                        </CardBody></Card>
                        <Card hover><CardBody className="p-4">
                            <p className="text-xs font-bold uppercase admin-page-sub">Total Classes</p>
                            <p className="mt-1 text-xl font-extrabold admin-page-title">{data.academic.total_classes}</p>
                        </CardBody></Card>
                    </div>
                    <Card><CardBody>
                        <h3 className="mb-4 text-sm font-bold admin-page-title">Class Strength</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.academic.class_strength.map((row) => ({
                                name: row.class ?? row.name ?? '—',
                                count: row.count,
                            }))}>
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4d7c0f' }} />
                                <YAxis tick={{ fontSize: 11, fill: '#4d7c0f' }} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardBody></Card>
                </div>
            )}

            {type === 'attendance' && data?.attendance && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                        { label: 'Total Records', value: data.attendance.total_records },
                        { label: 'Present', value: data.attendance.present },
                        { label: 'Absent', value: data.attendance.absent },
                        { label: 'Attendance Rate', value: `${data.attendance.rate}%` },
                    ].map(item => (
                        <Card key={item.label} hover>
                            <CardBody className="p-4">
                                <p className="text-xs font-bold uppercase admin-page-sub">{item.label}</p>
                                <p className="mt-1 text-xl font-extrabold admin-page-title">{isLoading ? '...' : item.value}</p>
                            </CardBody>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
