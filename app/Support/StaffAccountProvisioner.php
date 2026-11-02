<?php

namespace App\Support;

use App\AccountStatus;
use App\ApprovalStatus;
use App\Models\Student;
use App\Models\Teacher;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class StaffAccountProvisioner
{
    public static function createTeacherLogin(Teacher $teacher, string $email, ?string $password = null): User
    {
        $user = User::create([
            'school_id' => $teacher->school_id,
            'name' => $teacher->name,
            'email' => $email,
            'phone' => $teacher->phone,
            'password' => Hash::make($password ?? 'password'),
            'email_verified_at' => now(),
            'account_status' => AccountStatus::ACTIVE,
            'approval_status' => ApprovalStatus::APPROVED,
            'fee_cleared' => true,
            'approved_at' => now(),
            'approved_by' => auth()->id(),
            'gender' => $teacher->gender ?? 'male',
        ]);

        $user->assignRole('teacher');

        $teacher->update([
            'user_id' => $user->id,
            'email' => $email,
        ]);

        return $user;
    }

    public static function createStudentLogin(Student $student, string $email, ?string $password = null): User
    {
        $user = User::create([
            'school_id' => $student->school_id,
            'name' => $student->name,
            'email' => $email,
            'phone' => $student->phone,
            'password' => Hash::make($password ?? 'password'),
            'email_verified_at' => now(),
            'account_status' => AccountStatus::ACTIVE,
            'approval_status' => ApprovalStatus::APPROVED,
            'fee_cleared' => true,
            'approved_at' => now(),
            'approved_by' => auth()->id(),
            'gender' => $student->gender ?? 'male',
        ]);

        $user->assignRole('student');

        $student->update(['user_id' => $user->id]);

        return $user;
    }
}
