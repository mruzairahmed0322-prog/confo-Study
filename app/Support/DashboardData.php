<?php

namespace App\Support;

use App\AccountStatus;
use App\ApprovalStatus;
use App\Models\ActivityLog;
use App\Models\Assignment;
use App\Models\Attendance;
use App\Models\Event;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Models\FeePayment;
use App\Models\PaymentProof;
use App\Models\Quiz;
use App\Models\SchoolClass;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\TimetableSlot;
use App\Models\User;
use App\Models\UserNotification;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Role;

class DashboardData
{
    /**
     * @return array<string, mixed>
     */
    public static function forUser(User $user): array
    {
        $schoolId = (int) $user->school_id;

        return [
            'stats' => self::stats($schoolId, $user),
            'chartLabels' => self::lastSevenDayLabels(),
            'chartData' => self::attendanceTrend($schoolId, $user),
            'feeMonths' => self::lastSixMonthLabels(),
            'feeData' => self::feeCollectionTrend($schoolId),
            'genderData' => self::genderRatio($schoolId),
            'classStrength' => self::classStrength($schoolId),
            'recentAdmissions' => self::recentAdmissions($schoolId),
            'todayTimetable' => self::todayTimetable($schoolId, $user),
            'pendingHomework' => self::pendingHomework($schoolId, $user),
            'childResults' => self::childResults($schoolId, $user),
            'feeAlerts' => self::feeAlerts($schoolId, $user),
            'upcomingEvents' => self::upcomingEvents($schoolId),
            'recentActivities' => ActivityLog::where('school_id', $schoolId)
                ->with('user')
                ->latest()
                ->limit(5)
                ->get()
                ->map(fn (ActivityLog $log) => [
                    'id' => $log->id,
                    'action' => $log->action,
                    'user' => $log->user ? ['name' => $log->user->name] : null,
                    'created_at' => $log->created_at->diffForHumans(),
                ]),
            'notifications' => self::notifications($schoolId, $user),
            'liveSession' => self::liveSessionCta($user),
        ];
    }

    /**
     * Fee-paid student/parent only — Live or Watch Recording CTA for dashboard.
     * Unpaid users get null (no button, no tease).
     *
     * @return array<string, mixed>|null
     */
    private static function liveSessionCta(User $user): ?array
    {
        if (! $user->hasAnyRole(['student', 'parent'])) {
            return null;
        }

        if (! $user->fee_cleared || $user->account_status !== AccountStatus::ACTIVE) {
            return null;
        }

        $classIds = collect();
        if ($user->hasRole('student')) {
            $student = self::resolveStudent($user);
            if ($student?->school_class_id && ($student->status === null || $student->status === 'active')) {
                $classIds->push((int) $student->school_class_id);
            }
        }

        if ($user->hasRole('parent')) {
            $classIds = $classIds->merge(
                Student::query()
                    ->where('school_id', $user->school_id)
                    ->where('parent_id', $user->id)
                    ->where(function ($q) {
                        $q->whereNull('status')->orWhere('status', 'active');
                    })
                    ->pluck('school_class_id')
                    ->filter()
            );
        }

        $classIds = $classIds->unique()->values();
        if ($classIds->isEmpty()) {
            return null;
        }

        $liveClass = \App\Models\LiveClass::query()
            ->with(['subject', 'schoolClass'])
            ->where('school_id', $user->school_id)
            ->whereIn('school_class_id', $classIds)
            ->whereIn('status', ['live', 'scheduled', 'completed'])
            ->where(function ($q) {
                $q->whereIn('status', ['live', 'scheduled'])
                    ->orWhereNotNull('recording_url')
                    ->orWhere(function ($q2) {
                        $q2->where('status', 'completed')
                            ->whereNotNull('youtube_broadcast_id');
                    });
            })
            ->orderByRaw("CASE status WHEN 'live' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END")
            ->orderByDesc('scheduled_at')
            ->first();

        if (! $liveClass || ! LiveClassAccess::canViewLinks($user, $liveClass)) {
            return null;
        }

        $formatted = LiveClassAccess::formatForUser($liveClass, $user);
        if (! ($formatted['can_join'] || $formatted['can_watch'])) {
            return null;
        }

        return [
            'id' => $liveClass->id,
            'title' => $liveClass->title,
            'status' => $liveClass->status,
            'class_name' => $formatted['class_name'],
            'subject_name' => $formatted['subject_name'],
            'scheduled_at' => $formatted['scheduled_at'],
            'can_join' => (bool) $formatted['can_join'],
            'can_watch' => (bool) $formatted['can_watch'],
            'join_url' => $formatted['join_url'],
            'watch_url' => $formatted['watch_url'],
            'mode' => $formatted['can_join'] ? 'live' : 'recording',
        ];
    }

