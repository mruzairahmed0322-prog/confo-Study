<?php

namespace App\Http\Controllers\Api;

use App\Models\Student;
use App\Models\SchoolClass;
use App\Support\RoleDataScope;
use App\Support\NotificationService;
use App\Support\DocumentSlipBuilder;
use App\Support\StaffAccountProvisioner;
use App\Support\UserAccountManager;
use App\Support\ImageUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StudentApiController extends BaseApiController
{
    private function studentRules(?Student $student = null): array
    {
        $schoolId = $this->schoolId();

        return [
            'name' => 'required|string|max:255',
            'father_name' => 'nullable|string|max:255',
            'mother_name' => 'nullable|string|max:255',
            'roll_no' => [
                'required', 'string',
                Rule::unique('students', 'roll_no')->where('school_id', $schoolId)->ignore($student?->id),
            ],
            'gr_no' => 'nullable|string|max:50',
            'b_form_no' => 'nullable|string|max:20',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'section' => 'nullable|string|max:10',
            'gender' => 'in:male,female,other',
            'dob' => 'nullable|date',
            'religion' => 'nullable|string|max:50',
            'blood_group' => 'nullable|string|max:5',
            'admission_date' => 'nullable|date',
            'status' => 'in:active,inactive,pending',
            'phone' => 'nullable|string|max:20',
            'emergency_contact' => 'nullable|string|max:20',
            'father_cnic' => 'nullable|string|max:20',
            'father_phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'previous_school' => 'nullable|string|max:255',
            'parent_id' => 'nullable|exists:users,id',
            'photo' => 'nullable|image|max:2048',
            'email' => 'nullable|email|unique:users,email',
            'password' => 'nullable|string|min:8|required_with:email',
        ];
    }

    private function transformStudent(Student $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'father_name' => $s->father_name,
            'mother_name' => $s->mother_name,
            'photo' => ImageUpload::url($s->photo),
            'roll_no' => $s->roll_no,
            'gr_no' => $s->gr_no,
            'b_form_no' => $s->b_form_no,
            'class' => $s->classLabel(),
            'class_id' => $s->school_class_id,
            'section' => $s->section,
            'gender' => $s->gender,
            'dob' => $s->dob?->format('Y-m-d'),
            'religion' => $s->religion,
            'blood_group' => $s->blood_group,
            'status' => $s->status,
            'phone' => $s->phone,
            'emergency_contact' => $s->emergency_contact,
            'father_cnic' => $s->father_cnic,
            'father_phone' => $s->father_phone,
            'address' => $s->address,
            'city' => $s->city,
            'previous_school' => $s->previous_school,
            'parent_id' => $s->parent_id,
            'admission_date' => $s->admission_date?->format('Y-m-d'),
            'user_id' => $s->user_id,
            'email' => $s->user?->email,
            'login_status' => $s->user ? UserAccountManager::loginStatusLabel($s->user) : 'none',
            'deleted_at' => $s->deleted_at?->toIso8601String(),
        ];
    }

    private function ensureSuperAdmin(): void
    {
        abort_unless(auth()->user()?->hasRole('school-owner'), 403, 'Only superadmin can manage student archives.');
    }

    private function findTrashedInSchool(int $id): Student
    {
        $student = Student::onlyTrashed()->findOrFail($id);
        abort_unless($student->school_id === $this->schoolId(), 403);

        return $student;
    }

    public function index(Request $request): JsonResponse
    {
        $query = Student::with('schoolClass', 'user')
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('roll_no', 'like', "%{$s}%")
                    ->orWhere('father_name', 'like', "%{$s}%")
                    ->orWhere('gr_no', 'like', "%{$s}%");
            }))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->name, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->from, fn ($q, $d) => $q->whereDate('admission_date', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('admission_date', '<=', $d))
            ->latest('admission_date');

        RoleDataScope::scopeStudents($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Student $s) => $this->transformStudent($s));

        return $this->success($paginated);
    }

    public function show(Student $student): JsonResponse
    {
        abort_unless($student->school_id === $this->schoolId(), 403);
        $student->load('schoolClass', 'feePayments', 'attendances', 'user');

        return $this->success($this->transformStudent($student));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->studentRules());

        $data['school_id'] = $this->schoolId();
        if (! isset($data['admission_date'])) {
            $data['admission_date'] = now()->toDateString();
        }
        if (! isset($data['city'])) {
            $data['city'] = 'Karachi';
        }

        $photo = ImageUpload::store($request->file('photo'), 'students');
        $student = Student::create(collect($data)->except(['email', 'password', 'photo'])->merge(['photo' => $photo])->all());

        if ($request->filled('email')) {
            StaffAccountProvisioner::createStudentLogin($student, $request->email, $request->password);
        }

        $student->load('schoolClass');
        NotificationService::dispatch($this->schoolId(), 'new_student', [
            'student_name' => $student->name,
            'class_name' => $student->classLabel(),
            'roll_no' => $student->roll_no,
            'admission_date' => ($student->admission_date ?? $student->created_at)?->format('M d, Y') ?? '—',
        ], '/app/students');

        return $this->success($this->transformStudent($student->fresh(['schoolClass', 'user'])), 'Student created', 201);
    }

    public function update(Request $request, Student $student): JsonResponse
    {
        abort_unless($student->school_id === $this->schoolId(), 403);

        $rules = $this->studentRules($student);
        $rules['name'] = 'sometimes|string|max:255';
        $rules['roll_no'] = [
            'sometimes', 'string',
            Rule::unique('students', 'roll_no')->where('school_id', $this->schoolId())->ignore($student->id),
        ];
        $rules['email'] = 'nullable|email|unique:users,email,'.($student->user_id ?? 'NULL');

        $data = $request->validate($rules);
        $photo = ImageUpload::store($request->file('photo'), 'students', $student->photo);

        $student->update(collect($data)->except(['email', 'password', 'photo'])->merge(['photo' => $photo])->all());
        $student->load('schoolClass', 'user');

        return $this->success($this->transformStudent($student), 'Student updated');
    }

    public function toggleStatus(Student $student): JsonResponse
    {
        abort_unless($student->school_id === $this->schoolId(), 403);

        $newStatus = $student->status === 'active' ? 'inactive' : 'active';
        $student->update(['status' => $newStatus]);

        if ($student->user) {
            if ($newStatus === 'inactive') {
                UserAccountManager::block($student->user);
            } else {
                UserAccountManager::unblock($student->user);
            }
        }

        return $this->success([
            'status' => $student->status,
            'login_status' => $student->user ? UserAccountManager::loginStatusLabel($student->user) : 'none',
        ], 'Status updated');
    }

    public function classes(): JsonResponse
    {
        $query = SchoolClass::where('school_id', $this->schoolId())->orderBy('name');
        RoleDataScope::scopeSchoolClasses($query);
        $classes = $query->get()->map(fn ($c) => ['id' => $c->id, 'name' => $c->displayName()]);

        return $this->success($classes);
    }

    public function admissionSlip(Student $student): JsonResponse
    {
        abort_unless($student->school_id === $this->schoolId(), 403);

        return $this->success(DocumentSlipBuilder::admissionSlip($student));
    }

    public function archived(Request $request): JsonResponse
    {
        $this->ensureSuperAdmin();

        $query = Student::onlyTrashed()
            ->with('schoolClass', 'user')
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")
                    ->orWhere('roll_no', 'like', "%{$s}%")
                    ->orWhere('father_name', 'like', "%{$s}%")
                    ->orWhere('gr_no', 'like', "%{$s}%");
            }))
            ->latest('deleted_at');

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Student $s) => $this->transformStudent($s));

        return $this->success($paginated);
    }

    public function destroy(Student $student): JsonResponse
    {
        $this->ensureSuperAdmin();
        abort_unless($student->school_id === $this->schoolId(), 403);

        if ($student->user) {
            UserAccountManager::block($student->user);
        }

        $student->delete();

        return $this->success(null, 'Student moved to archives');
    }

    public function restore(int $id): JsonResponse
    {
        $this->ensureSuperAdmin();

        $student = $this->findTrashedInSchool($id);
        $student->restore();
        $student->load('schoolClass', 'user');

        return $this->success($this->transformStudent($student), 'Student restored');
    }

    public function forceDestroy(int $id): JsonResponse
    {
        $this->ensureSuperAdmin();

        $student = $this->findTrashedInSchool($id);
        $loginUser = $student->user;

        $student->forceDelete();

        if ($loginUser) {
            $loginUser->tokens()->delete();
            $loginUser->delete();
        }

        return $this->success(null, 'Student permanently deleted');
    }
}
