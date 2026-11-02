<?php

namespace App\Http\Controllers\Api;

use App\Support\YouTubeLiveService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class YouTubeIntegrationController extends BaseApiController
{
    public function status(): JsonResponse
    {
        return $this->success(YouTubeLiveService::integrationStatus($this->schoolId()));
    }

    public function connectUrl(): JsonResponse
    {
        if (! YouTubeLiveService::isConfigured()) {
            return $this->error('YouTube API credentials not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env', 422);
        }

        $url = YouTubeLiveService::authUrl($this->schoolId(), auth()->id());

        return $this->success(['url' => $url]);
    }

    public function disconnect(): JsonResponse
    {
        YouTubeLiveService::disconnect($this->schoolId());

        return $this->success(null, 'YouTube disconnected');
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'youtube_auto_stream' => 'sometimes|boolean',
            'multiple_live_class_mode' => 'sometimes|boolean',
        ]);

        if (array_key_exists('youtube_auto_stream', $data)) {
            save_school_setting(
                'youtube_auto_stream',
                $data['youtube_auto_stream'] ? 'true' : 'false',
                'boolean',
                'integrations'
            );
        }

        if (array_key_exists('multiple_live_class_mode', $data)) {
            save_school_setting(
                'multiple_live_class_mode',
                $data['multiple_live_class_mode'] ? 'true' : 'false',
                'boolean',
                'integrations'
            );
        }

        return $this->success(YouTubeLiveService::integrationStatus($this->schoolId()), 'YouTube settings saved');
    }
}
