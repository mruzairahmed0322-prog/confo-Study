<?php

namespace App\Support;

use App\Models\PushDeviceToken;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ExpoPushService
{
    private const API_URL = 'https://exp.host/--/api/v2/push/send';

    /** @var array<string, string> */
    private const MOBILE_URL_MAP = [
        '/app/live-classes' => '/(main)/live-classes',
        '/app/recordings' => '/(main)/recordings',
        '/app/students' => '/(main)/students',
        '/app/teachers' => '/(main)/teachers',
        '/app/fees' => '/(main)/fees',
        '/app/exams' => '/(main)/exams',
        '/app/assignments' => '/(main)/assignments',
        '/app/homework' => '/(main)/homework',
        '/app/materials' => '/(main)/materials',
        '/app/quizzes' => '/(main)/quizzes',
        '/app/attendance' => '/(main)/attendance',
        '/app/notifications' => '/(main)/notifications',
    ];

    public static function mobileUrlFromLink(?string $link): string
    {
        if ($link && isset(self::MOBILE_URL_MAP[$link])) {
            return self::MOBILE_URL_MAP[$link];
        }

        return '/(main)/notifications';
    }

    public static function sendToUser(User $user, string $title, string $body, array $data = []): void
    {
        $tokens = PushDeviceToken::where('user_id', $user->id)->pluck('token');

        if ($tokens->isEmpty()) {
            return;
        }

        self::sendToTokens($tokens, $title, $body, $data);
    }

  /**
   * @param  Collection<int, string>|array<int, string>  $tokens
   */
    public static function sendToTokens(Collection|array $tokens, string $title, string $body, array $data = []): void
    {
        $tokenList = collect($tokens)->filter()->unique()->values();

        if ($tokenList->isEmpty()) {
            return;
        }

        $messages = $tokenList->map(fn (string $token) => [
            'to' => $token,
            'title' => $title,
            'body' => $body,
            'sound' => 'default',
            'priority' => 'high',
            'data' => $data,
        ])->all();

        try {
            $response = Http::acceptJson()
                ->timeout(15)
                ->post(self::API_URL, $messages);

            if (! $response->successful()) {
                Log::warning('Expo push request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                return;
            }

            $payload = $response->json('data') ?? [];

            foreach ($payload as $index => $result) {
                if (($result['status'] ?? '') === 'error') {
                    $detail = $result['details'] ?? [];
                    $error = $detail['error'] ?? null;

                    if ($error === 'DeviceNotRegistered') {
                        $invalidToken = $tokenList[$index] ?? null;
                        if ($invalidToken) {
                            PushDeviceToken::where('token', $invalidToken)->delete();
                        }
                    }

                    Log::warning('Expo push ticket error', $result);
                }
            }
        } catch (\Throwable $e) {
            Log::error('Expo push exception', ['message' => $e->getMessage()]);
        }
    }
}
