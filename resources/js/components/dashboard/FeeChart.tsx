import { Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { Card, CardBody } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';
import { useChartTheme } from './useChartTheme';

interface FeeChartProps {
    months: string[];
    data: number[];
}

export default function FeeChart({ months, data }: FeeChartProps) {
    const chartData = months.map((month, i) => ({ month, amount: data[i] ?? 0 }));
    const { tick, grid, tooltip } = useChartTheme();

    return (
        <Card className="admin-chart-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={Wallet}
                    title="Fee Collection"
                    subtitle="Monthly overview"
                    accent="from-emerald-600 to-yellow-500"
                />
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData.length ? chartData : [{ month: '—', amount: 0 }]}>
                        <defs>
                            <linearGradient id="feeGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#059669" />
                                <stop offset="100%" stopColor="#eab308" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                        <XAxis dataKey="month" tick={tick} axisLine={false} tickLine={false} />
                        <YAxis tick={tick} axisLine={false} tickLine={false} width={40} />
                        <Tooltip
                            contentStyle={tooltip}
                            formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Collected']}
                        />
                        <Bar dataKey="amount" fill="url(#feeGradient)" radius={[8, 8, 0, 0]} maxBarSize={48} />
                    </BarChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
}
