<?php

namespace App\Support;

use App\Models\LiveClass;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LiveClassService
{
    public static function isMultipleLiveClassModeEnabled(int $schoolId): bool
    {
        return filter_var(
            school_setting('multiple_live_class_mode', false, $schoolId),
            FILTER_VALIDATE_BOOLEAN
        );
    }

    /** @return list<int> */
    public static function normalizeSubjectIds(array $data): array
    {
        $ids = $data['subject_ids'] ?? [];
        if (is_string($ids)) {
            $ids = array_filter(array_map('intval', explode(',', $ids)));
        }
        $ids = array_values(array_unique(array_map('intval', array_filter($ids))));

        if ($ids === [] && ! empty($data['subject_id'])) {
            $ids = [(int) $data['subject_id']];
        }

        return $ids;
    }

    public static function validateTeacherSubjects(User $user, int $schoolClassId, array $subjectIds): void
    {
        if ($subjectIds === [] || RegistrationGuard::isSuperAdmin($user) || $user->hasRole('admin')) {
            return;
        }

        $teacher = RoleDataScope::teacher();
        if (! $teacher) {
            return;
        }

        $allowed = DB::table('teacher_subject')
            ->where('teacher_id', $teacher->id)
            ->where('school_class_id', $schoolClassId)
            ->whereIn('subject_id', $subjectIds)
            ->pluck('subject_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $fromTimetable = DB::table('timetable_slots')
            ->where('teacher_id', $teacher->id)
            ->where('school_class_id', $schoolClassId)
            ->whereIn('subject_id', $subjectIds)
            ->pluck('subject_id')
            ->map(fn ($id) => (int) $id)
            ->all();

        $permitted = array_unique(array_merge($allowed, $fromTimetable));
        $invalid = array_diff($subjectIds, $permitted);

        if ($invalid !== []) {
            throw ValidationException::withMessages([
                'subject_ids' => ['You are not assigned to one or more selected subjects for this class.'],
            ]);
        }
    }

    /** @param array<string, mixed> $data @return list<LiveClass> */
    public static function createSessions(array $data, array $subjectIds, int $schoolId): array
    {
        if ($subjectIds === []) {
            throw ValidationException::withMessages(['subject_ids' => ['Select at least one subject.']]);
        }

        $multipleMode = self::isMultipleLiveClassModeEnabled($schoolId);
        self::applyScheduleTimes($data);

        if ($multipleMode || count($subjectIds) === 1) {
            $created = [];
            foreach ($subjectIds as $subjectId) {
                $row = $data;
                $row['subject_id'] = $subjectId;
                $row['subject_ids'] = [$subjectId];
                $row['active_subject_id'] = $subjectId;
                $created[] = LiveClass::create($row);
            }

            return $created;
        }

        $first = $subjectIds[0];
        $data['subject_id'] = $first;
        $data['subject_ids'] = $subjectIds;
        $data['active_subject_id'] = $first;

        return [LiveClass::create($data)];
    }

    /** @param array<string, mixed> $data */
    public static function applyScheduleTimes(array &$data): void
    {
        if (! empty($data['scheduled_at']) && ! empty($data['ends_at'])) {
            $start = Carbon::parse($data['scheduled_at']);
            $end = Carbon::parse($data['ends_at']);
            if ($end->lte($start)) {
                throw ValidationException::withMessages([
                    'ends_at' => ['End time must be after start time.'],
                ]);
            }
            $data['duration_minutes'] = max(1, (int) $start->diffInMinutes($end));
        } elseif (! empty($data['scheduled_at']) && ! empty($data['duration_minutes'])) {
            $data['ends_at'] = Carbon::parse($data['scheduled_at'])
                ->addMinutes((int) $data['duration_minutes']);
        }
    }

    public static function setActiveSubject(LiveClass $liveClass, int $subjectId): LiveClass
    {
        $ids = $liveClass->resolvedSubjectIds();
        if (! in_array($subjectId, $ids, true)) {
            throw ValidationException::withMessages([
                'subject_id' => ['Subject is not part of this live session.'],
            ]);
        }

        $liveClass->update([
            'active_subject_id' => $subjectId,
            'subject_id' => $subjectId,
        ]);

        return $liveClass->fresh(['teacher', 'subject', 'schoolClass']);
    }

    public static function endSession(LiveClass $liveClass): LiveClass
    {
        $payload = ['status' => 'completed'];
        if (blank($liveClass->recording_url)) {
            $videoId = YouTubeLiveService::videoId($liveClass);
            if ($videoId) {
                $payload['recording_url'] = YouTubeLiveService::watchUrl($videoId);
            }
        }
        $liveClass->update($payload);

        if ($liveClass->youtube_broadcast_id && YouTubeLiveService::isConnected($liveClass->school_id)) {
            YouTubeLiveService::syncBroadcastStatus($liveClass);
            $liveClass->refresh();
            YouTubeLiveService::ensureRecordingUrl($liveClass);
        }

        return $liveClass->fresh(['teacher', 'subject', 'schoolClass']);
    }

    /**
     * Create YouTube Unlisted broadcast + RTMP credentials when missing.
     *
     * @return array{ok: bool, message: string, live_class: LiveClass}
     */
    public static function ensureYouTubeStream(LiveClass $liveClass): array
    {
        $liveClass->refresh();

        if ($liveClass->platform !== 'youtube') {
            return ['ok' => false, 'message' => 'Platform is not YouTube.', 'live_class' => $liveClass];
        }

        if (filled($liveClass->youtube_broadcast_id) && filled($liveClass->youtube_url)) {
            return ['ok' => true, 'message' => 'YouTube stream already ready.', 'live_class' => $liveClass];
        }

        $schoolId = (int) $liveClass->school_id;

        if (! YouTubeLiveService::isConnected($schoolId)) {
            return [
                'ok' => false,
                'message' => 'Connect YouTube in System Settings first.',
                'live_class' => $liveClass,
            ];
        }

        try {
            $result = YouTubeLiveService::createScheduledBroadcast($liveClass);
            $liveClass->update([
                'youtube_url' => $result['youtube_url'],
                'youtube_broadcast_id' => $result['broadcast_id'],
                'youtube_stream_id' => $result['stream_id'],
                'youtube_rtmp_url' => $result['rtmp_url'] ?? null,
                'youtube_stream_key' => isset($result['stream_key'])
                    ? \Illuminate\Support\Facades\Crypt::encryptString($result['stream_key'])
                    : null,
                'meeting_url' => $result['youtube_url'],
                'auto_created' => true,
            ]);

            $liveClass = $liveClass->fresh(['teacher', 'subject', 'schoolClass']) ?? $liveClass;

            return [
                'ok' => true,
                'message' => 'YouTube Unlisted stream created. Go Live / OBS key ready.',
                'live_class' => $liveClass,
            ];
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('YouTube ensure stream failed', [
                'live_class_id' => $liveClass->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'ok' => false,
                'message' => 'YouTube stream create failed: '.$e->getMessage(),
                'live_class' => $liveClass,
            ];
        }
    }

    /** @return Collection<int, Subject> */
    public static function subjectsFor(LiveClass $liveClass): Collection
    {
        $ids = $liveClass->resolvedSubjectIds();
        if ($ids === []) {
            return collect();
        }

        return Subject::whereIn('id', $ids)->orderBy('name')->get(['id', 'name']);
    }

    /** @return array<string, mixed> */
    public static function sessionMeta(LiveClass $liveClass): array
    {
        $subjects = self::subjectsFor($liveClass);
        $activeId = $liveClass->active_subject_id ?? $liveClass->subject_id;

        return [
            'subject_ids' => $liveClass->resolvedSubjectIds(),
            'subjects' => $subjects->map(fn (Subject $s) => ['id' => $s->id, 'name' => $s->name])->values()->all(),
            'active_subject_id' => $activeId,
            'active_subject_name' => $subjects->firstWhere('id', $activeId)?->name ?? $liveClass->subject?->name,
            'ends_at' => $liveClass->ends_at?->format('Y-m-d H:i'),
            'multiple_live_class_mode' => self::isMultipleLiveClassModeEnabled((int) $liveClass->school_id),
        ];
    }
}
