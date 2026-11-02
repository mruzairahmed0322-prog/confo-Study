<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Assignment extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'school_id', 'teacher_id', 'subject_id', 'school_class_id',
        'title', 'description', 'due_date', 'total_marks', 'status', 'attachment',
    ];

    protected function casts(): array
    {
        return ['due_date' => 'date'];
    }

    public function school(): BelongsTo { return $this->belongsTo(School::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(Teacher::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function schoolClass(): BelongsTo { return $this->belongsTo(SchoolClass::class); }
    public function submissions(): HasMany { return $this->hasMany(AssignmentSubmission::class); }
}
