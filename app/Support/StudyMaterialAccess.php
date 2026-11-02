<?php

namespace App\Support;

use App\Models\Student;
use App\Models\StudyMaterial;
use App\Models\User;

class StudyMaterialAccess
{
    /** Notes, books & magazines are school-wide for every fee-paid enrolled student. */
    public static function isSchoolWideType(string $type): bool
    {
        return in_array($type, ['notes', 'book', 'magazine'], true);
    }

    public static function canManage(User $user, StudyMaterial $material): bool
    {
        if (RegistrationGuard::isSuperAdmin($user) || $user->hasRole('admin')) {
            return true;
        }

        if ($user->can('materials.edit') || $user->can('materials.delete')) {
            return true;
        }

        if ($user->hasRole('teacher')) {
            $teacher = RoleDataScope::teacher();

            return $teacher && (int) $material->teacher_id === (int) $teacher->id;
        }

        return false;
    }

    public static function studentEnrolled(?Student $student): bool
    {
        return $student
            && $student->status === 'active'
            && filled($student->school_class_id);
    }

    public static function canView(User $user, StudyMaterial $material): bool
    {
        if ($material->status !== 'published' && ! self::canManage($user, $material)) {
            return false;
        }

        if (self::canManage($user, $material)) {
            return true;
        }

        if ($user->hasRole('student')) {
            if (! $user->fee_cleared) {
                return false;
            }

            $student = LiveClassAccess::studentForUser($user);

            if (! self::studentEnrolled($student)) {
                return false;
            }

            if (self::isSchoolWideType($material->type)) {
                return true;
            }

            if ($material->school_class_id && (int) $student->school_class_id !== (int) $material->school_class_id) {
                return false;
            }

            return true;
        }

        if ($user->hasRole('parent')) {
            if (! $user->fee_cleared) {
                return false;
            }

            $query = Student::where('school_id', $user->school_id)
                ->where('parent_id', $user->id)
                ->where('status', 'active');

            if (! self::isSchoolWideType($material->type) && $material->school_class_id) {
                $query->where('school_class_id', $material->school_class_id);
            }

            return $query->exists();
        }

        return $user->can('materials.view');
    }

    public static function canDownload(User $user, StudyMaterial $material): bool
    {
        return self::canView($user, $material)
            && $material->download_allowed
            && filled($material->file_path);
    }

    public static function canOpen(User $user, StudyMaterial $material): bool
    {
        return self::canView($user, $material) && filled($material->file_path);
    }

    /** @return array<string, mixed> */
    public static function formatForUser(StudyMaterial $material, User $user): array
    {
        $canView = self::canView($user, $material);
        $canManage = self::canManage($user, $material);
        $canDownload = self::canDownload($user, $material);
        $canOpen = self::canOpen($user, $material);

        return [
            'id' => $material->id,
            'title' => $material->title,
            'description' => $material->description,
            'type' => $material->type,
            'status' => $material->status,
            'download_allowed' => $material->download_allowed,
            'school_class_id' => $material->school_class_id,
            'subject_id' => $material->subject_id,
            'live_class_id' => $material->live_class_id,
            'class_name' => $material->schoolClass?->displayName(),
            'batch_name' => $material->schoolClass?->section,
            'subject_name' => $material->subject?->name,
            'live_class_title' => $material->liveClass?->title,
            'teacher_name' => $material->teacher?->name,
            'file_name' => $canView ? $material->file_name : null,
            'file_size' => $canView ? $material->file_size : null,
            'mime_type' => $canView ? $material->mime_type : null,
            'created_at' => $material->created_at?->format('Y-m-d H:i'),
            'can_manage' => $canManage,
            'can_view' => $canView,
            'can_open' => $canOpen,
            'can_download' => $canDownload,
            'access_denied' => ! $canView,
            'access_message' => $canView ? null : __('ui.materials_fee_required'),
            'view_url' => $canOpen ? '/api/v1/materials/'.$material->id.'/view' : null,
            'download_url' => $canDownload ? '/api/v1/materials/'.$material->id.'/download' : null,
        ];
    }
}
