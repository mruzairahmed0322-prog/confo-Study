import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LocaleProvider } from '@/contexts/LocaleContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { SuccessPopupProvider } from '@/components/ui/SuccessPopup';
import { BrandLoader } from '@/components/brand/BrandLoader';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageContentSkeleton } from '@/components/ui/PageContentSkeleton';
const LoginPage = lazy(() => import('@/pages/auth/Login'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/ResetPassword'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const StudentsPage = lazy(() => import('@/pages/students/StudentsPage'));
const ArchivesPage = lazy(() => import('@/pages/students/ArchivesPage'));
const ParentsPage = lazy(() => import('@/pages/parents/ParentsPage'));
const FeesCollectPage = lazy(() => import('@/pages/fees/FeesCollectPage'));
const FeeReceiptsPage = lazy(() => import('@/pages/fees/FeeReceiptsPage'));
const AttendanceMarkPage = lazy(() => import('@/pages/attendance/AttendanceMarkPage'));
const HomeworkPage = lazy(() => import('@/pages/homework/HomeworkPage'));
const StudyMaterialsPage = lazy(() => import('@/pages/materials/StudyMaterialsPage'));
const ApprovalsPage = lazy(() => import('@/pages/approvals/ApprovalsPage'));
const ClassesPage = lazy(() => import('@/pages/admin/ClassesPage'));
const TimetablePage = lazy(() => import('@/pages/admin/TimetablePage'));
const SalaryPage = lazy(() => import('@/pages/admin/SalaryPage'));
const ExpensesPage = lazy(() => import('@/pages/admin/ExpensesPage'));
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const RolesPage = lazy(() => import('@/pages/admin/RolesPage'));
const ActivityLogsPage = lazy(() => import('@/pages/admin/ActivityLogsPage'));
const LoginLogsPage = lazy(() => import('@/pages/admin/LoginLogsPage'));
const AuditLogsPage = lazy(() => import('@/pages/admin/AuditLogsPage'));
const LibraryPage = lazy(() => import('@/pages/admin/LibraryPage'));
const SystemSettingsPage = lazy(() => import('@/pages/admin/SystemSettingsPage'));
const CertificatesPage = lazy(() => import('@/pages/admin/CertificatesPage'));
const NotificationsPage = lazy(() => import('@/pages/admin/NotificationsPage'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));
const ProfilePage = lazy(() => import('@/pages/admin/ProfilePage'));
const LiveRoomPage = lazy(() => import('@/pages/live/LiveRoomPage'));
const QuizAttemptPage = lazy(() => import('@/pages/quizzes/QuizAttemptPage'));

const TeachersPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.TeachersPage })));
const SubjectsPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.SubjectsPage })));
const AssignmentsPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.AssignmentsPage })));
const QuizzesListPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.QuizzesListPage })));
const LiveClassesPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.LiveClassesPage })));
const RecordingsPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.RecordingsPage })));
const ExamsPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.ExamsPage })));
const ResultsPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.ResultsPage })));
const FeesPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.FeesPage })));
const PaymentProofsPage = lazy(() => import('@/pages/modules/ModulePages').then((m) => ({ default: m.PaymentProofsPage })));

function PageLoader() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center">
            <BrandLoader size="lg" />
        </div>
    );
}

function AuthGate({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading && !user) return <PageLoader />;
    if (!user) return <Navigate to="/app/login" replace />;

    return <>{children}</>;
}

function PermissionRoute({ permission, children }: { permission?: string; children: React.ReactNode }) {
    const { user, hasPermission } = useAuth();

    if (!user) return <Navigate to="/app/login" replace />;
    if (permission && !hasPermission(permission)) return <Navigate to="/app" replace />;

    return <>{children}</>;
}

function SuperAdminRoute({ children }: { children: React.ReactNode }) {
    const { user, isSuperAdmin } = useAuth();

    if (!user) return <Navigate to="/app/login" replace />;
    if (!isSuperAdmin) return <Navigate to="/app" replace />;

    return <>{children}</>;
}

