<?php

namespace App\Http\Controllers\Api;

use App\Support\RoleDataScope;
use App\Support\DocumentSlipBuilder;

use App\Models\ActivityLog;
use App\Support\RegistrationGuard;
use App\Models\Attendance;
use App\Models\AuditLog;
use App\Models\Certificate;
use App\Models\Expense;
use App\Models\FeePayment;
use App\Models\LibraryBook;
use App\Models\LoginLog;
use App\Models\SchoolClass;
use App\Models\StaffSalary;
use App\Models\Student;
use App\Models\SystemSetting;
use App\Models\Subject;
use App\Models\Teacher;
use App\Models\TimetableSlot;
use App\Support\DashboardData;
use App\Support\DocumentUpload;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminApiController extends BaseApiController
{
    public function classes(Request $request): JsonResponse
    {
        $query = SchoolClass::where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->withCount('students')
            ->latest();

        RoleDataScope::scopeSchoolClasses($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (SchoolClass $c) => [
            'id' => $c->id,
            'name' => $c->displayName(),
            'class_name' => $c->name,
            'section' => $c->section,
            'capacity' => $c->capacity,
            'students_count' => $c->students_count,
            'status' => $c->status,
        ]);

        return $this->success($paginated);
    }

    public function storeClass(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100',
            'section' => 'nullable|string|max:20',
            'capacity' => 'nullable|integer|min:1|max:200',
            'status' => 'in:active,inactive',
        ]);
        $data['school_id'] = $this->schoolId();
        $class = SchoolClass::create($data);
        return $this->success($class, 'Class created', 201);
    }

    public function updateClass(Request $request, SchoolClass $schoolClass): JsonResponse
    {
        abort_unless($schoolClass->school_id === $this->schoolId(), 403);
        $data = $request->validate([
            'name' => 'sometimes|string|max:100',
            'section' => 'nullable|string|max:20',
            'capacity' => 'nullable|integer|min:1|max:200',
            'status' => 'in:active,inactive',
        ]);
        $schoolClass->update($data);
        return $this->success($schoolClass, 'Class updated');
    }

    public function destroyClass(SchoolClass $schoolClass): JsonResponse
    {
        abort_unless($schoolClass->school_id === $this->schoolId(), 403);
        abort_if($schoolClass->students()->exists(), 422, 'Cannot delete class with enrolled students.');
        $schoolClass->delete();

        return $this->success(null, 'Class deleted');
    }

    public function timetable(Request $request): JsonResponse
    {
        $query = TimetableSlot::with(['schoolClass', 'subject', 'teacher'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->whereHas('schoolClass', fn ($q) => $q->where('name', 'like', "%{$s}%"))
                    ->orWhereHas('subject', fn ($q) => $q->where('name', 'like', "%{$s}%"))
                    ->orWhereHas('teacher', fn ($q) => $q->where('name', 'like', "%{$s}%"));
            }))
            ->when($request->day, fn ($q, $d) => $q->where('day', $d))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->subject_id, fn ($q, $s) => $q->where('subject_id', $s))
            ->orderBy('day')
            ->orderBy('start_time');

        RoleDataScope::scopeTimetable($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (TimetableSlot $s) => $this->transformTimetableSlot($s));

        return $this->success($paginated);
    }

    public function storeTimetableSlot(Request $request): JsonResponse
    {
        abort_unless(RoleDataScope::isSuperAdmin(), 403, 'Only superadmin can manage timetable.');

        $data = $this->validateTimetableSlot($request);
        $this->assertTimetableRelationsBelongToSchool($data);

        $slot = TimetableSlot::create([
            ...$data,
            'school_id' => $this->schoolId(),
        ]);

        return $this->success(
            $this->transformTimetableSlot($slot->load(['schoolClass', 'subject', 'teacher'])),
            'Timetable slot created',
            201
        );
    }

    public function updateTimetableSlot(Request $request, TimetableSlot $timetableSlot): JsonResponse
    {
        abort_unless(RoleDataScope::isSuperAdmin(), 403, 'Only superadmin can manage timetable.');
        abort_unless($timetableSlot->school_id === $this->schoolId(), 403);

        $data = $this->validateTimetableSlot($request, true);
        $this->assertTimetableRelationsBelongToSchool($data);

        $timetableSlot->update($data);

        return $this->success(
            $this->transformTimetableSlot($timetableSlot->fresh(['schoolClass', 'subject', 'teacher'])),
            'Timetable slot updated'
        );
    }

    public function destroyTimetableSlot(TimetableSlot $timetableSlot): JsonResponse
    {
        abort_unless(RoleDataScope::isSuperAdmin(), 403, 'Only superadmin can manage timetable.');
        abort_unless($timetableSlot->school_id === $this->schoolId(), 403);

        $timetableSlot->delete();

        return $this->success(null, 'Timetable slot deleted');
    }

    /** @return array<string, mixed> */
    private function transformTimetableSlot(TimetableSlot $s): array
    {
        return [
            'id' => $s->id,
            'day' => ucfirst($s->day),
            'day_value' => $s->day,
            'start_time' => substr((string) $s->start_time, 0, 5),
            'end_time' => substr((string) $s->end_time, 0, 5),
            'class' => $s->schoolClass?->displayName() ?? '—',
            'school_class_id' => $s->school_class_id,
            'subject' => $s->subject?->name ?? '—',
            'subject_id' => $s->subject_id,
            'teacher' => $s->teacher?->name ?? '—',
            'teacher_id' => $s->teacher_id,
            'room' => $s->room ?? '—',
        ];
    }

    /** @return array<string, mixed> */
    private function validateTimetableSlot(Request $request, bool $partial = false): array
    {
        $rules = [
            'school_class_id' => ($partial ? 'sometimes|' : '').'required|exists:school_classes,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'teacher_id' => 'nullable|exists:teachers,id',
            'day' => ($partial ? 'sometimes|' : '').'required|in:monday,tuesday,wednesday,thursday,friday,saturday,sunday',
            'start_time' => ($partial ? 'sometimes|' : '').'required|date_format:H:i',
            'end_time' => ($partial ? 'sometimes|' : '').'required|date_format:H:i',
            'room' => 'nullable|string|max:100',
        ];

        $data = $request->validate($rules);

        if (isset($data['start_time'], $data['end_time']) && $data['end_time'] <= $data['start_time']) {
            abort(422, 'End time must be after start time.');
        }

        return $data;
    }

    /** @param array<string, mixed> $data */
    private function assertTimetableRelationsBelongToSchool(array $data): void
    {
        $schoolId = $this->schoolId();

        if (isset($data['school_class_id'])) {
            SchoolClass::where('school_id', $schoolId)->findOrFail($data['school_class_id']);
        }

        if (! empty($data['subject_id'])) {
            Subject::where('school_id', $schoolId)->findOrFail($data['subject_id']);
        }

        if (! empty($data['teacher_id'])) {
            Teacher::where('school_id', $schoolId)->findOrFail($data['teacher_id']);
        }
    }

    public function salaries(Request $request): JsonResponse
    {
        $query = StaffSalary::where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('employee_name', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('employee_name', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->month, fn ($q, $m) => $q->where('month', $m))
            ->when($request->year, fn ($q, $y) => $q->where('year', $y))
            ->latest('year')
            ->latest('month');

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (StaffSalary $s) => [
            'id' => $s->id,
            'employee_name' => $s->employee_name,
            'basic_salary' => $s->basic_salary,
            'allowances' => $s->allowances,
            'deductions' => $s->deductions,
            'net_salary' => $s->net_salary,
            'month' => $s->month,
            'year' => $s->year,
            'status' => $s->status,
            'paid_date' => $s->paid_date?->format('Y-m-d'),
        ]);

        return $this->success($paginated);
    }

    public function storeSalary(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_name' => 'required|string|max:255',
            'basic_salary' => 'required|numeric|min:0',
            'allowances' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
            'month' => 'required|string|max:20',
            'year' => 'required|integer|min:2000|max:2100',
            'status' => 'in:pending,paid,cancelled',
        ]);
        $data['school_id'] = $this->schoolId();
        $data['allowances'] = $data['allowances'] ?? 0;
        $data['deductions'] = $data['deductions'] ?? 0;
        $data['net_salary'] = $data['basic_salary'] + $data['allowances'] - $data['deductions'];
        $salary = StaffSalary::create($data);
        return $this->success($salary, 'Salary record created', 201);
    }

    public function updateSalary(Request $request, StaffSalary $staffSalary): JsonResponse
    {
        abort_unless($staffSalary->school_id === $this->schoolId(), 403);

        $data = $request->validate([
            'employee_name' => 'required|string|max:255',
            'basic_salary' => 'required|numeric|min:0',
            'allowances' => 'nullable|numeric|min:0',
            'deductions' => 'nullable|numeric|min:0',
            'month' => 'required|string|max:20',
            'year' => 'required|integer|min:2000|max:2100',
            'status' => 'in:pending,paid,cancelled',
        ]);
        $data['allowances'] = $data['allowances'] ?? 0;
        $data['deductions'] = $data['deductions'] ?? 0;
        $data['net_salary'] = $data['basic_salary'] + $data['allowances'] - $data['deductions'];
        $staffSalary->update($data);

        return $this->success($staffSalary->fresh(), 'Salary record updated');
    }

    public function destroySalary(StaffSalary $staffSalary): JsonResponse
    {
        abort_unless($staffSalary->school_id === $this->schoolId(), 403);
        $staffSalary->delete();

        return $this->success(null, 'Salary record deleted');
    }

    public function salarySlip(StaffSalary $staffSalary): JsonResponse
    {
        abort_unless($staffSalary->school_id === $this->schoolId(), 403);

        return $this->success(DocumentSlipBuilder::salarySlip($staffSalary));
    }

    public function expenses(Request $request): JsonResponse
    {
        $query = Expense::with('creator')
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->category, fn ($q, $c) => $q->where('category', $c))
            ->when($request->from, fn ($q, $d) => $q->whereDate('expense_date', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('expense_date', '<=', $d))
            ->latest('expense_date');

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Expense $e) => [
            'id' => $e->id,
            'title' => $e->title,
            'amount' => $e->amount,
            'category' => $e->category ?? 'General',
            'expense_date' => $e->expense_date?->format('Y-m-d'),
            'description' => $e->description ?? '',
            'created_by' => $e->creator?->name ?? '—',
        ]);

        return $this->success($paginated);
    }

    public function storeExpense(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'expense_date' => 'required|date',
            'description' => 'nullable|string',
        ]);
        $data['school_id'] = $this->schoolId();
        $data['created_by'] = auth()->id();
        $expense = Expense::create($data);
        return $this->success($expense, 'Expense recorded', 201);
    }

    public function updateExpense(Request $request, Expense $expense): JsonResponse
    {
        abort_unless($expense->school_id === $this->schoolId(), 403);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'category' => 'nullable|string|max:100',
            'expense_date' => 'required|date',
            'description' => 'nullable|string',
        ]);
        $expense->update($data);

        return $this->success($expense->fresh(), 'Expense updated');
    }

    public function destroyExpense(Expense $expense): JsonResponse
    {
        abort_unless($expense->school_id === $this->schoolId(), 403);
        $expense->delete();

        return $this->success(null, 'Expense deleted');
    }

    public function activityLogs(Request $request): JsonResponse
    {
        $query = ActivityLog::with('user')
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('description', 'like', "%{$s}%"))
            ->when($request->action, fn ($q, $a) => $q->where('action', $a))
            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest();

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (ActivityLog $l) => [
            'id' => $l->id,
            'action' => $l->action,
            'description' => $l->description,
            'user' => $l->user?->name ?? 'System',
            'ip_address' => $l->ip_address,
            'created_at' => $l->created_at?->format('Y-m-d H:i'),
        ]);

        return $this->success($paginated);
    }

    public function loginLogs(Request $request): JsonResponse
    {
        $query = LoginLog::with('user')
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('email', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest();

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (LoginLog $l) => [
            'id' => $l->id,
            'email' => $l->email,
            'user' => $l->user?->name ?? '—',
            'status' => $l->status,
            'ip_address' => $l->ip_address,
            'created_at' => $l->created_at?->format('Y-m-d H:i'),
        ]);

        return $this->success($paginated);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $query = AuditLog::with('user')
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('auditable_type', 'like', "%{$s}%")
                    ->orWhere('event', 'like', "%{$s}%");
            }))
            ->when($request->event, fn ($q, $e) => $q->where('event', $e))
            ->when($request->from, fn ($q, $d) => $q->whereDate('created_at', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('created_at', '<=', $d))
            ->latest();

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (AuditLog $l) => [
            'id' => $l->id,
            'event' => $l->event,
            'model' => class_basename($l->auditable_type),
            'model_id' => $l->auditable_id,
            'user' => $l->user?->name ?? 'System',
            'ip_address' => $l->ip_address,
            'created_at' => $l->created_at?->format('Y-m-d H:i'),
        ]);

        return $this->success($paginated);
    }

    public function settings(): JsonResponse
    {
        $settings = SystemSetting::where('school_id', $this->schoolId())->get();
        $school = auth()->user()->school;

        return $this->success([
            'school_name' => $school?->name ?? '',
            'school_address' => $school?->address ?? '',
            'school_phone' => $school?->phone ?? '',
            'school_email' => $school?->email ?? '',
            'school_logo' => school_logo_url($this->schoolId()),
            'slip_branding' => \App\Support\SlipBranding::resolve($this->schoolId()),
            'settings' => $settings->pluck('value', 'key'),
        ]);
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'school_name' => 'sometimes|string|max:255',
            'school_address' => 'nullable|string',
            'school_phone' => 'nullable|string|max:30',
            'school_email' => 'nullable|email|max:255',
            'slip_branding' => 'sometimes|array',
            'slip_branding.primary_color' => 'sometimes|string|max:20',
            'slip_branding.accent_color' => 'sometimes|string|max:20',
            'slip_branding.bg_color' => 'sometimes|string|max:20',
            'slip_branding.text_color' => 'sometimes|string|max:20',
            'slip_branding.border_color' => 'sometimes|string|max:20',
            'slip_branding.header_style' => 'sometimes|in:gradient,solid',
            'slip_branding.slip_theme' => 'sometimes|in:light,dark,auto',
            'slip_branding.show_qr' => 'sometimes|boolean',
            'slip_branding.show_logo' => 'sometimes|boolean',
            'slip_branding.custom_footer' => 'nullable|string|max:500',
        ]);

        $school = auth()->user()->school;
        if ($school) {
            $school->update(array_filter([
                'name' => $data['school_name'] ?? null,
                'address' => $data['school_address'] ?? null,
                'phone' => $data['school_phone'] ?? null,
                'email' => $data['school_email'] ?? null,
            ], fn ($v) => $v !== null));
        }

        if (isset($data['slip_branding'])) {
            save_school_setting('slip_branding', $data['slip_branding'], 'json', 'branding', $this->schoolId());
        }

        return $this->success(null, 'Settings saved');
    }

    public function resetDummyData(): JsonResponse
    {
        abort_unless(RegistrationGuard::isSuperAdmin(auth()->user()), 403);

        try {
            \Illuminate\Support\Facades\Artisan::call('db:seed', [
                '--class' => 'Database\\Seeders\\DummyDataSeeder',
                '--force' => true,
            ]);
        } catch (\Throwable $e) {
            return $this->error('Failed to load demo data: '.$e->getMessage(), 500);
        }

        ActivityLog::create([
            'school_id' => $this->schoolId(),
            'user_id' => auth()->id(),
            'action' => 'reset_dummy_data',
            'model_type' => 'System',
            'description' => auth()->user()->name.' loaded demo data for client preview.',
            'properties' => ['ip' => request()->ip()],
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);

        return $this->success(null, 'Demo data loaded. Your Super Admin account is unchanged. Refresh the page to see updates.');
    }

    public function systemSettings(): JsonResponse
    {
        $keys = [
            'academic_year', 'timezone', 'registration_open',
            'max_students_per_class', 'attendance_threshold', 'fee_due_day',
        ];
        $settings = SystemSetting::where('school_id', $this->schoolId())
            ->whereIn('key', $keys)
            ->get()
            ->pluck('value', 'key');

        return $this->success([
            'academic_year' => $settings['academic_year'] ?? date('Y').'-'.(date('Y') + 1),
            'timezone' => $settings['timezone'] ?? 'Asia/Karachi',
            'registration_open' => filter_var($settings['registration_open'] ?? 'true', FILTER_VALIDATE_BOOLEAN),
            'max_students_per_class' => (int) ($settings['max_students_per_class'] ?? 40),
            'attendance_threshold' => (int) ($settings['attendance_threshold'] ?? 75),
            'fee_due_day' => (int) ($settings['fee_due_day'] ?? 10),
        ]);
    }

    public function updateSystemSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'academic_year' => 'required|string|max:20',
            'timezone' => 'required|string|max:50',
            'registration_open' => 'required|boolean',
            'max_students_per_class' => 'required|integer|min:1|max:200',
            'attendance_threshold' => 'required|integer|min:0|max:100',
            'fee_due_day' => 'required|integer|min:1|max:28',
        ]);

        save_school_setting('academic_year', $data['academic_year'], 'string', 'system');
        save_school_setting('timezone', $data['timezone'], 'string', 'system');
        save_school_setting('registration_open', $data['registration_open'] ? 'true' : 'false', 'boolean', 'system');
        save_school_setting('max_students_per_class', $data['max_students_per_class'], 'integer', 'system');
        save_school_setting('attendance_threshold', $data['attendance_threshold'], 'integer', 'system');
        save_school_setting('fee_due_day', $data['fee_due_day'], 'integer', 'system');

        return $this->success(null, 'System settings saved');
    }

    public function roles(): JsonResponse
    {
        $protected = $this->protectedRoleNames();

        $roles = Role::with('permissions:id,name')
            ->withCount('users')
            ->where('guard_name', 'web')
            ->orderBy('name')
            ->get()
            ->map(fn (Role $r) => [
                'id' => $r->id,
                'name' => $r->name,
                'users_count' => $r->users_count,
                'permissions_count' => $r->permissions->count(),
                'permissions' => $r->permissions->pluck('name')->values()->all(),
                'is_protected' => in_array($r->name, $protected, true),
            ]);

        return $this->success($roles);
    }

    public function permissions(): JsonResponse
    {
        $permissions = Permission::where('guard_name', 'web')
            ->orderBy('name')
            ->get(['id', 'name'])
            ->map(fn (Permission $p) => [
                'id' => $p->id,
                'name' => $p->name,
                'group' => explode('.', $p->name)[0] ?? 'other',
            ]);

        return $this->success($permissions);
    }

    public function storeRole(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:100|unique:roles,name',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $name = $this->normalizeRoleName($data['name']);
        abort_if(Role::where('name', $name)->where('guard_name', 'web')->exists(), 422, 'Role already exists.');

        $role = Role::create(['name' => $name, 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions'] ?? []);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $this->success($this->transformRole($role->fresh('permissions')->loadCount('users')), 'Role created', 201);
    }

    public function updateRole(Request $request, Role $role): JsonResponse
    {
        abort_unless($role->guard_name === 'web', 404);

        $data = $request->validate([
            'name' => 'sometimes|required|string|max:100',
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        if (isset($data['name'])) {
            $name = $this->normalizeRoleName($data['name']);
            if ($name !== $role->name) {
                abort_if(in_array($role->name, $this->protectedRoleNames(), true), 422, 'System roles cannot be renamed.');
                abort_if(Role::where('name', $name)->where('guard_name', 'web')->where('id', '!=', $role->id)->exists(), 422, 'Role already exists.');
                $role->name = $name;
                $role->save();
            }
        }

        if (array_key_exists('permissions', $data)) {
            $role->syncPermissions($data['permissions'] ?? []);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $this->success($this->transformRole($role->fresh('permissions')->loadCount('users')), 'Role updated');
    }

    public function destroyRole(Role $role): JsonResponse
    {
        abort_unless($role->guard_name === 'web', 404);
        abort_if(in_array($role->name, $this->protectedRoleNames(), true), 422, 'System roles cannot be deleted.');
        abort_if($role->users()->count() > 0, 422, 'Cannot delete a role that still has users.');

        $role->syncPermissions([]);
        $role->delete();
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $this->success(null, 'Role deleted');
    }

    /** @return list<string> */
    private function protectedRoleNames(): array
    {
        return ['school-owner', 'admin', 'teacher', 'student', 'parent', 'accountant', 'reception', 'guest'];
    }

    private function normalizeRoleName(string $name): string
    {
        $slug = strtolower(trim(preg_replace('/[^a-zA-Z0-9]+/', '-', $name) ?? $name, '-'));

        return $slug !== '' ? $slug : 'role';
    }

    private function transformRole(Role $r): array
    {
        $r->loadMissing('permissions');

        return [
            'id' => $r->id,
            'name' => $r->name,
            'users_count' => $r->users_count ?? $r->users()->count(),
            'permissions_count' => $r->permissions->count(),
            'permissions' => $r->permissions->pluck('name')->values()->all(),
            'is_protected' => in_array($r->name, $this->protectedRoleNames(), true),
        ];
    }

    public function reports(Request $request): JsonResponse
    {
        $user = auth()->user();
        $schoolId = $this->schoolId();
        $type = $request->get('type', 'overview');
        $from = $request->get('from');
        $to = $request->get('to');

        $data = DashboardData::forUser($user);

        $payload = [
            'type' => $type,
            'stats' => $data['stats'],
            'chartLabels' => $data['chartLabels'],
            'chartData' => $data['chartData'],
            'feeMonths' => $data['feeMonths'],
            'feeData' => $data['feeData'],
            'genderData' => $data['genderData'],
            'classStrength' => $data['classStrength'],
            'recentAdmissions' => $data['recentAdmissions'],
        ];

        if ($type === 'financial') {
            $feeQuery = FeePayment::where('school_id', $schoolId);
            $expenseQuery = Expense::where('school_id', $schoolId);
            if ($from) {
                $feeQuery->whereDate('paid_at', '>=', $from);
                $expenseQuery->whereDate('expense_date', '>=', $from);
            }
            if ($to) {
                $feeQuery->whereDate('paid_at', '<=', $to);
                $expenseQuery->whereDate('expense_date', '<=', $to);
            }
            $payload['financial'] = [
                'fee_collected' => (float) $feeQuery->where('status', 'paid')->sum('amount'),
                'expenses' => (float) $expenseQuery->sum('amount'),
                'pending_fees' => (float) FeePayment::where('school_id', $schoolId)
                    ->whereIn('status', ['pending', 'overdue'])->sum('amount'),
            ];
        }

        if ($type === 'academic') {
            $payload['academic'] = [
                'total_students' => Student::where('school_id', $schoolId)->where('status', 'active')->count(),
                'total_classes' => SchoolClass::where('school_id', $schoolId)->where('status', 'active')->count(),
                'class_strength' => $data['classStrength'],
            ];
        }

        if ($type === 'attendance') {
            $attQuery = Attendance::where('school_id', $schoolId);
            if ($from) {
                $attQuery->whereDate('date', '>=', $from);
            }
            if ($to) {
                $attQuery->whereDate('date', '<=', $to);
            }
            $records = $attQuery->get();
            $total = $records->count();
            $payload['attendance'] = [
                'total_records' => $total,
                'present' => $records->whereIn('status', ['present', 'late'])->count(),
                'absent' => $records->where('status', 'absent')->count(),
                'rate' => $total > 0
                    ? round($records->whereIn('status', ['present', 'late'])->count() / $total * 100, 1)
                    : 0,
            ];
        }

        return $this->success($payload);
    }

    public function reportsExport(Request $request): StreamedResponse
    {
        $schoolId = $this->schoolId();
        $type = $request->get('type', 'overview');

        $headers = ['Content-Type' => 'text/csv', 'Content-Disposition' => "attachment; filename=report-{$type}.csv"];

        return response()->stream(function () use ($schoolId, $type, $request) {
            $handle = fopen('php://output', 'w');

            if ($type === 'financial') {
                fputcsv($handle, ['Date', 'Type', 'Title', 'Amount', 'Status']);
                $from = $request->get('from');
                $to = $request->get('to');
                $fees = FeePayment::where('school_id', $schoolId)
                    ->when($from, fn ($q, $d) => $q->whereDate('paid_at', '>=', $d))
                    ->when($to, fn ($q, $d) => $q->whereDate('paid_at', '<=', $d))
                    ->latest('paid_at')->limit(500)->get();
                foreach ($fees as $f) {
                    fputcsv($handle, [$f->paid_at?->format('Y-m-d'), 'Fee', $f->month_label ?? "Fee #{$f->id}", $f->amount, $f->status]);
                }
                $expenses = Expense::where('school_id', $schoolId)
                    ->when($from, fn ($q, $d) => $q->whereDate('expense_date', '>=', $d))
                    ->when($to, fn ($q, $d) => $q->whereDate('expense_date', '<=', $d))
                    ->latest('expense_date')->limit(500)->get();
                foreach ($expenses as $e) {
                    fputcsv($handle, [$e->expense_date?->format('Y-m-d'), 'Expense', $e->title, $e->amount, 'paid']);
                }
            } elseif ($type === 'academic') {
                fputcsv($handle, ['Class', 'Students']);
                $classes = SchoolClass::where('school_id', $schoolId)->withCount('students')->get();
                foreach ($classes as $c) {
                    fputcsv($handle, [$c->displayName(), $c->students_count]);
                }
            } elseif ($type === 'attendance') {
                fputcsv($handle, ['Date', 'Student ID', 'Status']);
                $from = $request->get('from');
                $to = $request->get('to');
                $records = Attendance::where('school_id', $schoolId)
                    ->when($from, fn ($q, $d) => $q->whereDate('date', '>=', $d))
                    ->when($to, fn ($q, $d) => $q->whereDate('date', '<=', $d))
                    ->latest('date')->limit(1000)->get();
                foreach ($records as $r) {
                    fputcsv($handle, [$r->date?->format('Y-m-d'), $r->student_id, $r->status]);
                }
            } else {
                fputcsv($handle, ['Metric', 'Value']);
                $data = DashboardData::forUser(auth()->user());
                foreach ($data['stats'] as $key => $val) {
                    fputcsv($handle, [$key, $val]);
                }
            }

            fclose($handle);
        }, 200, $headers);
    }

    public function libraryBooks(Request $request): JsonResponse
    {
        $query = LibraryBook::where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                    ->orWhere('author', 'like', "%{$s}%")
                    ->orWhere('isbn', 'like', "%{$s}%");
            }))
            ->when($request->name, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->category, fn ($q, $c) => $q->where('category', $c))
            ->latest();

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (LibraryBook $b) => $this->formatLibraryBook($b));

        return $this->success($paginated);
    }

    public function storeLibraryBook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:20',
            'category' => 'nullable|string|max:100',
            'total_copies' => 'required|integer|min:1|max:999',
            'shelf_location' => 'nullable|string|max:50',
            'status' => 'in:available,unavailable',
            'description' => 'nullable|string',
            'file' => 'nullable|file|max:51200',
        ]);
        $data['school_id'] = $this->schoolId();
        $data['available_copies'] = $data['total_copies'];

        $fileMeta = DocumentUpload::store($request->file('file'), 'library');
        if ($fileMeta) {
            $data['file_path'] = $fileMeta['file_path'];
            $data['file_name'] = $fileMeta['file_name'];
            $data['file_size'] = $fileMeta['file_size'];
            $data['mime_type'] = $fileMeta['mime_type'];
        }
        unset($data['file']);

        $book = LibraryBook::create($data);

        return $this->success($this->formatLibraryBook($book), 'Book added to library', 201);
    }

    public function updateLibraryBook(Request $request, LibraryBook $libraryBook): JsonResponse
    {
        abort_unless($libraryBook->school_id === $this->schoolId(), 403);
        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'author' => 'nullable|string|max:255',
            'isbn' => 'nullable|string|max:20',
            'category' => 'nullable|string|max:100',
            'total_copies' => 'sometimes|integer|min:1|max:999',
            'available_copies' => 'sometimes|integer|min:0|max:999',
            'shelf_location' => 'nullable|string|max:50',
            'status' => 'in:available,unavailable',
            'description' => 'nullable|string',
            'file' => 'nullable|file|max:51200',
        ]);

        $fileMeta = DocumentUpload::store($request->file('file'), 'library', $libraryBook->file_path);
        if ($fileMeta) {
            $data['file_path'] = $fileMeta['file_path'];
            $data['file_name'] = $fileMeta['file_name'];
            $data['file_size'] = $fileMeta['file_size'];
            $data['mime_type'] = $fileMeta['mime_type'];
        }
        unset($data['file']);

        $libraryBook->update($data);

        return $this->success($this->formatLibraryBook($libraryBook->fresh()), 'Book updated');
    }

    public function deleteLibraryBook(LibraryBook $libraryBook): JsonResponse
    {
        abort_unless($libraryBook->school_id === $this->schoolId(), 403);
        DocumentUpload::delete($libraryBook->file_path);
        $libraryBook->delete();

        return $this->success(null, 'Book removed');
    }

    public function downloadLibraryBook(LibraryBook $libraryBook): StreamedResponse|BinaryFileResponse|JsonResponse
    {
        abort_unless($libraryBook->school_id === $this->schoolId(), 403);

        if (! $libraryBook->file_path) {
            return $this->error('No file attached to this book', 404);
        }

        $disk = DocumentUpload::resolveDisk($libraryBook->file_path);
        if (! Storage::disk($disk)->exists($libraryBook->file_path)) {
            return $this->error('File not found on server', 404);
        }

        $filename = $libraryBook->file_name ?: basename($libraryBook->file_path);
        $headers = [
            'Content-Type' => $libraryBook->mime_type ?: 'application/octet-stream',
        ];

        if ($disk === 'local') {
            return response()->download(DocumentUpload::absolutePath($libraryBook->file_path), $filename, $headers);
        }

        return Storage::disk($disk)->download($libraryBook->file_path, $filename, $headers);
    }

    private function formatLibraryBook(LibraryBook $b): array
    {
        $hasFile = filled($b->file_path);

        return [
            'id' => $b->id,
            'title' => $b->title,
            'author' => $b->author ?? '—',
            'isbn' => $b->isbn ?? '—',
            'category' => $b->category ?? 'General',
            'total_copies' => $b->total_copies,
            'available_copies' => $b->available_copies,
            'shelf_location' => $b->shelf_location ?? '—',
            'status' => $b->status,
            'description' => $b->description,
            'file_name' => $b->file_name,
            'file_size' => $b->file_size,
            'has_file' => $hasFile,
            'download_url' => $hasFile ? "/api/v1/library/{$b->id}/download" : null,
        ];
    }

    public function certificates(Request $request): JsonResponse
    {
        $query = Certificate::with(['student', 'issuer'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->name, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $t) => $q->where('type', $t))
            ->when($request->class_id, fn ($q, $c) => $q->whereHas('student', fn ($q) => $q->where('school_class_id', $c)))
            ->when($request->from, fn ($q, $d) => $q->whereDate('issue_date', '>=', $d))
            ->when($request->to, fn ($q, $d) => $q->whereDate('issue_date', '<=', $d))
            ->latest();

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Certificate $c) => [
            'id' => $c->id,
            'title' => $c->title,
            'type' => $c->type,
            'student_id' => $c->student_id,
            'student' => $c->student?->name ?? '—',
            'status' => $c->status,
            'issue_date' => $c->issue_date?->format('Y-m-d') ?? '—',
            'issued_by' => $c->issuer?->name ?? '—',
            'notes' => $c->notes,
        ]);

        return $this->success($paginated);
    }

    public function storeCertificate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'title' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'issue_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $student = Student::where('school_id', $this->schoolId())->findOrFail($data['student_id']);

        $certificate = Certificate::create([
            'school_id' => $this->schoolId(),
            'student_id' => $student->id,
            'title' => $data['title'],
            'type' => $data['type'],
            'issue_date' => $data['issue_date'] ?? null,
            'notes' => $data['notes'] ?? null,
            'status' => 'draft',
        ]);

        return $this->success($certificate, 'Certificate created', 201);
    }

    public function updateCertificate(Request $request, Certificate $certificate): JsonResponse
    {
        abort_unless($certificate->school_id === $this->schoolId(), 403);

        $data = $request->validate([
            'student_id' => 'required|exists:students,id',
            'title' => 'required|string|max:255',
            'type' => 'required|string|max:100',
            'issue_date' => 'nullable|date',
            'notes' => 'nullable|string',
        ]);

        $student = Student::where('school_id', $this->schoolId())->findOrFail($data['student_id']);

        $certificate->update([
            'student_id' => $student->id,
            'title' => $data['title'],
            'type' => $data['type'],
            'issue_date' => $data['issue_date'] ?? null,
            'notes' => $data['notes'] ?? null,
        ]);

        return $this->success($certificate->fresh(['student', 'issuer']), 'Certificate updated');
    }

    public function destroyCertificate(Certificate $certificate): JsonResponse
    {
        abort_unless($certificate->school_id === $this->schoolId(), 403);
        $certificate->delete();

        return $this->success(null, 'Certificate deleted');
    }

    public function approveCertificate(Certificate $certificate): JsonResponse
    {
        abort_unless($certificate->school_id === $this->schoolId(), 403);
        abort_unless(in_array($certificate->status, ['draft', 'pending']), 422, 'Certificate cannot be approved');

        $certificate->update([
            'status' => 'approved',
            'issued_by' => auth()->id(),
            'issue_date' => $certificate->issue_date ?? now(),
        ]);

        return $this->success($certificate, 'Certificate approved');
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = auth()->user();
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'current_password' => 'required_with:password|string',
            'password' => 'nullable|string|min:8|confirmed',
        ]);

        if (! empty($data['password'])) {
            if (! Hash::check($data['current_password'], $user->password)) {
                return $this->error('Current password is incorrect', 422);
            }
            $user->password = Hash::make($data['password']);
        }

        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (isset($data['email'])) {
            $user->email = $data['email'];
        }
        $user->save();

        return $this->success([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
        ], 'Profile updated');
    }
}
