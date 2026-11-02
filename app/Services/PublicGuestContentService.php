<?php

namespace App\Services;

use App\Models\Event;
use App\Models\LiveClass;
use Illuminate\Support\Facades\Schema;

class PublicGuestContentService
{
    /** @return list<array<string, mixed>> */
    public function events(int $schoolId, int $limit = 6): array
    {
        if (! class_exists(Event::class) || ! Schema::hasTable('events') || ! Schema::hasColumn('events', 'event_date')) {
            return [];
        }

        try {
            return Event::where('school_id', $schoolId)
                ->whereDate('event_date', '>=', now()->toDateString())
                ->orderBy('event_date')
                ->limit($limit)
                ->get()
                ->map(fn (Event $e) => [
                    'id' => $e->id,
                    'title' => $e->title,
                    'description' => $e->description,
                    'event_date' => $e->event_date?->format('Y-m-d'),
                    'type' => $e->type,
                ])
                ->values()
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    /** @return list<array<string, mixed>> */
    public function upcomingClasses(int $schoolId, int $limit = 6): array
    {
        if (! class_exists(LiveClass::class) || ! Schema::hasTable('live_classes')) {
            return [];
        }

        try {
            $query = LiveClass::query()->where('school_id', $schoolId);

            if (Schema::hasColumn('live_classes', 'status')) {
                $query->where('status', 'scheduled');
            }
            if (Schema::hasColumn('live_classes', 'scheduled_at')) {
                $query->where('scheduled_at', '>=', now())->orderBy('scheduled_at');
            }

            $with = array_values(array_filter(
                ['teacher', 'subject', 'schoolClass'],
                fn (string $relation) => method_exists(LiveClass::class, $relation),
            ));
            if ($with !== []) {
                $query->with($with);
            }

            return $query
                ->limit($limit)
                ->get()
                ->map(fn (LiveClass $lc) => [
                    'id' => $lc->id,
                    'title' => $lc->title,
                    'scheduled_at' => $lc->scheduled_at?->toIso8601String(),
                    'platform' => $lc->platform ?? null,
                    'teacher' => $lc->teacher?->name ?? null,
                    'subject' => $lc->subject?->name ?? null,
                    'class' => $lc->schoolClass?->displayName(),
                ])
                ->values()
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }
}