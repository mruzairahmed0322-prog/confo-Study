import { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Calendar, ChevronLeft, ChevronRight, Search, Save,
    CheckCheck, RotateCcw, ClipboardCheck, LayoutGrid, CalendarDays,
    Eye, BarChart3, Download, List, Grid3X3, Zap, Keyboard,
} from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/PageHeader';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { asList } from '@/lib/listUtils';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { AttendanceStats } from '@/components/attendance/AttendanceStats';
import { AttendanceCalendar } from '@/components/attendance/AttendanceCalendar';
import { AttendanceTrendChart } from '@/components/attendance/AttendanceTrendChart';
import { AttendanceAtRiskPanel } from '@/components/attendance/AttendanceAtRiskPanel';
import { AttendanceStudentGrid } from '@/components/attendance/AttendanceStudentGrid';
import {
    FILTER_TABS,
    MARKABLE_STATUSES,
    STATUS_CONFIG,
    type AttendanceSummary,
    type AttendanceTrendPoint,
    type AtRiskStudent,
    type FilterTab,
    type MarkableStatus,
    type StudentRecord,
} from '@/components/attendance/attendanceTypes';

interface ClassOption {
    id: number;
    name: string;
}

interface AttendanceResponse {
    date: string;
    students: StudentRecord[];
    summary: AttendanceSummary;
}

interface SummaryResponse {
    month: string;
    total_students: number;
    days: import('@/components/attendance/attendanceTypes').AttendanceDaySummary[];
}

interface TrendResponse {
    days: number;
    average_rate: number;
    points: AttendanceTrendPoint[];
}

interface AtRiskResponse {
    threshold: number;
    month: string;
    students: AtRiskStudent[];
}

type PageTab = 'mark' | 'calendar' | 'insights';
type ViewMode = 'list' | 'grid';

const PAGE_TABS: { id: PageTab; label: string; icon: typeof LayoutGrid }[] = [
    { id: 'mark', label: 'Mark', icon: LayoutGrid },
    { id: 'calendar', label: 'Calendar', icon: CalendarDays },
    { id: 'insights', label: 'Insights', icon: BarChart3 },
];

function shiftDate(date: string, delta: number): string {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    return d.toISOString().split('T')[0];
}

function formatDisplayDate(date: string): string {
    return new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'short', day: 'numeric', year: 'numeric',
    });
}

