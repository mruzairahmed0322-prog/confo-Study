<?php

namespace App\Http\Controllers\Api;

use App\AccountStatus;
use App\ApprovalStatus;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\RegistrationGuard;
use App\Support\RegistrationProvisioning;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ApprovalApiController extends BaseApiController
{
    public function __construct()
    {
        $this->middleware('role:school-owner');
    }

    public function index(): JsonResponse
    {
        $schoolId = $this->schoolId();

        $pending = User::with('roles')
            ->where('school_id', $schoolId)
            ->where('approval_status', ApprovalStatus::PENDING)
            ->where('account_status', AccountStatus::PENDING)
            ->latest()
            ->get()
            ->map(fn (User $u) => $this->formatUser($u));

        $feePending = User::with('roles')
            ->where('school_id', $schoolId)
            ->where('approval_status', ApprovalStatus::APPROVED)
            ->where(function ($q) {
                $q->where('account_status', AccountStatus::FEE_PENDING)
                    ->orWhere('fee_cleared', false);
            })
            ->latest('approved_at')
            ->get()
            ->map(fn (User $u) => $this->formatUser($u));

        return $this->success([
            'pending' => $pending,
            'fee_pending' => $feePending,
        ]);
    }

    public function approve(User $user): JsonResponse
    {
        $this->authorizeUser($user);

        $role = $user->primaryRoleName();

        if (in_array($role, RegistrationGuard::adminOnlyRoles(), true)) {
            return $this->error(
                'Student and teacher accounts must be created by Super Admin. Reject this registration and add the user from Academics.',
                422
            );
        }

        $isStudent = $role === 'student';

        $user->update([
            'approval_status' => ApprovalStatus::APPROVED,
            'account_status' => $isStudent ? AccountStatus::FEE_PENDING : AccountStatus::ACTIVE,
            'fee_cleared' => ! $isStudent,
            'approved_at' => now(),
            'approved_by' => auth()->id(),
            'rejection_reason' => null,
            'email_verified_at' => $isStudent ? $user->email_verified_at : ($user->email_verified_at ?? now()),
        ]);

        RegistrationProvisioning::afterApproval($user);

        $message = $isStudent
            ? 'User approved — mark fee paid to enable student login.'
            : 'User approved — login is now enabled.';

        $this->logAction($user, 'approve', $message);

        return $this->success(null, 'User approved');
    }

    public function reject(Request $request, User $user): JsonResponse
    {
        $this->authorizeUser($user);

        $request->validate(['reason' => ['nullable', 'string', 'max:500']]);

        $user->update([
            'approval_status' => ApprovalStatus::REJECTED,
            'account_status' => AccountStatus::REJECTED,
            'rejection_reason' => $request->input('reason', 'Registration rejected.'),
            'approved_by' => auth()->id(),
        ]);

        $this->logAction($user, 'reject', 'Registration rejected.');

        return $this->success(null, 'User rejected');
    }

    public function markFeePaid(User $user): JsonResponse
    {
        $this->authorizeUser($user);

        $user->update([
            'account_status' => AccountStatus::ACTIVE,
            'fee_cleared' => true,
            'email_verified_at' => $user->email_verified_at ?? now(),
        ]);

        RegistrationProvisioning::afterFeePaid($user);

        $this->logAction($user, 'fee_paid', 'Fee marked as paid — login enabled.');

        return $this->success(null, 'Fee marked as paid');
    }

    private function formatUser(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'phone' => $user->phone,
            'role' => $user->primaryRoleName(),
            'created_at' => $user->created_at?->toIso8601String(),
            'registration_note' => $user->registration_note,
        ];
    }

    private function authorizeUser(User $user): void
    {
        abort_unless($user->school_id === auth()->user()->school_id, 403);
        abort_if($user->isSuperAdmin(), 403);
    }

    private function logAction(User $user, string $action, string $description): void
    {
        ActivityLog::create([
            'school_id' => $user->school_id,
            'user_id' => auth()->id(),
            'action' => $action,
            'model_type' => User::class,
            'model_id' => $user->id,
            'description' => $description,
            'properties' => ['target' => $user->email],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
