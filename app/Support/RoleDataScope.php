<?php

namespace App\Support;

use App\Models\Student;
use App\Models\Teacher;
use App\Models\TimetableSlot;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class RoleDataScope
{
    public static function isSuperAdmin(): bool
    {
        return RegistrationGuard::isSuperAdmin(auth()->user());
    }

    public static function user(): User
    {
        return auth()->user();
    }

    public static function teacher(): ?Teacher
    {
        $user = self::user();

        if (! $user->hasRole('teacher')) {
            return null;
        }

        return Teacher::where('school_id', $user->school_id)
            ->where('user_id', $user->id)
            ->first();
    }

    public static function student(): ?Student
    {
        $user = self::user();

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

    /** @return Collection<int, int> */
    public static function childStudentIds(): Collection
    {
        $user = self::user();

        if (! $user->hasRole('parent')) {
            return collect();
        }

        return Student::where('school_id', $user->school_id)
            ->where('parent_id', $user->id)
            ->pluck('id');
    }

    /** @return Collection<int, int> */
    public static function teacherClassIds(): Collection
    {
        $teacher = self::teacher();

        if (! $teacher) {
            return collect();
        }

        $fromTimetable = TimetableSlot::where('teacher_id', $teacher->id)->pluck('school_class_id');
        $fromSubjects = $teacher->subjects()->pluck('teacher_subject.school_class_id');

        return $fromTimetable->merge($fromSubjects)->filter()->unique()->values();
    }

    /** @return Collection<int, int> */
    public static function scopedStudentIds(): Collection
    {
        if (self::isSuperAdmin()) {
            return collect();
        }

        if (self::user()->hasRole('student')) {
            $student = self::student();

            return $student ? collect([$student->id]) : collect([-1]);
        }

        if (self::user()->hasRole('parent')) {
            $ids = self::childStudentIds();

            return $ids->isEmpty() ? collect([-1]) : $ids;
        }

        if (self::user()->hasRole('teacher')) {
            $classIds = self::teacherClassIds();

            if ($classIds->isEmpty()) {
                return collect([-1]);
            }

            return Student::where('school_id', self::user()->school_id)
                ->whereIn('school_class_id', $classIds)
                ->pluck('id');
        }

        return collect();
    }

  /** @return Collection<int, int> */
    public static function scopedClassIds(): Collection
    {
        if (self::isSuperAdmin()) {
            return collect();
        }

        if (self::user()->hasRole('student')) {
            $student = self::student();

            return $student?->school_class_id ? collect([$student->school_class_id]) : collect([-1]);
        }

        if (self::user()->hasRole('parent')) {
            $ids = Student::whereIn('id', self::childStudentIds())->pluck('school_class_id')->unique()->filter();

            return $ids->isEmpty() ? collect([-1]) : $ids->values();
        }

        if (self::user()->hasRole('teacher')) {
            $classIds = self::teacherClassIds();

            return $classIds->isEmpty() ? collect([-1]) : $classIds;
        }

        return collect();
    }

    public static function scopeStudents(Builder $query): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        if (self::user()->hasRole('student')) {
            $student = self::student();
            $query->where('id', $student?->id ?? 0);

            return;
        }

        if (self::user()->hasRole('parent')) {
            $ids = self::childStudentIds();
            $query->whereIn('id', $ids->isEmpty() ? [-1] : $ids);

            return;
        }

        if (self::user()->hasRole('teacher')) {
            $classIds = self::teacherClassIds();
            $query->whereIn('school_class_id', $classIds->isEmpty() ? [-1] : $classIds);
        }
    }

    public static function scopeTeachers(Builder $query): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        if (self::user()->hasRole('teacher')) {
            $teacher = self::teacher();
            $query->where('id', $teacher?->id ?? 0);
        }
    }

    public static function scopeByStudentColumn(Builder $query, string $column = 'student_id'): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        $ids = self::scopedStudentIds();

        if ($ids->isNotEmpty()) {
            $query->whereIn($column, $ids);
        }
    }

    public static function scopeByClassColumn(Builder $query, string $column = 'school_class_id'): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        $classIds = self::scopedClassIds();

        if ($classIds->isNotEmpty()) {
            $query->whereIn($column, $classIds);
        }
    }

    public static function scopeAssignments(Builder $query): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        if (self::user()->hasRole('teacher')) {
            $teacher = self::teacher();
            $classIds = self::teacherClassIds();

            $query->where(function ($q) use ($teacher, $classIds) {
                if ($teacher) {
                    $q->where('teacher_id', $teacher->id);
                }
                if ($classIds->isNotEmpty()) {
                    $q->orWhereIn('school_class_id', $classIds);
                }
            });

            return;
        }

        self::scopeByClassColumn($query);
    }

    public static function scopeQuizzes(Builder $query): void
    {
        self::scopeByClassColumn($query);
    }

    public static function scopeExams(Builder $query): void
    {
        self::scopeByClassColumn($query);
    }

    public static function scopeExamResults(Builder $query): void
    {
        self::scopeByStudentColumn($query);
    }

    public static function scopeLiveClasses(Builder $query): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        if (self::user()->hasRole('teacher')) {
            $teacher = self::teacher();
            if ($teacher) {
                $query->where('teacher_id', $teacher->id);
            }

            return;
        }

        self::scopeByClassColumn($query);
    }

    /** Teacher → own slots; student/parent → their class(es); admin/owner → school-wide. */
    public static function scopeTimetable(Builder $query): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        if (self::user()->hasRole('teacher')) {
            $teacher = self::teacher();
            if ($teacher) {
                $query->where('teacher_id', $teacher->id);
            } else {
                $query->whereRaw('1 = 0');
            }

            return;
        }

        self::scopeByClassColumn($query);
    }

    public static function scopeStudyMaterials(Builder $query): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        if (self::user()->hasRole('teacher')) {
            $teacher = self::teacher();
            if ($teacher) {
                $query->where('teacher_id', $teacher->id);
            }

            return;
        }

        // Class-scoped materials + school-wide notes/books/magazines for all fee-paid students
        $classIds = self::scopedClassIds();

        $query->where(function ($q) use ($classIds) {
            $q->whereIn('type', ['notes', 'book', 'magazine'])
                ->orWhereNull('school_class_id');

            if ($classIds->isNotEmpty()) {
                $q->orWhereIn('school_class_id', $classIds);
            }
        });
    }

    public static function scopeFeeInvoices(Builder $query): void
    {
        self::scopeByStudentColumn($query);
    }

    public static function scopeFeePayments(Builder $query): void
    {
        self::scopeByStudentColumn($query);
    }

    public static function assertCanAccessStudent(?int $studentId): void
    {
        if (self::isSuperAdmin() || ! $studentId) {
            return;
        }

        $ids = self::scopedStudentIds();

        // Empty collection = unrestricted staff (admin/accountant), same as scopeStudents.
        // Restricted roles use [-1] or a real ID list when they have no allowed students.
        if ($ids->isNotEmpty() && ! $ids->contains($studentId)) {
            abort(403, 'You cannot access this student record.');
        }
    }

    public static function scopeSchoolClasses(Builder $query): void
    {
        if (self::isSuperAdmin()) {
            return;
        }

        $classIds = self::scopedClassIds();

        if ($classIds->isNotEmpty()) {
            $query->whereIn('id', $classIds);
        }
    }
}
