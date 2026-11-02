export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | 'unmarked';

export interface StudentRecord {
    id: number;
    name: string;
    roll_no: string;
    class: string;
    status: AttendanceStatus;
}

export interface AttendanceSummary {
    total: number;
    marked: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    unmarked: number;
    rate: number;
    yesterday_rate?: number;
    rate_delta?: number;
}

export interface AttendanceTrendPoint {
    date: string;
    label: string;
    rate: number;
    present: number;
    absent: number;
    late: number;
    leave: number;
    marked: number;
    has_data: boolean;
}

export interface AtRiskStudent {
    id: number;
    name: string;
    roll_no: string;
    class: string;
    rate: number;
    marked_days: number;
    absent_days: number;
    late_days: number;
    leave_days: number;
    school_days: number;
}

export interface AttendanceDaySummary {
    date: string;
    day: number;
    weekday: string;
    is_weekend: boolean;
    present: number;
    absent: number;
    leave: number;
    marked: number;
    total: number;
    rate: number;
    has_data: boolean;
}

export const MARKABLE_STATUSES = ['present', 'absent', 'late', 'leave'] as const;
export type MarkableStatus = typeof MARKABLE_STATUSES[number];

export const STATUS_CONFIG: Record<MarkableStatus, {
    label: string;
    short: string;
    icon: string;
    activeClass: string;
    idleClass: string;
    ringClass: string;
}> = {
    present: {
        label: 'Present',
        short: 'P',
        icon: '✓',
        activeClass: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400',
        idleClass: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/50',
        ringClass: 'ring-emerald-500',
    },
    absent: {
        label: 'Absent',
        short: 'A',
        icon: '✕',
        activeClass: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400',
        idleClass: 'bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50',
        ringClass: 'ring-rose-500',
    },
    late: {
        label: 'Late',
        short: 'L',
        icon: '◷',
        activeClass: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-400',
        idleClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50',
        ringClass: 'ring-amber-500',
    },
    leave: {
        label: 'Leave',
        short: 'Lv',
        icon: '—',
        activeClass: 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-400',
        idleClass: 'bg-sky-50 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/50',
        ringClass: 'ring-sky-500',
    },
};

export const FILTER_TABS = [
    { id: 'all', label: 'All' },
    { id: 'unmarked', label: 'Unmarked' },
    { id: 'absent', label: 'Absent' },
    { id: 'late', label: 'Late' },
] as const;

export type FilterTab = typeof FILTER_TABS[number]['id'];
