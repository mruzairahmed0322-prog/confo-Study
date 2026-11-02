<?php

namespace App\Http\Controllers;

use App\Support\YouTubeLiveService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class YouTubeOAuthController extends Controller
{
    public function callback(Request $request): RedirectResponse
    {
        if ($request->filled('error')) {
            return redirect('/app/system-settings?youtube=denied');
        }

        if (! $request->filled('code') || ! $request->filled('state')) {
            return redirect('/app/system-settings?youtube=error');
        }

        try {
            YouTubeLiveService::handleCallback($request->code, $request->state);

            return redirect('/app/system-settings?youtube=connected');
        } catch (\Throwable $e) {
            Log::error('YouTube OAuth callback failed', ['error' => $e->getMessage()]);

            return redirect('/app/system-settings?youtube=error');
        }
    }
}
