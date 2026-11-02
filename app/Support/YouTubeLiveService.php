<?php

namespace App\Support;

use App\Models\LiveClass;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class YouTubeLiveService
{
    private const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const API_BASE = 'https://www.googleapis.com/youtube/v3';

    /** @var list<string> */
    private const SCOPES = [
        'https://www.googleapis.com/auth/youtube.force-ssl',
        'https://www.googleapis.com/auth/youtube',
    ];

    public static function isConfigured(): bool
    {
        return filled(config('services.google.client_id'))
            && filled(config('services.google.client_secret'));
    }

    public static function isConnected(int $schoolId): bool
    {
        if (filled(self::getTokens($schoolId))) {
            return true;
        }

        return filter_var(school_setting('youtube_connected', false, $schoolId), FILTER_VALIDATE_BOOLEAN)
            && filled(school_setting('youtube_channel_id', null, $schoolId));
    }

    public static function isAutoStreamEnabled(int $schoolId): bool
    {
        if (! self::isConnected($schoolId)) {
            return false;
        }

        $setting = school_setting('youtube_auto_stream', null, $schoolId);

        // Default ON when YouTube is connected — fully automatic
        if ($setting === null) {
            return true;
        }

        return filter_var($setting, FILTER_VALIDATE_BOOLEAN);
    }

    public static function studioLiveUrl(?string $broadcastId): ?string
    {
        return $broadcastId
            ? 'https://studio.youtube.com/video/'.$broadcastId.'/livestreaming'
            : null;
    }

    public static function watchUrl(?string $broadcastId): ?string
    {
        return $broadcastId
            ? 'https://www.youtube.com/watch?v='.$broadcastId
            : null;
    }

    public static function authUrl(int $schoolId, int $userId): string
    {
        $state = Crypt::encryptString(json_encode([
            'school_id' => $schoolId,
            'user_id' => $userId,
            'ts' => time(),
        ]));

        return self::AUTH_URL.'?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => config('services.google.redirect'),
            'response_type' => 'code',
            'scope' => implode(' ', self::SCOPES),
            'access_type' => 'offline',
            'prompt' => 'consent',
            'state' => $state,
        ]);
    }

    public static function handleCallback(string $code, string $state): int
    {
        $payload = json_decode(Crypt::decryptString($state), true);
        $schoolId = (int) ($payload['school_id'] ?? 0);

        if (! $schoolId) {
            throw new \RuntimeException('Invalid OAuth state.');
        }

        $response = Http::asForm()->post(self::TOKEN_URL, [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'code' => $code,
            'grant_type' => 'authorization_code',
            'redirect_uri' => config('services.google.redirect'),
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException('YouTube OAuth failed.');
        }

        self::storeTokens($schoolId, $response->json());

        $channel = self::getMyChannel($schoolId);
        if ($channel) {
            save_school_setting('youtube_channel_id', $channel['id'], 'string', 'integrations', $schoolId);
            save_school_setting('youtube_channel_title', $channel['title'], 'string', 'integrations', $schoolId);
        }
        save_school_setting('youtube_connected', 'true', 'boolean', 'integrations', $schoolId);
        save_school_setting('youtube_auto_stream', 'true', 'boolean', 'integrations', $schoolId);

        return $schoolId;
    }

    /** @param  array<string, mixed>  $data */
    private static function storeTokens(int $schoolId, array $data): void
    {
        $existing = self::getTokens($schoolId) ?? [];
        $merged = array_merge($existing, array_filter($data));

        if (isset($data['expires_in'])) {
            $merged['expires_at'] = time() + (int) $data['expires_in'];
        }

        save_school_setting(
            'youtube_oauth_tokens',
            Crypt::encryptString(json_encode($merged)),
            'string',
            'integrations',
            $schoolId
        );
    }

    /** @return array<string, mixed>|null */
    public static function getTokens(int $schoolId): ?array
    {
        $encrypted = school_setting('youtube_oauth_tokens', null, $schoolId);
        if (! $encrypted) {
            return null;
        }

        try {
            return json_decode(Crypt::decryptString($encrypted), true);
        } catch (\Throwable) {
            return null;
        }
    }

    public static function disconnect(int $schoolId): void
    {
        foreach (['youtube_oauth_tokens', 'youtube_channel_id', 'youtube_channel_title', 'youtube_connected', 'youtube_auto_stream'] as $key) {
            \App\Models\SystemSetting::where('school_id', $schoolId)->where('key', $key)->delete();
            cache()->forget("school_setting_{$schoolId}_{$key}");
        }
    }

    private static function getAccessToken(int $schoolId): ?string
    {
        $tokens = self::getTokens($schoolId);
        if (! $tokens) {
            return null;
        }

        if (isset($tokens['expires_at']) && time() < ($tokens['expires_at'] - 60)) {
            return $tokens['access_token'];
        }

        if (empty($tokens['refresh_token'])) {
            return $tokens['access_token'] ?? null;
        }

        $response = Http::asForm()->post(self::TOKEN_URL, [
            'client_id' => config('services.google.client_id'),
            'client_secret' => config('services.google.client_secret'),
            'refresh_token' => $tokens['refresh_token'],
            'grant_type' => 'refresh_token',
        ]);

        if (! $response->successful()) {
            Log::error('YouTube token refresh failed', ['school_id' => $schoolId]);

            return null;
        }

        self::storeTokens($schoolId, $response->json());

        return self::getTokens($schoolId)['access_token'] ?? null;
    }

    /**
     * @param  array<string, mixed>  $query
     * @param  array<string, mixed>|null  $body
     * @return array<string, mixed>
     */
    private static function api(int $schoolId, string $method, string $path, array $query = [], ?array $body = null): array
    {
        $token = self::getAccessToken($schoolId);
        if (! $token) {
            throw new \RuntimeException('YouTube not connected or token expired.');
        }

        $url = self::API_BASE.$path;
        $request = Http::withToken($token)->acceptJson();

        $response = match ($method) {
            'GET' => $request->get($url, $query),
            'POST' => $body
                ? $request->post($url.'?'.http_build_query($query), $body)
                : $request->post($url.'?'.http_build_query($query)),
            default => throw new \InvalidArgumentException("Unsupported method: {$method}"),
        };

        if (! $response->successful()) {
            $payload = $response->json();
            $apiMessage = is_array($payload)
                ? (string) data_get($payload, 'error.message', $response->body())
                : $response->body();

            throw new \RuntimeException(self::friendlyApiError($apiMessage));
        }

        return $response->json();
    }

    private static function friendlyApiError(string $apiMessage): string
    {
        $lower = strtolower($apiMessage);

        if (str_contains($lower, 'live streaming not enabled')
            || str_contains($lower, 'livestreamingnotenabled')
            || str_contains($lower, 'livepermissionblocked')) {
            return 'YouTube Live is not enabled on this channel. Open YouTube Studio → Go Live once, then retry Create Stream.';
        }

        if (str_contains($lower, 'invalidscheduledstarttime')
            || str_contains($lower, 'scheduled start time')
            || str_contains($lower, 'must be in the future')) {
            return 'YouTube rejected the start time. Retry Create Stream — a fresh start time will be used.';
        }

        if (str_contains($lower, 'accessnotconfigured')) {
            return 'YouTube API access issue. Reconnect YouTube in System Settings, then retry.';
        }

        if (str_contains($lower, 'embed setting was invalid')
            || str_contains($lower, 'enableembed')
            || str_contains($lower, 'embedding')) {
            return 'YouTube rejected embed settings. In YouTube Studio → Settings → Channel → Advanced, turn ON “Allow embedding”, then retry Create Stream.';
        }

        return 'YouTube API error: '.$apiMessage;
    }

    /** @return array{id: string, title: string}|null */
    public static function getMyChannel(int $schoolId): ?array
    {
        $data = self::api($schoolId, 'GET', '/channels', ['part' => 'snippet', 'mine' => 'true']);
        $item = $data['items'][0] ?? null;

        return $item ? ['id' => $item['id'], 'title' => $item['snippet']['title']] : null;
    }

    /**
     * @return array{broadcast_id: string, stream_id: string, youtube_url: string}
     */
    public static function createScheduledBroadcast(LiveClass $liveClass): array
    {
        $schoolId = $liveClass->school_id;
        // YouTube rejects scheduledStartTime in the past — common when status is already Live
        // or Create Stream is clicked after the class start time.
        $start = $liveClass->scheduled_at?->copy() ?? now();
        if ($start->lte(now()->addMinute())) {
            $start = now()->addMinutes(2);
        }

        $end = $liveClass->ends_at?->copy();
        if (! $end || $end->lte($start)) {
            $end = $start->copy()->addMinutes(max(1, (int) ($liveClass->duration_minutes ?? 60)));
        }

        // Do not send enableEmbed on insert — many channels return "Embed setting was invalid".
        // Unlisted lives remain embeddable when channel "Allow embedding" is on.
        $snippet = [
            'title' => mb_substr(trim((string) $liveClass->title) !== '' ? (string) $liveClass->title : 'Live Class', 0, 100),
            'description' => mb_substr((string) ($liveClass->description ?: $liveClass->title ?: 'Live class'), 0, 5000),
            'scheduledStartTime' => $start->copy()->utc()->format('Y-m-d\TH:i:s\Z'),
            'scheduledEndTime' => $end->copy()->utc()->format('Y-m-d\TH:i:s\Z'),
        ];
        $status = [
            'privacyStatus' => 'unlisted',
            'selfDeclaredMadeForKids' => false,
        ];
        $contentDetails = [
            'enableAutoStart' => true,
            'enableAutoStop' => true,
            'enableDvr' => true,
            // recordFromStart / enableEmbed omitted — fail on some channels
        ];

        try {
            $broadcast = self::api($schoolId, 'POST', '/liveBroadcasts', [
                'part' => 'snippet,status,contentDetails',
            ], [
                'snippet' => $snippet,
                'status' => $status,
                'contentDetails' => $contentDetails,
            ]);
        } catch (\RuntimeException $e) {
            // Fallback: minimal contentDetails if channel rejects DVR/auto flags
            if (! str_contains(strtolower($e->getMessage()), 'embed')
                && ! str_contains(strtolower($e->getMessage()), 'invalid')) {
                throw $e;
            }
            $broadcast = self::api($schoolId, 'POST', '/liveBroadcasts', [
                'part' => 'snippet,status,contentDetails',
            ], [
                'snippet' => $snippet,
                'status' => $status,
                'contentDetails' => [
                    'enableAutoStart' => true,
                    'enableAutoStop' => true,
                ],
            ]);
        }

        $broadcastId = $broadcast['id'];

        $stream = self::api($schoolId, 'POST', '/liveStreams', [
            'part' => 'snippet,cdn',
        ], [
            'snippet' => ['title' => mb_substr(($liveClass->title ?: 'Live').' — Stream', 0, 100)],
            'cdn' => ['frameRate' => 'variable', 'resolution' => 'variable', 'ingestionType' => 'rtmp'],
        ]);

        $streamId = $stream['id'];
        $ingestion = $stream['cdn']['ingestionInfo'] ?? [];

        // Some channels return stream without ingestionInfo on create — fetch again.
        if (empty($ingestion['ingestionAddress']) || empty($ingestion['streamName'])) {
            $fresh = self::api($schoolId, 'GET', '/liveStreams', [
                'part' => 'cdn',
                'id' => $streamId,
            ]);
            $ingestion = $fresh['items'][0]['cdn']['ingestionInfo'] ?? $ingestion;
        }

        self::api($schoolId, 'POST', '/liveBroadcasts/bind', [
            'id' => $broadcastId,
            'part' => 'id,contentDetails',
            'streamId' => $streamId,
        ]);

        if (empty($ingestion['ingestionAddress']) || empty($ingestion['streamName'])) {
            throw new \RuntimeException('YouTube stream created but RTMP URL / Stream Key missing. Reconnect YouTube and retry Create Stream.');
        }

        return [
            'broadcast_id' => $broadcastId,
            'stream_id' => $streamId,
            'youtube_url' => self::watchUrl($broadcastId),
            'studio_url' => self::studioLiveUrl($broadcastId),
            'rtmp_url' => $ingestion['ingestionAddress'] ?? null,
            'stream_key' => $ingestion['streamName'] ?? null,
        ];
    }

    public static function videoId(LiveClass $liveClass): ?string
    {
        if (filled($liveClass->youtube_broadcast_id)) {
            return $liveClass->youtube_broadcast_id;
        }

        foreach ([$liveClass->youtube_url, $liveClass->recording_url, $liveClass->meeting_url] as $url) {
            $id = self::videoIdFromUrl((string) $url);
            if ($id) {
                return $id;
            }
        }

        return null;
    }

    public static function videoIdFromUrl(?string $url): ?string
    {
        if (! $url) {
            return null;
        }

        if (preg_match('~(?:youtu\.be/|v/|embed/|watch\?v=)([A-Za-z0-9_-]{11})~', $url, $m)) {
            return $m[1];
        }

        return null;
    }

    public static function concurrentViewers(LiveClass $liveClass): ?int
    {
        $id = $liveClass->youtube_broadcast_id;
        if (! $id) {
            return null;
        }

        try {
            $data = self::api($liveClass->school_id, 'GET', '/videos', [
                'part' => 'liveStreamingDetails',
                'id' => $id,
            ]);
            $viewers = $data['items'][0]['liveStreamingDetails']['concurrentViewers'] ?? null;

            return $viewers !== null ? (int) $viewers : null;
        } catch (\Throwable) {
            return null;
        }
    }

    public static function syncBroadcastStatus(LiveClass $liveClass): void
    {
        if (! $liveClass->youtube_broadcast_id || ! self::isConnected($liveClass->school_id)) {
            return;
        }

        try {
            $broadcast = self::api($liveClass->school_id, 'GET', '/liveBroadcasts', [
                'part' => 'status',
                'id' => $liveClass->youtube_broadcast_id,
            ]);
            $lifeCycle = $broadcast['items'][0]['status']['lifeCycleStatus'] ?? '';

            if ($lifeCycle === 'live' && $liveClass->status !== 'live') {
                $liveClass->update(['status' => 'live']);
            }

            if (in_array($lifeCycle, ['complete', 'revoked'], true) && $liveClass->status === 'live') {
                $payload = ['status' => 'completed'];
                if (blank($liveClass->recording_url) && filled($liveClass->youtube_broadcast_id)) {
                    $payload['recording_url'] = self::watchUrl($liveClass->youtube_broadcast_id);
                }
                $liveClass->update($payload);
            }
        } catch (\Throwable $e) {
            Log::warning('YouTube status sync failed', [
                'live_class_id' => $liveClass->id,
                'error' => $e->getMessage(),
            ]);
        }
    }

    /**
     * Persist watch URL so the Recordings page can list the class.
     * Live Classes "Watch" can use youtube_broadcast_id alone; Recordings requires recording_url.
     */
    public static function ensureRecordingUrl(LiveClass $liveClass): bool
    {
        if (filled($liveClass->recording_url)) {
            return false;
        }

        $videoId = self::videoId($liveClass);
        if (! $videoId) {
            return false;
        }

        $url = self::watchUrl($videoId);
        if (! $url) {
            return false;
        }

        $liveClass->update(['recording_url' => $url]);

        return true;
    }

    /** @return array{rtmp_url: ?string, stream_key: ?string} */
    public static function obsCredentials(LiveClass $liveClass): array
    {
        $rtmp = $liveClass->youtube_rtmp_url;
        $key = null;

        if (filled($liveClass->youtube_stream_key)) {
            try {
                $key = Crypt::decryptString($liveClass->youtube_stream_key);
            } catch (\Throwable) {
                $key = null;
            }
        }

        if ((! $rtmp || ! $key) && $liveClass->youtube_stream_id && self::isConnected($liveClass->school_id)) {
            try {
                $stream = self::api($liveClass->school_id, 'GET', '/liveStreams', [
                    'part' => 'cdn',
                    'id' => $liveClass->youtube_stream_id,
                ]);
                $ingestion = $stream['items'][0]['cdn']['ingestionInfo'] ?? [];
                $rtmp = $rtmp ?: ($ingestion['ingestionAddress'] ?? null);
                $key = $key ?: ($ingestion['streamName'] ?? null);

                if ($rtmp || isset($ingestion['streamName'])) {
                    $liveClass->update([
                        'youtube_rtmp_url' => $rtmp,
                        'youtube_stream_key' => isset($ingestion['streamName'])
                            ? Crypt::encryptString($ingestion['streamName'])
                            : $liveClass->youtube_stream_key,
                    ]);
                }
            } catch (\Throwable $e) {
                Log::warning('YouTube OBS credentials fetch failed', [
                    'live_class_id' => $liveClass->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return [
            'rtmp_url' => $rtmp,
            'stream_key' => $key,
        ];
    }

    public static function syncRecording(LiveClass $liveClass): bool
    {
        if (filled($liveClass->recording_url)) {
            return false;
        }

        // Already completed in app (manual end / status sync) — attach URL immediately.
        if ($liveClass->status === 'completed' && self::ensureRecordingUrl($liveClass)) {
            return true;
        }

        if (! $liveClass->youtube_broadcast_id) {
            return false;
        }

        $endTime = $liveClass->scheduled_at->copy()->addMinutes($liveClass->duration_minutes ?? 60);
        $recordingUrl = self::watchUrl($liveClass->youtube_broadcast_id);
        $schoolId = $liveClass->school_id;

        try {
            $broadcast = self::api($schoolId, 'GET', '/liveBroadcasts', [
                'part' => 'status,contentDetails',
                'id' => $liveClass->youtube_broadcast_id,
            ]);

            $item = $broadcast['items'][0] ?? null;
            $lifeCycle = $item['status']['lifeCycleStatus'] ?? '';

            if ($lifeCycle === 'live' && $liveClass->status !== 'live') {
                $liveClass->update(['status' => 'live']);
            }

            if ($lifeCycle === 'complete') {
                $liveClass->update([
                    'recording_url' => $recordingUrl,
                    'status' => 'completed',
                ]);

                return true;
            }

            // Do not wait for scheduled end if YouTube already finished — handled above.
            if ($endTime->isFuture()) {
                return false;
            }

            // Fallback: class ended 45+ min ago — recording should be processing/done
            if ($endTime->copy()->addMinutes(45)->isPast()) {
                $liveClass->update([
                    'recording_url' => $recordingUrl,
                    'status' => 'completed',
                ]);

                return true;
            }
        } catch (\Throwable $e) {
            Log::warning('YouTube recording sync failed', [
                'live_class_id' => $liveClass->id,
                'error' => $e->getMessage(),
            ]);

            if ($endTime->isFuture()) {
                return false;
            }

            if ($endTime->copy()->addMinutes(60)->isPast()) {
                $liveClass->update([
                    'recording_url' => $recordingUrl,
                    'status' => 'completed',
                ]);

                return true;
            }
        }

        return false;
    }

    /** @return array<string, mixed> */
    public static function integrationStatus(int $schoolId): array
    {
        return [
            'configured' => self::isConfigured(),
            'connected' => self::isConnected($schoolId),
            'auto_stream_enabled' => self::isAutoStreamEnabled($schoolId),
            'multiple_live_class_mode' => LiveClassService::isMultipleLiveClassModeEnabled($schoolId),
            'channel_title' => school_setting('youtube_channel_title', null, $schoolId),
            'channel_id' => school_setting('youtube_channel_id', null, $schoolId),
        ];
    }
}
