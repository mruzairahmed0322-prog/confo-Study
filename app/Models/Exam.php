<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Exam extends Model
{
    protected $fillable = [
        'school_id', 'name', 'type', 'start_date', 'end_date', 'school_class_id', 'status',
    ];

    protected function casts(): array
    {
        return ['start_date' => 'date', 'end_date' => 'date'];
    }

    public function school(): BelongsTo { return $this->belongsTo(School::class); }
    public function schoolClass(): BelongsTo { return $this->belongsTo(SchoolClass::class); }
}
