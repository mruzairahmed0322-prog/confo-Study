<?php

namespace App\Support;

use App\Models\LiveClass;
use App\Models\NotificationTemplate;
use App\Models\Student;
use App\Models\StudyMaterial;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Support\Collection;

class NotificationService
{
    /** @var array<string, array{name: string, title: string, body: string, audience: list<string>, icon: string}> */
    public const DEFAULT_TEMPLATES = [
        'new_student' => [
            'name' => 'New Student Admission',
            'title' => 'New Student: {student_name}',
            'body' => '{student_name} has been admitted to {class_name}. Roll No: {roll_no}. Welcome aboard!',
            'audience' => ['admin', 'staff', 'teacher'],
            'icon' => 'user-plus',
        ],
        'new_teacher' => [
            'name' => 'New Teacher Joined',
            'title' => 'Welcome {teacher_name}',
            'body' => '{teacher_name} has joined as a teacher. Employee ID: {employee_id}.',
            'audience' => ['admin', 'staff'],
            'icon' => 'graduation-cap',
        ],
        'upcoming_event' => [
            'name' => 'Upcoming Event',
            'title' => 'Event: {event_title}',
            'body' => '{event_title} is scheduled on {event_date}. Don\'t miss it!',
            'audience' => ['student', 'teacher', 'staff', 'parent'],
            'icon' => 'calendar',
        ],
        'upcoming_exam' => [
            'name' => 'Upcoming Exam',
            'title' => 'Exam: {exam_name}',
            'body' => '{exam_name} starts on {exam_date}. Class: {class_name}. Prepare well!',
            'audience' => ['student', 'teacher', 'parent'],
            'icon' => 'file-badge',
        ],
        'fee_overdue' => [
            'name' => 'Fee Overdue Alert',
            'title' => 'Fee Overdue: {student_name}',
            'body' => 'Fee payment of {amount} for {student_name} is overdue since {due_date}.',
            'audience' => ['parent', 'admin'],
            'icon' => 'banknote',
        ],
        'live_class_scheduled' => [
            'name' => 'Live Class Scheduled',
            'title' => 'Live Class: {class_title}',
            'body' => '{class_title} for {subject_name} is scheduled on {class_date} at {class_time}. Class: {class_name}. Join from Live Classes.',
            'audience' => ['student', 'teacher', 'admin', 'parent'],
            'icon' => 'video',
        ],
        'recording_available' => [
            'name' => 'Class Recording Available',
            'title' => 'Recording Ready: {class_title}',
            'body' => 'Recording for {class_title} ({subject_name}) on {class_date} is now available. Watch from Recordings.',
            'audience' => ['student', 'teacher', 'admin', 'parent'],
            'icon' => 'video',
        ],
        'study_material_published' => [
            'name' => 'New Study Material',
            'title' => 'New Material: {material_title}',
            'body' => '{material_title} ({material_type}) for {subject_name} — Class {class_name} is now available. Open Study Materials.',
            'audience' => ['student', 'parent'],
            'icon' => 'file-text',
        ],
    ];

    public static function seedTemplatesForSchool(int $schoolId): void
    {
        foreach (self::DEFAULT_TEMPLATES as $type => $tpl) {
            NotificationTemplate::firstOrCreate(
                ['school_id' => $schoolId, 'type' => $type],
                [
                    'name' => $tpl['name'],
                    'title_template' => $tpl['title'],
                    'body_template' => $tpl['body'],
                    'audience' => $tpl['audience'],
                    'icon' => $tpl['icon'],
                    'is_active' => true,
                    'is_system' => true,
                ]
            );
        }
    }