export default function AttendanceMarkPage() {
    const today = new Date().toISOString().split('T')[0];
    const [tab, setTab] = useState<PageTab>('mark');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [date, setDate] = useState(today);
    const [month, setMonth] = useState(today.slice(0, 7));
    const [classId, setClassId] = useState('');
    const [records, setRecords] = useState<Record<number, MarkableStatus>>({});
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<FilterTab>('all');
    const [focusedIndex, setFocusedIndex] = useState(0);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const { toast } = useToast();
    const { hasPermission } = useAuth();
    const qc = useQueryClient();
    const canMark = hasPermission('attendance.mark');

    const { data: classes = [] } = useQuery({
        queryKey: ['classes-list'],
        queryFn: () => apiGet('/students/classes'),
        staleTime: 60_000,
        select: asList<ClassOption>,
    });

    useEffect(() => {
        if (!classId && classes.length > 0) {
            setClassId(String(classes[0].id));
        }
    }, [classes, classId]);

    const { data, isLoading, isFetching } = useQuery<AttendanceResponse>({
        queryKey: ['attendance', date, classId],
        queryFn: () => apiGet('/attendance', { date, class_id: classId }),
        enabled: !!classId,
        placeholderData: (prev) => prev,
    });

    const { data: summaryData } = useQuery<SummaryResponse>({
        queryKey: ['attendance-summary', month, classId],
        queryFn: () => apiGet('/attendance/summary', { month, class_id: classId }),
        enabled: !!classId && tab === 'calendar',
    });

    const { data: trendData, isLoading: trendLoading } = useQuery<TrendResponse>({
        queryKey: ['attendance-trend', classId],
        queryFn: () => apiGet('/attendance/trend', { class_id: classId, days: 7 }),
        enabled: !!classId && tab === 'insights',
    });

    const { data: atRiskData, isLoading: atRiskLoading } = useQuery<AtRiskResponse>({
        queryKey: ['attendance-at-risk', month, classId],
        queryFn: () => apiGet('/attendance/at-risk', { month, class_id: classId }),
        enabled: !!classId && tab === 'insights',
    });

    const markMutation = useMutation({
        mutationFn: () => apiPost('/attendance/mark', {
            date,
            records: Object.entries(records).map(([student_id, status]) => ({
                student_id: Number(student_id),
                status,
            })),
        }),
        onSuccess: () => {
            toast('Attendance saved successfully');
            qc.invalidateQueries({ queryKey: ['attendance'] });
            qc.invalidateQueries({ queryKey: ['attendance-summary'] });
            qc.invalidateQueries({ queryKey: ['attendance-trend'] });
            qc.invalidateQueries({ queryKey: ['attendance-at-risk'] });
            setRecords({});
        },
        onError: () => toast('Failed to save attendance', 'error'),
    });

    const getStatus = useCallback((student: StudentRecord): MarkableStatus | 'unmarked' => {
        const changed = records[student.id];
        if (changed) return changed;
        if (student.status === 'unmarked') return 'unmarked';
        return student.status as MarkableStatus;
    }, [records]);

    const setStatus = useCallback((id: number, status: MarkableStatus) => {
        if (!canMark) return;
        setRecords((p) => ({ ...p, [id]: status }));
    }, [canMark]);

    const markAll = (status: MarkableStatus) => {
        if (!canMark || !data?.students) return;
        const next: Record<number, MarkableStatus> = {};
        data.students.forEach((s) => { next[s.id] = status; });
        setRecords(next);
        toast(`All marked as ${status}`);
    };

    const markUnmarkedOnly = (status: MarkableStatus) => {
        if (!canMark || !data?.students) return;
        const next: Record<number, MarkableStatus> = { ...records };
        data.students.forEach((s) => {
            if (getStatus(s) === 'unmarked') next[s.id] = status;
        });
        setRecords(next);
        toast(`Unmarked students marked as ${status}`);
    };

    const clearChanges = () => setRecords({});

    const exportCsv = () => {
        if (!data?.students) return;
        const className = classes.find((c) => String(c.id) === classId)?.name ?? 'class';
        downloadCsv(
            `attendance-${className}-${date}.csv`,
            ['Roll No', 'Name', 'Class', 'Status'],
            data.students.map((s) => [s.roll_no, s.name, s.class, getStatus(s)]),
        );
        toast('CSV exported');
    };

    const filteredStudents = useMemo(() => {
        if (!data?.students) return [];
        let list = data.students;
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter((s) =>
                s.name.toLowerCase().includes(q) ||
                s.roll_no.toLowerCase().includes(q)
            );
        }
        if (filter !== 'all') {
            list = list.filter((s) => getStatus(s) === filter);
        }
        return list;
    }, [data?.students, search, filter, getStatus]);

    useEffect(() => {
        setFocusedIndex(0);
    }, [filteredStudents.length, date, classId]);

    useEffect(() => {
        if (!canMark || tab !== 'mark') return;

        const handler = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
            if (!filteredStudents.length) return;

            const key = e.key.toLowerCase();
            const statusMap: Record<string, MarkableStatus> = { p: 'present', a: 'absent', l: 'late', e: 'leave' };

            if (statusMap[key]) {
                e.preventDefault();
                const student = filteredStudents[focusedIndex];
                if (student) setStatus(student.id, statusMap[key]);
                return;
            }

            if (key === 'arrowdown' || key === 'j') {
                e.preventDefault();
                setFocusedIndex((i) => Math.min(i + 1, filteredStudents.length - 1));
            } else if (key === 'arrowup' || key === 'k') {
                e.preventDefault();
                setFocusedIndex((i) => Math.max(i - 1, 0));
            } else if (key === '?' ) {
                setShowShortcuts((s) => !s);
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [canMark, tab, filteredStudents, focusedIndex, setStatus]);

    const hasChanges = Object.keys(records).length > 0;
    const summary = data?.summary ?? {
        total: 0, marked: 0, present: 0, absent: 0, late: 0, leave: 0, unmarked: 0, rate: 0,
    };
    const selectedClass = classes.find((c) => String(c.id) === classId);
    const changedIds = useMemo(() => new Set(Object.keys(records).map(Number)), [records]);
    const isToday = date === today;

    return (
        <div className="space-y-5 pb-24 lg:pb-6">
            <PageHeader
                title="Attendance"
                subtitle={canMark ? 'Smart class attendance — mark, track, analyze & export' : 'View class attendance records'}
                actions={
                    <div className="flex flex-wrap items-center gap-2">
                        {!canMark && (
                            <span className="flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                                <Eye className="h-3.5 w-3.5" /> View Only
                            </span>
                        )}
                        <div className="flex rounded-xl border border-emerald-500/20 bg-white/60 p-1 dark:bg-emerald-950/30">
                            {PAGE_TABS.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    type="button"
                                    onClick={() => setTab(id)}
                                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all sm:px-3 ${
                                        tab === id
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-emerald-700 hover:bg-emerald-50 dark:text-lime-300 dark:hover:bg-emerald-900/40'
                                    }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    <span className="hidden sm:inline">{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                }
            />

            <div className="admin-card flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
                    <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-emerald-800/70 dark:text-lime-400/70">Class</label>
                            <select
                                value={classId}
                                onChange={(e) => { setClassId(e.target.value); setRecords({}); }}
                                className="admin-input w-full px-3 py-2.5 text-sm font-medium"
                            >
                                <option value="">Select class…</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-emerald-800/70 dark:text-lime-400/70">Date</label>
                            <div className="flex items-center gap-1 rounded-xl border border-emerald-500/15 bg-white dark:bg-emerald-950/20">
                                <button type="button" onClick={() => { setDate(shiftDate(date, -1)); setRecords({}); }} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <div className="flex flex-1 items-center gap-2 px-2">
                                    <Calendar className="h-4 w-4 shrink-0 text-emerald-500" />
                                    <input
                                        type="date"
                                        value={date}
                                        onChange={(e) => { setDate(e.target.value); setRecords({}); setMonth(e.target.value.slice(0, 7)); }}
                                        className="w-full bg-transparent text-sm font-semibold focus:outline-none dark:text-lime-50"
                                    />
                                </div>
                                <button type="button" onClick={() => { setDate(shiftDate(date, 1)); setRecords({}); }} className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {tab === 'mark' && (
                            <div>
                                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-emerald-800/70 dark:text-lime-400/70">Search</label>
                                <div className="relative">
                                    <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                                    <input
                                        type="search"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Name or roll no…"
                                        className="admin-input w-full py-2.5 ps-10 text-sm"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {!isToday && tab === 'mark' && (
                            <Button variant="ghost" size="sm" onClick={() => { setDate(today); setRecords({}); setMonth(today.slice(0, 7)); }}>
                                <Zap className="h-4 w-4" /> Today
                            </Button>
                        )}
                        {classId && tab === 'mark' && data?.students && (
                            <Button variant="ghost" size="sm" onClick={exportCsv}>
                                <Download className="h-4 w-4" /> Export
                            </Button>
                        )}
                        {canMark && tab === 'mark' && classId && (
                            <>
                                <Button variant="secondary" size="sm" onClick={() => markAll('present')}>
                                    <CheckCheck className="h-4 w-4" /> All Present
                                </Button>
                                <Button variant="secondary" size="sm" onClick={() => markUnmarkedOnly('present')}>
                                    <CheckCheck className="h-4 w-4" /> Unmarked → P
                                </Button>
                                {hasChanges && (
                                    <Button variant="ghost" size="sm" onClick={clearChanges}>
                                        <RotateCcw className="h-4 w-4" /> Reset
                                    </Button>
                                )}
                            </>
                        )}
                    </div>
                </div>

            {showShortcuts && tab === 'mark' && canMark && (
                <div className="admin-card flex items-start gap-3 border-emerald-500/20 bg-emerald-50/50 p-4 dark:bg-emerald-950/30">
                    <Keyboard className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="text-sm">
                        <p className="font-bold text-emerald-900 dark:text-lime-50">Keyboard Shortcuts</p>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600 dark:text-stone-400">
                            <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] shadow dark:bg-stone-800">P</kbd> Present</span>
                            <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] shadow dark:bg-stone-800">A</kbd> Absent</span>
                            <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] shadow dark:bg-stone-800">L</kbd> Late</span>
                            <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] shadow dark:bg-stone-800">E</kbd> Leave</span>
                            <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] shadow dark:bg-stone-800">↑↓</kbd> Navigate</span>
                            <span><kbd className="rounded bg-white px-1.5 py-0.5 font-mono text-[10px] shadow dark:bg-stone-800">?</kbd> Toggle help</span>
                        </div>
                    </div>
                    <button type="button" onClick={() => setShowShortcuts(false)} className="ms-auto text-stone-400 hover:text-stone-600">✕</button>
                </div>
            )}

            {!classId ? (
                <div className="admin-card flex flex-col items-center justify-center gap-4 py-20 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-lime-500 text-white shadow-lg shadow-emerald-500/25">
                        <ClipboardCheck className="h-8 w-8" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-emerald-900 dark:text-lime-50">Select a Class</p>
                        <p className="mt-1 text-sm text-stone-500">Choose a class above to load students and mark attendance</p>
                    </div>
                </div>
            ) : tab === 'insights' ? (
                <div className="space-y-5">
                    {(trendLoading || atRiskLoading) ? (
                        <div className="admin-card flex justify-center py-16">
                            <BrandLoader size="md" />
                        </div>
                    ) : (
                        <>
                            {trendData && (
                                <AttendanceTrendChart points={trendData.points} averageRate={trendData.average_rate} />
                            )}
                            {atRiskData && (
                                <AttendanceAtRiskPanel
                                    students={atRiskData.students}
                                    threshold={atRiskData.threshold}
                                    month={atRiskData.month}
                                />
                            )}
                        </>
                    )}
                </div>
            ) : tab === 'calendar' ? (
                <div className="space-y-5">
                    {summaryData ? (
                        <AttendanceCalendar
                            month={month}
                            days={summaryData.days}
                            onMonthChange={(m) => setMonth(m)}
                            onDaySelect={(d) => { setDate(d); setTab('mark'); setRecords({}); }}
                            selectedDate={date}
                        />
                    ) : (
                        <div className="admin-card flex justify-center py-16">
                            <BrandLoader size="md" />
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {data && <AttendanceStats summary={summary} />}

                    <div className="admin-card overflow-hidden">
                        <div className="flex flex-col gap-3 border-b border-emerald-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                            <div>
                                <p className="font-bold text-emerald-900 dark:text-lime-50">
                                    {selectedClass?.name ?? 'Class'}
                                </p>
                                <p className="text-xs text-stone-500">{formatDisplayDate(date)}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex rounded-lg border border-emerald-500/15 p-0.5">
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('list')}
                                        className={`rounded-md p-1.5 transition-all ${viewMode === 'list' ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                                        title="List view"
                                    >
                                        <List className="h-4 w-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setViewMode('grid')}
                                        className={`rounded-md p-1.5 transition-all ${viewMode === 'grid' ? 'bg-emerald-600 text-white' : 'text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                                        title="Grid view"
                                    >
                                        <Grid3X3 className="h-4 w-4" />
                                    </button>
                                </div>
                                {canMark && (
                                    <button
                                        type="button"
                                        onClick={() => setShowShortcuts((s) => !s)}
                                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
                                        title="Keyboard shortcuts"
                                    >
                                        <Keyboard className="h-4 w-4" />
                                    </button>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                    {FILTER_TABS.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setFilter(t.id)}
                                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                                                filter === t.id
                                                    ? 'bg-emerald-600 text-white shadow-sm'
                                                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300'
                                            }`}
                                        >
                                            {t.label}
                                            {t.id !== 'all' && data && (
                                                <span className="ms-1 opacity-70">
                                                    ({data.students.filter((s) => getStatus(s) === t.id).length})
                                                </span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {isLoading ? (
                            <div className="flex justify-center py-20">
                                <BrandLoader size="md" />
                            </div>
                        ) : !filteredStudents.length ? (
                            <div className="py-16 text-center text-sm text-stone-400">
                                {search || filter !== 'all' ? 'No students match your filter' : 'No students in this class'}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <AttendanceStudentGrid
                                students={filteredStudents}
                                getStatus={getStatus}
                                onSetStatus={setStatus}
                                changedIds={changedIds}
                                canMark={canMark}
                            />
                        ) : (
                            <div className="divide-y divide-emerald-500/8">
                                {filteredStudents.map((student, i) => {
                                    const current = getStatus(student);
                                    const isChanged = records[student.id] !== undefined;
                                    const isFocused = i === focusedIndex;

                                    return (
                                        <div
                                            key={student.id}
                                            className={`group flex flex-col gap-3 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4 ${
                                                i % 2 ? 'bg-emerald-50/30 dark:bg-emerald-950/20' : ''
                                            } ${isChanged ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''} ${
                                                isFocused ? 'ring-2 ring-inset ring-emerald-400/50' : ''
                                            }`}
                                            onClick={() => setFocusedIndex(i)}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white shadow-md ${
                                                    current === 'present' ? 'bg-gradient-to-br from-emerald-500 to-lime-500 shadow-emerald-500/25' :
                                                    current === 'absent' ? 'bg-gradient-to-br from-rose-500 to-rose-600 shadow-rose-500/25' :
                                                    current === 'late' ? 'bg-gradient-to-br from-amber-400 to-amber-500 shadow-amber-400/25' :
                                                    current === 'leave' ? 'bg-gradient-to-br from-sky-400 to-sky-500 shadow-sky-400/25' :
                                                    'bg-gradient-to-br from-stone-400 to-stone-500'
                                                }`}>
                                                    {student.name.charAt(0)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-stone-900 dark:text-white">{student.name}</p>
                                                    <p className="text-xs text-stone-500">{student.roll_no} · {student.class}</p>
                                                </div>
                                                {isChanged && (
                                                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                                                        Changed
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex gap-1.5 sm:gap-2">
                                                {MARKABLE_STATUSES.map((st) => {
                                                    const cfg = STATUS_CONFIG[st];
                                                    const active = current === st;
                                                    return (
                                                        <button
                                                            key={st}
                                                            type="button"
                                                            disabled={!canMark}
                                                            onClick={() => setStatus(student.id, st)}
                                                            title={cfg.label}
                                                            className={`flex items-center gap-1 rounded-xl px-2.5 py-2 text-xs font-bold transition-all duration-150 sm:px-3 ${
                                                                active ? cfg.activeClass : cfg.idleClass
                                                            } ${!canMark ? 'cursor-default opacity-70' : 'active:scale-95'}`}
                                                        >
                                                            <span className="hidden sm:inline">{cfg.label}</span>
                                                            <span className="sm:hidden">{cfg.short}</span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {isFetching && !isLoading && (
                            <div className="border-t border-emerald-500/10 px-5 py-2 text-center text-xs text-stone-400">
                                Updating…
                            </div>
                        )}
                    </div>
                </>
            )}

            {canMark && hasChanges && tab === 'mark' && (
                <div className="fixed inset-x-0 bottom-0 z-50 border-t border-emerald-500/20 bg-white/95 p-4 shadow-2xl shadow-emerald-900/10 backdrop-blur-md dark:bg-emerald-950/95 lg:static lg:mt-0 lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
                    <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 lg:admin-card lg:px-5 lg:py-4">
                        <div>
                            <p className="font-bold text-emerald-900 dark:text-lime-50">
                                {Object.keys(records).length} change{Object.keys(records).length !== 1 ? 's' : ''} pending
                            </p>
                            <p className="text-xs text-stone-500">{formatDisplayDate(date)}</p>
                        </div>
                        <Button
                            onClick={() => markMutation.mutate()}
                            loading={markMutation.isPending}
                            variant="success"
                            className="min-w-[140px] shadow-lg shadow-emerald-500/25"
                        >
                            <Save className="h-4 w-4" /> Save Attendance
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
