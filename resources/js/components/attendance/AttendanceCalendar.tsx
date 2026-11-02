import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AttendanceDaySummary } from '@/components/attendance/attendanceTypes';

interface AttendanceCalendarProps {
    month: string;
    days: AttendanceDaySummary[];
    onMonthChange: (month: string) => void;
    onDaySelect: (date: string) => void;
    selectedDate: string;
}

function shiftMonth(month: string, delta: number): string {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(month: string): string {
    const [y, m] = month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function rateColor(rate: number, hasData: boolean, isWeekend: boolean): string {
    if (isWeekend) return 'bg-stone-100 text-stone-400 dark:bg-stone-800/50 dark:text-stone-500';
    if (!hasData) return 'bg-stone-50 text-stone-400 border border-dashed border-stone-200 dark:bg-stone-900/30 dark:border-stone-700';
    if (rate >= 90) return 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25';
    if (rate >= 75) return 'bg-lime-500 text-white shadow-sm shadow-lime-500/25';
    if (rate >= 60) return 'bg-amber-400 text-white shadow-sm shadow-amber-400/25';
    return 'bg-rose-500 text-white shadow-sm shadow-rose-500/25';
}

export function AttendanceCalendar({ month, days, onMonthChange, onDaySelect, selectedDate }: AttendanceCalendarProps) {
    const firstDay = days[0];
    const startPad = firstDay ? new Date(firstDay.date).getDay() : 0;
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
        <div className="admin-card overflow-hidden">
            <div className="flex items-center justify-between border-b border-emerald-500/10 px-5 py-4">
                <div>
                    <h3 className="admin-page-title text-base">Monthly Overview</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Click a day to mark attendance</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onMonthChange(shiftMonth(month, -1))}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[140px] text-center text-sm font-bold text-emerald-900 dark:text-lime-100">
                        {monthLabel(month)}
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => onMonthChange(shiftMonth(month, 1))}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="p-4 sm:p-5">
                <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
                    {weekdays.map((d) => (
                        <div key={d} className="text-center text-[10px] font-bold uppercase tracking-wider text-stone-400 sm:text-xs">
                            {d}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {Array.from({ length: startPad }).map((_, i) => (
                        <div key={`pad-${i}`} />
                    ))}
                    {days.map((day) => {
                        const isSelected = day.date === selectedDate;
                        return (
                            <button
                                key={day.date}
                                type="button"
                                onClick={() => onDaySelect(day.date)}
                                className={`group relative flex flex-col items-center justify-center rounded-xl p-1.5 transition-all duration-200 sm:min-h-[52px] sm:p-2 ${
                                    rateColor(day.rate, day.has_data, day.is_weekend)
                                } ${isSelected ? 'ring-2 ring-emerald-600 ring-offset-2 dark:ring-offset-emerald-950 scale-105' : 'hover:scale-105'}`}
                            >
                                <span className="text-xs font-bold sm:text-sm">{day.day}</span>
                                {day.has_data && !day.is_weekend && (
                                    <span className="text-[9px] font-semibold opacity-90 sm:text-[10px]">{day.rate}%</span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-stone-500">
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" /> ≥90%</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-lime-500" /> 75–89%</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-400" /> 60–74%</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-rose-500" /> &lt;60%</span>
                    <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-stone-300 bg-stone-50" /> No data</span>
                </div>
            </div>
        </div>
    );
}
