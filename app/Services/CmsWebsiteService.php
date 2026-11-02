<?php

namespace App\Services;

use App\Models\CmsContent;
use App\Models\CmsFaculty;
use App\Models\CmsFaq;
use App\Models\CmsGallery;
use App\Models\CmsImage;
use App\Models\CmsProgram;
use App\Models\CmsService;
use App\Models\CmsSetting;
use App\Models\CmsStat;
use App\Models\School;
use Illuminate\Support\Facades\Schema;

class CmsWebsiteService
{
    public function schoolPayload(School $school): array
    {
        try {
            $cms = CmsSetting::forSchool($school->id);
            $settings = $this->schoolSettings($school);

            return [
                'id' => $school->id,
                'name' => $school->name,
                'address' => $school->address,
                'phone' => $school->phone,
                'email' => $school->email,
                'logo' => $school->logo,
                'about' => $cms?->about ?? ($settings['about'] ?? 'Welcome to ConfoStudy — quality online education across Pakistan.'),
                'established_year' => $settings['established_year'] ?? null,
                'tagline' => $cms?->tagline ?? ($settings['tagline'] ?? 'Learn Today. Lead Tomorrow.'),
                'hero_image' => CmsImage::payload($school->id)['hero'] ?? null,
            ];
        } catch (\Throwable) {
            return [
                'id' => $school->id,
                'name' => $school->name ?? 'ConfoStudy',
                'about' => 'Welcome to ConfoStudy.',
                'tagline' => 'Learn Today. Lead Tomorrow.',
            ];
        }
    }

    public function homePayload(int $schoolId, School $school): array
    {
        try {
            $guest = app(PublicGuestContentService::class);

            return [
                'school' => $this->schoolPayload($school),
                'events' => $this->safe(fn () => $guest->events($schoolId), []),
                'upcoming_classes' => $this->safe(fn () => $guest->upcomingClasses($schoolId), []),
                'courses' => $this->programsPayload($schoolId),
                'services' => $this->servicesPayload($schoolId),
                'content' => $this->contentPayload($schoolId),
                'stats' => $this->statsPayload($schoolId),
                'faculty' => $this->facultyPayload($schoolId),
                'gallery' => $this->galleryPayload($schoolId),
                'faqs' => $this->faqsPayload($schoolId),
                'images' => $this->safe(fn () => CmsImage::payload($schoolId), []),
                'admission_badge' => $this->safe(
                    fn () => CmsSetting::forSchool($schoolId)?->admission_badge,
                    null
                ),
                'guest_home_mode' => $this->guestHomeMode($schoolId),
                'wordpress_home_url' => $this->wordpressHomeUrl($schoolId),
            ];
        } catch (\Throwable) {
            return [
                'school' => $this->schoolPayload($school),
                'events' => [],
                'upcoming_classes' => [],
                'courses' => [],
                'services' => [],
                'content' => [],
                'stats' => [],
                'faculty' => [],
                'gallery' => [],
                'faqs' => [],
                'images' => [],
                'admission_badge' => null,
                'guest_home_mode' => $this->guestHomeMode($schoolId),
                'wordpress_home_url' => $this->wordpressHomeUrl($schoolId),
            ];
        }
    }

    public function guestHomeMode(int $schoolId): string
    {
        $mode = (string) school_setting(
            'guest_home_mode',
            config('services.wordpress.guest_home_mode', 'wordpress'),
            $schoolId
        );

        return in_array($mode, ['wordpress', 'cms'], true) ? $mode : 'wordpress';
    }

    public function wordpressHomeUrl(int $schoolId): string
    {
        $fallback = (string) config('services.wordpress.home_url', 'https://confostudy.com/');
        $url = trim((string) school_setting('wordpress_home_url', $fallback, $schoolId));

        // Empty / invalid DB value must never become "/" (WebView shows Domain: undefined).
        if ($url === '' || $url === '/' || ! filter_var($url, FILTER_VALIDATE_URL)) {
            $url = $fallback;
        }

        return rtrim($url, '/').'/';
    }

