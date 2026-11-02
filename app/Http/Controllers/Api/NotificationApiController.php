<?php

namespace App\Http\Controllers\Api;

use App\Models\NotificationTemplate;
use App\Models\PushDeviceToken;
use App\Models\UserNotification;
use App\Support\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationApiController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = UserNotification::where('user_id', auth()->id())
            ->where('school_id', $this->schoolId())
            ->latest();

        if ($request->boolean('unread_only')) {
            $query->whereNull('read_at');
        }

        $paginated = $this->paginated($query);
        $paginated->getCollection()->transform(fn (UserNotification $n) => [
            'id' => $n->id,
            'type' => $n->type,
            'title' => $n->title,
            'body' => $n->body,
            'icon' => $n->icon,
            'link' => $n->link,
            'read' => $n->read_at !== null,
            'time' => $n->created_at->diffForHumans(),
            'created_at' => $n->created_at->toIso8601String(),
        ]);

        return $this->success($paginated);
    }

    public function unreadCount(): JsonResponse
    {
        $count = UserNotification::where('user_id', auth()->id())
            ->where('school_id', $this->schoolId())
            ->whereNull('read_at')
            ->count();

        return $this->success(['count' => $count]);
    }

    public function markRead(UserNotification $notification): JsonResponse
    {
        abort_unless($notification->user_id === auth()->id(), 403);
        $notification->markRead();

        return $this->success(null, 'Marked as read');
    }

    public function markAllRead(): JsonResponse
    {
        UserNotification::where('user_id', auth()->id())
            ->where('school_id', $this->schoolId())
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return $this->success(null, 'All marked as read');
    }

    public function templates(): JsonResponse
    {
        NotificationService::seedTemplatesForSchool($this->schoolId());

        $templates = NotificationTemplate::where('school_id', $this->schoolId())
            ->orderBy('type')
            ->get()
            ->map(fn (NotificationTemplate $t) => [
                'id' => $t->id,
                'type' => $t->type,
                'name' => $t->name,
                'title_template' => $t->title_template,
                'body_template' => $t->body_template,
                'audience' => $t->audience,
                'icon' => $t->icon,
                'is_active' => $t->is_active,
                'is_system' => $t->is_system,
            ]);

        return $this->success($templates);
    }

    public function updateTemplate(Request $request, NotificationTemplate $template): JsonResponse
    {
        abort_unless($template->school_id === $this->schoolId(), 403);

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'title_template' => 'sometimes|string|max:500',
            'body_template' => 'sometimes|string|max:2000',
            'audience' => 'sometimes|array',
            'audience.*' => 'in:admin,staff,teacher,student,parent',
            'icon' => 'sometimes|string|max:50',
            'is_active' => 'sometimes|boolean',
        ]);

        $template->update($data);

        return $this->success($template, 'Template updated');
    }

    public function generateTemplate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|in:new_student,new_teacher,upcoming_event,upcoming_exam,fee_overdue,custom',
            'tone' => 'nullable|in:professional,friendly,formal',
            'school_name' => 'nullable|string|max:255',
        ]);

        $generated = NotificationService::generateTemplate(
            $data['type'],
            $data
        );

        return $this->success($generated, 'Template generated');
    }

    public function sendTest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type' => 'required|string',
            'vars' => 'nullable|array',
        ]);

        $count = NotificationService::dispatch(
            $this->schoolId(),
            $data['type'],
            $data['vars'] ?? [
                'student_name' => 'Test Student',
                'class_name' => 'Class 10-A',
                'roll_no' => '001',
                'teacher_name' => 'Test Teacher',
                'employee_id' => 'T-001',
                'event_title' => 'Annual Day',
                'event_date' => now()->addDays(7)->format('M d, Y'),
                'exam_name' => 'Mid Term Exam',
                'exam_date' => now()->addDays(14)->format('M d, Y'),
                'amount' => '5,000',
                'due_date' => now()->subDays(3)->format('M d, Y'),
            ]
        );

        return $this->success(['sent' => $count], "Test notification sent to {$count} user(s)");
    }

    public function registerPushToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string|max:255',
            'platform' => 'nullable|in:ios,android',
            'device_name' => 'nullable|string|max:255',
        ]);

        PushDeviceToken::updateOrCreate(
            ['token' => $data['token']],
            [
                'user_id' => auth()->id(),
                'school_id' => $this->schoolId(),
                'platform' => $data['platform'] ?? null,
                'device_name' => $data['device_name'] ?? null,
                'last_used_at' => now(),
            ]
        );

        return $this->success(null, 'Push token registered');
    }

    public function unregisterPushToken(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => 'required|string|max:255',
        ]);

        PushDeviceToken::where('user_id', auth()->id())
            ->where('token', $data['token'])
            ->delete();

        return $this->success(null, 'Push token removed');
    }
}
