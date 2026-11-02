<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Subject extends Model
{
    protected $fillable = [
        'school_id', 'name', 'code', 'school_class_id', 'type', 'total_marks', 'status',
    ];

    public function school(): BelongsTo { return $this->belongsTo(School::class); }
    public function schoolClass(): BelongsTo { return $this->belongsTo(SchoolClass::class); }

    public function teachers(): BelongsToMany
    {
        return $this->belongsToMany(Teacher::class, 'teacher_subject')
            ->withPivot('school_class_id')->withTimestamps();
    }
}
