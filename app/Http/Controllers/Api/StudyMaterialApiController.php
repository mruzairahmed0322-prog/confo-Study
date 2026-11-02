<?php

namespace App\Http\Controllers\Api;

use App\Models\StudyMaterial;
use App\Support\DocumentUpload;
use App\Support\NotificationService;
use App\Support\RoleDataScope;
use App\Support\StudyMaterialAccess;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class StudyMaterialApiController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $user = auth()->user();

        $query = StudyMaterial::with(['teacher', 'subject', 'schoolClass', 'liveClass'])
            ->where('school_id', $this->schoolId())
            ->when($request->search, fn ($q, $s) => $q->where(function ($q) use ($s) {
                $q->where('title', 'like', "%{$s}%")
                    ->orWhere('description', 'like', "%{$s}%")
                    ->orWhere('file_name', 'like', "%{$s}%");
            }))
            ->when($request->name, fn ($q, $s) => $q->where('title', 'like', "%{$s}%"))
            ->when($request->status, fn ($q, $s) => $q->where('status', $s))
            ->when($request->type, fn ($q, $s) => $q->where('type', $s))
            ->when($request->class_id, fn ($q, $s) => $q->where('school_class_id', $s))
            ->when($request->subject_id, fn ($q, $s) => $q->where('subject_id', $s))
            ->when($request->live_class_id, fn ($q, $s) => $q->where('live_class_id', $s))
            ->when($request->from, fn ($q, $s) => $q->whereDate('created_at', '>=', $s))
            ->when($request->to, fn ($q, $s) => $q->whereDate('created_at', '<=', $s))
            ->latest();

        RoleDataScope::scopeStudyMaterials($query);

        if ($user->hasRole('student') || $user->hasRole('parent')) {
            $query->where('status', 'published');
        }

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(
            fn (StudyMaterial $m) => StudyMaterialAccess::formatForUser($m, $user)
        );

        return $this->success($paginated);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless(
            auth()->user()->can('materials.create') || auth()->user()->hasRole('teacher'),
            403
        );

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => 'in:notes,pdf,book,magazine,document,study_material,image,other',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'live_class_id' => 'nullable|exists:live_classes,id',
            'download_allowed' => 'nullable|boolean',
            'status' => 'in:draft,published',
            'file' => 'required|file|max:20480',
        ]);

        $type = $data['type'] ?? 'pdf';
        if (! StudyMaterialAccess::isSchoolWideType($type) && empty($data['school_class_id'])) {
            return $this->error('Class is required for this material type', 422);
        }

        $teacher = RoleDataScope::teacher();
        $fileMeta = DocumentUpload::store($request->file('file'), 'materials');

        if ($fileMeta) {
            $duplicate = StudyMaterial::where('school_id', $this->schoolId())
                ->where('file_hash', $fileMeta['file_hash'])
                ->when(
                    filled($data['school_class_id'] ?? null),
                    fn ($q) => $q->where('school_class_id', $data['school_class_id']),
                    fn ($q) => $q->whereNull('school_class_id')
                )
                ->when(
                    filled($data['subject_id'] ?? null),
                    fn ($q) => $q->where('subject_id', $data['subject_id']),
                    fn ($q) => $q->whereNull('subject_id')
                )
                ->when(
                    filled($data['live_class_id'] ?? null),
                    fn ($q) => $q->where('live_class_id', $data['live_class_id']),
                    fn ($q) => $q->whereNull('live_class_id')
                )
                ->first();

            if ($duplicate) {
                DocumentUpload::delete($fileMeta['file_path']);

                return $this->success(
                    StudyMaterialAccess::formatForUser(
                        $duplicate->load(['teacher', 'subject', 'schoolClass', 'liveClass']),
                        auth()->user()
                    ),
                    'This file is already uploaded for this class/subject.',
                    200
                );
            }
        }

        $material = StudyMaterial::create([
            'school_id' => $this->schoolId(),
            'teacher_id' => $teacher?->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'type' => $type,
            'school_class_id' => $data['school_class_id'] ?? null,
            'subject_id' => $data['subject_id'] ?? null,
            'live_class_id' => $data['live_class_id'] ?? null,
            'download_allowed' => $request->boolean('download_allowed', true),
            'status' => $data['status'] ?? 'published',
            ...($fileMeta ?? []),
        ]);

        if ($material->status === 'published') {
            $this->notifyClass($material);
        }

        return $this->success(
            StudyMaterialAccess::formatForUser($material->load(['teacher', 'subject', 'schoolClass', 'liveClass']), auth()->user()),
            'Study material uploaded',
            201
        );
    }

    public function update(Request $request, StudyMaterial $studyMaterial): JsonResponse
    {
        abort_unless($studyMaterial->school_id === $this->schoolId(), 403);
        abort_unless(StudyMaterialAccess::canManage(auth()->user(), $studyMaterial), 403);

        $wasDraft = $studyMaterial->status === 'draft';

        $data = $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => 'in:notes,pdf,book,magazine,document,study_material,image,other',
            'school_class_id' => 'nullable|exists:school_classes,id',
            'subject_id' => 'nullable|exists:subjects,id',
            'live_class_id' => 'nullable|exists:live_classes,id',
            'download_allowed' => 'nullable|boolean',
            'status' => 'in:draft,published',
            'file' => 'nullable|file|max:20480',
        ]);

        $nextType = $data['type'] ?? $studyMaterial->type;
        $nextClassId = array_key_exists('school_class_id', $data)
            ? $data['school_class_id']
            : $studyMaterial->school_class_id;

        if (! StudyMaterialAccess::isSchoolWideType($nextType) && empty($nextClassId)) {
            return $this->error('Class is required for this material type', 422);
        }

        if (StudyMaterialAccess::isSchoolWideType($nextType)) {
            $data['school_class_id'] = $nextClassId ?: null;
            $data['download_allowed'] = $request->has('download_allowed')
                ? $request->boolean('download_allowed')
                : ($data['download_allowed'] ?? true);
        } elseif ($request->has('download_allowed')) {
            $data['download_allowed'] = $request->boolean('download_allowed');
        }

        $fileMeta = DocumentUpload::store($request->file('file'), 'materials', $studyMaterial->file_path);
        if ($fileMeta) {
            $data = array_merge($data, $fileMeta);
        }

        $studyMaterial->update($data);

        if ($wasDraft && $studyMaterial->status === 'published') {
            $this->notifyClass($studyMaterial);
        }

        return $this->success(
            StudyMaterialAccess::formatForUser($studyMaterial->fresh(['teacher', 'subject', 'schoolClass', 'liveClass']), auth()->user()),
            'Study material updated'
        );
    }

    public function destroy(StudyMaterial $studyMaterial): JsonResponse
    {
        abort_unless($studyMaterial->school_id === $this->schoolId(), 403);
        abort_unless(StudyMaterialAccess::canManage(auth()->user(), $studyMaterial), 403);

        DocumentUpload::delete($studyMaterial->file_path);
        $studyMaterial->delete();

        return $this->success(null, 'Study material removed');
    }

    public function view(StudyMaterial $studyMaterial): BinaryFileResponse|JsonResponse
    {
        return $this->streamFile($studyMaterial, inline: true);
    }

    public function download(StudyMaterial $studyMaterial): StreamedResponse|BinaryFileResponse|JsonResponse
    {
        abort_unless(StudyMaterialAccess::canDownload(auth()->user(), $studyMaterial), 403);

        return $this->streamFile($studyMaterial, inline: false);
    }

    private function streamFile(StudyMaterial $studyMaterial, bool $inline): StreamedResponse|BinaryFileResponse|JsonResponse
    {
        abort_unless($studyMaterial->school_id === $this->schoolId(), 403);

        if ($inline) {
            abort_unless(StudyMaterialAccess::canOpen(auth()->user(), $studyMaterial), 403);
        }

        $disk = DocumentUpload::resolveDisk($studyMaterial->file_path ?? '');

        if (! $studyMaterial->file_path || ! Storage::disk($disk)->exists($studyMaterial->file_path)) {
            return $this->error('File not found', 404);
        }

        $filename = $studyMaterial->file_name ?? basename($studyMaterial->file_path);
        $headers = [
            'Content-Type' => $studyMaterial->mime_type ?? 'application/octet-stream',
            'Content-Disposition' => ($inline ? 'inline' : 'attachment').'; filename="'.addslashes($filename).'"',
            'Cache-Control' => 'private, no-store',
            'X-Content-Type-Options' => 'nosniff',
        ];

        if ($inline) {
            return response()->file(DocumentUpload::absolutePath($studyMaterial->file_path), $headers);
        }

        return Storage::disk($disk)->download($studyMaterial->file_path, $filename, $headers);
    }

    private function notifyClass(StudyMaterial $material): void
    {
        $material->loadMissing(['subject', 'schoolClass']);

        NotificationService::dispatchForStudyMaterial($material, 'study_material_published', [
            'material_title' => $material->title,
            'material_type' => str_replace('_', ' ', $material->type),
            'subject_name' => $material->subject?->name ?? '—',
            'class_name' => $material->schoolClass?->displayName() ?? '—',
        ], '/app/materials');
    }
}
