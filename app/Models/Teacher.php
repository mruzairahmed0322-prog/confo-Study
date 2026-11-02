<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Teacher extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'school_id', 'user_id', 'name', 'photo', 'father_name', 'cnic',
        'employee_id', 'email', 'phone',
        'gender', 'joining_date', 'salary', 'status', 'qualification', 'address',
    ];

    protected function casts(): array
    {
        return ['joining_date' => 'date', 'salary' => 'decimal:2'];
    }

    public function school(): BelongsTo { return $this->belongsTo(School::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }

    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class, 'teacher_subject')
            ->withPivot('school_class_id')->withTimestamps();
    }
}
