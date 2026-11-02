import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useChartTheme } from '@/components/dashboard/useChartTheme';
import type { AttendanceTrendPoint } from '@/components/attendance/attendanceTypes';

interface AttendanceTrendChartProps {
    points: AttendanceTrendPoint[];
    averageRate: number;
}

export function AttendanceTrendChart({ points, averageRate }: AttendanceTrendChartProps) {
    const { tick, grid, tooltip } = useChartTheme();
    const chartData = points.map((p) => ({
        ...p,
        displayRate: p.has_data ? p.rate : null,
    }));

    const dataPoints = points.filter((p) => p.has_data);
    const firstRate = dataPoints[0]?.rate ?? 0;
    const lastRate = dataPoints[dataPoints.length - 1]?.rate ?? 0;
    const delta = dataPoints.length >= 2 ? Math.round((lastRate - firstRate) * 10) / 10 : 0;

    return (
        <div className="admin-card overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-emerald-500/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="admin-page-title text-base">Weekly Trend</h3>
                    <p className="text-xs text-stone-500">Attendance rate over the last 7 days</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-center">
                        <p className="text-2xl font-extrabold text-emerald-700 dark:text-lime-300">{averageRate}%</p>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">7-day avg</p>
                    </div>
                    {dataPoints.length >= 2 && (
                        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                            delta > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            delta < 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                            'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                        }`}>
                            {delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> :
                             delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> :
                             <Minus className="h-3.5 w-3.5" />}
                            {delta > 0 ? '+' : ''}{delta}%
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 sm:p-5">
                <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="attTrendFill" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#059669" stopOpacity={0.35} />
                                <stop offset="100%" stopColor="#84cc16" stopOpacity={0.02} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                        <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
                        <YAxis tick={tick} axisLine={false} tickLine={false} width={36} domain={[0, 100]} />
                        <Tooltip
                            contentStyle={tooltip}
                            formatter={(v) => [v != null ? `${v}%` : 'No data', 'Rate']}
                            labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ''}
                        />
                        <Area
                            type="monotone"
                            dataKey="displayRate"
                            stroke="#059669"
                            strokeWidth={2.5}
                            fill="url(#attTrendFill)"
                            connectNulls={false}
                            dot={{ fill: '#84cc16', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#059669' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
