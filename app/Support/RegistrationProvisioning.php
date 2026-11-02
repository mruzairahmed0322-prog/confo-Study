<?php

namespace App\Support;

use App\Models\Student;
use App\Models\User;

class RegistrationProvisioning
{
    public static function afterApproval(User $user): void
    {
        // Teacher/student accounts are provisioned by Super Admin — nothing to do here.
    }

    public static function afterFeePaid(User $user): void
    {
        if ($user->primaryRoleName() !== 'student') {
            return;
        }

        self::linkLegacyStudent($user);
    }

    /** @deprecated Students are created by Super Admin; links legacy self-registrations if any. */
    private static function linkLegacyStudent(User $user): void
    {
        $rollFromNote = self::rollFromNote($user->registration_note);

        $student = null;

        if ($rollFromNote) {
            $student = Student::where('school_id', $user->school_id)
                ->where('roll_no', $rollFromNote)
                ->first();
        }

        if (! $student && $user->phone) {
            $student = Student::where('school_id', $user->school_id)
                ->where('phone', $user->phone)
                ->first();
        }

        if (! $student) {
            $student = Student::where('school_id', $user->school_id)
                ->where('name', $user->name)
                ->first();
        }

        if ($student) {
            $student->update([
                'user_id' => $user->id,
                'name' => $user->name,
                'phone' => $user->phone ?? $student->phone,
                'gender' => $user->gender ?? $student->gender,
                'status' => 'active',
            ]);
        }
    }

    private static function rollFromNote(?string $note): ?string
    {
        if (! $note) {
            return null;
        }

        if (preg_match('/\b(\d{4}-\d{3,6})\b/', $note, $matches)) {
            return $matches[1];
        }

        if (preg_match('/roll[:\s#-]*([A-Za-z0-9\-]+)/i', $note, $matches)) {
            return trim($matches[1]);
        }

        return null;
    }
}
