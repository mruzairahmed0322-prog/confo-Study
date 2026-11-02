<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LibraryBook extends Model
{
    protected $fillable = [
        'school_id',
        'title',
        'author',
        'isbn',
        'category',
        'total_copies',
        'available_copies',
        'shelf_location',
        'status',
        'description',
        'file_path',
        'file_name',
        'file_size',
        'mime_type',
    ];

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }
}
