<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SchoolScope
{
    public function handle(Request $request, Closure $next): Response
    {
        if (auth()->check() && ! Builder::hasGlobalMacro('forSchool')) {
            Builder::macro('forSchool', function (?int $id = null) {
                /** @var Builder $this */
                return $this->where('school_id', $id ?? current_school_id());
            });
        }

        return $next($request);
    }
}
