import { lazy, Suspense, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useInstantQuery } from '@/lib/useInstantQuery';
import { hasDashboardSections } from '@/lib/listUtils';
import { resolveDashboardSections } from '@/lib/dashboardSections';

import { apiDelete, apiGet } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { StatCards } from '@/components/dashboard/StatCards';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentAdmissions } from '@/components/dashboard/RecentAdmissions';
import { NotificationsWidget } from '@/components/dashboard/NotificationsWidget';
import { RecentActivityWidget } from '@/components/dashboard/RecentActivityWidget';
import { FeeAlertsWidget } from '@/components/dashboard/FeeAlertsWidget';
import { UpcomingEventsWidget } from '@/components/dashboard/UpcomingEventsWidget';
import { TimetableWidget } from '@/components/dashboard/TimetableWidget';
import { HomeworkWidget } from '@/components/dashboard/HomeworkWidget';
import { ChildResultsWidget } from '@/components/dashboard/ChildResultsWidget';
import { LiveSessionWidget } from '@/components/dashboard/LiveSessionWidget';
import { ChartSkeleton } from '@/components/dashboard/DashboardSkeleton';
import type { DashboardData } from '@/components/dashboard/types';

const AttendanceChart = lazy(() => import('@/components/dashboard/AttendanceChart'));
const FeeChart = lazy(() => import('@/components/dashboard/FeeChart'));
const GenderChart = lazy(() => import('@/components/dashboard/GenderChart'));
const ClassStrengthChart = lazy(() => import('@/components/dashboard/ClassStrengthChart'));

const ROLE_LABELS: Record<string, string> = {
    'school-owner': 'Superadmin',
    admin: 'Admin',
    teacher: 'Teacher',
    student: 'Student',
    parent: 'Parent',
    accountant: 'Accountant',
    reception: 'Reception',
};

const DASHBOARD_TITLES: Record<string, string> = {
    'school-owner': 'Superadmin Dashboard',
    teacher: 'Teacher Dashboard',
    student: 'Student Dashboard',
    parent: 'Parent Dashboard',
    accountant: 'Accountant Dashboard',
    reception: 'Reception Dashboard',
    admin: 'Admin Dashboard',
};

