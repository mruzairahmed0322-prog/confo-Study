<?php

namespace App\Support;

use App\Models\User;

class DashboardWidgets
{
    /** @return list<string> */
    private static function keys(): array
    {
        return [
            'stat_students',
            'stat_teachers',
            'stat_staff',
            'stat_parents',
            'stat_classes',
            'stat_assignments',
            'stat_quizzes',
            'stat_pending_approvals',
            'stat_attendance',
            'stat_child_attendance',
            'stat_fee_collected',
            'stat_pending_fees',
            'stat_fee_payments',
            'stat_exams',
            'stat_new_students',
            'chart_attendance',
            'chart_fees',
            'chart_gender',
            'chart_class_strength',
            'widget_admissions',
            'widget_quick_actions',
            'widget_timetable',
            'widget_homework',
            'widget_fee_alerts',
            'widget_events',
            'widget_notifications',
            'widget_recent_activity',
            'widget_child_results',
            'widget_child_fees',
            'widget_live_session',
        ];
    }

    /**
     * @return array<string, bool>
     */
    public static function sectionsFor(User $user): array
    {
        $role = $user->primaryRoleName();
        $enabled = self::enabledForRole($role);

        $sections = [];
        foreach (self::keys() as $key) {
            $sections[$key] = in_array($key, $enabled, true);
        }

        return $sections;
    }

    /** @return list<string> */
    private static function enabledForRole(string $role): array
    {
        return match ($role) {
            'school-owner' => [
                'stat_students', 'stat_teachers', 'stat_staff', 'stat_parents',
                'stat_classes', 'stat_assignments', 'stat_pending_approvals',
                'stat_attendance', 'stat_fee_collected', 'stat_pending_fees', 'stat_fee_payments',
                'stat_exams', 'stat_new_students',
                'chart_attendance', 'chart_fees', 'chart_gender', 'chart_class_strength',
                'widget_admissions', 'widget_quick_actions', 'widget_fee_alerts',
                'widget_events', 'widget_notifications', 'widget_recent_activity',
            ],
            'admin' => [
                'stat_students', 'stat_teachers', 'stat_attendance',
                'stat_fee_collected', 'stat_pending_fees',
                'chart_attendance', 'chart_fees', 'chart_gender', 'chart_class_strength',
                'widget_admissions', 'widget_quick_actions', 'widget_fee_alerts', 'widget_events',
            ],
            'teacher' => [
                'stat_students', 'stat_attendance', 'stat_assignments',
                'chart_attendance',
                'widget_quick_actions', 'widget_timetable', 'widget_homework', 'widget_events',
                'widget_notifications',
            ],
            'accountant' => [
                'stat_fee_collected', 'stat_pending_fees',
                'chart_fees',
                'widget_quick_actions', 'widget_fee_alerts', 'widget_events',
            ],
            'student' => [
                'stat_attendance', 'stat_assignments', 'stat_exams', 'stat_pending_fees',
                'widget_live_session',
                'widget_timetable', 'widget_homework', 'widget_events',
                'widget_fee_alerts', 'widget_notifications', 'widget_child_results',
            ],
            'parent' => [
                'stat_child_attendance', 'stat_pending_fees', 'stat_exams',
                'widget_live_session',
                'widget_child_fees', 'widget_child_results', 'widget_fee_alerts',
                'widget_events', 'widget_notifications', 'widget_homework',
            ],
            default => ['stat_attendance', 'widget_events'],
        };
    }
}
