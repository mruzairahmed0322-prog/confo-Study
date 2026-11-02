<?php

namespace App\Support;

use App\Models\LiveClass;
use App\Models\Student;
use App\Models\User;

class LiveClassAccess
{
    public static function canManage(User $user, LiveClass $liveClass): bool
    {
        if (RegistrationGuard::isSuperAdmin($user) || $user->hasRole('admin')) {
            return true;
        }

        if ($user->hasRole('teacher')) {
            $teacher = RoleDataScope::teacher();

            return $teacher && (int) $liveClass->teacher_id === (int) $teacher->id;
        }

        return $user->can('live-classes.edit') || $user->can('recordings.manage');
    }

    public static function canViewLinks(User $user, LiveClass $liveClass): bool
    {
        if (self::canManage($user, $liveClass)) {
            return true;
        }

        if ($user->hasRole('student')) {
            if (! $user->fee_cleared) {
                return false;
            }
            $student = self::studentForUser($user);

            // Fee-paid + active enrolled student only (same rule as study materials).
            return $student
                && $student->status === 'active'
                && filled($student->school_class_id)
                && (int) $student->school_class_id === (int) $liveClass->school_class_id;
        }

        if ($user->hasRole('parent')) {
            if (! $user->fee_cleared) {
                return false;
            }

            return Student::where('school_id', $user->school_id)
                ->where('parent_id', $user->id)
                ->where('status', 'active')
                ->where('school_class_id', $liveClass->school_class_id)
                ->exists();
        }

        return false;
    }

    public static function studentForUser(User $user): ?Student
    {
        $byUser = Student::where('school_id', $user->school_id)
            ->where('user_id', $user->id)
            ->first();
        if ($byUser) {
            return $byUser;
        }

        return Student::where('school_id', $user->school_id)
            ->where(function ($q) use ($user) {
                $q->where('name', $user->name);
                if ($user->phone) {
                    $q->orWhere('phone', $user->phone);
                }
            })
            ->first();
    }

    public static function inAppRoomPath(LiveClass $liveClass, string $mode = 'live'): string
    {
        $path = '/app/live-classes/'.$liveClass->id.'/room';

        return $mode === 'recording' ? $path.'?mode=recording' : $path;
    }

    public static function hasPlayableVideo(LiveClass $liveClass): bool
    {
        return filled(YouTubeLiveService::videoId($liveClass))
            || (JitsiLiveService::isJitsiPlatform($liveClass) && filled($liveClass->meeting_url));
    }

    public static function joinUrl(LiveClass $liveClass): ?string
    {
        if (! self::hasPlayableVideo($liveClass)) {
            return null;
        }

        if (JitsiLiveService::isJitsiPlatform($liveClass)) {
            return self::inAppRoomPath($liveClass);
        }

        return self::inAppRoomPath($liveClass);
    }

    /** @return array<string, mixed>|null */
    public static function jitsiConfig(LiveClass $liveClass, User $user): ?array
    {
        if (! JitsiLiveService::isJitsiPlatform($liveClass) || ! self::canViewLinks($user, $liveClass)) {
            return null;
        }

        $room = JitsiLiveService::roomNameFromUrl($liveClass->meeting_url);
        if (! $room) {
            return null;
        }

        return [
            'domain' => JitsiLiveService::DOMAIN,
            'room' => $room,
            'display_name' => $user->name,
            'title' => $liveClass->title,
            'is_moderator' => self::canManage($user, $liveClass),
        ];
    }

    /** @return array<string, mixed> */
    public static function formatForUser(LiveClass $lc, User $user): array
    {
        $canView = self::canViewLinks($user, $lc);
        $canManage = self::canManage($user, $lc);
        $hasVideo = self::hasPlayableVideo($lc);
        $isLive = in_array($lc->status, ['scheduled', 'live'], true);
        $hasRecording = filled($lc->recording_url) || ($lc->status === 'completed' && filled(YouTubeLiveService::videoId($lc)));
        $joinUrl = $canView && $hasVideo && $isLive ? self::inAppRoomPath($lc) : null;
        $watchUrl = $canView && $hasRecording ? self::inAppRoomPath($lc, 'recording') : null;

        $meta = LiveClassService::sessionMeta($lc);

        return [
            'id' => $lc->id,
            'title' => $lc->title,
            'description' => $lc->description,
            'scheduled_at' => $lc->scheduled_at?->format('Y-m-d H:i'),
            'ends_at' => $lc->ends_at?->format('Y-m-d H:i'),
            'duration_minutes' => $lc->duration_minutes,
            'platform' => $lc->platform,
            'status' => $lc->status,
            'school_class_id' => $lc->school_class_id,
            'subject_id' => $lc->active_subject_id ?? $lc->subject_id,
            'subject_name' => $meta['active_subject_name'],
            'subject_ids' => $meta['subject_ids'],
            'subjects' => $meta['subjects'],
            'active_subject_id' => $meta['active_subject_id'],
            'active_subject_name' => $meta['active_subject_name'],
            'multiple_live_class_mode' => $meta['multiple_live_class_mode'],
            'class_name' => $lc->schoolClass?->displayName(),
            'teacher_id' => $lc->teacher_id,
            'teacher_name' => $lc->teacher?->name,
            'can_join' => (bool) $joinUrl,
            'can_watch' => (bool) $watchUrl,
            'can_manage' => $canManage,
            'can_monitor' => $canManage,
            'access_denied' => ! $canView,
            'access_message' => $canView ? null : __('ui.live_class_fee_required'),
            'join_url' => $joinUrl,
            'watch_url' => $watchUrl,
            'meeting_url' => $canManage ? $lc->meeting_url : null,
            'youtube_url' => $canManage ? $lc->youtube_url : null,
            'recording_url' => $canManage ? $lc->recording_url : null,
            'has_recording' => $canView && $hasRecording,
            'auto_created' => (bool) $lc->auto_created,
            'join_in_app' => true,
            'youtube_studio_url' => $canManage && $lc->youtube_broadcast_id
                ? YouTubeLiveService::studioLiveUrl($lc->youtube_broadcast_id)
                : null,
            'youtube_broadcast_id' => $canManage ? $lc->youtube_broadcast_id : null,
            'has_obs' => $canManage && (filled($lc->youtube_stream_id) || filled($lc->youtube_rtmp_url)),
            'needs_stream_setup' => $canManage
                && $lc->platform === 'youtube'
                && in_array($lc->status, ['scheduled', 'live'], true)
                && blank($lc->youtube_broadcast_id),
            'deleted_at' => $lc->deleted_at?->toIso8601String(),
        ];
    }
}
