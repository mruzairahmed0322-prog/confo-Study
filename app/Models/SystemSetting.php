<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SystemSetting extends Model
{
    protected $fillable = [
        'school_id',
        'key',
        'value',
        'type',
        'group',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