    private static function resolveStudent(User $user): ?Student
    {
        if (! $user->hasRole('student')) {
            return null;
        }

        $byUser = Student::where('school_id', $user->school_id)
            ->where('user_id', $user->id)
            ->first();

        if ($byUser) {
            return $byUser;
        }

        $fallback = Student::where('school_id', $user->school_id)
            ->where(function ($q) use ($user) {
                $q->where('name', $user->name);
                if ($user->phone) {
                    $q->orWhere('phone', $user->phone);
                }
            })
            ->first();

        if ($fallback && ! $fallback->user_id) {
            $fallback->update(['user_id' => $user->id]);
        }

        return $fallback;
    }

    /** @return array<string, int|float> */
    private static function stats(int $schoolId, User $user): array
    {
        if ($user->hasRole('student')) {
            return self::studentStats($schoolId, $user);
        }

        if ($user->hasRole('parent')) {
            return self::parentStats($schoolId, $user);
        }

        if ($user->hasRole('teacher')) {
            return self::teacherStats($schoolId, $user);
        }

        return self::staffStats($schoolId, $user);
    }

    /** @return array<string, int|float> */
    private static function studentStats(int $schoolId, User $user): array
    {
        $student = self::resolveStudent($user);
        $today = today();
        $monthStart = $today->copy()->startOfMonth();

        $attendanceToday = 0.0;
        $pendingFees = 0.0;
        $totalAssignments = 0;
        $upcomingExams = 0;

        if ($student) {
            $monthAtt = Attendance::where('student_id', $student->id)
                ->where('date', '>=', $monthStart)
                ->get();

            $attendanceToday = $monthAtt->isEmpty()
                ? 0
                : round($monthAtt->whereIn('status', ['present', 'late'])->count() / $monthAtt->count() * 100, 1);

            $pendingFees = (float) FeePayment::where('student_id', $student->id)
                ->whereIn('status', ['pending', 'overdue'])
                ->sum('amount');

            if ($student->school_class_id) {
                $totalAssignments = Assignment::where('school_id', $schoolId)
                    ->where('school_class_id', $student->school_class_id)
                    ->where('status', 'published')
                    ->where('due_date', '>=', $today)
                    ->count();

                $upcomingExams = Exam::where('school_id', $schoolId)
                    ->where('school_class_id', $student->school_class_id)
                    ->whereBetween('start_date', [$today, $today->copy()->addDays(30)])
                    ->count();

                if ($upcomingExams === 0) {
                    $upcomingExams = Event::where('school_id', $schoolId)
                        ->where('type', 'exam')
                        ->whereBetween('event_date', [$today, $today->copy()->addDays(30)])
                        ->count();
                }
            }
        }

        return [
            'total_students' => 0,
            'total_teachers' => 0,
            'total_staff' => 0,
            'total_parents' => 0,
            'total_classes' => 0,
            'total_assignments' => $totalAssignments,
            'total_quizzes' => 0,
            'pending_approvals' => 0,
            'fee_payments_month' => 0,
            'attendance_today' => $attendanceToday,
            'child_attendance' => 0,
            'fee_collected' => 0,
            'pending_fees' => $pendingFees,
            'child_pending_fees' => 0,
            'upcoming_exams' => $upcomingExams,
            'new_students_month' => 0,
        ];
    }

    /** @return array<string, int|float> */
    private static function parentStats(int $schoolId, User $user): array
    {
        $today = today();
        $childIds = Student::where('school_id', $schoolId)->where('parent_id', $user->id)->pluck('id');
        $classIds = Student::whereIn('id', $childIds)->pluck('school_class_id')->filter()->unique();

        $childPending = (float) FeePayment::whereIn('student_id', $childIds)
            ->whereIn('status', ['pending', 'overdue'])
            ->sum('amount');

        $childAtt = Attendance::whereIn('student_id', $childIds)
            ->whereDate('date', $today)
            ->get();

        $childAttendance = $childAtt->isEmpty()
            ? 0
            : round($childAtt->whereIn('status', ['present', 'late'])->count() / $childAtt->count() * 100, 1);

        $upcomingExams = 0;
        if ($classIds->isNotEmpty()) {
            $upcomingExams = Exam::where('school_id', $schoolId)
                ->whereIn('school_class_id', $classIds)
                ->whereBetween('start_date', [$today, $today->copy()->addDays(30)])
                ->count();
        }

        $base = self::emptyStats();
        $base['child_attendance'] = $childAttendance;
        $base['pending_fees'] = $childPending;
        $base['child_pending_fees'] = $childPending;
        $base['upcoming_exams'] = $upcomingExams;

        return $base;
    }