function GuestRoute({ children }: { children: React.ReactNode }) {
    const { user, loading } = useAuth();

    if (loading && !user) return <PageLoader />;
    if (user) return <Navigate to="/app" replace />;

    return <>{children}</>;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/app/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/app/register" element={<Navigate to="/app/login" replace />} />
            <Route path="/app/register/pending" element={<Navigate to="/app/login" replace />} />
            <Route path="/app/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
            <Route path="/app/reset-password/:token" element={<GuestRoute><ResetPasswordPage /></GuestRoute>} />

            <Route path="/app" element={<AuthGate><AppLayout /></AuthGate>}>
                <Route index element={<DashboardPage />} />
                <Route path="students" element={<PermissionRoute permission="students.view"><StudentsPage /></PermissionRoute>} />
                <Route path="archives" element={<SuperAdminRoute><ArchivesPage /></SuperAdminRoute>} />
                <Route path="parents" element={<PermissionRoute permission="parents.view"><ParentsPage /></PermissionRoute>} />
                <Route path="teachers" element={<PermissionRoute permission="teachers.view"><TeachersPage /></PermissionRoute>} />
                <Route path="classes" element={<PermissionRoute permission="classes.view"><ClassesPage /></PermissionRoute>} />
                <Route path="subjects" element={<PermissionRoute permission="subjects.view"><SubjectsPage /></PermissionRoute>} />
                <Route path="timetable" element={<PermissionRoute permission="timetable.view"><TimetablePage /></PermissionRoute>} />
                <Route path="assignments" element={<PermissionRoute permission="assignments.view"><AssignmentsPage /></PermissionRoute>} />
                <Route path="homework" element={<PermissionRoute permission="homework.view"><HomeworkPage /></PermissionRoute>} />
                <Route path="materials" element={<PermissionRoute permission="materials.view"><StudyMaterialsPage /></PermissionRoute>} />
                <Route path="quizzes" element={<PermissionRoute permission="quizzes.view"><QuizzesListPage /></PermissionRoute>} />
                <Route path="quizzes/:id/attempt" element={<PermissionRoute permission="quizzes.view"><QuizAttemptPage /></PermissionRoute>} />
                <Route path="live-classes" element={<PermissionRoute permission="live-classes.view"><LiveClassesPage /></PermissionRoute>} />
                <Route path="live-classes/:id/room" element={<PermissionRoute permission="live-classes.view"><LiveRoomPage /></PermissionRoute>} />
                <Route path="recordings" element={<PermissionRoute permission="recordings.view"><RecordingsPage /></PermissionRoute>} />
                <Route path="attendance" element={<PermissionRoute permission="attendance.view"><AttendanceMarkPage /></PermissionRoute>} />
                <Route path="attendance/mark" element={<PermissionRoute permission="attendance.view"><AttendanceMarkPage /></PermissionRoute>} />
                <Route path="exams" element={<PermissionRoute permission="exams.view"><ExamsPage /></PermissionRoute>} />
                <Route path="results" element={<PermissionRoute permission="results.view"><ResultsPage /></PermissionRoute>} />
                <Route path="fees" element={<PermissionRoute permission="fees.view"><FeesPage /></PermissionRoute>} />
                <Route path="fees/receipts" element={<PermissionRoute permission="fees.view"><FeeReceiptsPage /></PermissionRoute>} />
                <Route path="fees/collect" element={<PermissionRoute permission="fees.collect"><FeesCollectPage /></PermissionRoute>} />
                <Route path="payment-proofs" element={<PermissionRoute permission="fees.collect"><PaymentProofsPage /></PermissionRoute>} />
                <Route path="salary" element={<PermissionRoute permission="expenses.view"><SalaryPage /></PermissionRoute>} />
                <Route path="expenses" element={<PermissionRoute permission="expenses.view"><ExpensesPage /></PermissionRoute>} />
                <Route path="reports" element={<PermissionRoute permission="reports.view"><ReportsPage /></PermissionRoute>} />
                <Route path="library" element={<PermissionRoute permission="library.view"><LibraryPage /></PermissionRoute>} />
                <Route path="certificates" element={<PermissionRoute permission="certificates.view"><CertificatesPage /></PermissionRoute>} />
                <Route path="settings" element={<PermissionRoute permission="settings.edit"><SettingsPage /></PermissionRoute>} />
                <Route path="notifications" element={<PermissionRoute permission="settings.edit"><NotificationsPage /></PermissionRoute>} />
                <Route path="system-settings" element={<PermissionRoute permission="system-settings.view"><SystemSettingsPage /></PermissionRoute>} />
                <Route path="website-cms" element={<Navigate to="/app" replace />} />
                <Route path="roles" element={<PermissionRoute permission="roles.view"><RolesPage /></PermissionRoute>} />
                <Route path="activity-logs" element={<PermissionRoute permission="activity-logs.view"><ActivityLogsPage /></PermissionRoute>} />
                <Route path="login-logs" element={<PermissionRoute permission="login-logs.view"><LoginLogsPage /></PermissionRoute>} />
                <Route path="audit-logs" element={<PermissionRoute permission="audit-logs.view"><AuditLogsPage /></PermissionRoute>} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="approvals" element={<SuperAdminRoute><ApprovalsPage /></SuperAdminRoute>} />
                <Route path="users" element={<SuperAdminRoute><UsersPage /></SuperAdminRoute>} />
            </Route>

            <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <LocaleProvider>
                    <AuthProvider>
                        <ToastProvider>
                            <SuccessPopupProvider>
                                <BrowserRouter>
                                    <Suspense fallback={<PageContentSkeleton />}>
                                        <AppRoutes />
                                    </Suspense>
                                </BrowserRouter>
                            </SuccessPopupProvider>
                        </ToastProvider>
                    </AuthProvider>
                </LocaleProvider>
            </ThemeProvider>
        </QueryClientProvider>
    );
}

const rootEl = document.getElementById('root');

if (rootEl) {
    createRoot(rootEl).render(<App />);
}

export default App;
