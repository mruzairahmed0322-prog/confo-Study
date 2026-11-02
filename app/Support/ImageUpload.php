<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ImageUpload
{
    public static function store(?UploadedFile $file, string $folder, ?string $oldPath = null): ?string
    {
        if (! $file) {
            return $oldPath;
        }

        if ($oldPath) {
            Storage::disk('public')->delete($oldPath);
        }

        $name = Str::uuid().'.'.$file->getClientOriginalExtension();

        return $file->storeAs("photos/{$folder}", $name, 'public');
    }

    public static function url(?string $path): ?string
    {
        return $path ? asset('storage/'.$path) : null;
    }
}