    public function adminOverview(int $schoolId): array
    {
        return [
            'settings' => CmsSetting::forSchool($schoolId),
            'images' => CmsImage::query()->where('school_id', $schoolId)->first(),
            'stats' => CmsStat::query()->forSchool($schoolId)->orderBy('sort_order')->get(),
            'faculty' => CmsFaculty::query()->forSchool($schoolId)->orderBy('sort_order')->get(),
            'gallery' => CmsGallery::query()->forSchool($schoolId)->orderBy('sort_order')->get(),
            'faqs' => CmsFaq::query()->forSchool($schoolId)->orderBy('sort_order')->get(),
            'services' => CmsService::query()->forSchool($schoolId)->orderBy('sort_order')->get(),
            'content' => CmsContent::query()->forSchool($schoolId)->orderBy('sort_order')->get(),
            'programs' => CmsProgram::query()->forSchool($schoolId)->orderBy('sort_order')->get(),
            'guest_home_mode' => $this->guestHomeMode($schoolId),
            'wordpress_home_url' => $this->wordpressHomeUrl($schoolId),
        ];
    }

    public function programsPayload(int $schoolId, int $limit = 20): array
    {
        if (! class_exists(CmsProgram::class) || ! Schema::hasTable('cms_programs')) {
            return [];
        }

        return $this->safe(function () use ($schoolId, $limit) {
            return CmsProgram::activeForSchool($schoolId)
                ->take($limit)
                ->map(fn (CmsProgram $p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'type' => $p->type,
                    'class' => $p->getAttribute('class'),
                    'image_url' => $p->image_url,
                ])
                ->values()
                ->all();
        }, []);
    }

    public function servicesPayload(int $schoolId): array
    {
        if (! Schema::hasTable('cms_services')) {
            return [];
        }

        return $this->safe(function () use ($schoolId) {
            return CmsService::activeForSchool($schoolId)
                ->map(fn (CmsService $s) => [
                    'id' => $s->slug,
                    'title' => $s->title,
                    'description' => $s->description,
                    'icon' => $s->icon,
                    'count' => null,
                    'count_label' => null,
                ])
                ->values()
                ->all();
        }, []);
    }

    public function contentPayload(int $schoolId, int $limit = 10): array
    {
        if (! Schema::hasTable('cms_contents')) {
            return [];
        }

        return $this->safe(function () use ($schoolId, $limit) {
            return CmsContent::activeForSchool($schoolId)
                ->take($limit)
                ->map(fn (CmsContent $c) => [
                    'id' => $c->id,
                    'title' => $c->title,
                    'body' => $c->body,
                    'date' => $c->display_date,
                    'type' => $c->type,
                ])
                ->values()
                ->all();
        }, []);
    }

    public function statsPayload(int $schoolId): array
    {
        if (! Schema::hasTable('cms_stats')) {
            return [];
        }

        return $this->safe(function () use ($schoolId) {
            return CmsStat::activeForSchool($schoolId)
                ->map(fn (CmsStat $s) => ['label' => $s->label, 'value' => $s->value])
                ->values()
                ->all();
        }, []);
    }

    public function facultyPayload(int $schoolId): array
    {
        if (! Schema::hasTable('cms_faculty')) {
            return [];
        }

        return $this->safe(function () use ($schoolId) {
            return CmsFaculty::activeForSchool($schoolId)
                ->map(fn (CmsFaculty $f) => [
                    'id' => $f->id,
                    'name' => $f->name,
                    'subject' => $f->subject,
                    'classes' => $f->classes,
                    'image' => $f->image_url,
                ])
                ->values()
                ->all();
        }, []);
    }

    public function galleryPayload(int $schoolId): array
    {
        if (! Schema::hasTable('cms_gallery')) {
            return [];
        }

        return $this->safe(function () use ($schoolId) {
            return CmsGallery::activeForSchool($schoolId)
                ->map(fn (CmsGallery $g) => [
                    'id' => $g->id,
                    'url' => $g->image_url,
                    'title' => $g->title,
                ])
                ->values()
                ->all();
        }, []);
    }

    public function faqsPayload(int $schoolId): array
    {
        if (! Schema::hasTable('cms_faqs')) {
            return [];
        }

        return $this->safe(function () use ($schoolId) {
            return CmsFaq::activeForSchool($schoolId)
                ->map(fn (CmsFaq $f) => [
                    'id' => $f->id,
                    'question' => $f->question,
                    'answer' => $f->answer,
                ])
                ->values()
                ->all();
        }, []);
    }

    /** @return array<string, mixed> */
    private function schoolSettings(School $school): array
    {
        try {
            $settings = $school->settings;

            return is_array($settings) ? $settings : [];
        } catch (\Throwable) {
            return [];
        }
    }

    private function safe(callable $fn, mixed $default): mixed
    {
        try {
            return $fn();
        } catch (\Throwable) {
            return $default;
        }
    }
}
