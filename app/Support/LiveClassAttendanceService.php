<?php

namespace App\Support;

use App\Models\LiveClass;
use App\Models\LiveClassAttendance;
use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Carbon;

class LiveClassAttendanceService
{
    public const HEARTBEAT_SECONDS = 30;

    public const ONLINE_WINDOW_SECONDS = 90;

    public static function studentForViewer(User $user, LiveClass $liveClass): ?Student
    {
        if ($user->hasRole('student')) {
            $student = LiveClassAccess::studentForUser($user);

            return $student && (int) $student->school_class_id === (int) $liveClass->school_class_id
                ? $student
                : null;
        }

        if ($user->hasRole('parent')) {
            return Student::where('school_id', $user->school_id)
                ->where('parent_id', $user->id)
                ->where('school_class_id', $liveClass->school_class_id)
                ->first();
        }

        return null;
    }

    public static function recordHeartbeat(LiveClass $liveClass, User $user, int $elapsedSeconds = self::HEARTBEAT_SECONDS, ?string $device = 'web'): ?LiveClassAttendance
    {
        $student = self::studentForViewer($user, $liveClass);
        if (! $student) {
            return null;
        }

        $elapsedSeconds = max(15, min($elapsedSeconds, 60));
        $now = now();

        $row = LiveClassAttendance::firstOrNew([
            'live_class_id' => $liveClass->id,
            'student_id' => $student->id,
        ]);

        if (! $row->exists) {
            $row->school_id = $liveClass->school_id;
            $row->user_id = $user->id;
            $row->first_joined_at = $now;
            $row->seconds_attended = 0;
        }

        $last = $row->last_heartbeat_at;
        if ($last instanceof Carbon && $last->diffInSeconds($now) < 15) {
            $row->last_heartbeat_at = $now;
            $row->device = $device;
            $row->save();

            return $row;
        }

        $row->seconds_attended += $elapsedSeconds;
        $row->last_heartbeat_at = $now;
        $row->user_id = $user->id;
        $row->device = $device;
        $row->save();

        return $row;
    }

