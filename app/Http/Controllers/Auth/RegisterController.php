<?php

namespace App\Http\Controllers\Auth;

use App\AccountStatus;
use App\ApprovalStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterStep1Request;
use App\Http\Requests\Auth\RegisterStep2Request;
use App\Http\Requests\Auth\RegisterStep3Request;
use App\Models\ActivityLog;
use App\Models\User;
use App\Support\RegistrationGuard;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class RegisterController extends Controller
{
    private const SESSION_KEY = 'register_wizard';

    public function __construct()
    {
        $this->middleware('guest');
    }

    public function showRegistrationForm(Request $request): RedirectResponse
    {
        return redirect('/app/login')->withErrors([
            'email' => 'Public registration is disabled. Contact your school administrator for login credentials.',
        ]);
    }

    public function storeStep1(RegisterStep1Request $request): RedirectResponse
    {
        $request->session()->put(self::SESSION_KEY, array_merge(
            $request->session()->get(self::SESSION_KEY, []),
            $request->validated(),
            ['_form_started' => $request->session()->get(self::SESSION_KEY.'._form_started', time())]
        ));

        return redirect('/app/register');
    }

    public function showStep2(Request $request): RedirectResponse
    {
        if (! $this->hasStep1($request)) {
            return redirect('/app/register');
        }

        return redirect('/app/register');
    }

    public function storeStep2(RegisterStep2Request $request): RedirectResponse
    {
        if (! $this->hasStep1($request)) {
            return redirect()->route('register');
        }

        $request->session()->put(self::SESSION_KEY, array_merge(
            $request->session()->get(self::SESSION_KEY, []),
            $request->validated()
        ));

        return redirect('/app/register');
    }

    public function showStep3(Request $request): RedirectResponse
    {
        if (! $this->hasStep1($request) || ! $request->session()->has(self::SESSION_KEY.'.role')) {
            return redirect('/app/register');
        }

        return redirect('/app/register');
    }

    public function register(RegisterStep3Request $request): RedirectResponse
    {
        return redirect('/app/login')->withErrors([
            'email' => 'Public registration is disabled. Contact your school administrator for login credentials.',
        ]);
    }

    public function pending(): RedirectResponse
    {
        return redirect('/app/register/pending');
    }

    private function hasStep1(Request $request): bool
    {
        $data = $request->session()->get(self::SESSION_KEY, []);

        return ! empty($data['name']) && ! empty($data['email']);
    }
}
