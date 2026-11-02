<?php

namespace App\Support;

use App\Models\LiveClass;
use Illuminate\Support\Str;

class JitsiLiveService
{
    public const DOMAIN = 'meet.jit.si';

    /**
     * Create a secure Jitsi room URL — teacher opens browser, allows camera, done.
     * No OBS, no YouTube account, no extra software.
     */
    public static function createRoom(LiveClass $liveClass): string
    {
        $room = 'ConfoStudy-'.$liveClass->school_id.'-'.Str::lower(Str::random(24));

        return 'https://'.self::DOMAIN.'/'.$room;
    }

    public static function roomNameFromUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        $path = parse_url($url, PHP_URL_PATH);

        return $path ? ltrim($path, '/') : null;
    }

    public static function isJitsiPlatform(LiveClass $liveClass): bool
    {
        return $liveClass->platform === 'jitsi';
    }
}
