<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\RegisterApiController;
use App\Http\Controllers\Api\StudentApiController;
use App\Http\Controllers\Api\TeacherApiController;
use App\Http\Controllers\Api\AttendanceApiController;
use App\Http\Controllers\Api\FeeApiController;
use App\Http\Controllers\Api\ModuleApiController;
use App\Http\Controllers\Api\AssignmentApiController;
use App\Http\Controllers\Api\QuizApiController;
use App\Http\Controllers\Api\AdminApiController;
use App\Http\Controllers\Api\ParentApiController;
use App\Http\Controllers\Api\NotificationApiController;
use App\Http\Controllers\Api\UserAccountApiController;
use App\Http\Controllers\Api\CmsApiController;
use App\Http\Controllers\Api\PublicApiController;
use App\Http\Controllers\Api\StudyMaterialApiController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::prefix('public')->group(function () {
        Route::get('/school', [PublicApiController::class, 'schoolInfo']);
        Route::get('/home', [PublicApiController::class, 'home']);
        Route::get('/events', [PublicApiController::class, 'events']);
        Route::get('/upcoming-classes', [PublicApiController::class, 'upcomingClasses']);
        Route::get('/courses', [PublicApiController::class, 'courses']);
        Route::get('/services', [PublicApiController::class, 'services']);
    });

    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/register', [RegisterApiController::class, 'register']);
    Route::post('/password/email', [AuthController::class, 'sendResetLink']);
    Route::post('/password/reset', [AuthController::class, 'reset']);

    Route::middleware(['auth:sanctum', 'user.active', 'school.scope', 'log.activity'])->group(function () {
        Route::get('/user', [AuthController::class, 'user']);
        Route::post('/logout', [AuthController::class, 'logout']);

        Route::get('/dashboard', [ModuleApiController::class, 'dashboard']);

        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationApiController::class, 'index']);
            Route::get('/unread-count', [NotificationApiController::class, 'unreadCount']);
            Route::post('/mark-all-read', [NotificationApiController::class, 'markAllRead']);
            Route::post('/{notification}/read', [NotificationApiController::class, 'markRead']);
            // Template management = admin only (not student/teacher)
            Route::get('/templates', [NotificationApiController::class, 'templates'])->middleware('permission:settings.edit');
            Route::put('/templates/{template}', [NotificationApiController::class, 'updateTemplate'])->middleware('permission:settings.edit');
            Route::post('/templates/generate', [NotificationApiController::class, 'generateTemplate'])->middleware('permission:settings.edit');
            Route::post('/test', [NotificationApiController::class, 'sendTest'])->middleware('permission:settings.edit');
            Route::post('/push-token', [NotificationApiController::class, 'registerPushToken']);
            Route::post('/push-token/remove', [NotificationApiController::class, 'unregisterPushToken']);
        });

        Route::prefix('students')->group(function () {
            Route::get('/', [StudentApiController::class, 'index']);
            Route::get('/classes', [StudentApiController::class, 'classes']);
            Route::get('/archived', [StudentApiController::class, 'archived'])->middleware('role:school-owner');
            Route::post('/', [StudentApiController::class, 'store']);
            Route::get('/{student}/slip', [StudentApiController::class, 'admissionSlip']);
            Route::get('/{student}', [StudentApiController::class, 'show']);
            Route::put('/{student}', [StudentApiController::class, 'update']);
            Route::patch('/{student}/toggle-status', [StudentApiController::class, 'toggleStatus']);
            Route::delete('/{student}', [StudentApiController::class, 'destroy'])->middleware('role:school-owner');
            Route::post('/{id}/restore', [StudentApiController::class, 'restore'])->middleware('role:school-owner');
            Route::delete('/{id}/force', [StudentApiController::class, 'forceDestroy'])->middleware('role:school-owner');
        });

        Route::prefix('teachers')->group(function () {
            Route::get('/', [TeacherApiController::class, 'index']);
            Route::post('/', [TeacherApiController::class, 'store']);
            Route::get('/{teacher}/slip', [TeacherApiController::class, 'employeeSlip']);
            Route::put('/{teacher}', [TeacherApiController::class, 'update']);
            Route::patch('/{teacher}/toggle-block', [TeacherApiController::class, 'toggleBlock']);
            Route::delete('/{teacher}', [TeacherApiController::class, 'destroy'])->middleware('permission:teachers.delete');
        });

        Route::prefix('parents')->group(function () {
            Route::get('/', [ParentApiController::class, 'index']);
            Route::post('/', [ParentApiController::class, 'store']);
            Route::put('/{user}', [ParentApiController::class, 'update']);
            Route::patch('/{user}/toggle-block', [ParentApiController::class, 'toggleBlock']);
            Route::delete('/{user}', [ParentApiController::class, 'destroy'])->middleware('permission:parents.delete');
        });

        Route::prefix('attendance')->group(function () {
            Route::get('/', [AttendanceApiController::class, 'index']);
            Route::get('/summary', [AttendanceApiController::class, 'summary']);
            Route::get('/trend', [AttendanceApiController::class, 'trend']);
            Route::get('/at-risk', [AttendanceApiController::class, 'atRisk']);
            Route::post('/mark', [AttendanceApiController::class, 'mark']);
        });

        Route::prefix('fees')->group(function () {
            Route::get('/invoices', [FeeApiController::class, 'invoices']);
            Route::get('/invoices/{feeInvoice}/slip', [FeeApiController::class, 'invoiceSlip']);
            Route::post('/invoices', [FeeApiController::class, 'storeInvoice']);
            Route::put('/invoices/{feeInvoice}', [FeeApiController::class, 'updateInvoice']);
            Route::delete('/invoices/{feeInvoice}', [FeeApiController::class, 'destroyInvoice'])->middleware('permission:fees.delete');
            Route::get('/payments', [FeeApiController::class, 'payments']);
            Route::get('/payments/{feePayment}/slip', [FeeApiController::class, 'paymentSlip']);
            Route::post('/collect', [FeeApiController::class, 'collect'])->middleware('permission:fees.collect');
            Route::get('/payment-proofs', [FeeApiController::class, 'paymentProofs']);
            Route::post('/payment-proofs/{proof}/approve', [FeeApiController::class, 'approvePayment']);
            Route::post('/payment-proofs/{proof}/reject', [FeeApiController::class, 'rejectPayment']);
        });

        Route::prefix('assignments')->group(function () {
            Route::get('/', [AssignmentApiController::class, 'index']);
            Route::post('/', [AssignmentApiController::class, 'store']);
            Route::put('/{assignment}', [AssignmentApiController::class, 'update']);
            Route::delete('/{assignment}', [AssignmentApiController::class, 'destroy'])
                ->middleware('permission:assignments.delete,homework.delete');
        });

        Route::prefix('quizzes')->group(function () {
            Route::get('/', [QuizApiController::class, 'index']);
            Route::post('/', [QuizApiController::class, 'store']);
            Route::get('/{quiz}', [QuizApiController::class, 'show']);
            Route::put('/{quiz}', [QuizApiController::class, 'update'])->middleware('permission:exams.edit,assignments.edit');
            Route::post('/{quiz}/attempt', [QuizApiController::class, 'attempt']);
            Route::delete('/{quiz}', [QuizApiController::class, 'destroy'])->middleware('permission:exams.delete');
        });
        Route::prefix('live-classes')->group(function () {
            Route::get('/', [ModuleApiController::class, 'liveClasses']);
            Route::get('/archived', [ModuleApiController::class, 'archivedLiveClasses'])
                ->middleware('permission:live-classes.delete,live-classes.edit');
            Route::post('/', [ModuleApiController::class, 'storeLiveClass']);
            Route::get('/{liveClass}/join', [ModuleApiController::class, 'liveClassJoin']);
            Route::post('/{liveClass}/heartbeat', [ModuleApiController::class, 'liveClassHeartbeat']);
            Route::get('/{liveClass}/status', [ModuleApiController::class, 'liveClassStatus']);
            Route::get('/{liveClass}/monitor', [ModuleApiController::class, 'liveClassMonitor']);
            Route::get('/{liveClass}/obs', [ModuleApiController::class, 'liveClassObs']);
            Route::post('/{liveClass}/active-subject', [ModuleApiController::class, 'liveClassSetActiveSubject']);
            Route::post('/{liveClass}/end', [ModuleApiController::class, 'liveClassEnd']);
            Route::post('/{liveClass}/provision-youtube', [ModuleApiController::class, 'provisionYouTubeStream'])
                ->middleware('permission:live-classes.create,live-classes.edit');
            Route::put('/{liveClass}', [ModuleApiController::class, 'updateLiveClass']);
            Route::delete('/{liveClass}', [ModuleApiController::class, 'destroyLiveClass'])
                ->middleware('permission:live-classes.delete,live-classes.edit');
            Route::post('/{id}/restore', [ModuleApiController::class, 'restoreLiveClass'])
                ->middleware('permission:live-classes.delete,live-classes.edit');
            Route::delete('/{id}/force', [ModuleApiController::class, 'forceDestroyLiveClass'])
                ->middleware('permission:live-classes.delete');
        });
        Route::get('/recordings', [ModuleApiController::class, 'recordings'])->middleware('permission:recordings.view');

        Route::prefix('materials')->group(function () {
            Route::get('/', [StudyMaterialApiController::class, 'index'])->middleware('permission:materials.view');
            Route::post('/', [StudyMaterialApiController::class, 'store'])->middleware('permission:materials.create');
            Route::put('/{studyMaterial}', [StudyMaterialApiController::class, 'update'])->middleware('permission:materials.edit');
            Route::delete('/{studyMaterial}', [StudyMaterialApiController::class, 'destroy'])->middleware('permission:materials.delete');
            Route::get('/{studyMaterial}/view', [StudyMaterialApiController::class, 'view'])->middleware('permission:materials.view');
            Route::get('/{studyMaterial}/download', [StudyMaterialApiController::class, 'download'])->middleware('permission:materials.view');
        });

        Route::prefix('integrations/youtube')->group(function () {
            Route::get('/status', [\App\Http\Controllers\Api\YouTubeIntegrationController::class, 'status'])
                ->middleware('permission:system-settings.view,live-classes.create');
            Route::get('/connect-url', [\App\Http\Controllers\Api\YouTubeIntegrationController::class, 'connectUrl'])
                ->middleware('permission:system-settings.edit');
            Route::post('/disconnect', [\App\Http\Controllers\Api\YouTubeIntegrationController::class, 'disconnect'])
                ->middleware('permission:system-settings.edit');
            Route::put('/settings', [\App\Http\Controllers\Api\YouTubeIntegrationController::class, 'updateSettings'])
                ->middleware('permission:system-settings.edit');
        });
        Route::prefix('subjects')->group(function () {
            Route::get('/', [ModuleApiController::class, 'subjects']);
            Route::post('/', [ModuleApiController::class, 'storeSubject']);
            Route::put('/{subject}', [ModuleApiController::class, 'updateSubject']);
            Route::delete('/{subject}', [ModuleApiController::class, 'destroySubject'])->middleware('permission:subjects.delete');
        });
        Route::prefix('exams')->group(function () {
            Route::get('/', [ModuleApiController::class, 'exams']);
            Route::post('/', [ModuleApiController::class, 'storeExam']);
            Route::put('/{exam}', [ModuleApiController::class, 'updateExam']);
            Route::delete('/{exam}', [ModuleApiController::class, 'destroyExam'])->middleware('permission:exams.delete');
        });
        Route::prefix('results')->group(function () {
            Route::get('/', [ModuleApiController::class, 'results']);
            Route::post('/', [ModuleApiController::class, 'storeResult']);
            Route::put('/{result}', [ModuleApiController::class, 'updateResult']);
            Route::delete('/{result}', [ModuleApiController::class, 'destroyResult'])->middleware('permission:results.edit');
        });

        Route::prefix('classes')->group(function () {
            Route::get('/', [AdminApiController::class, 'classes']);
            Route::post('/', [AdminApiController::class, 'storeClass']);
            Route::put('/{schoolClass}', [AdminApiController::class, 'updateClass']);
            Route::delete('/{schoolClass}', [AdminApiController::class, 'destroyClass'])->middleware('permission:classes.delete');
        });

        Route::prefix('timetable')->group(function () {
            Route::get('/', [AdminApiController::class, 'timetable']);
            Route::post('/', [AdminApiController::class, 'storeTimetableSlot'])->middleware('role:school-owner');
            Route::put('/{timetableSlot}', [AdminApiController::class, 'updateTimetableSlot'])->middleware('role:school-owner');
            Route::delete('/{timetableSlot}', [AdminApiController::class, 'destroyTimetableSlot'])->middleware('role:school-owner');
        });

        Route::prefix('salaries')->group(function () {
            Route::get('/', [AdminApiController::class, 'salaries']);
            Route::get('/{staffSalary}/slip', [AdminApiController::class, 'salarySlip']);
            Route::post('/', [AdminApiController::class, 'storeSalary']);
            Route::put('/{staffSalary}', [AdminApiController::class, 'updateSalary']);
            Route::delete('/{staffSalary}', [AdminApiController::class, 'destroySalary']);
        });

        Route::prefix('expenses')->group(function () {
            Route::get('/', [AdminApiController::class, 'expenses']);
            Route::post('/', [AdminApiController::class, 'storeExpense']);
            Route::put('/{expense}', [AdminApiController::class, 'updateExpense'])->middleware('permission:expenses.edit');
            Route::delete('/{expense}', [AdminApiController::class, 'destroyExpense'])->middleware('permission:expenses.delete');
        });

        Route::get('/activity-logs', [AdminApiController::class, 'activityLogs'])->middleware('permission:activity-logs.view');
        Route::get('/login-logs', [AdminApiController::class, 'loginLogs'])->middleware('permission:login-logs.view');
        Route::get('/audit-logs', [AdminApiController::class, 'auditLogs'])->middleware('permission:audit-logs.view');
        Route::get('/settings', [AdminApiController::class, 'settings'])->middleware('permission:settings.view');
        Route::put('/settings', [AdminApiController::class, 'updateSettings'])->middleware('permission:settings.edit');
        Route::post('/settings/reset-dummy-data', [AdminApiController::class, 'resetDummyData'])->middleware('role:school-owner');
        Route::get('/system-settings', [AdminApiController::class, 'systemSettings'])->middleware('permission:system-settings.view');
        Route::put('/system-settings', [AdminApiController::class, 'updateSystemSettings'])->middleware('permission:system-settings.edit');
        Route::get('/roles', [AdminApiController::class, 'roles'])->middleware('permission:roles.view');
        Route::get('/permissions', [AdminApiController::class, 'permissions'])->middleware('permission:roles.view');
        Route::post('/roles', [AdminApiController::class, 'storeRole'])->middleware('permission:roles.create');
        Route::put('/roles/{role}', [AdminApiController::class, 'updateRole'])->middleware('permission:roles.edit');
        Route::delete('/roles/{role}', [AdminApiController::class, 'destroyRole'])->middleware('permission:roles.delete');
        Route::get('/reports', [AdminApiController::class, 'reports'])->middleware('permission:reports.view');
        Route::get('/reports/export', [AdminApiController::class, 'reportsExport'])->middleware('permission:reports.export');
        Route::prefix('library')->middleware('permission:library.view')->group(function () {
            Route::get('/', [AdminApiController::class, 'libraryBooks']);
            Route::get('/{libraryBook}/download', [AdminApiController::class, 'downloadLibraryBook']);
            Route::post('/', [AdminApiController::class, 'storeLibraryBook'])->middleware('permission:library.create');
            Route::post('/{libraryBook}', [AdminApiController::class, 'updateLibraryBook'])->middleware('permission:library.edit');
            Route::put('/{libraryBook}', [AdminApiController::class, 'updateLibraryBook'])->middleware('permission:library.edit');
            Route::delete('/{libraryBook}', [AdminApiController::class, 'deleteLibraryBook'])->middleware('permission:library.delete');
        });
        Route::prefix('certificates')->middleware('permission:certificates.view')->group(function () {
            Route::get('/', [AdminApiController::class, 'certificates']);
            Route::post('/', [AdminApiController::class, 'storeCertificate'])->middleware('permission:certificates.create');
            Route::put('/{certificate}', [AdminApiController::class, 'updateCertificate'])->middleware('permission:certificates.create');
            Route::put('/{certificate}/approve', [AdminApiController::class, 'approveCertificate'])->middleware('permission:certificates.approve');
            Route::delete('/{certificate}', [AdminApiController::class, 'destroyCertificate'])->middleware('permission:certificates.create');
        });
        Route::put('/profile', [AdminApiController::class, 'updateProfile']);

        Route::middleware('role:school-owner')->prefix('approvals')->group(function () {
            Route::get('/', [\App\Http\Controllers\Api\ApprovalApiController::class, 'index']);
            Route::post('/{user}/approve', [\App\Http\Controllers\Api\ApprovalApiController::class, 'approve']);
            Route::post('/{user}/reject', [\App\Http\Controllers\Api\ApprovalApiController::class, 'reject']);
            Route::post('/{user}/fee-paid', [\App\Http\Controllers\Api\ApprovalApiController::class, 'markFeePaid']);
        });

        Route::middleware('role:school-owner')->prefix('users')->group(function () {
            Route::get('/', [UserAccountApiController::class, 'index']);
            Route::post('/', [UserAccountApiController::class, 'store']);
            Route::put('/{user}', [UserAccountApiController::class, 'update']);
            Route::patch('/{user}/block', [UserAccountApiController::class, 'block']);
            Route::patch('/{user}/unblock', [UserAccountApiController::class, 'unblock']);
            Route::delete('/{user}', [UserAccountApiController::class, 'destroy']);
        });

        Route::prefix('cms')->middleware('permission:cms.view')->group(function () {
            Route::get('/website', [CmsApiController::class, 'overview']);
            Route::put('/settings', [CmsApiController::class, 'updateSettings'])->middleware('permission:cms.edit');
            Route::put('/images', [CmsApiController::class, 'updateImages'])->middleware('permission:cms.edit');
            Route::post('/stats', [CmsApiController::class, 'storeStat'])->middleware('permission:cms.edit');
            Route::put('/stats/{stat}', [CmsApiController::class, 'updateStat'])->middleware('permission:cms.edit');
            Route::delete('/stats/{stat}', [CmsApiController::class, 'destroyStat'])->middleware('permission:cms.edit');
            Route::post('/faculty', [CmsApiController::class, 'storeFaculty'])->middleware('permission:cms.edit');
            Route::put('/faculty/{faculty}', [CmsApiController::class, 'updateFaculty'])->middleware('permission:cms.edit');
            Route::delete('/faculty/{faculty}', [CmsApiController::class, 'destroyFaculty'])->middleware('permission:cms.edit');
            Route::post('/gallery', [CmsApiController::class, 'storeGallery'])->middleware('permission:cms.edit');
            Route::put('/gallery/{gallery}', [CmsApiController::class, 'updateGallery'])->middleware('permission:cms.edit');
            Route::delete('/gallery/{gallery}', [CmsApiController::class, 'destroyGallery'])->middleware('permission:cms.edit');
            Route::post('/faqs', [CmsApiController::class, 'storeFaq'])->middleware('permission:cms.edit');
            Route::put('/faqs/{faq}', [CmsApiController::class, 'updateFaq'])->middleware('permission:cms.edit');
            Route::delete('/faqs/{faq}', [CmsApiController::class, 'destroyFaq'])->middleware('permission:cms.edit');
            Route::post('/programs', [CmsApiController::class, 'storeProgram'])->middleware('permission:cms.edit');
            Route::put('/programs/{program}', [CmsApiController::class, 'updateProgram'])->middleware('permission:cms.edit');
            Route::delete('/programs/{program}', [CmsApiController::class, 'destroyProgram'])->middleware('permission:cms.edit');
        });
    });
});
