<?php

namespace App\Http\Controllers\Auth;

use App\AccountStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\ActivityLog;
use App\Models\LoginLog;
use App\Models\User;
use App\Support\RegistrationGuard;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;

class LoginController extends Controller
{
    private const MAX_ATTEMPTS = 5;
    private const LOCK_MINUTES = 15;
    private const REMEMBER_DAYS = 30;

    public function __construct()
    {
        $this->middleware('guest')->except('logout');
    }

    public function showLoginForm(): RedirectResponse
    {
        return redirect('/app/login');
    }

    public function login(LoginRequest $request): RedirectResponse
    {
        $email = $request->validated('email');
        $user = User::where('email', $email)->first();

        if ($user && $user->isLocked()) {
            LoginLog::create([
                'school_id' => $user->school_id,
                'user_id' => $user->id,
                'email' => $email,
                'status' => 'locked',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent() ?? '',
            ]);

            return back()->withErrors([
                'email' => 'Account locked due to too many failed attempts. Try again after '.$user->locked_until->diffForHumans().'.',
            ])->onlyInput('email');
        }

        if (! Auth::attempt(
            $request->only('email', 'password'),
            $request->boolean('remember')
        )) {
            if ($user) {
                $user->increment('failed_login_attempts');

                if ($user->failed_login_attempts >= self::MAX_ATTEMPTS) {
                    $user->update([
                        'locked_until' => now()->addMinutes(self::LOCK_MINUTES),
                        'failed_login_attempts' => 0,
                    ]);

                    LoginLog::create([
                        'school_id' => $user->school_id,
                        'user_id' => $user->id,
                        'email' => $email,
                        'status' => 'locked',
                        'ip_address' => $request->ip(),
                        'user_agent' => $request->userAgent() ?? '',
                    ]);

                    return back()->withErrors([
                        'email' => 'Too many failed attempts. Account locked for '.self::LOCK_MINUTES.' minutes.',
                    ])->onlyInput('email');
                }

                LoginLog::create([
                    'school_id' => $user->school_id,
                    'user_id' => $user->id,
                    'email' => $email,
                    'status' => 'failed',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent() ?? '',
                ]);
            } else {
                LoginLog::create([
                    'school_id' => 1,
                    'user_id' => null,
                    'email' => $email,
                    'status' => 'failed',
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent() ?? '',
                ]);
            }

            return back()->withErrors([
                'email' => 'These credentials do not match our records.',
            ])->onlyInput('email');
        }

        /** @var User $authenticatedUser */
        $authenticatedUser = Auth::user();

        if (! RegistrationGuard::canLogin($authenticatedUser)) {
            Auth::logout();

            LoginLog::create([
                'school_id' => $authenticatedUser->school_id,
                'user_id' => $authenticatedUser->id,
                'email' => $email,
                'status' => 'failed',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent() ?? '',
            ]);

            return back()->withErrors([
                'email' => RegistrationGuard::loginBlockMessage($authenticatedUser),
            ])->onlyInput('email');
        }

        $authenticatedUser->update([
            'failed_login_attempts' => 0,
            'locked_until' => null,
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
        ]);

        LoginLog::create([
            'school_id' => $authenticatedUser->school_id,
            'user_id' => $authenticatedUser->id,
            'email' => $email,
            'status' => 'success',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent() ?? '',
        ]);

        if ($request->boolean('remember')) {
            config(['session.lifetime' => self::REMEMBER_DAYS * 24 * 60]);
        }

        $request->session()->regenerate();

        $token = $authenticatedUser->createToken('web-spa')->plainTextToken;
        session()->flash('spa_token', $token);

        return redirect()->intended('/app');
    }

    public function logout(Request $request): RedirectResponse
    {
        if ($user = auth()->user()) {
            ActivityLog::create([
                'school_id' => $user->school_id,
                'user_id' => $user->id,
                'action' => 'logout',
                'model_type' => User::class,
                'model_id' => $user->id,
                'description' => $user->name.' logged out.',
                'properties' => null,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        }

        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('login');
    }

    public function showLinkRequestForm(): RedirectResponse
    {
        return redirect('/app/login');
    }

    public function sendResetLinkEmail(Request $request): RedirectResponse
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'Please enter your email address.',
            'email.email' => 'Please enter a valid email address.',
        ]);

        $status = Password::sendResetLink($request->only('email'));

        return $status === Password::RESET_LINK_SENT
            ? back()->with('status', __($status))
            : back()->withErrors(['email' => __($status)]);
    }

    public function showResetForm(Request $request, string $token): RedirectResponse
    {
        return redirect('/app/login');
    }

    public function reset(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', 'min:8'],
        ], [
            'password.min' => 'Password must be at least 8 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                    'failed_login_attempts' => 0,
                    'locked_until' => null,
                ])->save();

                event(new PasswordReset($user));
            }
        );

        return $status === Password::PASSWORD_RESET
            ? redirect()->route('login')->with('status', __($status))
            : back()->withErrors(['email' => [__($status)]]);
    }
}