    /** @return array<string, mixed> */
    public static function monitor(LiveClass $liveClass, ?string $search = null, int $page = 1, int $perPage = 50): array
    {
        $perPage = max(10, min($perPage, 100));
        $page = max(1, $page);

        // Active class roster — names always shown for Open Class attendance.
        $baseQuery = Student::query()
            ->with(['user:id,fee_cleared,account_status'])
            ->where('school_id', $liveClass->school_id)
            ->where('school_class_id', $liveClass->school_class_id)
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', 'active');
            })
            ->when($search, function ($q, $s) {
                $q->where(function ($inner) use ($s) {
                    $inner->where('name', 'like', "%{$s}%")
                        ->orWhere('roll_no', 'like', "%{$s}%");
                });
            });

        $expected = (clone $baseQuery)->count();

        $students = (clone $baseQuery)
            ->orderBy('roll_no')
            ->orderBy('name')
            ->get(['id', 'name', 'roll_no', 'user_id']);

        $attendances = LiveClassAttendance::query()
            ->where('live_class_id', $liveClass->id)
            ->get()
            ->keyBy('student_id');

        $onlineCutoff = now()->subSeconds(self::ONLINE_WINDOW_SECONDS);
        $rows = [];
        $presentNow = 0;
        $attended = 0;
        $presentNames = [];

        foreach ($attendances as $att) {
            $online = $att->last_heartbeat_at && $att->last_heartbeat_at->gte($onlineCutoff);
            $minutes = $att->minutesAttended();
            $hasAttended = $minutes > 0 || $att->first_joined_at;

            if ($online) {
                $presentNow++;
            }
            if ($hasAttended) {
                $attended++;
            }
        }

        foreach ($students as $student) {
            /** @var LiveClassAttendance|null $att */
            $att = $attendances->get($student->id);
            $minutes = $att ? $att->minutesAttended() : 0;
            $online = $att?->last_heartbeat_at && $att->last_heartbeat_at->gte($onlineCutoff);
            $hasAttended = $minutes > 0 || (bool) $att;
            $status = $online ? 'present' : ($hasAttended ? 'left' : 'absent');
            $feeCleared = (bool) ($student->user?->fee_cleared);

            if ($online) {
                $presentNames[] = $student->name;
            }

            $rows[] = [
                'student_id' => $student->id,
                'name' => $student->name,
                'roll_no' => $student->roll_no,
                'minutes_attended' => $minutes,
                'seconds_attended' => (int) ($att->seconds_attended ?? 0),
                'status' => $status,
                'fee_cleared' => $feeCleared,
                'first_joined_at' => $att?->first_joined_at?->format('Y-m-d H:i:s'),
                'last_seen_at' => $att?->last_heartbeat_at?->format('Y-m-d H:i:s'),
                'device' => $att?->device,
            ];
        }

        // Present → left → absent, then roll/name for stable Open Class roster.
        usort($rows, function (array $a, array $b) {
            $rank = ['present' => 0, 'left' => 1, 'absent' => 2];
            $ra = $rank[$a['status']] ?? 9;
            $rb = $rank[$b['status']] ?? 9;
            if ($ra !== $rb) {
                return $ra <=> $rb;
            }

            return strcmp((string) ($a['roll_no'] ?? $a['name']), (string) ($b['roll_no'] ?? $b['name']));
        });

        $totalRows = count($rows);
        $rows = array_slice($rows, ($page - 1) * $perPage, $perPage);

        $youtubeViewers = null;
        if ($liveClass->youtube_broadcast_id && YouTubeLiveService::isConnected($liveClass->school_id)) {
            $youtubeViewers = YouTubeLiveService::concurrentViewers($liveClass);
        }

        $meta = LiveClassService::sessionMeta($liveClass);

        return [
            'live_class_id' => $liveClass->id,
            'title' => $liveClass->title,
            'status' => $liveClass->status,
            'school_class_id' => $liveClass->school_class_id,
            'class_name' => $liveClass->schoolClass?->displayName(),
            'subject_id' => $meta['active_subject_id'],
            'subject_name' => $meta['active_subject_name'],
            'subjects' => $meta['subjects'],
            'active_subject_id' => $meta['active_subject_id'],
            'active_subject_name' => $meta['active_subject_name'],
            'teacher_id' => $liveClass->teacher_id,
            'teacher_name' => $liveClass->teacher?->name,
            'duration_minutes' => $liveClass->duration_minutes,
            'ends_at' => $liveClass->ends_at?->format('Y-m-d H:i'),
            'expected' => $expected,
            'present_now' => $presentNow,
            'attended' => $attended,
            'absent' => max(0, $expected - $attended),
            'youtube_concurrent_viewers' => $youtubeViewers,
            'recording_url' => $liveClass->recording_url,
            'has_recording' => filled($liveClass->recording_url),
            'present_names' => $presentNames,
            'students' => $rows,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $totalRows,
                'last_page' => (int) max(1, ceil($totalRows / $perPage)),
            ],
        ];
    }

    /** Lightweight stats for polling — no student list. */
    public static function statusSnapshot(LiveClass $liveClass): array
    {
        $expected = Student::query()
            ->where('school_id', $liveClass->school_id)
            ->where('school_class_id', $liveClass->school_class_id)
            ->where(function ($q) {
                $q->whereNull('status')->orWhere('status', 'active');
            })
            ->count();

        $onlineCutoff = now()->subSeconds(self::ONLINE_WINDOW_SECONDS);
        $attendances = LiveClassAttendance::query()
            ->with(['student:id,name'])
            ->where('live_class_id', $liveClass->id)
            ->get(['id', 'student_id', 'seconds_attended', 'last_heartbeat_at', 'first_joined_at']);

        $presentNow = 0;
        $attended = 0;
        $presentNames = [];
        foreach ($attendances as $att) {
            $online = $att->last_heartbeat_at && $att->last_heartbeat_at->gte($onlineCutoff);
            $hasAttended = ($att->seconds_attended ?? 0) > 0 || $att->first_joined_at;
            if ($online) {
                $presentNow++;
                if ($att->student?->name) {
                    $presentNames[] = $att->student->name;
                }
            }
            if ($hasAttended) {
                $attended++;
            }
        }

        $meta = LiveClassService::sessionMeta($liveClass);

        return [
            'live_class_id' => $liveClass->id,
            'status' => $liveClass->status,
            'active_subject_id' => $meta['active_subject_id'],
            'active_subject_name' => $meta['active_subject_name'],
            'subjects' => $meta['subjects'],
            'expected' => $expected,
            'present_now' => $presentNow,
            'attended' => $attended,
            'absent' => max(0, $expected - $attended),
            'present_names' => $presentNames,
            'ends_at' => $liveClass->ends_at?->format('Y-m-d H:i'),
            'recording_url' => $liveClass->recording_url,
            'has_recording' => filled($liveClass->recording_url),
        ];
    }
}