    /**
     * Dispatch notification to all users matching template audience.
     *
     * @param  array<string, string>  $vars
     */
    public static function dispatch(int $schoolId, string $type, array $vars = [], ?string $link = null): int
    {
        self::seedTemplatesForSchool($schoolId);

        $template = NotificationTemplate::where('school_id', $schoolId)
            ->where('type', $type)
            ->where('is_active', true)
            ->first();

        if (! $template) {
            return 0;
        }

        $rendered = $template->render($vars);
        $users = self::resolveAudience($schoolId, $template->audience);

        $count = 0;
        foreach ($users as $user) {
            // Duplicate check: skip if same type+title sent in last 5 minutes
            $exists = UserNotification::where('user_id', $user->id)
                ->where('type', $type)
                ->where('title', $rendered['title'])
                ->where('created_at', '>=', now()->subMinutes(5))
                ->exists();

            if ($exists) {
                continue;
            }

            UserNotification::create([
                'school_id' => $schoolId,
                'user_id' => $user->id,
                'type' => $type,
                'title' => $rendered['title'],
                'body' => $rendered['body'],
                'icon' => $template->icon,
                'link' => $link,
                'meta' => $vars,
            ]);

            ExpoPushService::sendToUser($user, $rendered['title'], $rendered['body'], [
                'url' => ExpoPushService::mobileUrlFromLink($link),
                'type' => $type,
            ]);

            $count++;
        }

        return $count;
    }

    /**
     * Send notification to fee-paid students/parents in a live class, plus teacher and admin.
     *
     * @param  array<string, string>  $vars
     */
    public static function dispatchForLiveClass(LiveClass $liveClass, string $type, array $vars = [], ?string $link = null): int
    {
        self::seedTemplatesForSchool($liveClass->school_id);

        $template = NotificationTemplate::where('school_id', $liveClass->school_id)
            ->where('type', $type)
            ->where('is_active', true)
            ->first();

        if (! $template) {
            return 0;
        }

        $rendered = $template->render($vars);
        $users = self::resolveLiveClassAudience($liveClass, $template->audience);

        $count = 0;
        foreach ($users as $user) {
            $exists = UserNotification::where('user_id', $user->id)
                ->where('type', $type)
                ->where('title', $rendered['title'])
                ->where('created_at', '>=', now()->subMinutes(5))
                ->exists();

            if ($exists) {
                continue;
            }

            UserNotification::create([
                'school_id' => $liveClass->school_id,
                'user_id' => $user->id,
                'type' => $type,
                'title' => $rendered['title'],
                'body' => $rendered['body'],
                'icon' => $template->icon,
                'link' => $link,
                'meta' => array_merge($vars, ['live_class_id' => $liveClass->id]),
            ]);

            ExpoPushService::sendToUser($user, $rendered['title'], $rendered['body'], [
                'url' => ExpoPushService::mobileUrlFromLink($link),
                'type' => $type,
                'live_class_id' => $liveClass->id,
            ]);

            $count++;
        }

        return $count;
    }

    /**
     * Notify fee-paid students/parents when study material is published.
     *
     * @param  array<string, string>  $vars
     */
    public static function dispatchForStudyMaterial(StudyMaterial $material, string $type, array $vars = [], ?string $link = null): int
    {
        self::seedTemplatesForSchool($material->school_id);

        $template = NotificationTemplate::where('school_id', $material->school_id)
            ->where('type', $type)
            ->where('is_active', true)
            ->first();

        if (! $template) {
            return 0;
        }

        $rendered = $template->render($vars);
        $users = self::resolveStudyMaterialAudience($material, $template->audience);

        $count = 0;
        foreach ($users as $user) {
            UserNotification::create([
                'school_id' => $material->school_id,
                'user_id' => $user->id,
                'type' => $type,
                'title' => $rendered['title'],
                'body' => $rendered['body'],
                'icon' => $template->icon,
                'link' => $link,
                'meta' => array_merge($vars, ['study_material_id' => $material->id]),
            ]);

            ExpoPushService::sendToUser($user, $rendered['title'], $rendered['body'], [
                'url' => ExpoPushService::mobileUrlFromLink($link),
                'type' => $type,
                'study_material_id' => $material->id,
            ]);

            $count++;
        }

        return $count;
    }

