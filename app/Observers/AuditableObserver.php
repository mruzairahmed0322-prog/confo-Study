<?php

namespace App\Observers;

use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Model;

class AuditableObserver
{
    public function created(Model $model): void
    {
        AuditLogger::log($model, 'created');
    }

    public function updated(Model $model): void
    {
        $changes = $model->getChanges();
        if (empty($changes)) {
            return;
        }

        AuditLogger::log($model, 'updated', $model->getOriginal(), $changes);
    }

    public function deleted(Model $model): void
    {
        AuditLogger::log($model, 'deleted', $model->getAttributes());
    }
}
