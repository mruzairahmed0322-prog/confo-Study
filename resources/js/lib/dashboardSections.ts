import type { DashboardSections } from '@/components/dashboard/types';

const ALL_SECTION_KEYS: (keyof DashboardSections)[] = [
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

/** Must stay in sync with App\Support\DashboardWidgets::enabledForRole */
const ENABLED_BY_ROLE: Record<string, (keyof DashboardSections)[]> = {
    'school-owner': [
        'stat_students', 'stat_teachers', 'stat_staff', 'stat_parents',
        'stat_classes', 'stat_assignments', 'stat_pending_approvals',
        'stat_attendance', 'stat_fee_collected', 'stat_pending_fees', 'stat_fee_payments',
        'stat_exams', 'stat_new_students',
        'chart_attendance', 'chart_fees', 'chart_gender', 'chart_class_strength',
        'widget_admissions', 'widget_quick_actions', 'widget_fee_alerts',
        'widget_events', 'widget_notifications', 'widget_recent_activity',
    ],
    admin: [
        'stat_students', 'stat_teachers', 'stat_attendance',
        'stat_fee_collected', 'stat_pending_fees',
        'chart_attendance', 'chart_fees', 'chart_gender', 'chart_class_strength',
        'widget_admissions', 'widget_quick_actions', 'widget_fee_alerts', 'widget_events',
    ],
    teacher: [
        'stat_students', 'stat_attendance', 'stat_assignments',
        'chart_attendance',
        'widget_quick_actions', 'widget_timetable', 'widget_homework', 'widget_events',
        'widget_notifications',
    ],
    accountant: [
        'stat_fee_collected', 'stat_pending_fees',
        'chart_fees',
        'widget_quick_actions', 'widget_fee_alerts', 'widget_events',
    ],
    student: [
        'stat_attendance', 'stat_assignments', 'stat_exams', 'stat_pending_fees',
        'widget_live_session',
        'widget_timetable', 'widget_homework', 'widget_events',
        'widget_fee_alerts', 'widget_notifications', 'widget_child_results',
    ],
    parent: [
        'stat_child_attendance', 'stat_pending_fees', 'stat_exams',
        'widget_live_session',
        'widget_child_fees', 'widget_child_results', 'widget_fee_alerts',
        'widget_events', 'widget_notifications', 'widget_homework',
    ],
    reception: [
        'stat_students', 'stat_attendance', 'stat_new_students',
        'widget_admissions', 'widget_events', 'widget_notifications',
    ],
};

/**
 * Role allow-list is the source of truth for card visibility.
 * Stale admin cache cannot show privileged widgets to teacher/parent/student.
 */
export function resolveDashboardSections(role: string | undefined): DashboardSections {
    const allowed = new Set(
        ENABLED_BY_ROLE[role ?? ''] ?? ['stat_attendance', 'widget_events'],
    );

    const sections = {} as DashboardSections;
    for (const key of ALL_SECTION_KEYS) {
        sections[key] = allowed.has(key);
    }

    return sections;
}
