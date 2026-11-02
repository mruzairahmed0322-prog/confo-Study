<?php

namespace App\Models;

use App\AccountStatus;
use App\ApprovalStatus;
use App\Support\RegistrationGuard;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasRoles, Notifiable, SoftDeletes;

    /**
     * Roles are seeded on the web guard; API auth uses Sanctum.
     * Without this, Spatie resolves roles against the sanctum guard and throws.
     */
    protected $guard_name = 'web';

    protected $fillable = [
        'school_id',
        'name',
        'father_name',
        'cnic',
        'email',
        'password',
        'avatar',
        'phone',
        'address',
        'gender',
        'dob',
        'account_status',
        'approval_status',
        'fee_cleared',
        'approved_at',
        'approved_by',
        'rejection_reason',
        'registration_ip',
        'registration_note',
        'last_login_at',
        'last_login_ip',
        'failed_login_attempts',
        'locked_until',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'dob' => 'date',
            'last_login_at' => 'datetime',
            'locked_until' => 'datetime',
            'approved_at' => 'datetime',
            'fee_cleared' => 'boolean',
            'failed_login_attempts' => 'integer',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function loginLogs(): HasMany
    {
        return $this->hasMany(LoginLog::class);
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function children(): HasMany
    {
        return $this->hasMany(Student::class, 'parent_id');
    }

    public function isSuperAdmin(): bool
    {
        return RegistrationGuard::isSuperAdmin($this);
    }

    public function canAccessSystem(): bool
    {
        return RegistrationGuard::canLogin($this);
    }

    public function isPendingApproval(): bool
    {
        return $this->approval_status === ApprovalStatus::PENDING
            || $this->account_status === AccountStatus::PENDING;
    }

    public function needsFeePayment(): bool
    {
        return ! $this->fee_cleared || $this->account_status === AccountStatus::FEE_PENDING;
    }

    public function isActive(): bool
    {
        return $this->account_status === AccountStatus::ACTIVE;
    }

    public function isLocked(): bool
    {
        return $this->locked_until && $this->locked_until->isFuture();
    }

    public function primaryRoleName(): string
    {
        $this->loadMissing('roles');

        $names = $this->roles->pluck('name')->all();
        if ($names === []) {
            return 'guest';
        }

        // Prefer the highest-privilege role when a user somehow has more than one.
        $priority = [
            'school-owner', 'admin', 'teacher', 'accountant',
            'reception', 'parent', 'student', 'guest',
        ];

        foreach ($priority as $role) {
            if (in_array($role, $names, true)) {
                return $role;
            }
        }

        return $names[0];
    }
}
