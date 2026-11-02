<?php

namespace App\Http\Middleware;

use App\Models\ActivityLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class LogUserActivity
{
    protected array $ignoredRoutes = [
        'admin.dashboard',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        if (! auth()->check()) {
            return;
        }

        if ($request->isMethod('GET')) {
            return;
        }

        if ($request->routeIs($this->ignoredRoutes)) {
            return;
        }

        $user = auth()->user();

        ActivityLog::create([
            'school_id' => $user->school_id,
            'user_id' => $user->id,
            'action' => strtolower($request->method()).'.'.$request->route()?->getName(),
            'model_type' => 'HTTP Request',
            'model_id' => null,
            'description' => $user->name.' performed '.$request->method().' on '.$request->path(),
            'properties' => [
                'route' => $request->route()?->getName(),
                'method' => $request->method(),
                'url' => $request->fullUrl(),
                'status_code' => $response->getStatusCode(),
            ],
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
