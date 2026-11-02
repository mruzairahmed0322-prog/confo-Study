import { MARKABLE_STATUSES, STATUS_CONFIG, type MarkableStatus, type StudentRecord } from '@/components/attendance/attendanceTypes';

interface AttendanceStudentGridProps {
    students: StudentRecord[];
    getStatus: (student: StudentRecord) => MarkableStatus | 'unmarked';
    onSetStatus: (id: number, status: MarkableStatus) => void;
    changedIds: Set<number>;
    canMark: boolean;
}

export function AttendanceStudentGrid({
    students, getStatus, onSetStatus, changedIds, canMark,
}: AttendanceStudentGridProps) {
    return (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {students.map((student) => {
                const current = getStatus(student);
                const isChanged = changedIds.has(student.id);

                return (
                    <div
                        key={student.id}
                        className={`relative flex flex-col items-center rounded-2xl border p-3 transition-all ${
                            isChanged
                                ? 'border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20'
                                : 'border-emerald-500/10 bg-white dark:bg-emerald-950/20'
                        }`}
                    >
                        {isChanged && (
                            <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-amber-500" />
                        )}
                        <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-xl text-lg font-extrabold text-white shadow-md ${
                            current === 'present' ? 'bg-gradient-to-br from-emerald-500 to-lime-500' :
                            current === 'absent' ? 'bg-gradient-to-br from-rose-500 to-rose-600' :
                            current === 'late' ? 'bg-gradient-to-br from-amber-400 to-amber-500' :
                            current === 'leave' ? 'bg-gradient-to-br from-sky-400 to-sky-500' :
                            'bg-gradient-to-br from-stone-400 to-stone-500'
                        }`}>
                            {student.name.charAt(0)}
                        </div>
                        <p className="w-full truncate text-center text-xs font-bold text-stone-900 dark:text-white">
                            {student.name}
                        </p>
                        <p className="text-[10px] text-stone-400">{student.roll_no}</p>
                        <div className="mt-2 grid w-full grid-cols-4 gap-1">
                            {MARKABLE_STATUSES.map((st) => {
                                const cfg = STATUS_CONFIG[st];
                                const active = current === st;
                                return (
                                    <button
                                        key={st}
                                        type="button"
                                        disabled={!canMark}
                                        onClick={() => onSetStatus(student.id, st)}
                                        title={cfg.label}
                                        className={`rounded-lg py-1.5 text-[10px] font-extrabold transition-all ${
                                            active ? cfg.activeClass : cfg.idleClass
                                        } ${!canMark ? 'cursor-default opacity-70' : 'active:scale-95'}`}
                                    >
                                        {cfg.short}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
