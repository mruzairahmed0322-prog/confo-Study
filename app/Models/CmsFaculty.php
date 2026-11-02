<?php

namespace App\Models;

use App\Models\Concerns\HasSchoolCmsScope;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CmsFaculty extends Model
{
    use HasSchoolCmsScope;

    protected $table = 'cms_faculty';

    protected $fillable = ['school_id', 'name', 'subject', 'classes', 'image_url', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
