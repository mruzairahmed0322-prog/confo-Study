<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withSchedule(function (\Illuminate\Console\Scheduling\Schedule $schedule): void {
        $schedule->command('youtube:sync-recordings')->everyFiveMinutes();
    })
    ->withMiddleware(function (Middleware $middleware): void {
        // Bearer-token SPA — do NOT enable statefulApi() (session locks cause login timeouts on shared hosting).

        $middleware->web(append: [
            \App\Http\Middleware\SecurityHeaders::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'permission' => \App\Http\Middleware\PermissionMiddleware::class,
            'user.active' => \App\Http\Middleware\EnsureUserIsActive::class,
            'log.activity' => \App\Http\Middleware\LogUserActivity::class,
            'school.scope' => \App\Http\Middleware\SchoolScope::class,
        ]);

        $middleware->trustProxies(at: '*');

        $middleware->trustHosts(at: [
            'localhost',
            '127.0.0.1',
            'admin.confostudy.com',
            'app.confostudy.com',
            'confostudy.com',
            parse_url(env('APP_URL', 'http://localhost'), PHP_URL_HOST),
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->render(function (\Illuminate\Session\TokenMismatchException $e, $request) {
            if ($request->expectsJson()) {
                return response()->json(['message' => 'Page expired. Please refresh and try again.'], 419);
            }

            if ($request->is('login', 'register', 'password/*')) {
                return redirect()
                    ->route($request->is('register*') ? 'register' : 'login')
                    ->withErrors(['session' => __('ui.page_expired')])
                    ->withInput($request->except('password', 'password_confirmation', '_token'));
            }

            return redirect()->back()
                ->withErrors(['session' => __('ui.page_expired')])
                ->withInput($request->except('password', 'password_confirmation', '_token'));
        });
    })->create();
