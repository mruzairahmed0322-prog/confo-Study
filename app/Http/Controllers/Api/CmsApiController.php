<?php

namespace App\Http\Controllers\Api;

use App\Models\CmsFaculty;
use App\Models\CmsFaq;
use App\Models\CmsGallery;
use App\Models\CmsImage;
use App\Models\CmsProgram;
use App\Models\CmsSetting;
use App\Models\CmsStat;
use App\Services\CmsWebsiteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CmsApiController extends BaseApiController
{
    public function overview(): JsonResponse
    {
        return $this->success(app(CmsWebsiteService::class)->adminOverview($this->schoolId()));
    }

    public function updateSettings(Request $request): JsonResponse
    {
        $data = $request->validate([
            'tagline' => 'nullable|string|max:255',
            'about' => 'nullable|string',
            'admission_badge' => 'nullable|string|max:255',
            'guest_home_mode' => 'nullable|in:wordpress,cms',
            'wordpress_home_url' => 'nullable|url|max:500',
        ]);

        $cmsData = collect($data)->only(['tagline', 'about', 'admission_badge'])->all();
        $settings = CmsSetting::query()->updateOrCreate(['school_id' => $this->schoolId()], $cmsData);

        if (array_key_exists('guest_home_mode', $data) && $data['guest_home_mode'] !== null) {
            save_school_setting('guest_home_mode', $data['guest_home_mode'], 'string', 'website', $this->schoolId());
        }
        if (array_key_exists('wordpress_home_url', $data) && filled($data['wordpress_home_url'])) {
            save_school_setting('wordpress_home_url', rtrim($data['wordpress_home_url'], '/').'/', 'string', 'website', $this->schoolId());
        }

        return $this->success([
            'settings' => $settings,
            'guest_home_mode' => app(CmsWebsiteService::class)->guestHomeMode($this->schoolId()),
            'wordpress_home_url' => app(CmsWebsiteService::class)->wordpressHomeUrl($this->schoolId()),
        ], 'Website settings saved');
    }

    public function updateImages(Request $request): JsonResponse
    {
        $data = $request->validate([
            'hero' => 'nullable|string|max:2048',
            'classroom' => 'nullable|string|max:2048',
            'students' => 'nullable|string|max:2048',
            'school' => 'nullable|string|max:2048',
            'about' => 'nullable|string|max:2048',
        ]);

        $images = CmsImage::query()->updateOrCreate(['school_id' => $this->schoolId()], $data);

        return $this->success($images, 'Images saved');
    }

    public function storeStat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'label' => 'required|string|max:100',
            'value' => 'required|string|max:50',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        return $this->success(CmsStat::create([...$data, 'school_id' => $this->schoolId()]), 'Stat added', 201);
    }

    public function updateStat(Request $request, CmsStat $stat): JsonResponse
    {
        abort_if($stat->school_id !== $this->schoolId(), 403);
        $stat->update($request->validate([
            'label' => 'sometimes|string|max:100',
            'value' => 'sometimes|string|max:50',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]));

        return $this->success($stat, 'Stat updated');
    }

    public function destroyStat(CmsStat $stat): JsonResponse
    {
        abort_if($stat->school_id !== $this->schoolId(), 403);
        $stat->delete();

        return $this->success(null, 'Stat deleted');
    }

    public function storeFaculty(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'subject' => 'required|string|max:255',
            'classes' => 'nullable|string|max:255',
            'image_url' => 'nullable|string|max:2048',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        return $this->success(CmsFaculty::create([...$data, 'school_id' => $this->schoolId()]), 'Faculty added', 201);
    }

    public function updateFaculty(Request $request, CmsFaculty $faculty): JsonResponse
    {
        abort_if($faculty->school_id !== $this->schoolId(), 403);
        $faculty->update($request->validate([
            'name' => 'sometimes|string|max:255',
            'subject' => 'sometimes|string|max:255',
            'classes' => 'nullable|string|max:255',
            'image_url' => 'nullable|string|max:2048',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]));

        return $this->success($faculty, 'Faculty updated');
    }

    public function destroyFaculty(CmsFaculty $faculty): JsonResponse
    {
        abort_if($faculty->school_id !== $this->schoolId(), 403);
        $faculty->delete();

        return $this->success(null, 'Faculty deleted');
    }

    public function storeGallery(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'image_url' => 'required|string|max:2048',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        return $this->success(CmsGallery::create([...$data, 'school_id' => $this->schoolId()]), 'Gallery image added', 201);
    }

    public function updateGallery(Request $request, CmsGallery $gallery): JsonResponse
    {
        abort_if($gallery->school_id !== $this->schoolId(), 403);
        $gallery->update($request->validate([
            'title' => 'nullable|string|max:255',
            'image_url' => 'sometimes|string|max:2048',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]));

        return $this->success($gallery, 'Gallery updated');
    }

    public function destroyGallery(CmsGallery $gallery): JsonResponse
    {
        abort_if($gallery->school_id !== $this->schoolId(), 403);
        $gallery->delete();

        return $this->success(null, 'Gallery image deleted');
    }

    public function storeFaq(Request $request): JsonResponse
    {
        $data = $request->validate([
            'question' => 'required|string|max:500',
            'answer' => 'required|string',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        return $this->success(CmsFaq::create([...$data, 'school_id' => $this->schoolId()]), 'FAQ added', 201);
    }

    public function updateFaq(Request $request, CmsFaq $faq): JsonResponse
    {
        abort_if($faq->school_id !== $this->schoolId(), 403);
        $faq->update($request->validate([
            'question' => 'sometimes|string|max:500',
            'answer' => 'sometimes|string',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]));

        return $this->success($faq, 'FAQ updated');
    }

    public function destroyFaq(CmsFaq $faq): JsonResponse
    {
        abort_if($faq->school_id !== $this->schoolId(), 403);
        $faq->delete();

        return $this->success(null, 'FAQ deleted');
    }

    public function storeProgram(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'nullable|string|max:100',
            'class' => 'nullable|string|max:255',
            'image_url' => 'nullable|string|max:2048',
            'sort_order' => 'nullable|integer|min:0',
        ]);

        return $this->success(CmsProgram::create([...$data, 'school_id' => $this->schoolId()]), 'Program added', 201);
    }

    public function updateProgram(Request $request, CmsProgram $program): JsonResponse
    {
        abort_if($program->school_id !== $this->schoolId(), 403);
        $program->update($request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'nullable|string|max:100',
            'class' => 'nullable|string|max:255',
            'image_url' => 'nullable|string|max:2048',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
        ]));

        return $this->success($program, 'Program updated');
    }

    public function destroyProgram(CmsProgram $program): JsonResponse
    {
        abort_if($program->school_id !== $this->schoolId(), 403);
        $program->delete();

        return $this->success(null, 'Program deleted');
    }
}
