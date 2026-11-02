<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class CmsImage extends Model
{
    protected $table = 'cms_images';

    protected $fillable = ['school_id', 'hero', 'classroom', 'students', 'school', 'about'];

    public static function payload(int $schoolId): array
    {
        $row = DB::table('cms_images')->where('school_id', $schoolId)->first();

        return [
            'hero' => $row->hero ?? null,
            'classroom' => $row->classroom ?? null,
            'students' => $row->students ?? null,
            'school' => $row->school ?? null,
            'about' => $row->about ?? null,
        ];
    }

    /** @param  array<string, mixed>  $attributes */
    public static function upsertForSchool(int $schoolId, array $attributes): void
    {
        DB::table('cms_images')->updateOrInsert(
            ['school_id' => $schoolId],
            array_merge($attributes, [
                'school_id' => $schoolId,
                'updated_at' => now(),
                'created_at' => now(),
            ])
        );
    }
}
