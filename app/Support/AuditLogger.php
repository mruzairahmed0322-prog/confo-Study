<?php

namespace App\Support;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    public static function log(Model $model, string $event, ?array $oldValues = null, ?array $newValues = null): void
    {
        if (! auth()->check()) {
            return;
        }

        $user = auth()->user();

        AuditLog::create([
            'school_id' => $user->school_id,
            'user_id' => $user->id,
            'auditable_type' => $model::class,
            'auditable_id' => $model->getKey(),
            'event' => $event,
            'old_values' => $oldValues,
            'new_values' => $newValues ?? $model->getAttributes(),
            'url' => Request::fullUrl(),
            'ip_address' => Request::ip(),
        ]);
    }
}
