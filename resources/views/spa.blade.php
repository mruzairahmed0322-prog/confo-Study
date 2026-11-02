<!DOCTYPE html>
<html lang="en" class="h-full scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" content="#059669">
    <title>{{ config('app.name') }}</title>

    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="apple-touch-icon" href="/favicon.svg">
    <link rel="shortcut icon" href="/favicon.svg">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" onload="this.onload=null;this.rel='stylesheet'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"></noscript>

    <style>
        #app-splash {
            display: flex;
            min-height: 100vh;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            gap: 1rem;
            background: linear-gradient(135deg, #f7fee7 0%, #fff 40%, #ecfccb 100%);
        }
        .dark #app-splash {
            background: linear-gradient(135deg, #011a12 0%, #042e1c 50%, #011a12 100%);
        }
        #app-splash .splash-ring {
            position: absolute;
            inset: 0;
            border: 2px solid rgba(5, 150, 105, 0.15);
            border-top-color: #059669;
            border-right-color: #84cc16;
            border-radius: 1rem;
            animation: splash-spin 0.9s linear infinite;
        }
        #app-splash .splash-wrap {
            position: relative;
            width: 3.5rem;
            height: 3.5rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        #app-splash .splash-label {
            font-family: Inter, system-ui, sans-serif;
            font-size: 0.875rem;
            font-weight: 600;
            color: #047857;
        }
        .dark #app-splash .splash-label { color: #86efac; }
        @keyframes splash-spin { to { transform: rotate(360deg); } }
    </style>

    <script>if(localStorage.getItem('theme')==='dark')document.documentElement.classList.add('dark');</script>
    <script>
        try {
            var k = 'sms_query_cache_v2';
            var raw = localStorage.getItem(k);
            if (raw && raw.indexOf('youtube-status') !== -1) {
                var store = JSON.parse(raw);
                Object.keys(store.entries || {}).forEach(function (key) {
                    if (key.indexOf('youtube-status') !== -1) delete store.entries[key];
                });
                localStorage.setItem(k, JSON.stringify(store));
            }
        } catch (e) {}
    </script>
    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.tsx'])
    @if(session('spa_token'))
    <script>localStorage.setItem('auth_token', @json(session('spa_token')));</script>
    @endif
</head>
<body class="h-full font-sans antialiased">
    <div id="root">
        <div id="app-splash" role="status" aria-label="Loading {{ config('app.name') }}">
            <div class="splash-wrap">
                <span class="splash-ring" aria-hidden="true"></span>
                <img src="/favicon.svg" width="40" height="40" alt="{{ config('app.name') }}" class="relative z-10">
            </div>
            <p class="splash-label">Loading {{ config('app.name') }}…</p>
        </div>
    </div>
</body>
</html>

