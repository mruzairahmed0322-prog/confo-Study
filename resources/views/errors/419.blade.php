<!DOCTYPE html>
<html lang="{{ app()->getLocale() }}" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="#059669">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/favicon.svg">
    <title>{{ __('ui.page_expired') }} — {{ config('app.name') }}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    @include('partials.auth.login-theme')
</head>
<body class="login-page flex min-h-screen items-center justify-center p-6">
    <div class="login-bg-overlay fixed inset-0" aria-hidden="true"></div>
    <div class="login-glass-strong relative z-10 w-full max-w-md rounded-3xl p-8 text-center">
        <p class="text-6xl font-extrabold login-gradient-text">419</p>
        <h1 class="mt-4 text-xl font-bold text-yellow-50">{{ __('ui.page_expired') }}</h1>
        <p class="mt-2 text-sm text-yellow-100/70">{{ __('ui.page_expired_desc') }}</p>
        <a href="{{ route('login') }}" class="login-glass-btn mt-6 inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-bold">
            {{ __('ui.back_to_login') }}
        </a>
    </div>
</body>
</html>
