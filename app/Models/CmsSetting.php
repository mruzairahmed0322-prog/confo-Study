<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class CmsSetting extends Model
{
    protected $table = 'cms_settings';

    protected $fillable = ['school_id', 'tagline', 'about', 'admission_badge'];

    public static function forSchool(int $schoolId): ?self
    {
        $row = DB::table('cms_settings')->where('school_id', $schoolId)->first();
        if (! $row) {
            return null;
        }

        $model = new static;
        $model->setRawAttributes((array) $row, true);
        $model->exists = true;

        return $model;
    }

    /** @param  array<string, mixed>  $attributes */
    public static function upsertForSchool(int $schoolId, array $attributes): self
    {
        DB::table('cms_settings')->updateOrInsert(
            ['school_id' => $schoolId],
            array_merge($attributes, [
                'school_id' => $schoolId,
                'updated_at' => now(),
                'created_at' => now(),
            ])
        );

        return static::forSchool($schoolId) ?? new static(array_merge($attributes, ['school_id' => $schoolId]));
    }
}
