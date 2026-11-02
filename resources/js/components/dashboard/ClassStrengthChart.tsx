import { Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { Card, CardBody } from '@/components/ui/Card';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';
import { useChartTheme } from './useChartTheme';

interface ClassStrengthChartProps {
    data: Array<{ class: string; count: number }>;
}

export default function ClassStrengthChart({ data }: ClassStrengthChartProps) {
    const total = data.reduce((s, d) => s + d.count, 0);
    const { tick, grid, tooltip } = useChartTheme();

    return (
        <Card className="admin-chart-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={Layers}
                    title="Class Strength"
                    subtitle={total > 0 ? `${total} total students` : 'Per class enrollment'}
                    accent="from-violet-500 to-purple-400"
                />
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.length ? data : [{ class: '—', count: 0 }]}>
                        <defs>
                            <linearGradient id="classGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#7c3aed" />
                                <stop offset="100%" stopColor="#a78bfa" />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                        <XAxis dataKey="class" tick={tick} axisLine={false} tickLine={false} />
                        <YAxis tick={tick} axisLine={false} tickLine={false} width={32} />
                        <Tooltip contentStyle={tooltip} />
                        <Bar dataKey="count" fill="url(#classGrad)" radius={[8, 8, 0, 0]} maxBarSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
}
