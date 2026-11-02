<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentUpload
{
    /** @var list<string> */
    public const ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'zip', 'jpg', 'jpeg', 'png', 'webp', 'epub'];

    /**
     * Store study documents on the local (private) disk — never expose public /storage URLs.
     *
     * @return array{file_path: string, file_name: string, file_size: int, mime_type: string, file_hash: string}|null
     */
    public static function store(?UploadedFile $file, string $folder, ?string $oldPath = null, string $disk = 'local'): ?array
    {
        if (! $file) {
            return null;
        }

        $ext = strtolower($file->getClientOriginalExtension() ?: 'bin');
        if (! in_array($ext, self::ALLOWED_EXTENSIONS, true)) {
            abort(422, 'File type not allowed. Use PDF, Word, PowerPoint, Excel, images, or ZIP.');
        }

        self::delete($oldPath);

        $storedName = Str::uuid().'.'.$ext;
        $path = $file->storeAs("documents/{$folder}", $storedName, $disk);
        $realPath = $file->getRealPath() ?: Storage::disk($disk)->path($path);

        return [
            'file_path' => $path,
            'file_name' => $file->getClientOriginalName(),
            'file_size' => $file->getSize(),
            'mime_type' => $file->getMimeType() ?: 'application/octet-stream',
            'file_hash' => hash_file('sha256', $realPath),
        ];
    }

    public static function delete(?string $path): void
    {
        if (! $path) {
            return;
        }

        foreach (['local', 'public'] as $disk) {
            if (Storage::disk($disk)->exists($path)) {
                Storage::disk($disk)->delete($path);

                return;
            }
        }
    }

    public static function resolveDisk(string $path): string
    {
        if (Storage::disk('local')->exists($path)) {
            return 'local';
        }

        return 'public';
    }

    public static function absolutePath(string $path): string
    {
        $disk = self::resolveDisk($path);

        return Storage::disk($disk)->path($path);
    }
}
