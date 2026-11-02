<?php

namespace App\Console\Commands;

use App\Models\LiveClass;
use App\Support\NotificationService;
use App\Support\YouTubeLiveService;
use Illuminate\Console\Command;

class SyncYouTubeRecordingsCommand extends Command
{
    protected $signature = 'youtube:sync-recordings';

    protected $description = 'Sync YouTube live class status and recordings';

    public function handle(): int
    {
        $synced = 0;

        LiveClass::query()
            ->whereNotNull('youtube_broadcast_id')
            ->where(function ($q) {
                $q->whereIn('status', ['scheduled', 'live'])
                    ->orWhereNull('recording_url')
                    ->orWhere('recording_url', '');
            })
            ->where('scheduled_at', '<=', now()->addMinutes(30))
            ->orderBy('id')
            ->chunkById(50, function ($classes) use (&$synced) {
                foreach ($classes as $liveClass) {
                    if (! YouTubeLiveService::isConnected($liveClass->school_id)) {
                        continue;
                    }

                    $hadRecording = filled($liveClass->recording_url);

                    YouTubeLiveService::syncBroadcastStatus($liveClass);
                    $liveClass->refresh();

                    if (! YouTubeLiveService::syncRecording($liveClass)) {
                        continue;
                    }

                    $liveClass->refresh();

                    if (! $hadRecording && filled($liveClass->recording_url)) {
                        $liveClass->load(['subject', 'schoolClass']);
                        NotificationService::dispatchForLiveClass(
                            $liveClass,
                            'recording_available',
                            NotificationService::liveClassNotificationVars($liveClass),
                            '/app/recordings'
                        );
                        $synced++;
                    }
                }
            });

        $this->info("Synced {$synced} recording(s).");

        return self::SUCCESS;
    }
}
