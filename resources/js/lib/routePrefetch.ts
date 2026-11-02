/** Lazy route chunks — prefetch on sidebar hover for instant navigation. */
const ROUTE_CHUNKS: Record<string, () => Promise<unknown>> = {
    '/app': () => import('@/pages/Dashboard'),
    '/app/students': () => import('@/pages/students/StudentsPage'),
    '/app/archives': () => import('@/pages/students/ArchivesPage'),
    '/app/parents': () => import('@/pages/parents/ParentsPage'),
    '/app/teachers': () => import('@/pages/modules/ModulePages'),
    '/app/classes': () => import('@/pages/admin/ClassesPage'),
    '/app/subjects': () => import('@/pages/modules/ModulePages'),
    '/app/timetable': () => import('@/pages/admin/TimetablePage'),
    '/app/assignments': () => import('@/pages/modules/ModulePages'),
    '/app/homework': () => import('@/pages/homework/HomeworkPage'),
    '/app/materials': () => import('@/pages/materials/StudyMaterialsPage'),
    '/app/live-classes': () => import('@/pages/modules/ModulePages'),
    '/app/recordings': () => import('@/pages/modules/ModulePages'),
    '/app/attendance': () => import('@/pages/attendance/AttendanceMarkPage'),
    '/app/exams': () => import('@/pages/modules/ModulePages'),
    '/app/results': () => import('@/pages/modules/ModulePages'),
    '/app/fees': () => import('@/pages/modules/ModulePages'),
    '/app/fees/receipts': () => import('@/pages/fees/FeeReceiptsPage'),
    '/app/fees/collect': () => import('@/pages/fees/FeesCollectPage'),
    '/app/payment-proofs': () => import('@/pages/modules/ModulePages'),
    '/app/salary': () => import('@/pages/admin/SalaryPage'),
    '/app/expenses': () => import('@/pages/admin/ExpensesPage'),
    '/app/reports': () => import('@/pages/admin/ReportsPage'),
    '/app/library': () => import('@/pages/admin/LibraryPage'),
    '/app/certificates': () => import('@/pages/admin/CertificatesPage'),
    '/app/settings': () => import('@/pages/admin/SettingsPage'),
    '/app/notifications': () => import('@/pages/admin/NotificationsPage'),
    '/app/system-settings': () => import('@/pages/admin/SystemSettingsPage'),
    '/app/roles': () => import('@/pages/admin/RolesPage'),
    '/app/activity-logs': () => import('@/pages/admin/ActivityLogsPage'),
    '/app/login-logs': () => import('@/pages/admin/LoginLogsPage'),
    '/app/audit-logs': () => import('@/pages/admin/AuditLogsPage'),
    '/app/profile': () => import('@/pages/admin/ProfilePage'),
    '/app/approvals': () => import('@/pages/approvals/ApprovalsPage'),
    '/app/users': () => import('@/pages/admin/UsersPage'),
};

const prefetched = new Set<string>();

export function prefetchRouteChunk(path: string) {
    const loader = ROUTE_CHUNKS[path];
    if (!loader || prefetched.has(path)) return;
    prefetched.add(path);
    loader().catch(() => prefetched.delete(path));
}
