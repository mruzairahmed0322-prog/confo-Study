<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class LiveClass extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'school_id', 'teacher_id', 'subject_id', 'subject_ids', 'active_subject_id', 'school_class_id',
        'title', 'description', 'scheduled_at', 'ends_at', 'duration_minutes',
        'meeting_url', 'youtube_url', 'youtube_broadcast_id', 'youtube_stream_id',
        'youtube_rtmp_url', 'youtube_stream_key',
        'auto_created', 'recording_url', 'platform', 'status',
    ];

    protected function casts(): array
    {
        return [
            'scheduled_at' => 'datetime',
            'ends_at' => 'datetime',
            'subject_ids' => 'array',
        ];
    }

    /** @return list<int> */
    public function resolvedSubjectIds(): array
    {
        $ids = $this->subject_ids ?? [];
        if ($ids === [] && $this->subject_id) {
            return [(int) $this->subject_id];
        }

        return array_values(array_map('intval', $ids));
    }

    public function activeSubject(): BelongsTo
    {
        return $this->belongsTo(Subject::class, 'active_subject_id');
    }

    public function school(): BelongsTo { return $this->belongsTo(School::class); }
    public function teacher(): BelongsTo { return $this->belongsTo(Teacher::class); }
    public function subject(): BelongsTo { return $this->belongsTo(Subject::class); }
    public function schoolClass(): BelongsTo { return $this->belongsTo(SchoolClass::class); }

    public function attendances(): HasMany
    {
        return $this->hasMany(LiveClassAttendance::class);
    }
}
