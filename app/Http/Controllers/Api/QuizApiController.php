<?php

namespace App\Http\Controllers\Api;

use App\Models\Quiz;
use App\Support\RoleDataScope;
use App\Models\QuizAttempt;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuizApiController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Quiz::with(['teacher', 'subject'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->class_id, fn ($q, $c) => $q->where('school_class_id', $c))
            ->when($request->subject_id, fn ($q, $s) => $q->where('subject_id', $s))
            ->latest();

        RoleDataScope::scopeQuizzes($query);

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (Quiz $q) => [
            'id' => $q->id,
            'title' => $q->title,
            'description' => $q->description,
            'duration_minutes' => $q->duration_minutes,
            'total_marks' => $q->total_marks,
            'status' => $q->status,
            'subject' => $q->subject?->name,
            'subject_id' => $q->subject_id,
            'school_class_id' => $q->school_class_id,
            'start_time' => $q->start_time?->toIso8601String(),
            'end_time' => $q->end_time?->toIso8601String(),
        ]);

        return $this->success($paginated);
    }

    public function show(Quiz $quiz): JsonResponse
    {
        abort_unless($quiz->school_id === $this->schoolId(), 403);

        $studentId = $this->resolveStudentId(optional: true);
        $existingAttempt = $studentId
            ? QuizAttempt::where('quiz_id', $quiz->id)->where('student_id', $studentId)->where('status', 'completed')->first()
            : null;

        $quiz->load(['questions' => fn ($q) => $q->orderBy('sort_order')]);

        return $this->success([
            'id' => $quiz->id,
            'title' => $quiz->title,
            'description' => $quiz->description,
            'duration_minutes' => $quiz->duration_minutes,
            'total_marks' => $quiz->total_marks,
            'status' => $quiz->status,
            'has_attempted' => (bool) $existingAttempt,
            'attempt_score' => $existingAttempt?->score,
            'questions' => $quiz->questions->map(fn ($q) => [
                'id' => $q->id,
                'question' => $q->question,
                'options' => $q->options ?? [],
                'marks' => $q->marks,
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'nullable|integer|min:1|max:480',
            'total_marks' => 'nullable|integer|min:1',
            'subject_id' => 'nullable|exists:subjects,id',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after:start_time',
            'status' => 'in:draft,active,closed',
        ]);

        $data['school_id'] = $this->schoolId();
        $data['duration_minutes'] = $data['duration_minutes'] ?? 30;
        $data['total_marks'] = $data['total_marks'] ?? 100;
        $data['status'] = $data['status'] ?? 'draft';

        $quiz = Quiz::create($data);

        return $this->success($quiz, 'Quiz created', 201);
    }

    public function update(Request $request, Quiz $quiz): JsonResponse
    {
        abort_unless($quiz->school_id === $this->schoolId(), 403);

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'duration_minutes' => 'nullable|integer|min:1|max:480',
            'total_marks' => 'nullable|integer|min:1',
            'subject_id' => 'nullable|exists:subjects,id',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'start_time' => 'nullable|date',
            'end_time' => 'nullable|date|after:start_time',
            'status' => 'in:draft,active,closed',
        ]);

        $quiz->update($data);

        return $this->success($quiz->fresh(), 'Quiz updated');
    }

    public function destroy(Quiz $quiz): JsonResponse
    {
        abort_unless($quiz->school_id === $this->schoolId(), 403);
        $quiz->delete();

        return $this->success(null, 'Quiz deleted');
    }

    public function attempt(Request $request, Quiz $quiz): JsonResponse
    {
        abort_unless($quiz->school_id === $this->schoolId(), 403);
        abort_unless($quiz->status === 'active', 422, 'Quiz is not active');

        $studentId = $this->resolveStudentId();

        $alreadyAttempted = QuizAttempt::where('quiz_id', $quiz->id)
            ->where('student_id', $studentId)
            ->where('status', 'completed')
            ->exists();

        if ($alreadyAttempted) {
            return $this->error('You have already attempted this quiz', 409);
        }

        $data = $request->validate([
            'answers' => 'required|array',
            'answers.*' => 'required|string',
        ]);

        $quiz->load('questions');
        $score = 0;
        foreach ($quiz->questions as $question) {
            $answer = $data['answers'][(string) $question->id] ?? $data['answers'][$question->id] ?? null;
            if ($answer === $question->correct_answer) {
                $score += $question->marks;
            }
        }

        $attempt = QuizAttempt::updateOrCreate(
            ['quiz_id' => $quiz->id, 'student_id' => $studentId],
            [
                'answers' => $data['answers'],
                'score' => $score,
                'status' => 'completed',
                'started_at' => now(),
                'completed_at' => now(),
            ]
        );

        return $this->success([
            'score' => $score,
            'total_marks' => $quiz->total_marks,
            'attempt_id' => $attempt->id,
        ], 'Quiz submitted');
    }

    private function resolveStudentId(bool $optional = false): ?int
    {
        $user = auth()->user();

        $student = Student::where('school_id', $this->schoolId())
            ->where(function ($q) use ($user) {
                $q->where('name', $user->name);
                if ($user->phone) {
                    $q->orWhere('phone', $user->phone);
                }
            })
            ->first();

        if (! $student) {
            if ($optional) {
                return null;
            }
            abort(403, 'Student profile not found');
        }

        return $student->id;
    }
}
