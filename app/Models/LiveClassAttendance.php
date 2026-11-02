<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LiveClassAttendance extends Model
{
    protected $fillable = [
        'school_id',
        'live_class_id',
        'student_id',
        'user_id',
        'first_joined_at',
        'last_heartbeat_at',
        'seconds_attended',
        'device',
    ];

    protected function casts(): array
    {
        return [
            'first_joined_at' => 'datetime',
            'last_heartbeat_at' => 'datetime',
        ];
    }

    public function liveClass(): BelongsTo
    {
        return $this->belongsTo(LiveClass::class);
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function minutesAttended(): int
    {
        return (int) floor($this->seconds_attended / 60);
    }
}
