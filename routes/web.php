<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Auth\LoginController;

Route::get('/', function () {
    return auth()->check()
        ? redirect('/app')
        : redirect('/app/login');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('/login', fn () => redirect('/app/login'))->name('login');
    Route::post('/login', [LoginController::class, 'login']);
    Route::get('/register', fn () => redirect('/app/login'))->name('register');
    Route::get('/register/step-2', fn () => redirect('/app/login'));
    Route::get('/register/step-3', fn () => redirect('/app/login'));
    Route::get('/register/pending', fn () => redirect('/app/login'))->name('register.pending');
    Route::post('/register/step-1', fn () => redirect('/app/login'))->name('register.step1');
    Route::post('/register/step-2', fn () => redirect('/app/login'))->name('register.step2.store');
    Route::post('/register', fn () => redirect('/app/login'))->name('register.store');
    Route::get('/password/reset', fn () => redirect('/app/login'))->name('password.request');
    Route::post('/password/email', [LoginController::class, 'sendResetLinkEmail'])->name('password.email');
    Route::get('/password/reset/{token}', [LoginController::class, 'showResetForm'])->name('password.reset');
    Route::post('/password/reset', [LoginController::class, 'reset'])->name('password.update');
});

Route::post('/logout', [LoginController::class, 'logout'])
    ->middleware('auth')
    ->name('logout');

Route::get('/integrations/youtube/callback', [\App\Http\Controllers\YouTubeOAuthController::class, 'callback'])
    ->name('youtube.callback');

$adminRedirects = [
    '' => '/app',
    'dashboard' => '/app',
    'search' => '/app',
    'students' => '/app/students',
    'teachers' => '/app/teachers',
    'classes' => '/app/classes',
    'subjects' => '/app/subjects',
    'timetable' => '/app/timetable',
    'attendance' => '/app/attendance',
    'assignments' => '/app/assignments',
    'quizzes' => '/app/quizzes',
    'live-classes' => '/app/live-classes',
    'exams' => '/app/exams',
    'results' => '/app/results',
    'fees' => '/app/fees',
    'payment-proofs' => '/app/payment-proofs',
    'salary' => '/app/salary',
    'expenses' => '/app/expenses',
    'reports' => '/app/reports',
    'settings' => '/app/settings',
    'approvals' => '/app/approvals',
    'profile' => '/app/profile',
];

Route::prefix('admin')
    ->middleware(['auth', 'user.active', 'school.scope'])
    ->group(function () use ($adminRedirects) {
        foreach ($adminRedirects as $path => $target) {
            Route::redirect($path === '' ? '/' : "/{$path}", $target);
        }
    });

Route::view('/app/{any?}', 'spa')->where('any', '.*')->name('spa');
