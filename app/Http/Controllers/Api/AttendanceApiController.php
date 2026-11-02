<?php

namespace App\Http\Controllers\Api;

use App\Models\Attendance;
use App\Models\Student;
use App\Support\RegistrationGuard;
use App\Support\RoleDataScope;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AttendanceApiController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $date = $request->date ?? now()->format('Y-m-d');
        $classId = $request->class_id;

        $studentQuery = Student::with(['attendances' => fn ($q) => $q->where('date', $date)])
            ->where('school_id', $this->schoolId())
            ->when($classId, fn ($q) => $q->where('school_class_id', $classId))
            ->where('status', 'active')
            ->orderBy('roll_no');

        RoleDataScope::scopeStudents($studentQuery);

        $students = $studentQuery->get();
        $mapped = $students->map(fn ($s) => [
            'id' => $s->id,
            'name' => $s->name,
            'roll_no' => $s->roll_no,
            'class' => $s->classLabel(),
            'status' => $s->attendances->first()?->status ?? 'unmarked',
        ]);

        $counts = [
            'present' => 0,
            'absent' => 0,
            'late' => 0,
            'leave' => 0,
            'unmarked' => 0,
        ];

        foreach ($mapped as $row) {
            $status = $row['status'];
            if (isset($counts[$status])) {
                $counts[$status]++;
            } else {
                $counts['unmarked']++;
            }
        }

        $total = $mapped->count();
        $marked = $total - $counts['unmarked'];
        $attended = $counts['present'] + $counts['late'];
        $rate = $total > 0 ? round(($attended / $total) * 100, 1) : 0;

        $yesterday = Carbon::parse($date)->subDay()->toDateString();
        $yesterdayRate = $this->dayRateForClass($this->schoolId(), $yesterday, $classId, $students->pluck('id'));

        return $this->success([
            'date' => $date,
            'students' => $mapped->values(),
            'summary' => [
                'total' => $total,
                'marked' => $marked,
                'present' => $counts['present'],
                'absent' => $counts['absent'],
                'late' => $counts['late'],
                'leave' => $counts['leave'],
                'unmarked' => $counts['unmarked'],
                'rate' => $rate,
                'yesterday_rate' => $yesterdayRate,
                'rate_delta' => round($rate - $yesterdayRate, 1),
            ],
        ]);
    }

    public function trend(Request $request): JsonResponse
    {
        $classId = $request->class_id;
        $schoolId = $this->schoolId();
        $days = min(max((int) ($request->days ?? 7), 3), 30);

        $studentQuery = Student::where('school_id', $schoolId)
            ->where('status', 'active')
            ->when($classId, fn ($q) => $q->where('school_class_id', $classId));
        RoleDataScope::scopeStudents($studentQuery);
        $studentIds = $studentQuery->pluck('id');
        $totalStudents = $studentIds->count();

        $start = now()->subDays($days - 1)->startOfDay();
        $records = Attendance::query()
            ->where('school_id', $schoolId)
            ->where('date', '>=', $start)
            ->when($classId, fn ($q) => $q->whereIn('student_id', $studentIds))
            ->get(['date', 'status']);

        $byDate = $records->groupBy(fn ($r) => $r->date->toDateString());

        $points = collect(range($days - 1, 0))->map(function ($daysAgo) use ($byDate, $totalStudents) {
            $date = now()->subDays($daysAgo);
            $key = $date->toDateString();
            $dayRecords = $byDate->get($key);

            if (! $dayRecords || $dayRecords->isEmpty()) {
                return [
                    'date' => $key,
                    'label' => $date->format('D'),
                    'rate' => 0.0,
                    'present' => 0,
                    'absent' => 0,
                    'late' => 0,
                    'leave' => 0,
                    'marked' => 0,
                    'has_data' => false,
                ];
            }

            $present = $dayRecords->whereIn('status', ['present', 'late'])->count();
            $rate = $totalStudents > 0
                ? round($present / $totalStudents * 100, 1)
                : round($present / $dayRecords->count() * 100, 1);

            return [
                'date' => $key,
                'label' => $date->format('D'),
                'rate' => $rate,
                'present' => $dayRecords->where('status', 'present')->count(),
                'absent' => $dayRecords->where('status', 'absent')->count(),
                'late' => $dayRecords->where('status', 'late')->count(),
                'leave' => $dayRecords->where('status', 'leave')->count(),
                'marked' => $dayRecords->count(),
                'has_data' => true,
            ];
        })->values();

        $avgRate = round($points->where('has_data', true)->avg('rate') ?? 0, 1);

        return $this->success([
            'days' => $days,
            'average_rate' => $avgRate,
            'points' => $points,
        ]);
    }

    public function atRisk(Request $request): JsonResponse
    {
        $classId = $request->class_id;
        $month = $request->month ?? now()->format('Y-m');
        $schoolId = $this->schoolId();
        $threshold = (int) school_setting('attendance_threshold', 75, $schoolId);

        $start = Carbon::parse($month.'-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $today = now()->toDateString();
        $effectiveEnd = min($end->toDateString(), $today);

        $studentQuery = Student::with('schoolClass')
            ->where('school_id', $schoolId)
            ->where('status', 'active')
            ->when($classId, fn ($q) => $q->where('school_class_id', $classId))
            ->orderBy('roll_no');
        RoleDataScope::scopeStudents($studentQuery);
        $students = $studentQuery->get();

        if ($students->isEmpty()) {
            return $this->success([
                'threshold' => $threshold,
                'month' => $month,
                'students' => [],
            ]);
        }

        $studentIds = $students->pluck('id');
        $records = Attendance::query()
            ->where('school_id', $schoolId)
            ->whereIn('student_id', $studentIds)
            ->whereBetween('date', [$start->toDateString(), $effectiveEnd])
            ->get(['student_id', 'status']);

        $byStudent = $records->groupBy('student_id');
        $schoolDays = $start->diffInWeekdays(Carbon::parse($effectiveEnd)) + 1;

        $atRisk = $students->map(function ($student) use ($byStudent, $schoolDays) {
            $studentRecords = $byStudent->get($student->id, collect());
            $marked = $studentRecords->count();
            $attended = $studentRecords->whereIn('status', ['present', 'late'])->count();
            $absent = $studentRecords->where('status', 'absent')->count();
            $late = $studentRecords->where('status', 'late')->count();
            $leave = $studentRecords->where('status', 'leave')->count();
            $denominator = max($marked, 1);
            $rate = round($attended / $denominator * 100, 1);

            return [
                'id' => $student->id,
                'name' => $student->name,
                'roll_no' => $student->roll_no,
                'class' => $student->classLabel(),
                'rate' => $rate,
                'marked_days' => $marked,
                'absent_days' => $absent,
                'late_days' => $late,
                'leave_days' => $leave,
                'school_days' => $schoolDays,
            ];
        })
            ->filter(fn ($s) => $s['marked_days'] > 0 && $s['rate'] < $threshold)
            ->sortBy('rate')
            ->values();

        return $this->success([
            'threshold' => $threshold,
            'month' => $month,
            'students' => $atRisk,
        ]);
    }

    private function dayRateForClass(int $schoolId, string $date, ?string $classId, $studentIds): float
    {
        if ($studentIds->isEmpty()) {
            return 0.0;
        }

        $records = Attendance::query()
            ->where('school_id', $schoolId)
            ->where('date', $date)
            ->whereIn('student_id', $studentIds)
            ->get(['status']);

        if ($records->isEmpty()) {
            return 0.0;
        }

        $attended = $records->whereIn('status', ['present', 'late'])->count();

        return round($attended / $studentIds->count() * 100, 1);
    }

    public function summary(Request $request): JsonResponse
    {
        $classId = $request->class_id;
        $month = $request->month ?? now()->format('Y-m');

        $start = Carbon::parse($month . '-01')->startOfMonth();
        $end = $start->copy()->endOfMonth();

        $studentQuery = Student::where('school_id', $this->schoolId())
            ->where('status', 'active')
            ->when($classId, fn ($q) => $q->where('school_class_id', $classId));

        RoleDataScope::scopeStudents($studentQuery);
        $studentIds = $studentQuery->pluck('id');
        $totalStudents = $studentIds->count();

        $daily = Attendance::query()
            ->where('school_id', $this->schoolId())
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->when($classId, fn ($q) => $q->whereIn('student_id', $studentIds))
            ->select('date', 'status', DB::raw('count(*) as count'))
            ->groupBy('date', 'status')
            ->get();

        $byDate = [];
        foreach ($daily as $row) {
            $d = $row->date->format('Y-m-d');
            $byDate[$d][$row->status] = (int) $row->count;
        }

        $days = [];
        $cursor = $start->copy();
        while ($cursor <= $end) {
            $key = $cursor->format('Y-m-d');
            $statuses = $byDate[$key] ?? [];
            $present = ($statuses['present'] ?? 0) + ($statuses['late'] ?? 0);
            $absent = ($statuses['absent'] ?? 0);
            $leave = ($statuses['leave'] ?? 0);
            $marked = array_sum($statuses);
            $rate = $totalStudents > 0 ? round(($present / $totalStudents) * 100, 1) : 0;

            $days[] = [
                'date' => $key,
                'day' => $cursor->day,
                'weekday' => $cursor->format('D'),
                'is_weekend' => $cursor->isWeekend(),
                'present' => $present,
                'absent' => $absent,
                'leave' => $leave,
                'marked' => $marked,
                'total' => $totalStudents,
                'rate' => $rate,
                'has_data' => $marked > 0,
            ];
            $cursor->addDay();
        }

        return $this->success([
            'month' => $month,
            'total_students' => $totalStudents,
            'days' => $days,
        ]);
    }

    public function mark(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! RegistrationGuard::isSuperAdmin($user) && ! $user->can('attendance.mark')) {
            abort(403, 'You do not have permission to mark attendance.');
        }

        $data = $request->validate([
            'date' => 'required|date',
            'records' => 'required|array|min:1',
            'records.*.student_id' => 'required|exists:students,id',
            'records.*.status' => 'required|in:present,absent,late,leave',
        ]);

        $schoolId = $this->schoolId();
        $studentIds = collect($data['records'])->pluck('student_id')->unique();

        $validQuery = Student::where('school_id', $schoolId)
            ->whereIn('id', $studentIds)
            ->where('status', 'active');
        RoleDataScope::scopeStudents($validQuery);
        $validIds = $validQuery->pluck('id')->all();

        foreach ($data['records'] as $record) {
            if (! in_array($record['student_id'], $validIds, true)) {
                continue;
            }

            Attendance::updateOrCreate(
                ['student_id' => $record['student_id'], 'date' => $data['date']],
                ['school_id' => $schoolId, 'status' => $record['status']]
            );
        }

        return $this->success(null, 'Attendance saved successfully');
    }
}