    /** @param  list<string>  $audience */
    public static function resolveStudyMaterialAudience(StudyMaterial $material, array $audience): Collection
    {
        $schoolId = $material->school_id;
        $users = collect();
        $schoolWide = StudyMaterialAccess::isSchoolWideType($material->type) || ! $material->school_class_id;

        if (in_array('student', $audience, true)) {
            $studentQuery = Student::where('school_id', $schoolId)
                ->where('status', 'active')
                ->whereNotNull('user_id')
                ->whereNotNull('school_class_id');

            if (! $schoolWide) {
                $studentQuery->where('school_class_id', $material->school_class_id);
            }

            $users = $users->merge(
                User::whereIn('id', $studentQuery->pluck('user_id'))
                    ->where('fee_cleared', true)
                    ->where('account_status', 'active')
                    ->get()
            );
        }

        if (in_array('parent', $audience, true)) {
            $parentQuery = Student::where('school_id', $schoolId)
                ->where('status', 'active')
                ->whereNotNull('parent_id');

            if (! $schoolWide) {
                $parentQuery->where('school_class_id', $material->school_class_id);
            }

            $users = $users->merge(
                User::whereIn('id', $parentQuery->pluck('parent_id'))
                    ->where('fee_cleared', true)
                    ->where('account_status', 'active')
                    ->get()
            );
        }

        return $users->filter()->unique('id')->values();
    }

    /** @param  list<string>  $audience */
    public static function resolveLiveClassAudience(LiveClass $liveClass, array $audience): Collection
    {
        $schoolId = $liveClass->school_id;
        $users = collect();

        if (in_array('admin', $audience, true)) {
            $users = $users->merge(
                User::where('school_id', $schoolId)
                    ->where('account_status', 'active')
                    ->whereHas('roles', fn ($q) => $q->whereIn('name', ['school-owner', 'admin']))
                    ->get()
            );
        }

        if (in_array('teacher', $audience, true) && $liveClass->teacher_id) {
            $teacherUserId = $liveClass->teacher?->user_id;
            if ($teacherUserId) {
                $teacherUser = User::where('id', $teacherUserId)->where('account_status', 'active')->first();
                if ($teacherUser) {
                    $users->push($teacherUser);
                }
            }
        }

        if ($liveClass->school_class_id) {
            if (in_array('student', $audience, true)) {
                $studentUserIds = Student::where('school_id', $schoolId)
                    ->where('school_class_id', $liveClass->school_class_id)
                    ->whereNotNull('user_id')
                    ->where(function ($q) {
                        $q->whereNull('status')->orWhere('status', 'active');
                    })
                    ->pluck('user_id');

                $users = $users->merge(
                    User::whereIn('id', $studentUserIds)
                        ->where('fee_cleared', true)
                        ->where('account_status', 'active')
                        ->get()
                );
            }

            if (in_array('parent', $audience, true)) {
                $parentIds = Student::where('school_id', $schoolId)
                    ->where('school_class_id', $liveClass->school_class_id)
                    ->whereNotNull('parent_id')
                    ->where(function ($q) {
                        $q->whereNull('status')->orWhere('status', 'active');
                    })
                    ->pluck('parent_id');

                $users = $users->merge(
                    User::whereIn('id', $parentIds)
                        ->where('fee_cleared', true)
                        ->where('account_status', 'active')
                        ->get()
                );
            }
        }

        return $users->filter()->unique('id')->values();
    }

    /** @return array<string, string> */
    public static function liveClassNotificationVars(LiveClass $liveClass): array
    {
        $liveClass->loadMissing(['subject', 'schoolClass']);

        return [
            'class_title' => $liveClass->title,
            'subject_name' => $liveClass->subject?->name ?? '—',
            'class_name' => $liveClass->schoolClass?->displayName() ?? '—',
            'class_date' => $liveClass->scheduled_at?->format('M d, Y') ?? '—',
            'class_time' => $liveClass->scheduled_at?->format('h:i A') ?? '—',
        ];
    }

