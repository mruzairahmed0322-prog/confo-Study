import { Users } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { Card, CardBody } from '@/components/ui/Card';
import { DashboardWidgetHeader } from './DashboardWidgetHeader';
import { useChartTheme } from './useChartTheme';

const COLORS = ['#059669', '#eab308', '#84cc16'];

interface GenderChartProps {
    data: { male: number; female: number };
}

export default function GenderChart({ data }: GenderChartProps) {
    const chartData = [
        { name: 'Male', value: data.male },
        { name: 'Female', value: data.female },
    ].filter((d) => d.value > 0);

    const total = chartData.reduce((s, d) => s + d.value, 0);
    const { tooltip, legend } = useChartTheme();

    return (
        <Card className="admin-chart-card">
            <CardBody>
                <DashboardWidgetHeader
                    icon={Users}
                    title="Gender Ratio"
                    subtitle={total > 0 ? `${total} students` : 'Student distribution'}
                    accent="from-teal-500 to-cyan-400"
                />
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        <Pie
                            data={chartData.length ? chartData : [{ name: 'No data', value: 1 }]}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={78}
                            paddingAngle={3}
                            label={({ name, percent }) =>
                                chartData.length ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : name
                            }
                        >
                            {chartData.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={tooltip} />
                        <Legend
                            iconType="circle"
                            iconSize={8}
                            wrapperStyle={legend}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardBody>
        </Card>
    );
}
