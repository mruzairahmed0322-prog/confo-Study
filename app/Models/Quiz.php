<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Quiz extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'school_id', 'teacher_id', 'subject_id', 'school_class_id',
        'title', 'description', 'duration_minutes', 'total_marks',
        'start_time', 'end_time', 'status',
    ];

    protected function casts(): array
    {
        return ['start_time' => 'datetime', 'end_time' => 'datetime'];
    }

    public function school(): BelongsTo { return $this->belongsTo(School::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(Teacher::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function questions(): HasMany { return $this->hasMany(QuizQuestion::class); }
    public function attempts(): HasMany { return $this->hasMany(QuizAttempt::class); }
}
