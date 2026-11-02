import { ClipboardCheck } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import { Card, CardBody } from '@/components/ui/Card';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';
import { useChartTheme } from './useChartTheme';

interface AttendanceChartProps {
    labels: string[];
    data: number[];
}

export default function AttendanceChart({ labels, data }: AttendanceChartProps) {
    const chartData = labels.map((day, i) => ({ day, pct: data[i] ?? 0 }));
    const { tick, grid, tooltip } = useChartTheme();

    return (
        <Card className="admin-chart-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={ClipboardCheck}
                    title="Attendance Trend"
                    subtitle="Last 7 days"
                    accent="from-lime-500 to-emerald-500"
                />
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData.length ? chartData : [{ day: '—', pct: 0 }]}>
                        <defs>
                            <linearGradient id="attendanceFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#84cc16" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                        <XAxis dataKey="day" tick={tick} axisLine={false} tickLine={false} />
                        <YAxis tick={tick} axisLine={false} tickLine={false} width={32} />
                        <Tooltip contentStyle={tooltip} formatter={(v) => [`${v}%`, 'Attendance']} />
                        <Area
                            type="monotone"
                            dataKey="pct"
                            stroke="#059669"
                            strokeWidth={2.5}
                            fill="url(#attendanceFill)"
                            dot={{ fill: '#eab308', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#84cc16' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
}
