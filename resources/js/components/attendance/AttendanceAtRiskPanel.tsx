import { AlertTriangle, UserX, Clock, Plane } from 'lucide-react';
import type { AtRiskStudent } from '@/components/attendance/attendanceTypes';

interface AttendanceAtRiskPanelProps {
    students: AtRiskStudent[];
    threshold: number;
    month: string;
}

function monthLabel(month: string): string {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function AttendanceAtRiskPanel({ students, threshold, month }: AttendanceAtRiskPanelProps) {
    if (!students.length) {
        return (
            <div className="admin-card flex flex-col items-center gap-3 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-900/40">
                    <UserX className="h-7 w-7 text-emerald-600 dark:text-lime-400" />
                </div>
                <div>
                    <p className="font-bold text-emerald-900 dark:text-lime-50">All Students On Track</p>
                    <p className="mt-1 text-sm text-stone-500">
                        No students below {threshold}% attendance in {monthLabel(month)}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-card overflow-hidden">
            <div className="flex items-start gap-3 border-b border-rose-500/10 bg-rose-50/50 px-5 py-4 dark:bg-rose-950/20">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/25">
                    <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                    <h3 className="font-bold text-rose-900 dark:text-rose-100">At-Risk Students</h3>
                    <p className="text-xs text-stone-500">
                        Below {threshold}% in {monthLabel(month)} · {students.length} student{students.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
                {students.map((student) => (
                    <div key={student.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <p className="truncate font-semibold text-stone-900 dark:text-white">{student.name}</p>
                            <p className="text-xs text-stone-500">{student.roll_no} · {student.class}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex gap-2 text-xs text-stone-500">
                                {student.absent_days > 0 && (
                                    <span className="flex items-center gap-1 text-rose-600">
                                        <UserX className="h-3 w-3" /> {student.absent_days} absent
                                    </span>
                                )}
                                {student.late_days > 0 && (
                                    <span className="flex items-center gap-1 text-amber-600">
                                        <Clock className="h-3 w-3" /> {student.late_days} late
                                    </span>
                                )}
                                {student.leave_days > 0 && (
                                    <span className="flex items-center gap-1 text-sky-600">
                                        <Plane className="h-3 w-3" /> {student.leave_days} leave
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-20 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-700">
                                    <div
                                        className={`h-full rounded-full transition-all ${
                                            student.rate >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(student.rate, 100)}%` }}
                                    />
                                </div>
                                <span className={`min-w-[42px] text-right text-sm font-extrabold ${
                                    student.rate >= 60 ? 'text-amber-600' : 'text-rose-600'
                                }`}>
                                    {student.rate}%
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
