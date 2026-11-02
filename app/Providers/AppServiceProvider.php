<?php

namespace App\Providers;

use App\Models\Assignment;
use App\Models\FeePayment;
use App\Models\Student;
use App\Models\Teacher;
use App\Observers\AuditableObserver;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        if ($this->app->environment('production') || env('FORCE_HTTPS', false)) {
            URL::forceScheme('https');
        }

        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            $email = $notifiable->getEmailForPasswordReset();

            return url('/app/reset-password/'.$token.'?email='.urlencode($email));
        });

        Student::observe(AuditableObserver::class);
        Teacher::observe(AuditableObserver::class);
        FeePayment::observe(AuditableObserver::class);
        Assignment::observe(AuditableObserver::class);
    }
}
