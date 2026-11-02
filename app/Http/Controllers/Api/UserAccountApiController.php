<?php

namespace App\Http\Controllers\Api;

use App\AccountStatus;
use App\ApprovalStatus;
use App\Models\User;
use App\Support\RegistrationGuard;
use App\Support\UserAccountManager;
use App\Support\ImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserAccountApiController extends BaseApiController
{
    private function userRules(?User $user = null): array
    {
        return [
            'name' => 'required|string|max:255',
            'father_name' => 'nullable|string|max:255',
            'cnic' => 'nullable|string|max:20',
            'email' => 'required|email|unique:users,email'.($user ? ','.$user->id : ''),
            'password' => ($user ? 'nullable' : 'required').'|string|min:8',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'gender' => 'nullable|in:male,female,other',
            'dob' => 'nullable|date',
            'role' => ($user ? 'sometimes' : 'required').'|in:parent,teacher,student,reception,accountant,admin',
            'photo' => 'nullable|image|max:2048',
        ];
    }

    private function transformUser(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'father_name' => $u->father_name,
            'cnic' => $u->cnic,
            'photo' => ImageUpload::url($u->avatar),
            'email' => $u->email,
            'phone' => $u->phone,
            'address' => $u->address,
            'gender' => $u->gender,
            'dob' => $u->dob?->format('Y-m-d'),
            'role' => $u->primaryRoleName(),
            'login_status' => UserAccountManager::loginStatusLabel($u),
            'account_status' => $u->account_status,
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $query = User::with('roles')
            ->where('school_id', $this->schoolId())
            ->whereDoesntHave('roles', fn ($q) => $q->where('name', 'school-owner'))
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('email', 'like', "%{$s}%")
                    ->orWhere('phone', 'like', "%{$s}%")
                    ->orWhere('father_name', 'like', "%{$s}%")
                    ->orWhere('cnic', 'like', "%{$s}%");
            }))
            ->when($request->name, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->role, fn ($q, $role) => $q->role($role))
            ->when($request->login_status === 'blocked', fn ($q) => $q->whereIn('account_status', [AccountStatus::SUSPENDED, AccountStatus::BANNED]))
            ->when($request->login_status === 'active', fn ($q) => $q->where('account_status', AccountStatus::ACTIVE))
            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest();

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (User $u) => $this->transformUser($u));

        return $this->success($paginated);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->userRules());
        $role = RegistrationGuard::mapRole($data['role']);
        $avatar = ImageUpload::store($request->file('photo'), 'staff');

        $user = User::create([
            'school_id' => $this->schoolId(),
            'name' => $data['name'],
            'father_name' => $data['father_name'] ?? null,
            'cnic' => $data['cnic'] ?? null,
            'email' => $data['email'],
            'phone' => $data['phone'] ?? null,
            'address' => $data['address'] ?? null,
            'gender' => $data['gender'] ?? null,
            'dob' => $data['dob'] ?? null,
            'avatar' => $avatar,
            'password' => Hash::make($data['password']),
            'email_verified_at' => now(),
            'account_status' => AccountStatus::ACTIVE,
            'approval_status' => ApprovalStatus::APPROVED,
            'fee_cleared' => true,
            'approved_at' => now(),
            'approved_by' => auth()->id(),
        ]);

        $user->assignRole($role);

        return $this->success($this->transformUser($user->fresh('roles')), 'User account created', 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        abort_unless($user->school_id === $this->schoolId(), 403);
        abort_if(RegistrationGuard::isSuperAdmin($user), 403, 'Cannot edit super admin.');

        $data = $request->validate($this->userRules($user));
        $avatar = ImageUpload::store($request->file('photo'), 'staff', $user->avatar);

        $updateData = collect($data)->except(['password', 'photo', 'role'])->merge(['avatar' => $avatar])->all();
        if (! empty($data['password'])) {
            $updateData['password'] = Hash::make($data['password']);
        }

        $user->update($updateData);

        if (isset($data['role'])) {
            $role = RegistrationGuard::mapRole($data['role']);
            $user->syncRoles([$role]);
        }

        return $this->success($this->transformUser($user->fresh('roles')), 'User updated');
    }

    public function block(User $user): JsonResponse
    {
        abort_unless($user->school_id === $this->schoolId(), 403);
        abort_if(RegistrationGuard::isSuperAdmin($user), 403, 'Cannot block super admin.');

        UserAccountManager::block($user);

        return $this->success(null, 'User blocked — login disabled');
    }

    public function unblock(User $user): JsonResponse
    {
        abort_unless($user->school_id === $this->schoolId(), 403);

        UserAccountManager::unblock($user);

        return $this->success(null, 'User unblocked — login enabled');
    }

    public function destroy(User $user): JsonResponse
    {
        abort_unless($user->school_id === $this->schoolId(), 403);
        abort_if(RegistrationGuard::isSuperAdmin($user), 403, 'Cannot delete super admin.');

        $user->tokens()->delete();
        $user->delete();

        return $this->success(null, 'User deleted');
    }
}
