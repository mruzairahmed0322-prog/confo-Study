<?php

namespace App\Http\Controllers\Api;

use App\Models\Teacher;
use App\Support\RoleDataScope;
use App\Support\NotificationService;
use App\Support\DocumentSlipBuilder;
use App\Support\StaffAccountProvisioner;
use App\Support\UserAccountManager;
use App\Support\ImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TeacherApiController extends BaseApiController
{
    private function teacherRules(?Teacher $teacher = null): array
    {
        $schoolId = $this->schoolId();

        return [
            'name' => 'required|string|max:255',
            'father_name' => 'nullable|string|max:255',
            'cnic' => 'nullable|string|max:20',
            'email' => 'required|email|unique:users,email'.($teacher?->user_id ? ','.$teacher->user_id : ''),
            'phone' => 'nullable|string|max:20',
            'employee_id' => [
                'nullable', 'string',
                Rule::unique('teachers', 'employee_id')->where('school_id', $schoolId)->ignore($teacher?->id),
            ],
            'gender' => 'in:male,female,other',
            'joining_date' => 'nullable|date',
            'salary' => 'nullable|numeric|min:0',
            'qualification' => 'nullable|string|max:255',
            'address' => 'nullable|string',
            'status' => 'in:active,inactive,on_leave',
            'password' => ($teacher ? 'nullable' : 'required').'|string|min:8',
            'photo' => 'nullable|image|max:2048',
            'subject_ids' => 'nullable|array',
            'subject_ids.*' => 'exists:subjects,id',
        ];
    }

    private function transformTeacher(Teacher $t): array
    {
        return [
            'id' => $t->id,
            'name' => $t->name,
            'father_name' => $t->father_name,
            'cnic' => $t->cnic,
            'photo' => ImageUpload::url($t->photo),
            'employee_id' => $t->employee_id,
            'email' => $t->email,
            'phone' => $t->phone,
            'gender' => $t->gender,
            'joining_date' => $t->joining_date?->format('Y-m-d'),
            'salary' => $t->salary,
            'qualification' => $t->qualification,
            'address' => $t->address,
            'status' => $t->status,
            'subjects' => $t->subjects->pluck('name')->join(', ') ?: '—',
            'subject_ids' => $t->subjects->pluck('id')->all(),
            'user_id' => $t->user_id,
            'login_status' => $t->user ? UserAccountManager::loginStatusLabel($t->user) : 'none',
        ];
    }

    public function index(Request $request): JsonResponse
    {
        $query = Teacher::with(['subjects', 'user'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('employee_id', 'like', "%{$s}%")
                    ->orWhere('father_name', 'like', "%{$s}%");
            }))
            ->when($request->name, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->subject_id, fn ($q, $s) => $q->whereHas('subjects', fn ($q) => $q->where('subjects.id', $s)))
            ->when($request->from, fn ($q, $d) => $q->whereDate('joining_date', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('joining_date', '<=', $d))
            ->latest();

        RoleDataScope::scopeTeachers($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Teacher $t) => $this->transformTeacher($t));

        return $this->success($paginated);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->teacherRules());

        $data['school_id'] = $this->schoolId();
        $photo = ImageUpload::store($request->file('photo'), 'teachers');
        $teacher = Teacher::create(collect($data)->except(['password', 'photo', 'subject_ids'])->merge(['photo' => $photo])->all());

        if ($request->has('subject_ids')) {
            $teacher->subjects()->sync($request->input('subject_ids', []));
        }

        StaffAccountProvisioner::createTeacherLogin($teacher, $data['email'], $data['password']);
        $teacher->load('subjects', 'user');

        NotificationService::dispatch($this->schoolId(), 'new_teacher', [
            'teacher_name' => $teacher->name,
            'employee_id' => $teacher->employee_id ?? '—',
            'subject' => $teacher->subjects->pluck('name')->join(', ') ?: 'General',
        ], '/app/teachers');

        return $this->success($this->transformTeacher($teacher), 'Teacher created', 201);
    }

    public function update(Request $request, Teacher $teacher): JsonResponse
    {
        abort_unless($teacher->school_id === $this->schoolId(), 403);

        $rules = $this->teacherRules($teacher);
        $rules['name'] = 'sometimes|string|max:255';
        $rules['email'] = 'sometimes|email|unique:users,email,'.($teacher->user_id ?? 'NULL');

        $data = $request->validate($rules);
        $photo = ImageUpload::store($request->file('photo'), 'teachers', $teacher->photo);

        $teacher->update(collect($data)->except(['password', 'photo', 'subject_ids'])->merge(['photo' => $photo])->all());

        if ($request->has('subject_ids')) {
            $teacher->subjects()->sync($request->input('subject_ids', []));
        }

        $teacher->load('subjects', 'user');

        return $this->success($this->transformTeacher($teacher), 'Teacher updated');
    }

    public function toggleBlock(Teacher $teacher): JsonResponse
    {
        abort_unless($teacher->school_id === $this->schoolId(), 403);
        abort_unless($teacher->user, 422, 'Teacher has no login account.');

        if (UserAccountManager::isBlocked($teacher->user)) {
            UserAccountManager::unblock($teacher->user);
            $message = 'Teacher unblocked — login enabled';
        } else {
            UserAccountManager::block($teacher->user);
            $message = 'Teacher blocked — login disabled';
        }

        return $this->success([
            'login_status' => UserAccountManager::loginStatusLabel($teacher->user->fresh()),
        ], $message);
    }

    public function employeeSlip(Teacher $teacher): JsonResponse
    {
        abort_unless($teacher->school_id === $this->schoolId(), 403);

        return $this->success(DocumentSlipBuilder::employeeSlip($teacher));
    }

    public function destroy(Teacher $teacher): JsonResponse
    {
        abort_unless($teacher->school_id === $this->schoolId(), 403);

        $teacher->subjects()->detach();
        $loginUser = $teacher->user;
        $teacher->delete();

        if ($loginUser) {
            $loginUser->tokens()->delete();
            $loginUser->delete();
        }

        return $this->success(null, 'Teacher deleted');
    }
}
