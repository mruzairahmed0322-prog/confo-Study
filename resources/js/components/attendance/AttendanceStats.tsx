import { CheckCircle2, XCircle, Clock, Plane, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { AttendanceSummary } from '@/components/attendance/attendanceTypes';

interface AttendanceStatsProps {
    summary: AttendanceSummary;
}

const STAT_ITEMS = [
    { key: 'present', label: 'Present', icon: CheckCircle2, color: 'text-emerald-600 dark:text-emerald-400', bg: 'from-emerald-500/15 to-emerald-500/5' },
    { key: 'absent', label: 'Absent', icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'from-rose-500/15 to-rose-500/5' },
    { key: 'late', label: 'Late', icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'from-amber-500/15 to-amber-500/5' },
    { key: 'leave', label: 'Leave', icon: Plane, color: 'text-sky-600 dark:text-sky-400', bg: 'from-sky-500/15 to-sky-500/5' },
] as const;

export function AttendanceStats({ summary }: AttendanceStatsProps) {
    const circumference = 2 * Math.PI * 42;
    const offset = circumference - (summary.rate / 100) * circumference;
    const delta = summary.rate_delta ?? 0;

    return (
        <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <div className="admin-card flex items-center gap-5 p-5">
                <div className="relative h-24 w-24 shrink-0">
                    <svg className="h-24 w-24 -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8" className="text-emerald-100 dark:text-emerald-900/40" />
                        <circle
                            cx="50" cy="50" r="42" fill="none"
                            stroke="url(#attGrad)" strokeWidth="8" strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={offset}
                            className="transition-all duration-500 ease-out"
                        />
                        <defs>
                            <linearGradient id="attGrad" x1="0" y1="0" x2="1" y2="1">
                                <stop offset="0%" stopColor="#059669" />
                                <stop offset="100%" stopColor="#84cc16" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-extrabold text-emerald-900 dark:text-lime-50">{summary.rate}%</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70 dark:text-lime-400/70">Today</span>
                    </div>
                </div>
                <div>
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-800 dark:text-lime-200">
                        <TrendingUp className="h-4 w-4" /> Attendance Rate
                    </p>
                    <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                        <span className="font-bold text-emerald-900 dark:text-lime-100">{summary.marked}</span> of {summary.total} marked
                    </p>
                    {summary.yesterday_rate !== undefined && (
                        <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                            delta > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                            delta < 0 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                            'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                        }`}>
                            {delta > 0 ? <TrendingUp className="h-3 w-3" /> :
                             delta < 0 ? <TrendingDown className="h-3 w-3" /> :
                             <Minus className="h-3 w-3" />}
                            {delta > 0 ? '+' : ''}{delta}% vs yesterday
                        </div>
                    )}
                    {summary.unmarked > 0 && (
                        <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
                            {summary.unmarked} student{summary.unmarked !== 1 ? 's' : ''} still unmarked
                        </p>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {STAT_ITEMS.map(({ key, label, icon: Icon, color, bg }) => (
                    <div
                        key={key}
                        className={`admin-card relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br ${bg}`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">{label}</p>
                                <p className="mt-1 text-2xl font-extrabold text-stone-900 dark:text-white">
                                    {summary[key as keyof AttendanceSummary]}
                                </p>
                            </div>
                            <Icon className={`h-5 w-5 ${color}`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="admin-card flex items-center gap-3 p-4 lg:col-span-2">
                <Users className="h-5 w-5 text-emerald-600 dark:text-lime-400" />
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span><strong className="text-emerald-900 dark:text-lime-100">{summary.total}</strong> <span className="text-stone-500">students</span></span>
                    <span><strong className="text-emerald-700 dark:text-lime-300">{summary.present + summary.late}</strong> <span className="text-stone-500">attended</span></span>
                    <span><strong className="text-rose-600">{summary.absent}</strong> <span className="text-stone-500">absent</span></span>
                </div>
            </div>
        </div>
    );
}
