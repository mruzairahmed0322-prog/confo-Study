<?php

namespace App\Http\Controllers\Api;

use App\Models\Assignment;
use App\Models\Quiz;
use App\Models\LiveClass;
use App\Models\Subject;
use App\Models\Exam;
use App\Models\ExamResult;
use App\Support\DashboardData;
use App\Support\DashboardWidgets;
use App\Support\JitsiLiveService;
use App\Support\LiveClassAccess;
use App\Support\LiveClassAttendanceService;
use App\Support\LiveClassService;
use App\Support\NotificationService;
use App\Support\RoleDataScope;
use App\Support\YouTubeLiveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModuleApiController extends BaseApiController
{
    public function dashboard(): JsonResponse
    {
        $user = auth()->user();

        return $this->success(array_merge(
            DashboardData::forUser($user),
            ['sections' => DashboardWidgets::sectionsFor($user)],
        ));
    }

    public function assignments(Request $request): JsonResponse
    {
        $query = Assignment::with(['teacher', 'subject', 'schoolClass'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->subject_id, fn ($q, $s) => $q->where('subject_id', $s))
            ->when($request->from, fn ($q, $d) => $q->whereDate('due_date', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('due_date', '<=', $d))
            ->latest();
        return $this->success($this->paginated($query));
    }

    public function quizzes(Request $request): JsonResponse
    {
        $query = Quiz::with(['teacher', 'subject'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->subject_id, fn ($q, $s) => $q->where('subject_id', $s))
            ->latest();
        return $this->success($this->paginated($query));
    }

    public function subjects(Request $request): JsonResponse
    {
        $query = Subject::with('schoolClass')
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest();

        RoleDataScope::scopeByClassColumn($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Subject $s) => [
            'id' => $s->id,
            'name' => $s->name,
            'code' => $s->code,
            'type' => $s->type,
            'total_marks' => $s->total_marks,
            'status' => $s->status,
            'school_class_id' => $s->school_class_id,
        ]);

        return $this->success($paginated);
    }

    public function liveClasses(Request $request): JsonResponse
    {
        $query = LiveClass::with(['teacher', 'subject', 'schoolClass'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->subject_id, fn ($q, $s) => $q->where('subject_id', $s))
            ->when($request->from, fn ($q, $d) => $q->whereDate('scheduled_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('scheduled_at', '<=', $d))
            ->orderBy('scheduled_at');

        RoleDataScope::scopeLiveClasses($query);

        $user = auth()->user();
        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(
            fn (LiveClass $lc) => LiveClassAccess::formatForUser($lc, $user)
        );

        return $this->success($paginated);
    }

    public function liveClassJoin(Request $request, LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);

        $user = auth()->user();
        if (! LiveClassAccess::canViewLinks($user, $liveClass)) {
            return $this->error(__('ui.live_class_fee_required'), 403);
        }

        $liveClass->loadMissing(['teacher', 'subject', 'schoolClass']);

        $mode = $request->query('mode');
        if (! in_array($mode, ['live', 'recording'], true)) {
            $mode = ($liveClass->status === 'completed' || filled($liveClass->recording_url))
                ? 'recording'
                : 'live';
        }

        if (JitsiLiveService::isJitsiPlatform($liveClass)) {
            $config = LiveClassAccess::jitsiConfig($liveClass, $user);
            if (! $config) {
                return $this->error('You cannot join this class.', 403);
            }

            return $this->success(array_merge($config, [
                'platform' => 'jitsi',
                'mode' => 'live',
                'heartbeat_interval_seconds' => 30,
                'can_monitor' => LiveClassAccess::canManage($user, $liveClass),
            ]));
        }

        $videoId = YouTubeLiveService::videoId($liveClass);
        if (! $videoId) {
            return $this->error('Stream is not ready yet.', 404);
        }

        YouTubeLiveService::syncBroadcastStatus($liveClass);
        $liveClass->refresh();

        return $this->success(array_merge([
            'platform' => 'youtube',
            'mode' => in_array($mode, ['live', 'recording'], true) ? $mode : 'live',
            'video_id' => $videoId,
            'title' => $liveClass->title,
            'description' => $liveClass->description,
            'status' => $liveClass->status,
            'duration_minutes' => $liveClass->duration_minutes,
            'ends_at' => $liveClass->ends_at?->format('Y-m-d H:i'),
            'school_class_id' => $liveClass->school_class_id,
            'class_name' => $liveClass->schoolClass?->displayName(),
            'teacher_name' => $liveClass->teacher?->name,
            'heartbeat_interval_seconds' => 30,
            'can_monitor' => LiveClassAccess::canManage($user, $liveClass),
            'youtube_studio_url' => LiveClassAccess::canManage($user, $liveClass) && $liveClass->youtube_broadcast_id
                ? YouTubeLiveService::studioLiveUrl($liveClass->youtube_broadcast_id)
                : null,
            'interactive_classroom_ready' => false,
            'youtube_student_controls' => [
                'mic' => false,
                'camera' => false,
                'raise_hand' => false,
            ],
        ], LiveClassService::sessionMeta($liveClass)));
    }

    public function liveClassHeartbeat(Request $request, LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);

        $user = auth()->user();
        if (! LiveClassAccess::canViewLinks($user, $liveClass)) {
            return $this->error(__('ui.live_class_fee_required'), 403);
        }

        $data = $request->validate([
            'seconds' => 'nullable|integer|min:15|max:60',
            'device' => 'nullable|in:web,app',
        ]);

        $row = LiveClassAttendanceService::recordHeartbeat(
            $liveClass,
            $user,
            (int) ($data['seconds'] ?? 30),
            $data['device'] ?? 'web',
        );

        return $this->success([
            'tracked' => (bool) $row,
            'minutes_attended' => $row?->minutesAttended() ?? 0,
        ]);
    }

    public function liveClassMonitor(Request $request, LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);
        abort_unless(LiveClassAccess::canManage(auth()->user(), $liveClass), 403);

        $liveClass->load(['teacher', 'subject', 'schoolClass']);

        return $this->success(LiveClassAttendanceService::monitor(
            $liveClass,
            $request->query('search'),
            (int) $request->query('page', 1),
            (int) $request->query('per_page', 50),
        ));
    }

    public function liveClassStatus(LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);

        $user = auth()->user();
        if (! LiveClassAccess::canViewLinks($user, $liveClass)) {
            return $this->error(__('ui.live_class_fee_required'), 403);
        }

        if ($liveClass->platform === 'youtube') {
            YouTubeLiveService::syncBroadcastStatus($liveClass);
            $liveClass->refresh();
        }

        $payload = LiveClassAttendanceService::statusSnapshot($liveClass);
        $payload['can_manage'] = LiveClassAccess::canManage($user, $liveClass);

        return $this->success($payload);
    }

    public function liveClassSetActiveSubject(Request $request, LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);
        abort_unless(LiveClassAccess::canManage(auth()->user(), $liveClass), 403);

        $data = $request->validate(['subject_id' => 'required|integer|exists:subjects,id']);
        $liveClass = LiveClassService::setActiveSubject($liveClass, (int) $data['subject_id']);

        return $this->success(
            LiveClassAccess::formatForUser($liveClass, auth()->user()),
            'Active subject updated'
        );
    }

    public function liveClassEnd(LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);
        abort_unless(LiveClassAccess::canManage(auth()->user(), $liveClass), 403);

        $liveClass = LiveClassService::endSession($liveClass);

        return $this->success(
            LiveClassAccess::formatForUser($liveClass, auth()->user()),
            'Live class ended'
        );
    }

    public function liveClassObs(LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);
        abort_unless(LiveClassAccess::canManage(auth()->user(), $liveClass), 403);

        $obs = YouTubeLiveService::obsCredentials($liveClass);

        return $this->success([
            'rtmp_url' => $obs['rtmp_url'],
            'stream_key' => $obs['stream_key'],
            'studio_url' => YouTubeLiveService::studioLiveUrl($liveClass->youtube_broadcast_id),
            'title' => $liveClass->title,
        ]);
    }

    public function recordings(Request $request): JsonResponse
    {
        $query = LiveClass::with(['teacher', 'subject', 'schoolClass'])
            ->where('school_id', $this->schoolId())
            ->where(function ($q) {
                $q->where(function ($q2) {
                    $q2->whereNotNull('recording_url')->where('recording_url', '!=', '');
                })->orWhere(function ($q2) {
                    // Completed YouTube lives may still be missing recording_url (pre-fix).
                    $q2->where('status', 'completed')
                        ->where(function ($q3) {
                            $q3->whereNotNull('youtube_broadcast_id')
                                ->orWhere(function ($q4) {
                                    $q4->whereNotNull('youtube_url')->where('youtube_url', '!=', '');
                                });
                        });
                });
            })
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->subject_id, fn ($q, $s) => $q->where('subject_id', $s))
            ->when($request->from, fn ($q, $d) => $q->whereDate('scheduled_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('scheduled_at', '<=', $d))
            ->orderByDesc('scheduled_at');

        RoleDataScope::scopeLiveClasses($query);

        $user = auth()->user();
        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(function (LiveClass $lc) use ($user) {
            if (blank($lc->recording_url)) {
                YouTubeLiveService::ensureRecordingUrl($lc);
                $lc->refresh();
            }

            $formatted = LiveClassAccess::formatForUser($lc, $user);

            if ($formatted['access_denied']) {
                $formatted['recording_url'] = null;
                $formatted['has_recording'] = false;
                $formatted['can_watch'] = false;
                $formatted['watch_url'] = null;
            }

            return $formatted;
        });

        return $this->success($paginated);
    }

    public function exams(Request $request): JsonResponse
    {
        $query = Exam::with('schoolClass')
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->from, fn ($q, $d) => $q->whereDate('start_date', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('start_date', '<=', $d))
            ->latest();

        RoleDataScope::scopeExams($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Exam $e) => [
            'id' => $e->id,
            'name' => $e->name,
            'type' => $e->type,
            'start_date' => $e->start_date?->format('Y-m-d'),
            'end_date' => $e->end_date?->format('Y-m-d'),
            'status' => $e->status,
            'school_class_id' => $e->school_class_id,
        ]);

        return $this->success($paginated);
    }

    public function results(Request $request): JsonResponse
    {
        $query = ExamResult::with(['student', 'exam', 'subject'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->whereHas('student', fn ($q) => $q->where('name', 'like', "%{$s}%")))
            ->when($request->name, fn ($q, $s) => $q->whereHas('student', fn ($q) => $q->where('name', 'like', "%{$s}%")))
            ->when($request->exam_id, fn ($q, $e) => $q->where('exam_id', $e))
            ->when($request->subject_id, fn ($q, $s) => $q->where('subject_id', $s))
            ->when($request->student_id, fn ($q, $s) => $q->where('student_id', $s))
            ->when($request->class_id, fn ($q, $c) => $q->whereHas('student', fn ($q) => $q->where('school_class_id', $c)))
            ->latest();

        RoleDataScope::scopeExamResults($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (ExamResult $r) => [
            'id' => $r->id,
            'exam_id' => $r->exam_id,
            'student_id' => $r->student_id,
            'subject_id' => $r->subject_id,
            'marks_obtained' => $r->marks_obtained,
            'total_marks' => $r->total_marks,
            'grade' => $r->grade,
            'remarks' => $r->remarks,
            'student' => $r->student?->name ?? '—',
            'exam' => $r->exam?->name ?? '—',
            'subject' => $r->subject?->name ?? '—',
        ]);

        return $this->success($paginated);
    }

    public function storeSubject(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:20',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'type' => 'nullable|string|max:50',
            'total_marks' => 'nullable|integer|min:1|max:1000',
            'status' => 'in:active,inactive',
        ]);
        $data['school_id'] = $this->schoolId();
        $data['status'] = $data['status'] ?? 'active';
        $subject = Subject::create($data);

        return $this->success($subject, 'Subject created', 201);
    }

    public function updateSubject(Request $request, Subject $subject): JsonResponse
    {
        abort_unless($subject->school_id === $this->schoolId(), 403);
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'code' => 'nullable|string|max:20',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'type' => 'nullable|string|max:50',
            'total_marks' => 'nullable|integer|min:1|max:1000',
            'status' => 'in:active,inactive',
        ]);
        $subject->update($data);

        return $this->success($subject, 'Subject updated');
    }

    public function destroySubject(Subject $subject): JsonResponse
    {
        abort_unless($subject->school_id === $this->schoolId(), 403);
        $subject->delete();

        return $this->success(null, 'Subject deleted');
    }

    public function storeLiveClass(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'scheduled_at' => 'required|date',
            'ends_at' => 'nullable|date|after:scheduled_at',
            'duration_minutes' => 'nullable|integer|min:1|max:480',
            'meeting_url' => 'nullable|url|max:500',
            'youtube_url' => 'nullable|url|max:500',
            'recording_url' => 'nullable|url|max:500',
            'platform' => 'nullable|string|max:50',
            'status' => 'in:scheduled,live,completed,cancelled',
            'teacher_id' => 'nullable|exists:teachers,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'integer|exists:subjects,id',
            'school_class_id' => 'nullable|exists:school_classes,id',
        ]);
        $data['school_id'] = $this->schoolId();
        $data['status'] = $data['status'] ?? 'scheduled';
        $data['platform'] = $data['platform'] ?? 'youtube';
        if (empty($data['teacher_id'])) {
            $teacher = RoleDataScope::teacher();
            if ($teacher) {
                $data['teacher_id'] = $teacher->id;
            }
        }

        $subjectIds = LiveClassService::normalizeSubjectIds($data);
        if ($data['school_class_id'] ?? null) {
            LiveClassService::validateTeacherSubjects(
                auth()->user(),
                (int) $data['school_class_id'],
                $subjectIds
            );
        }

        LiveClassService::applyScheduleTimes($data);

        $sessions = LiveClassService::createSessions($data, $subjectIds, $this->schoolId());
        $autoMessage = null;

        foreach ($sessions as $liveClass) {
            if (YouTubeLiveService::isAutoStreamEnabled($this->schoolId())) {
                $result = LiveClassService::ensureYouTubeStream($liveClass);
                if ($autoMessage === null) {
                    $autoMessage = $result['message'];
                }
                $liveClass = $result['live_class'];
            }
            $liveClass->load(['teacher', 'subject', 'schoolClass']);
            NotificationService::dispatchForLiveClass(
                $liveClass,
                'live_class_scheduled',
                NotificationService::liveClassNotificationVars($liveClass),
                '/app/live-classes'
            );
        }

        $primary = $sessions[0];
        $response = LiveClassAccess::formatForUser($primary, auth()->user());
        if (count($sessions) > 1) {
            $response['created_count'] = count($sessions);
            $response['created_ids'] = array_map(fn (LiveClass $lc) => $lc->id, $sessions);
        }

        return $this->success(
            $response,
            $autoMessage ?? (count($sessions) > 1 ? count($sessions).' live sessions scheduled' : 'Live class scheduled'),
            201
        );
    }

    private function autoCreateJitsiRoom(LiveClass $liveClass): ?string
    {
        if ($liveClass->platform !== 'jitsi' || filled($liveClass->meeting_url)) {
            return null;
        }

        $liveClass->update([
            'meeting_url' => JitsiLiveService::createRoom($liveClass),
            'auto_created' => true,
        ]);

        return 'Live class scheduled — browser room ready (no OBS needed)';
    }

    public function provisionYouTubeStream(LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);
        abort_unless(LiveClassAccess::canManage(auth()->user(), $liveClass), 403);

        $result = LiveClassService::ensureYouTubeStream($liveClass);

        return $result['ok']
            ? $this->success(LiveClassAccess::formatForUser($result['live_class'], auth()->user()), $result['message'])
            : $this->error($result['message'], 422);
    }

    public function archivedLiveClasses(Request $request): JsonResponse
    {
        $query = LiveClass::onlyTrashed()
            ->with(['teacher', 'subject', 'schoolClass'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->orderByDesc('deleted_at');

        RoleDataScope::scopeLiveClasses($query);

        $user = auth()->user();
        $paginated = $query->paginate(min((int) $request->get('per_page', 15), 50));
        $paginated->getCollection()->transform(
            fn (LiveClass $lc) => LiveClassAccess::formatForUser($lc, $user)
        );

        return $this->success($paginated);
    }

    public function destroyLiveClass(LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);
        abort_unless(LiveClassAccess::canManage(auth()->user(), $liveClass), 403);

        $liveClass->delete();

        return $this->success(null, 'Live class moved to archive');
    }

    public function restoreLiveClass(int $id): JsonResponse
    {
        $liveClass = LiveClass::onlyTrashed()
            ->where('school_id', $this->schoolId())
            ->findOrFail($id);

        abort_unless(LiveClassAccess::canManage(auth()->user(), $liveClass), 403);

        $liveClass->restore();
        $liveClass->load(['teacher', 'subject', 'schoolClass']);

        return $this->success(
            LiveClassAccess::formatForUser($liveClass, auth()->user()),
            'Live class restored'
        );
    }

    public function forceDestroyLiveClass(int $id): JsonResponse
    {
        $liveClass = LiveClass::onlyTrashed()
            ->where('school_id', $this->schoolId())
            ->findOrFail($id);

        abort_unless(LiveClassAccess::canManage(auth()->user(), $liveClass), 403);

        $liveClass->forceDelete();

        return $this->success(null, 'Live class permanently deleted');
    }

    public function updateLiveClass(Request $request, LiveClass $liveClass): JsonResponse
    {
        abort_unless($liveClass->school_id === $this->schoolId(), 403);
        $hadRecording = filled($liveClass->recording_url);
        $previousScheduledAt = $liveClass->scheduled_at?->toDateTimeString();

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'scheduled_at' => 'sometimes|date',
            'ends_at' => 'nullable|date',
            'duration_minutes' => 'nullable|integer|min:1|max:480',
            'meeting_url' => 'nullable|url|max:500',
            'youtube_url' => 'nullable|url|max:500',
            'recording_url' => 'nullable|url|max:500',
            'platform' => 'nullable|string|max:50',
            'status' => 'in:scheduled,live,completed,cancelled',
            'teacher_id' => 'nullable|exists:teachers,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'integer|exists:subjects,id',
            'school_class_id' => 'nullable|exists:school_classes,id',
        ]);

        if (isset($data['subject_ids']) || isset($data['subject_id'])) {
            $subjectIds = LiveClassService::normalizeSubjectIds($data);
            $classId = (int) ($data['school_class_id'] ?? $liveClass->school_class_id);
            if ($classId && $subjectIds !== []) {
                LiveClassService::validateTeacherSubjects(auth()->user(), $classId, $subjectIds);
            }
            if ($subjectIds !== []) {
                $data['subject_ids'] = $subjectIds;
                $data['subject_id'] = $subjectIds[0];
                $data['active_subject_id'] = $liveClass->active_subject_id && in_array((int) $liveClass->active_subject_id, $subjectIds, true)
                    ? $liveClass->active_subject_id
                    : $subjectIds[0];
            }
        }

        if (empty($data['scheduled_at']) && ! empty($data['ends_at'])) {
            $data['scheduled_at'] = $liveClass->scheduled_at;
        }
        LiveClassService::applyScheduleTimes($data);
        $liveClass->update($data);
        $liveClass->refresh()->load(['teacher', 'subject', 'schoolClass']);

        if ($liveClass->status === 'completed' && blank($liveClass->recording_url)) {
            YouTubeLiveService::ensureRecordingUrl($liveClass);
            $liveClass->refresh()->load(['teacher', 'subject', 'schoolClass']);
        }

        // If YouTube is connected now, backfill stream for classes created before Connect
        if ($liveClass->platform === 'youtube'
            && blank($liveClass->youtube_broadcast_id)
            && YouTubeLiveService::isAutoStreamEnabled($this->schoolId())) {
            LiveClassService::ensureYouTubeStream($liveClass);
            $liveClass->refresh()->load(['teacher', 'subject', 'schoolClass']);
        }

        $vars = NotificationService::liveClassNotificationVars($liveClass);

        if (! $hadRecording && filled($liveClass->recording_url)) {
            NotificationService::dispatchForLiveClass(
                $liveClass,
                'recording_available',
                $vars,
                '/app/recordings'
            );
        } elseif (
            $liveClass->scheduled_at?->toDateTimeString() !== $previousScheduledAt
            && $liveClass->status === 'scheduled'
        ) {
            NotificationService::dispatchForLiveClass(
                $liveClass,
                'live_class_scheduled',
                $vars,
                '/app/live-classes'
            );
        }

        return $this->success(
            LiveClassAccess::formatForUser($liveClass, auth()->user()),
            'Live class updated'
        );
    }

    public function storeExam(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|max:50',
            'start_date' => 'required|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'status' => 'in:upcoming,ongoing,completed,cancelled',
        ]);
        $data['school_id'] = $this->schoolId();
        $data['status'] = $data['status'] ?? 'upcoming';
        $exam = Exam::create($data);
        $exam->load('schoolClass');

        $className = $exam->schoolClass?->displayName() ?? 'All Classes';
        NotificationService::dispatch($this->schoolId(), 'upcoming_exam', [
            'exam_name' => $exam->name,
            'exam_date' => $exam->start_date?->format('M d, Y') ?? '—',
            'class_name' => $className,
        ], '/app/exams');

        return $this->success($exam, 'Exam created', 201);
    }

    public function updateExam(Request $request, Exam $exam): JsonResponse
    {
        abort_unless($exam->school_id === $this->schoolId(), 403);
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'nullable|string|max:50',
            'start_date' => 'sometimes|date',
            'end_date' => 'nullable|date',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'status' => 'in:upcoming,ongoing,completed,cancelled',
        ]);
        $exam->update($data);

        return $this->success($exam, 'Exam updated');
    }

    public function destroyExam(Exam $exam): JsonResponse
    {
        abort_unless($exam->school_id === $this->schoolId(), 403);
        $exam->delete();

        return $this->success(null, 'Exam deleted');
    }

    public function storeResult(Request $request): JsonResponse
    {
        $data = $request->validate([
            'exam_id' => 'required|exists:exams,id',
            'student_id' => 'required|exists:students,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'marks_obtained' => 'required|numeric|min:0',
            'total_marks' => 'nullable|integer|min:1',
            'grade' => 'nullable|string|max:10',
            'remarks' => 'nullable|string',
        ]);
        $data['school_id'] = $this->schoolId();
        $result = ExamResult::create($data);

        return $this->success($result, 'Result recorded', 201);
    }

    public function updateResult(Request $request, ExamResult $result): JsonResponse
    {
        abort_unless($result->school_id === $this->schoolId(), 403);
        $data = $request->validate([
            'exam_id' => 'sometimes|exists:exams,id',
            'student_id' => 'sometimes|exists:students,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'marks_obtained' => 'sometimes|numeric|min:0',
            'total_marks' => 'nullable|integer|min:1',
            'grade' => 'nullable|string|max:10',
            'remarks' => 'nullable|string',
        ]);
        $result->update($data);

        return $this->success($result, 'Result updated');
    }

    public function destroyResult(ExamResult $result): JsonResponse
    {
        abort_unless($result->school_id === $this->schoolId(), 403);
        $result->delete();

        return $this->success(null, 'Result deleted');
    }
}
