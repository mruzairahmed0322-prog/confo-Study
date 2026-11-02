<?php

namespace App\Http\Controllers\Api;

use App\Models\Assignment;
use App\Support\RoleDataScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssignmentApiController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Assignment::with(['teacher', 'subject', 'schoolClass'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->latest();

        RoleDataScope::scopeAssignments($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Assignment $a) => [
            'id' => $a->id,
            'title' => $a->title,
            'description' => $a->description,
            'due_date' => $a->due_date?->format('Y-m-d'),
            'total_marks' => $a->total_marks,
            'status' => $a->status,
            'subject' => $a->subject?->name,
            'class' => $a->schoolClass?->displayName(),
            'school_class_id' => $a->school_class_id,
            'subject_id' => $a->subject_id,
        ]);

        return $this->success($paginated);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'total_marks' => 'nullable|integer|min:1',
            'status' => 'in:draft,published,closed',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'subject_id' => 'nullable|exists:subjects,id',
        ]);

        $data['school_id'] = $this->schoolId();
        $data['total_marks'] = $data['total_marks'] ?? 100;
        $data['status'] = $data['status'] ?? 'draft';

        $assignment = Assignment::create($data);

        return $this->success($assignment, 'Homework created', 201);
    }

    public function update(Request $request, Assignment $assignment): JsonResponse
    {
        abort_unless($assignment->school_id === $this->schoolId(), 403);

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'total_marks' => 'nullable|integer|min:1',
            'status' => 'in:draft,published,closed',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'subject_id' => 'nullable|exists:subjects,id',
        ]);

        $assignment->update($data);

        return $this->success($assignment, 'Homework updated');
    }

    public function destroy(Assignment $assignment): JsonResponse
    {
        abort_unless($assignment->school_id === $this->schoolId(), 403);
        $assignment->delete();

        return $this->success(null, 'Homework deleted');
    }
}