export default function DashboardPage() {
    const { user, isSuperAdmin } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const handleTimetableDelete = useCallback(async (slot: { id?: string | number }) => {
        if (!slot.id) return;
        if (!confirm('Delete this timetable slot?')) return;
        try {
            await apiDelete(`/timetable/${slot.id}`);
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['timetable'] });
        } catch {
            alert('Delete failed');
        }
    }, [queryClient]);

    const { data, isInitialLoading, isError, refetch } = useInstantQuery<DashboardData>({
        queryKey: ['dashboard', user?.id ?? 'anon', user?.role ?? 'guest'],
        queryFn: () => apiGet('/dashboard'),
        validateCache: hasDashboardSections,
        enabled: !!user?.id,
    });

    // Role allow-list wins — never show admin cards to teacher/parent/student from stale cache.
    const sections = useMemo(
        () => resolveDashboardSections(user?.role),
        [user?.role],
    );
    const stats = data?.stats ?? {};
    const loading = isInitialLoading;
    const hasVisibleSections = Object.values(sections).some(Boolean);

    const showCharts = sections.chart_attendance || sections.chart_fees || sections.chart_gender || sections.chart_class_strength;
    const showBottomRow = sections.widget_admissions || sections.widget_quick_actions || sections.widget_notifications || sections.widget_recent_activity;
    const showAlertsRow = sections.widget_fee_alerts || sections.widget_events;
    const showTeacherStudentRow = sections.widget_timetable || sections.widget_homework || sections.widget_child_results;

    return (
        <div className="space-y-6">
            <PageHeader
                title={DASHBOARD_TITLES[user?.role ?? ''] ?? (isSuperAdmin ? 'Superadmin Dashboard' : 'Dashboard')}
                subtitle={`Welcome back, ${user?.name ?? 'User'}`}
                badge={ROLE_LABELS[user?.role ?? ''] ?? user?.role}
            />

            {isError && !data && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                    <p>Could not load dashboard data. Please try again.</p>
                    <Button type="button" variant="secondary" className="mt-3" onClick={() => refetch()}>
                        Retry
                    </Button>
                </div>
            )}

            {!loading && data && !hasVisibleSections && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm admin-page-sub">
                    <p>Dashboard widgets are loading…</p>
                    <Button type="button" variant="secondary" className="mt-3" onClick={() => refetch()}>
                        Refresh dashboard
                    </Button>
                </div>
            )}

            <StatCards
                sections={sections}
                stats={stats}
                loading={loading}
                childFees={sections.widget_child_fees}
            />

            {sections.widget_live_session && data?.liveSession && (
                <LiveSessionWidget session={data.liveSession} />
            )}

            {showCharts && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {sections.chart_attendance && (
                        <Suspense fallback={<ChartSkeleton />}>
                            <AttendanceChart
                                labels={data?.chartLabels ?? []}
                                data={data?.chartData ?? []}
                            />
                        </Suspense>
                    )}
                    {sections.chart_fees && (
                        <Suspense fallback={<ChartSkeleton />}>
                            <FeeChart months={data?.feeMonths ?? []} data={data?.feeData ?? []} />
                        </Suspense>
                    )}
                    {sections.chart_gender && data?.genderData && (
                        <Suspense fallback={<ChartSkeleton />}>
                            <GenderChart data={data.genderData} />
                        </Suspense>
                    )}
                    {sections.chart_class_strength && data?.classStrength && (
                        <Suspense fallback={<ChartSkeleton />}>
                            <ClassStrengthChart data={data.classStrength} />
                        </Suspense>
                    )}
                </div>
            )}

            {showTeacherStudentRow && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {sections.widget_timetable && (
                        <TimetableWidget
                            slots={data?.todayTimetable ?? []}
                            onAdd={isSuperAdmin ? () => navigate('/app/timetable', { state: { openForm: true } }) : undefined}
                            onEdit={isSuperAdmin ? (slot) => navigate('/app/timetable', { state: { editId: slot.id } }) : undefined}
                            onDelete={isSuperAdmin ? handleTimetableDelete : undefined}
                        />
                    )}
                    {sections.widget_homework && (
                        <HomeworkWidget items={data?.pendingHomework ?? []} />
                    )}
                    {sections.widget_child_results && (
                        <ChildResultsWidget
                            results={data?.childResults ?? []}
                            title={user?.role === 'student' ? 'My Results' : 'Child Results'}
                            subtitle={user?.role === 'student' ? 'Your latest exam scores' : 'Latest exam scores'}
                        />
                    )}
                </div>
            )}

            {showBottomRow && (
                <div className="grid gap-6 lg:grid-cols-3">
                    {sections.widget_admissions && (
                        <RecentAdmissions admissions={data?.recentAdmissions ?? []} />
                    )}
                    {sections.widget_notifications && (
                        <NotificationsWidget notifications={data?.notifications ?? []} />
                    )}
                    {sections.widget_recent_activity && (
                        <RecentActivityWidget activities={data?.recentActivities ?? []} />
                    )}
                    {sections.widget_quick_actions && <QuickActions />}
                </div>
            )}

            {showAlertsRow && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {sections.widget_fee_alerts && (
                        <FeeAlertsWidget
                            alerts={data?.feeAlerts ?? []}
                            title={
                                user?.role === 'student'
                                    ? 'My Fee Alerts'
                                    : user?.role === 'parent'
                                      ? 'Child Fee Alerts'
                                      : 'Fee Alerts'
                            }
                            subtitle={
                                user?.role === 'student'
                                    ? 'Your outstanding payments'
                                    : user?.role === 'parent'
                                      ? 'Outstanding child payments'
                                      : 'Outstanding payments'
                            }
                        />
                    )}
                    {sections.widget_events && (
                        <UpcomingEventsWidget events={data?.upcomingEvents ?? []} />
                    )}
                </div>
            )}
        </div>
    );
}

