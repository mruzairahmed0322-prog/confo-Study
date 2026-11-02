import {
    Users, BookOpen, ClipboardCheck, Wallet, TrendingUp, FileBadge,
    UserCheck, Briefcase, Layers, FileText, HelpCircle, UserPlus, Bell,
} from 'lucide-react';

import { formatCurrency, cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

import type { DashboardSections } from './types';
import { StatCardsSkeleton } from './DashboardSkeleton';

const statIcons: Record<string, React.ElementType> = {
    total_students: Users,
    total_teachers: BookOpen,
    total_staff: Briefcase,
    total_parents: UserPlus,
    total_classes: Layers,
    total_assignments: FileText,
    total_quizzes: HelpCircle,
    pending_approvals: Bell,
    attendance_today: ClipboardCheck,
    child_attendance: UserCheck,
    fee_collected: Wallet,
    pending_fees: Wallet,
    fee_payments_month: Wallet,
    upcoming_exams: FileBadge,
    new_students_month: UserPlus,
};

const statLabels: Record<string, string> = {
    total_students: 'Total Students',
    total_teachers: 'Total Teachers',
    total_staff: 'Total Staff',
    total_parents: 'Total Parents',
    total_classes: 'Total Classes',
    total_assignments: 'Assignments',
    total_quizzes: 'Quizzes',
    pending_approvals: 'Pending Approvals',
    attendance_today: 'Attendance Today',
    child_attendance: 'Child Attendance',
    fee_collected: 'Fee Collected',
    pending_fees: 'Pending Fees',
    fee_payments_month: 'Payments (Month)',
    upcoming_exams: 'Upcoming Exams',
    new_students_month: 'New Admissions',
};

const studentStatLabels: Record<string, string> = {
    attendance_today: 'My Attendance',
    total_assignments: 'Pending Homework',
    pending_fees: 'My Pending Fees',
    upcoming_exams: 'Upcoming Exams',
};

const teacherStatLabels: Record<string, string> = {
    total_students: 'My Students',
    attendance_today: 'Class Attendance',
    total_assignments: 'My Assignments',
};

const parentStatLabels: Record<string, string> = {
    child_attendance: 'Child Attendance',
    pending_fees: 'Child Pending Fees',
    upcoming_exams: 'Upcoming Exams',
};

const statAccents: Record<string, { gradient: string; glow: string; bar: string }> = {
    total_students: { gradient: 'from-emerald-500 to-teal-400', glow: 'bg-emerald-400/20', bar: 'bg-emerald-500' },
    total_teachers: { gradient: 'from-blue-500 to-cyan-400', glow: 'bg-blue-400/20', bar: 'bg-blue-500' },
    total_staff: { gradient: 'from-violet-500 to-purple-400', glow: 'bg-violet-400/20', bar: 'bg-violet-500' },
    total_parents: { gradient: 'from-pink-500 to-rose-400', glow: 'bg-pink-400/20', bar: 'bg-pink-500' },
    total_classes: { gradient: 'from-indigo-500 to-blue-400', glow: 'bg-indigo-400/20', bar: 'bg-indigo-500' },
    total_assignments: { gradient: 'from-amber-500 to-yellow-400', glow: 'bg-amber-400/20', bar: 'bg-amber-500' },
    total_quizzes: { gradient: 'from-cyan-500 to-sky-400', glow: 'bg-cyan-400/20', bar: 'bg-cyan-500' },
    pending_approvals: { gradient: 'from-yellow-500 to-orange-400', glow: 'bg-yellow-400/20', bar: 'bg-yellow-500' },
    attendance_today: { gradient: 'from-lime-500 to-green-400', glow: 'bg-lime-400/20', bar: 'bg-lime-500' },
    child_attendance: { gradient: 'from-teal-500 to-emerald-400', glow: 'bg-teal-400/20', bar: 'bg-teal-500' },
    fee_collected: { gradient: 'from-emerald-600 to-lime-500', glow: 'bg-emerald-400/20', bar: 'bg-emerald-600' },
    pending_fees: { gradient: 'from-red-500 to-orange-400', glow: 'bg-red-400/20', bar: 'bg-red-500' },
    fee_payments_month: { gradient: 'from-green-600 to-emerald-400', glow: 'bg-green-400/20', bar: 'bg-green-600' },
    upcoming_exams: { gradient: 'from-purple-500 to-violet-400', glow: 'bg-purple-400/20', bar: 'bg-purple-500' },
    new_students_month: { gradient: 'from-lime-600 to-yellow-400', glow: 'bg-lime-400/20', bar: 'bg-lime-600' },
};

function miniBars(seed: number, barClass: string) {
    const heights = [40, 65, 45, 80, 55, 70, 50].map((h, i) => {
        const v = (seed * (i + 3) * 7) % 100;
        return Math.max(25, Math.min(100, h + (v % 30) - 15));
    });
    return heights.map((h, i) => (
        <div
            key={i}
            className={cn('w-1.5 rounded-full opacity-50 transition-all group-hover:opacity-80', barClass)}
            style={{ height: `${h}%` }}
        />
    ));
}

interface StatDef {
    sectionKey: keyof DashboardSections;
    statKey: string;
    format?: (value: number | string) => string | number;
}

const STAT_DEFS: StatDef[] = [
    { sectionKey: 'stat_students', statKey: 'total_students' },
    { sectionKey: 'stat_teachers', statKey: 'total_teachers' },
    { sectionKey: 'stat_staff', statKey: 'total_staff' },
    { sectionKey: 'stat_parents', statKey: 'total_parents' },
    { sectionKey: 'stat_classes', statKey: 'total_classes' },
    { sectionKey: 'stat_assignments', statKey: 'total_assignments' },
    { sectionKey: 'stat_quizzes', statKey: 'total_quizzes' },
    { sectionKey: 'stat_pending_approvals', statKey: 'pending_approvals' },
    {
        sectionKey: 'stat_attendance',
        statKey: 'attendance_today',
        format: (v) => (typeof v === 'number' ? `${v}%` : v),
    },
    {
        sectionKey: 'stat_child_attendance',
        statKey: 'child_attendance',
        format: (v) => (typeof v === 'number' ? `${v}%` : v),
    },
    {
        sectionKey: 'stat_fee_collected',
        statKey: 'fee_collected',
        format: (v) => (typeof v === 'number' ? formatCurrency(v) : v),
    },
    { sectionKey: 'stat_pending_fees', statKey: 'pending_fees', format: (v) => (typeof v === 'number' ? formatCurrency(v) : v) },
    { sectionKey: 'stat_fee_payments', statKey: 'fee_payments_month' },
    { sectionKey: 'stat_exams', statKey: 'upcoming_exams' },
    { sectionKey: 'stat_new_students', statKey: 'new_students_month' },
];

interface StatCardsProps {
    sections: DashboardSections;
    stats: Record<string, number | string>;
    loading: boolean;
    childFees?: boolean;
}

export function StatCards({ sections, stats, loading, childFees }: StatCardsProps) {
    const { user } = useAuth();
    const isStudent = user?.role === 'student';
    const isTeacher = user?.role === 'teacher';
    const isParent = user?.role === 'parent';
    const visible = STAT_DEFS.filter((d) => sections[d.sectionKey]);

    if (visible.length === 0) return null;

    if (loading && Object.keys(stats).length === 0) {
        return <StatCardsSkeleton count={visible.length} />;
    }

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">
            {visible.map(({ sectionKey, statKey, format }) => {
                const pendingKey = sectionKey === 'stat_pending_fees' && childFees ? 'child_pending_fees' : statKey;
                const raw = stats[pendingKey] ?? 0;
                const display = format ? format(raw) : raw;
                const roleLabels = isStudent
                    ? studentStatLabels
                    : isTeacher
                      ? teacherStatLabels
                      : isParent
                        ? parentStatLabels
                        : null;
                const label =
                    sectionKey === 'stat_pending_fees' && childFees
                        ? 'Child Fee Status'
                        : roleLabels?.[statKey] ?? (statLabels[statKey] ?? statKey);
                const Icon = statIcons[statKey] ?? TrendingUp;
                const isAlert = sectionKey === 'stat_pending_approvals' && Number(raw) > 0;
                const accent = statAccents[statKey] ?? {
                    gradient: 'from-emerald-500 to-lime-500',
                    glow: 'bg-emerald-400/20',
                    bar: 'bg-emerald-500',
                };
                const seed = typeof raw === 'number' ? raw : String(raw).length;

                return (
                    <div
                        key={sectionKey}
                        className={cn(
                            'admin-stat-card-modern group relative overflow-hidden',
                            isAlert && 'ring-1 ring-yellow-500/30',
                        )}
                    >
                        <div
                            className={cn(
                                'pointer-events-none absolute -end-6 -top-6 h-28 w-28 rounded-full blur-2xl admin-stat-glow',
                                isAlert ? 'bg-yellow-400/25' : accent.glow,
                            )}
                        />
                        <div className="relative flex items-center gap-3.5">
                            <div
                                className={cn(
                                    'admin-dash-icon flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br',
                                    isAlert ? 'from-yellow-500 to-orange-400' : accent.gradient,
                                )}
                            >
                                <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold uppercase tracking-wider admin-page-sub truncate">
                                    {label}
                                </p>
                                <p
                                    className={cn(
                                        'mt-1 text-2xl font-extrabold tabular-nums admin-page-title',
                                        isAlert && 'text-yellow-600 dark:text-yellow-400',
                                    )}
                                >
                                    {loading && !(pendingKey in stats) ? (
                                        <span className="inline-block h-8 w-20 animate-pulse rounded-lg bg-emerald-500/10" />
                                    ) : (
                                        display
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="relative mt-4 flex h-5 items-end gap-1 opacity-60 dark:opacity-80 group-hover:opacity-100 transition-opacity">
                            {miniBars(seed, isAlert ? 'bg-yellow-500' : accent.bar)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
