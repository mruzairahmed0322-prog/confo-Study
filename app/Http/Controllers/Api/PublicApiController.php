<?php

namespace App\Http\Controllers\Api;

use App\Models\School;
use App\Services\CmsWebsiteService;
use App\Services\PublicGuestContentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;
use ZipArchive;

class PublicApiController extends BaseApiController
{
    public function __construct(
        private CmsWebsiteService $cms,
        private PublicGuestContentService $guest,
    ) {}

    public function schoolInfo(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);
        if (! $school) {
            return $this->error('School not found.', 404);
        }

        return $this->success($this->cms->schoolPayload($school));
    }

    public function home(Request $request): JsonResponse
    {
        if ($request->query('diag') === '1' || $request->query('heal_vite') === '1') {
            return $this->viteDiagOrHeal($request);
        }

        $schoolId = (int) $request->query('school_id', 1);
        $school = $this->resolveSchool($request);
        if (! $school) {
            return $this->error('School not found.', 404);
        }

        return $this->success($this->cms->homePayload($schoolId, $school));
    }

    public function courses(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);
        if (! $school) {
            return $this->error('School not found.', 404);
        }

        $limit = min(max((int) $request->query('limit', 20), 1), 50);

        return $this->success($this->cms->programsPayload($school->id, $limit));
    }

    public function services(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);
        if (! $school) {
            return $this->error('School not found.', 404);
        }

        return $this->success($this->cms->servicesPayload($school->id));
    }

    public function events(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);
        if (! $school) {
            return $this->error('School not found.', 404);
        }

        $limit = min(max((int) $request->query('limit', 10), 1), 50);

        return $this->success($this->guest->events($school->id, $limit));
    }

    public function upcomingClasses(Request $request): JsonResponse
    {
        $school = $this->resolveSchool($request);
        if (! $school) {
            return $this->error('School not found.', 404);
        }

        $limit = min(max((int) $request->query('limit', 10), 1), 50);

        return $this->success($this->guest->upcomingClasses($school->id, $limit));
    }

    private function resolveSchool(Request $request): ?School
    {
        $schoolId = (int) $request->query('school_id', 1);

        return School::find($schoolId);
    }

    private function viteDiagOrHeal(Request $request): JsonResponse
    {
        $secret = 'ConfoStudy2026Setup';
        $docRoot = (string) ($_SERVER['DOCUMENT_ROOT'] ?? '');
        $public = public_path();
        $manifestPublic = $public.DIRECTORY_SEPARATOR.'build'.DIRECTORY_SEPARATOR.'manifest.json';
        $manifestDoc = $docRoot !== ''
            ? $docRoot.DIRECTORY_SEPARATOR.'build'.DIRECTORY_SEPARATOR.'manifest.json'
            : null;

        $info = [
            'TIME' => gmdate('c'),
            'DOCUMENT_ROOT' => $docRoot,
            'SCRIPT_FILENAME' => $_SERVER['SCRIPT_FILENAME'] ?? null,
            'base_path' => base_path(),
            'public_path' => $public,
            'public_realpath' => realpath($public) ?: null,
            'manifest_public' => $this->manifestInfo($manifestPublic),
            'manifest_docroot' => $manifestDoc ? $this->manifestInfo($manifestDoc) : null,
            'heal_exists_in_docroot' => $docRoot !== '' && is_file($docRoot.'/hostinger-heal-vite.php'),
            'clear_cache_exists_in_docroot' => $docRoot !== '' && is_file($docRoot.'/hostinger-clear-cache.php'),
            'setup_exists_in_docroot' => $docRoot !== '' && is_file($docRoot.'/hostinger-setup.php'),
            'docroot_listing' => $this->listDir($docRoot, 40),
            'public_build_listing' => $this->listDir($public.'/build', 20),
        ];

        if ($request->query('heal_vite') !== '1') {
            return response()->json(['success' => true, 'data' => $info]);
        }

        if (($request->query('key') ?? '') !== $secret) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $targets = array_values(array_unique(array_filter([
            realpath($public) ?: $public,
            $docRoot !== '' ? (realpath($docRoot) ?: $docRoot) : null,
        ])));

        $zipCandidates = [];
        foreach ($targets as $root) {
            $zipCandidates[] = $root.'/build-assets.zip';
            $zipCandidates[] = $root.'/../build-assets.zip';
        }
        $zipCandidates[] = base_path('build-assets.zip');
        $zipCandidates[] = base_path('public/build-assets.zip');
        $zipCandidates[] = '/home/u815787663/domains/confostudy.com/public_html/admin/build-assets.zip';
        $zipCandidates[] = '/home/u815787663/domains/confostudy.com/public_html/build-assets.zip';
        $zipCandidates[] = '/home/u815787663/domains/confostudy.com/confostudy/public/build-assets.zip';

        $usedZip = null;
        $extractResults = [];
        foreach ($zipCandidates as $zipPath) {
            $rp = realpath($zipPath);
            if (! $rp || ! is_file($rp)) {
                continue;
            }
            $usedZip = $rp;
            foreach ($targets as $targetRoot) {
                $buildDir = $targetRoot.'/build';
                $extractResults[] = [
                    'zip' => $rp,
                    'target' => $buildDir,
                    'result' => $this->extractBuildZip($rp, $buildDir),
                ];
            }
            break;
        }

        // Also copy from public_path build into DOCUMENT_ROOT build if public already has new assets
        $copyResults = [];
        if ($docRoot !== '' && realpath($public) && realpath($docRoot) && realpath($public) !== realpath($docRoot)) {
            $src = realpath($public).'/build';
            $dst = (realpath($docRoot) ?: $docRoot).'/build';
            if (is_dir($src)) {
                $copyResults = $this->copyBuildTree($src, $dst);
            }
        }

        $info['heal'] = [
            'used_zip' => $usedZip,
            'targets' => $targets,
            'extract_results' => $extractResults,
            'copy_results' => $copyResults,
            'manifest_public_after' => $this->manifestInfo($manifestPublic),
            'manifest_docroot_after' => $manifestDoc ? $this->manifestInfo($manifestDoc) : null,
        ];

        return response()->json(['success' => true, 'data' => $info]);
    }

    /**
     * @return array<string, mixed>
     */
    private function manifestInfo(string $path): array
    {
        if (! is_file($path)) {
            return ['path' => $path, 'exists' => false];
        }
        $raw = (string) file_get_contents($path);
        $json = json_decode($raw, true);
        $app = is_array($json) ? ($json['resources/js/app.tsx']['file'] ?? null) : null;
        $css = is_array($json) ? ($json['resources/css/app.css']['file'] ?? null) : null;

        return [
            'path' => $path,
            'realpath' => realpath($path) ?: null,
            'exists' => true,
            'size' => filesize($path),
            'mtime' => gmdate('c', filemtime($path) ?: time()),
            'md5' => md5($raw),
            'app_js' => $app,
            'app_css' => $css,
        ];
    }

    /**
     * @return list<string>
     */
    private function listDir(?string $dir, int $limit): array
    {
        if (! $dir || ! is_dir($dir)) {
            return [];
        }
        $out = [];
        foreach (array_values(array_diff(scandir($dir) ?: [], ['.', '..'])) as $f) {
            $p = $dir.'/'.$f;
            $out[] = (is_dir($p) ? '[D] ' : '[F] ').$f.(is_file($p) ? (' '.filesize($p)) : '');
            if (count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    /**
     * @return array{ok:int,fail:int,error?:string}
     */
    private function extractBuildZip(string $zipPath, string $buildDir): array
    {
        if (! class_exists(ZipArchive::class)) {
            return ['ok' => 0, 'fail' => 0, 'error' => 'ZipArchive missing'];
        }
        if (! is_dir($buildDir) && ! @mkdir($buildDir, 0755, true)) {
            return ['ok' => 0, 'fail' => 0, 'error' => 'cannot mkdir '.$buildDir];
        }
        if (! is_dir($buildDir.'/assets') && ! @mkdir($buildDir.'/assets', 0755, true)) {
            return ['ok' => 0, 'fail' => 0, 'error' => 'cannot mkdir assets'];
        }

        $zip = new ZipArchive();
        $open = $zip->open($zipPath);
        if ($open !== true) {
            return ['ok' => 0, 'fail' => 0, 'error' => 'zip open failed '.$open];
        }

        $ok = 0;
        $fail = 0;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $name = $zip->getNameIndex($i);
            if ($name === false) {
                $fail++;
                continue;
            }
            $name = str_replace('\\', '/', $name);
            if (str_ends_with($name, '/')) {
                continue;
            }
            if (str_starts_with($name, 'build/')) {
                $rel = substr($name, strlen('build/'));
            } elseif (str_starts_with($name, 'public/build/')) {
                $rel = substr($name, strlen('public/build/'));
            } else {
                $rel = $name;
            }
            if ($rel === '' || str_contains($rel, '..')) {
                $fail++;
                continue;
            }
            $dest = $buildDir.'/'.$rel;
            $parent = dirname($dest);
            if (! is_dir($parent) && ! @mkdir($parent, 0755, true)) {
                $fail++;
                continue;
            }
            $stream = $zip->getStream($name);
            if ($stream === false) {
                $fail++;
                continue;
            }
            $out = @fopen($dest, 'wb');
            if ($out === false) {
                fclose($stream);
                $fail++;
                continue;
            }
            stream_copy_to_stream($stream, $out);
            fclose($out);
            fclose($stream);
            $ok++;
        }
        $zip->close();

        return ['ok' => $ok, 'fail' => $fail];
    }

    /**
     * @return array{copied:int,failed:int}
     */
    private function copyBuildTree(string $src, string $dst): array
    {
        $copied = 0;
        $failed = 0;
        if (! is_dir($dst) && ! @mkdir($dst, 0755, true)) {
            return ['copied' => 0, 'failed' => 1];
        }
        $iterator = new \RecursiveIteratorIterator(
            new \RecursiveDirectoryIterator($src, \FilesystemIterator::SKIP_DOTS),
            \RecursiveIteratorIterator::SELF_FIRST
        );
        foreach ($iterator as $item) {
            /** @var \SplFileInfo $item */
            $rel = str_replace('\\', '/', substr($item->getPathname(), strlen($src)));
            $rel = ltrim($rel, '/');
            $target = $dst.'/'.$rel;
            if ($item->isDir()) {
                if (! is_dir($target) && ! @mkdir($target, 0755, true)) {
                    $failed++;
                }
                continue;
            }
            $parent = dirname($target);
            if (! is_dir($parent) && ! @mkdir($parent, 0755, true)) {
                $failed++;
                continue;
            }
            if (@copy($item->getPathname(), $target)) {
                $copied++;
            } else {
                $failed++;
            }
        }

        return ['copied' => $copied, 'failed' => $failed];
    }
}