    /** @param  list<string>  $audience */
    public static function resolveAudience(int $schoolId, array $audience): Collection
    {
        $roles = [];

        if (in_array('admin', $audience, true)) {
            $roles = array_merge($roles, ['school-owner', 'admin']);
        }
        if (in_array('staff', $audience, true)) {
            $roles = array_merge($roles, ['accountant', 'reception']);
        }
        if (in_array('teacher', $audience, true)) {
            $roles[] = 'teacher';
        }
        if (in_array('student', $audience, true)) {
            $roles[] = 'student';
        }
        if (in_array('parent', $audience, true)) {
            $roles[] = 'parent';
        }

        $roles = array_unique($roles);

        if (empty($roles)) {
            return collect();
        }

        return User::where('school_id', $schoolId)
            ->where('account_status', 'active')
            ->whereHas('roles', fn ($q) => $q->whereIn('name', $roles))
            ->get();
    }

    /**
     * AI-style template generation from type + context.
     *
     * @param  array<string, string>  $context
     * @return array{title_template: string, body_template: string, audience: list<string>, icon: string}
     */
    public static function generateTemplate(string $type, array $context = []): array
    {
        $defaults = self::DEFAULT_TEMPLATES[$type] ?? self::DEFAULT_TEMPLATES['new_student'];

        $tone = $context['tone'] ?? 'professional';
        $school = $context['school_name'] ?? 'our school';

        $variations = [
            'new_student' => [
                'title_template' => $tone === 'friendly'
                    ? '🎉 Welcome {student_name} to '.$school.'!'
                    : 'New Admission: {student_name} — {class_name}',
                'body_template' => $tone === 'friendly'
                    ? 'Hey everyone! {student_name} just joined {class_name} (Roll: {roll_no}). Let\'s give them a warm welcome! 🌟'
                    : 'A new student {student_name} has been admitted to {class_name} with Roll No. {roll_no} on {admission_date}.',
            ],
            'new_teacher' => [
                'title_template' => 'New Faculty: {teacher_name}',
                'body_template' => '{teacher_name} has joined '.$school.' as a teacher'.($context['subject'] ?? false ? ' for {subject}' : '').'. Employee ID: {employee_id}.',
            ],
            'upcoming_event' => [
                'title_template' => '📅 {event_title} — {event_date}',
                'body_template' => 'Reminder: {event_title} is coming up on {event_date}. '.($context['location'] ?? false ? 'Venue: {location}. ' : '').'Mark your calendars!',
            ],
            'upcoming_exam' => [
                'title_template' => '📝 Exam Alert: {exam_name}',
                'body_template' => '{exam_name} is scheduled for {exam_date}. Class: {class_name}. '.($tone === 'friendly' ? 'Good luck, you\'ve got this! 💪' : 'Please ensure all preparations are complete.'),
            ],
            'fee_overdue' => [
                'title_template' => '⚠️ Fee Overdue — {student_name}',
                'body_template' => 'Outstanding fee of {amount} for {student_name} was due on {due_date}. Please clear at your earliest convenience.',
            ],
            'live_class_scheduled' => [
                'title_template' => '📹 Live Class: {class_title}',
                'body_template' => '{class_title} for {subject_name} is on {class_date} at {class_time}. Class: {class_name}. Fee-paid students can join from Live Classes.',
            ],
            'recording_available' => [
                'title_template' => '🎬 Recording Ready: {class_title}',
                'body_template' => 'Recording for {class_title} ({subject_name}) on {class_date} is now available. Watch from Recordings section.',
            ],
        ];

        $generated = $variations[$type] ?? [
            'title_template' => $defaults['title'],
            'body_template' => $defaults['body'],
        ];

        return [
            'title_template' => $generated['title_template'],
            'body_template' => $generated['body_template'],
            'audience' => $defaults['audience'],
            'icon' => $defaults['icon'],
        ];
    }
}