    /** @return array<string, int|float> */
    private static function teacherStats(int $schoolId, User $user): array
    {
        $today = today();
        $teacher = Teacher::where('school_id', $schoolId)->where('user_id', $user->id)->first();
        $classIds = collect();

        if ($teacher) {
            $fromTimetable = TimetableSlot::where('teacher_id', $teacher->id)->pluck('school_class_id');
            $fromSubjects = method_exists($teacher, 'subjects')
                ? $teacher->subjects()->pluck('teacher_subject.school_class_id')
                : collect();
            $classIds = $fromTimetable->merge($fromSubjects)->filter()->unique()->values();
        }

        $studentIds = $classIds->isEmpty()
            ? collect()
            : Student::where('school_id', $schoolId)
                ->whereIn('school_class_id', $classIds)
                ->where('status', 'active')
                ->pluck('id');

        $totalStudents = $studentIds->count();

        $todayAttendance = $studentIds->isEmpty()
            ? collect()
            : Attendance::whereIn('student_id', $studentIds)->whereDate('date', $today)->get();

        $attendanceToday = $todayAttendance->isEmpty()
            ? 0
            : round($todayAttendance->whereIn('status', ['present', 'late'])->count() / $todayAttendance->count() * 100, 1);

        $totalAssignments = 0;
        if ($teacher) {
            $totalAssignments = Assignment::where('school_id', $schoolId)
                ->where(function ($q) use ($teacher, $classIds) {
                    $q->where('teacher_id', $teacher->id);
                    if ($classIds->isNotEmpty()) {
                        $q->orWhereIn('school_class_id', $classIds);
                    }
                })
                ->where('status', 'published')
                ->where('due_date', '>=', $today)
                ->count();
        }

        $base = self::emptyStats();
        $base['total_students'] = $totalStudents;
        $base['attendance_today'] = $attendanceToday;
        $base['total_assignments'] = $totalAssignments;

        return $base;
    }

    /** @return array<string, int|float> */
    private static function emptyStats(): array
    {
        return [
            'total_students' => 0,
            'total_teachers' => 0,
            'total_staff' => 0,
            'total_parents' => 0,
            'total_classes' => 0,
            'total_assignments' => 0,
            'total_quizzes' => 0,
            'pending_approvals' => 0,
            'fee_payments_month' => 0,
            'attendance_today' => 0,
            'child_attendance' => 0,
            'fee_collected' => 0,
            'pending_fees' => 0,
            'child_pending_fees' => 0,
            'upcoming_exams' => 0,
            'new_students_month' => 0,
        ];
    }

