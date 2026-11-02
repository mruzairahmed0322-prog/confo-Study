<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Student extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'school_id',
        'school_class_id',
        'parent_id',
        'user_id',
        'name',
        'photo',
        'father_name',
        'mother_name',
        'roll_no',
        'gr_no',
        'b_form_no',
        'gender',
        'dob',
        'section',
        'religion',
        'blood_group',
        'admission_date',
        'status',
        'phone',
        'emergency_contact',
        'father_cnic',
        'father_phone',
        'address',
        'previous_school',
        'city',
    ];

    protected function casts(): array
    {
        return [
            'admission_date' => 'date',
            'dob' => 'date',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function schoolClass(): BelongsTo
    {
        return $this->belongsTo(SchoolClass::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function feePayments(): HasMany
    {
        return $this->hasMany(FeePayment::class);
    }

    public function classLabel(): string
    {
        return $this->schoolClass?->displayName() ?? '—';
    }
}
