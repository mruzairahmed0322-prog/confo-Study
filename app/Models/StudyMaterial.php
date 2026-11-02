<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class StudyMaterial extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'school_id', 'teacher_id', 'subject_id', 'school_class_id', 'live_class_id',
        'title', 'description', 'type', 'file_path', 'file_name',
        'file_size', 'mime_type', 'file_hash', 'download_allowed', 'status',
    ];

    protected function casts(): array
    {
        return [
            'download_allowed' => 'boolean',
            'file_size' => 'integer',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(Teacher::class);
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function liveClass(): BelongsTo
    {
        return $this->belongsTo(LiveClass::class);
    }
}
