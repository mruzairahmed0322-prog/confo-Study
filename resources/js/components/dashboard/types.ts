export interface DashboardSections {
    stat_students?: boolean;
    stat_teachers?: boolean;
    stat_staff?: boolean;
    stat_parents?: boolean;
    stat_classes?: boolean;
    stat_assignments?: boolean;
    stat_quizzes?: boolean;
    stat_pending_approvals?: boolean;
    stat_attendance?: boolean;
    stat_child_attendance?: boolean;
    stat_fee_collected?: boolean;
    stat_pending_fees?: boolean;
    stat_fee_payments?: boolean;
    stat_exams?: boolean;
    stat_new_students?: boolean;
    chart_attendance?: boolean;
    chart_fees?: boolean;
    chart_gender?: boolean;
    chart_class_strength?: boolean;
    widget_admissions?: boolean;
    widget_quick_actions?: boolean;
    widget_timetable?: boolean;
    widget_homework?: boolean;
    widget_fee_alerts?: boolean;
    widget_events?: boolean;
    widget_notifications?: boolean;
    widget_recent_activity?: boolean;
    widget_child_results?: boolean;
    widget_child_fees?: boolean;
    widget_live_session?: boolean;
}

export interface DashboardNotification {
    id: string;
    title: string;
    body?: string;
    time: string;
    read: boolean;
    icon: string;
    link?: string;
}

export interface DashboardActivity {
    id: number;
    action: string;
    user?: { name: string };
    created_at: string;
}

export interface LiveSessionCta {
    id: number;
    title: string;
    status: string;
    class_name?: string | null;
    subject_name?: string | null;
    scheduled_at?: string | null;
    can_join: boolean;
    can_watch: boolean;
    join_url?: string | null;
    watch_url?: string | null;
    mode: 'live' | 'recording';
}

export interface DashboardData {
    stats?: Record<string, number | string>;
    sections?: DashboardSections;
    chartLabels?: string[];
    chartData?: number[];
    feeMonths?: string[];
    feeData?: number[];
    genderData?: { male: number; female: number };
    classStrength?: Array<{ class: string; count: number }>;
    recentAdmissions?: Array<{ name: string; class: string; date: string; roll?: string; status?: string }>;
    feeAlerts?: Array<{ student: string; class: string; amount: number; due: string }>;
    upcomingEvents?: Array<{ title: string; date: string }>;
    notifications?: DashboardNotification[];
    recentActivities?: DashboardActivity[];
    todayTimetable?: Array<{ id?: number; subject: string; teacher: string; class: string; time: string; room: string }>;
    pendingHomework?: Array<{ title: string; class: string; due: string; marks: number }>;
    childResults?: Array<{ student: string; exam: string; subject: string; marks: number; total: number; grade: string }>;
    liveSession?: LiveSessionCta | null;
}
