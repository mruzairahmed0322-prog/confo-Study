<?php

namespace App\Models;

use App\Models\Concerns\HasSchoolCmsScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CmsStat extends Model
{
    use HasSchoolCmsScope;

    protected $fillable = ['school_id', 'label', 'value', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