    /** @return array<string, int|float> */
    private static function staffStats(int $schoolId, User $user): array
    {
        $today = today();
        $monthStart = $today->copy()->startOfMonth();

        $totalStudents = Student::where('school_id', $schoolId)->where('status', 'active')->count();
        $teacherRole = Role::findByName('teacher', 'web');
        $totalTeachers = $teacherRole
            ? User::role('teacher')->where('school_id', $schoolId)->where('account_status', 'active')->count()
            : 0;

        $todayAttendance = Attendance::where('school_id', $schoolId)
            ->whereDate('date', $today)
            ->get();

        $attendanceToday = $todayAttendance->isEmpty()
            ? 0
            : round($todayAttendance->whereIn('status', ['present', 'late'])->count() / $todayAttendance->count() * 100, 1);

        $feeCollected = (float) FeePayment::where('school_id', $schoolId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', $monthStart)
            ->sum('amount');

        $pendingFees = (float) FeePayment::where('school_id', $schoolId)
            ->whereIn('status', ['pending', 'overdue'])
            ->sum('amount');

        $upcomingExams = Event::where('school_id', $schoolId)
            ->where('type', 'exam')
            ->whereBetween('event_date', [$today, $today->copy()->addDays(30)])
            ->count();

        $newStudentsThisMonth = Student::where('school_id', $schoolId)
            ->where('created_at', '>=', $monthStart)
            ->count();

        $staffRoles = ['accountant', 'reception', 'admin'];
        $totalStaff = User::where('school_id', $schoolId)
            ->where('account_status', 'active')
            ->whereHas('roles', fn ($q) => $q->whereIn('name', $staffRoles))
            ->count();

        $totalParents = User::role('parent')
            ->where('school_id', $schoolId)
            ->where('account_status', 'active')
            ->count();

        $totalClasses = SchoolClass::where('school_id', $schoolId)->count();
        $totalAssignments = Assignment::where('school_id', $schoolId)->count();
        $totalQuizzes = Quiz::where('school_id', $schoolId)->count();

        $pendingApprovals = User::where('school_id', $schoolId)
            ->where('approval_status', ApprovalStatus::PENDING)
            ->where('account_status', AccountStatus::PENDING)
            ->count();

        $feePaymentsMonth = FeePayment::where('school_id', $schoolId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', $monthStart)
            ->count();

        return [
            'total_students' => $totalStudents,
            'total_teachers' => $totalTeachers,
            'total_staff' => $totalStaff,
            'total_parents' => $totalParents,
            'total_classes' => $totalClasses,
            'total_assignments' => $totalAssignments,
            'total_quizzes' => $totalQuizzes,
            'pending_approvals' => $pendingApprovals,
            'fee_payments_month' => $feePaymentsMonth,
            'attendance_today' => $attendanceToday,
            'child_attendance' => 0,
            'fee_collected' => $feeCollected,
            'pending_fees' => $pendingFees,
            'child_pending_fees' => 0,
            'upcoming_exams' => $upcomingExams,
            'new_students_month' => $newStudentsThisMonth,
        ];
    }

    /** @return list<string> */
    private static function lastSevenDayLabels(): array
    {
        return collect(range(6, 0))
            ->map(fn ($d) => now()->subDays($d)->format('D'))
            ->values()
            ->all();
    }

    /** @return list<float> */
    private static function attendanceTrend(int $schoolId, User $user): array
    {
        $startDate = now()->subDays(6)->startOfDay();
        $query = Attendance::where('school_id', $schoolId)
            ->where('date', '>=', $startDate);

        if ($user->hasRole('student')) {
            $student = self::resolveStudent($user);
            if (! $student) {
                return array_fill(0, 7, 0.0);
            }
            $query->where('student_id', $student->id);
        } elseif ($user->hasRole('teacher')) {
            $teacher = Teacher::where('school_id', $schoolId)->where('user_id', $user->id)->first();
            $classIds = $teacher
                ? TimetableSlot::where('teacher_id', $teacher->id)->pluck('school_class_id')->unique()
                : collect();
            $studentIds = $classIds->isEmpty()
                ? collect([-1])
                : Student::where('school_id', $schoolId)->whereIn('school_class_id', $classIds)->pluck('id');
            $query->whereIn('student_id', $studentIds->isEmpty() ? [-1] : $studentIds);
        } elseif ($user->hasRole('parent')) {
            $childIds = Student::where('school_id', $schoolId)->where('parent_id', $user->id)->pluck('id');
            $query->whereIn('student_id', $childIds->isEmpty() ? [-1] : $childIds);
        }

        $records = $query->get(['date', 'status']);
        $byDate = $records->groupBy(fn ($r) => $r->date->toDateString());

        return collect(range(6, 0))->map(function ($daysAgo) use ($byDate) {
            $date = now()->subDays($daysAgo)->toDateString();
            $dayRecords = $byDate->get($date);

            if (! $dayRecords || $dayRecords->isEmpty()) {
                return 0.0;
            }

            return round($dayRecords->whereIn('status', ['present', 'late'])->count() / $dayRecords->count() * 100, 1);
        })->values()->all();
    }

    /** @return list<string> */
    private static function lastSixMonthLabels(): array
    {
        return collect(range(5, 0))
            ->map(fn ($m) => now()->subMonths($m)->format('M'))
            ->values()
            ->all();
    }

    /** @return list<float> */
    private static function feeCollectionTrend(int $schoolId): array
    {
        $startMonth = now()->subMonths(5)->startOfMonth();

        $payments = FeePayment::where('school_id', $schoolId)
            ->where('status', 'paid')
            ->where('paid_at', '>=', $startMonth)
            ->get(['paid_at', 'amount']);

        $byMonth = $payments->groupBy(fn ($p) => $p->paid_at->format('Y-m'));

        return collect(range(5, 0))->map(function ($monthsAgo) use ($byMonth) {
            $key = now()->subMonths($monthsAgo)->format('Y-m');

            return (float) ($byMonth->get($key)?->sum('amount') ?? 0);
        })->values()->all();
    }

    /** @return array{male: int, female: int} */
    private static function genderRatio(int $schoolId): array
    {
        return [
            'male' => Student::where('school_id', $schoolId)->where('gender', 'male')->count(),
            'female' => Student::where('school_id', $schoolId)->where('gender', 'female')->count(),
        ];
    }

    /** @return list<array{class: string, count: int}> */
    private static function classStrength(int $schoolId): array
    {
        return Student::query()
            ->where('students.school_id', $schoolId)
            ->where('students.status', 'active')
            ->join('school_classes', 'students.school_class_id', '=', 'school_classes.id')
            ->selectRaw("CONCAT(school_classes.name, IF(school_classes.section IS NOT NULL AND school_classes.section != '', CONCAT('-', school_classes.section), '')) as class_name")
            ->selectRaw('COUNT(*) as total')
            ->groupBy('school_classes.id', 'school_classes.name', 'school_classes.section')
            ->orderBy('school_classes.name')
            ->get()
            ->map(fn ($row) => ['class' => $row->class_name, 'count' => (int) $row->total])
            ->values()
            ->all();
    }

    private static function recentAdmissions(int $schoolId): Collection
    {
        return Student::with('schoolClass')
            ->where('school_id', $schoolId)
            ->latest('admission_date')
            ->limit(5)
            ->get()
            ->map(fn (Student $s) => [
                'name' => $s->name,
                'roll' => $s->roll_no,
                'class' => $s->classLabel(),
                'date' => ($s->admission_date ?? $s->created_at)?->format('M d, Y') ?? '—',
                'status' => $s->status,
            ]);
    }

    private static function feeAlerts(int $schoolId, User $user): Collection
    {
        $query = FeePayment::with(['student.schoolClass'])
            ->where('school_id', $schoolId)
            ->whereIn('status', ['pending', 'overdue']);

        if ($user->hasRole('parent')) {
            $childIds = Student::where('parent_id', $user->id)->pluck('id');
            $query->whereIn('student_id', $childIds);
        } elseif ($user->hasRole('student')) {
            $student = self::resolveStudent($user);
            $query->where('student_id', $student?->id ?? 0);
        }

        return $query->orderBy('due_date')
            ->limit(5)
            ->get()
            ->map(fn (FeePayment $fee) => [
                'student' => $fee->student?->name ?? '—',
                'class' => $fee->student?->classLabel() ?? '—',
                'amount' => (float) $fee->amount,
                'due' => Carbon::parse($fee->due_date)->format('M d, Y'),
            ]);
    }

    private static function upcomingEvents(int $schoolId): Collection
    {
        return Event::where('school_id', $schoolId)
            ->where('event_date', '>=', today())
            ->orderBy('event_date')
            ->limit(5)
            ->get()
            ->map(fn (Event $e) => [
                'title' => $e->title,
                'date' => Carbon::parse($e->event_date)->format('M d, Y'),
            ]);
    }

    private static function todayTimetable(int $schoolId, User $user): Collection
    {
        $day = strtolower(now()->format('l'));
        $query = TimetableSlot::with(['subject', 'teacher', 'schoolClass'])
            ->where('school_id', $schoolId)
            ->where('day', $day)
            ->orderBy('start_time');

        if ($user->hasRole('teacher')) {
            $teacher = Teacher::where('user_id', $user->id)->first();
            if ($teacher) {
                $query->where('teacher_id', $teacher->id);
            }
        } elseif ($user->hasRole('student')) {
            $student = self::resolveStudent($user);
            if ($student?->school_class_id) {
                $query->where('school_class_id', $student->school_class_id);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user->hasRole('parent')) {
            $classIds = Student::where('school_id', $schoolId)
                ->where('parent_id', $user->id)
                ->where('status', 'active')
                ->pluck('school_class_id')
                ->filter()
                ->unique()
                ->values();
            if ($classIds->isEmpty()) {
                $query->whereRaw('1 = 0');
            } else {
                $query->whereIn('school_class_id', $classIds);
            }
        }

        return $query->get()->map(fn (TimetableSlot $slot) => [
            'id' => $slot->id,
            'subject' => $slot->subject?->name ?? '—',
            'teacher' => $slot->teacher?->name ?? '—',
            'class' => $slot->schoolClass?->displayName() ?? '—',
            'time' => substr((string) $slot->start_time, 0, 5).' - '.substr((string) $slot->end_time, 0, 5),
            'room' => $slot->room ?? '—',
        ]);
    }

    private static function pendingHomework(int $schoolId, User $user): Collection
    {
        $query = Assignment::with('schoolClass')
            ->where('school_id', $schoolId)
            ->where('status', 'published')
            ->where('due_date', '>=', today())
            ->orderBy('due_date')
            ->limit(5);

        if ($user->hasRole('student')) {
            $student = self::resolveStudent($user);
            if ($student?->school_class_id) {
                $query->where('school_class_id', $student->school_class_id);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user->hasRole('parent')) {
            $classIds = Student::where('school_id', $schoolId)
                ->where('parent_id', $user->id)
                ->pluck('school_class_id')
                ->filter()
                ->unique();
            if ($classIds->isNotEmpty()) {
                $query->whereIn('school_class_id', $classIds);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user->hasRole('teacher')) {
            $teacher = Teacher::where('user_id', $user->id)->first();
            if ($teacher) {
                $classIds = TimetableSlot::where('teacher_id', $teacher->id)->pluck('school_class_id')->unique();
                $query->whereIn('school_class_id', $classIds);
            }
        }

        return $query->get()->map(fn (Assignment $a) => [
            'title' => $a->title,
            'class' => $a->schoolClass?->displayName() ?? '—',
            'due' => $a->due_date?->format('M d, Y') ?? '—',
            'marks' => $a->total_marks,
        ]);
    }

    private static function childResults(int $schoolId, User $user): Collection
    {
        $studentIds = collect();

        if ($user->hasRole('parent')) {
            $studentIds = Student::where('school_id', $schoolId)->where('parent_id', $user->id)->pluck('id');
        } elseif ($user->hasRole('student')) {
            $student = self::resolveStudent($user);
            $studentIds = $student ? collect([$student->id]) : collect();
        } else {
            return collect();
        }

        if ($studentIds->isEmpty()) {
            return collect();
        }

        return ExamResult::with(['exam', 'subject', 'student'])
            ->where('school_id', $schoolId)
            ->whereIn('student_id', $studentIds)
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn (ExamResult $r) => [
                'student' => $r->student?->name ?? '—',
                'exam' => $r->exam?->name ?? '—',
                'subject' => $r->subject?->name ?? '—',
                'marks' => $r->marks_obtained,
                'total' => $r->total_marks,
                'grade' => $r->grade ?? '—',
            ]);
    }

    /** @return list<array{id: string, title: string, time: string, read: bool, icon: string}> */
    public static function headerNotifications(int $schoolId): array
    {
        return self::notifications($schoolId, auth()->user());
    }

    /** @return list<array{id: string, title: string, time: string, read: bool, icon: string, body?: string, link?: string}> */
    private static function notifications(int $schoolId, ?User $user = null): array
    {
        if ($user) {
            NotificationService::seedTemplatesForSchool($schoolId);

            $dbItems = UserNotification::where('user_id', $user->id)
                ->where('school_id', $schoolId)
                ->latest()
                ->limit(10)
                ->get()
                ->map(fn (UserNotification $n) => [
                    'id' => (string) $n->id,
                    'title' => $n->title,
                    'body' => $n->body,
                    'time' => $n->created_at->diffForHumans(),
                    'read' => $n->read_at !== null,
                    'icon' => $n->icon,
                    'link' => $n->link,
                ])
                ->all();

            if (! empty($dbItems)) {
                return $dbItems;
            }
        }

        return self::legacyNotifications($schoolId, $user);
    }

    /** @return list<array{id: string, title: string, time: string, read: bool, icon: string}> */
    private static function legacyNotifications(int $schoolId, ?User $user = null): array
    {
        $items = [];

        if ($user?->hasRole('school-owner')) {
            $pendingCount = User::where('school_id', $schoolId)
                ->where('approval_status', ApprovalStatus::PENDING)
                ->where('account_status', AccountStatus::PENDING)
                ->count();

            if ($pendingCount > 0) {
                $items[] = [
                    'id' => 'approvals-pending',
                    'title' => "{$pendingCount} user(s) awaiting approval",
                    'time' => 'Action required',
                    'read' => false,
                    'icon' => 'bell',
                ];
            }
        }

        if ($user?->hasRole('student')) {
            $student = self::resolveStudent($user);
            if ($student) {
                $overdue = FeePayment::where('student_id', $student->id)->where('status', 'overdue')->count();
                if ($overdue > 0) {
                    $items[] = [
                        'id' => 'fees-overdue',
                        'title' => "{$overdue} overdue fee payment(s)",
                        'time' => 'Fee alert',
                        'read' => false,
                        'icon' => 'banknote',
                    ];
                }

                $nextEvent = Event::where('school_id', $schoolId)->where('event_date', '>=', today())->orderBy('event_date')->first();
                if ($nextEvent) {
                    $items[] = [
                        'id' => 'event-'.$nextEvent->id,
                        'title' => $nextEvent->title,
                        'time' => $nextEvent->event_date->format('M d'),
                        'read' => true,
                        'icon' => 'calendar',
                    ];
                }
            }

            return array_slice($items, 0, 5);
        }

        $overdueFees = FeePayment::where('school_id', $schoolId)->where('status', 'overdue')->count();
        if ($overdueFees > 0) {
            $items[] = [
                'id' => 'fees-overdue',
                'title' => "{$overdueFees} overdue fee payment(s) need attention",
                'time' => 'Fee alert',
                'read' => false,
                'icon' => 'banknote',
            ];
        }

        $pendingProofs = PaymentProof::where('school_id', $schoolId)->where('status', 'pending')->count();
        if ($pendingProofs > 0) {
            $items[] = [
                'id' => 'proofs-pending',
                'title' => "{$pendingProofs} payment proof(s) awaiting review",
                'time' => 'Review required',
                'read' => false,
                'icon' => 'bell',
            ];
        }

        $recentStudents = Student::where('school_id', $schoolId)->latest()->limit(2)->get();
        foreach ($recentStudents as $student) {
            $items[] = [
                'id' => 'student-'.$student->id,
                'title' => __('ui.new_admission', ['name' => $student->name]),
                'time' => $student->created_at->diffForHumans(),
                'read' => false,
                'icon' => 'user-plus',
            ];
        }

        $recentFees = FeePayment::where('school_id', $schoolId)
            ->where('status', 'paid')
            ->latest('paid_at')
            ->limit(2)
            ->get();

        foreach ($recentFees as $fee) {
            $items[] = [
                'id' => 'fee-'.$fee->id,
                'title' => __('ui.fee_received', ['amount' => format_currency($fee->amount)]),
                'time' => $fee->paid_at?->diffForHumans() ?? $fee->created_at->diffForHumans(),
                'read' => true,
                'icon' => 'banknote',
            ];
        }

        $nextEvent = Event::where('school_id', $schoolId)->where('event_date', '>=', today())->orderBy('event_date')->first();
        if ($nextEvent) {
            $items[] = [
                'id' => 'event-'.$nextEvent->id,
                'title' => $nextEvent->title,
                'time' => $nextEvent->event_date->format('M d'),
                'read' => true,
                'icon' => 'calendar',
            ];
        }

        return array_slice($items, 0, 5);
    }

    /** @return list<array{type: string, label: string, url: string}> */
    public static function search(int $schoolId, string $query): array
    {
        if (strlen($query) < 2) {
            return [];
        }

        $results = [];

        Student::where('school_id', $schoolId)
            ->where(function ($q) use ($query) {
                $q->where('name', 'like', "%{$query}%")
                    ->orWhere('roll_no', 'like', "%{$query}%");
            })
            ->with('schoolClass')
            ->limit(5)
            ->get()
            ->each(function (Student $s) use (&$results) {
                $results[] = [
                    'type' => __('ui.students'),
                    'label' => $s->name.' — '.$s->classLabel(),
                    'url' => '/app/students?search='.urlencode($s->name),
                ];
            });

        User::role('teacher')
            ->where('school_id', $schoolId)
            ->where('name', 'like', "%{$query}%")
            ->limit(3)
            ->get()
            ->each(function (User $u) use (&$results) {
                $results[] = [
                    'type' => __('ui.teachers'),
                    'label' => $u->name,
                    'url' => '#',
                ];
            });

        return $results;
    }
}
