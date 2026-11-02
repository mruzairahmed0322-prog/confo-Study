# ConfoStudy - sirf chhota update ZIP banao (Hostinger File Manager ke liye)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\make-update-zip.ps1
# Optional: -SkipBuild

param([switch]$SkipBuild)

$ErrorActionPreference = 'Stop'
$Root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

Push-Location $Root
try {
    if (-not $SkipBuild) {
        Write-Host ">>> npm run build"
        if (-not (Test-Path 'node_modules')) { npm install --no-audit --no-fund }
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
        if (Test-Path 'public\hot') { Remove-Item 'public\hot' -Force }
    }

    if (-not (Test-Path 'public\build\manifest.json')) {
        throw 'public/build/manifest.json missing'
    }

    $zipPath = Join-Path $Root 'deploy-pack.zip'
    if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

    $tempDir = Join-Path $env:TEMP ("cs_zip_" + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory $tempDir | Out-Null
    try {
        Copy-Item 'public\build' (Join-Path $tempDir 'build') -Recurse
        Copy-Item 'app' (Join-Path $tempDir 'app') -Recurse
        Copy-Item 'routes' (Join-Path $tempDir 'routes') -Recurse
        if (Test-Path 'config') { Copy-Item 'config' (Join-Path $tempDir 'config') -Recurse }
        if (Test-Path 'database\migrations') {
            New-Item -ItemType Directory (Join-Path $tempDir 'database') -Force | Out-Null
            Copy-Item 'database\migrations' (Join-Path $tempDir 'database\migrations') -Recurse
        }
        if (Test-Path 'resources\views') {
            New-Item -ItemType Directory (Join-Path $tempDir 'resources') -Force | Out-Null
            Copy-Item 'resources\views' (Join-Path $tempDir 'resources\views') -Recurse
        }
        if (Test-Path 'lang') { Copy-Item 'lang' (Join-Path $tempDir 'lang') -Recurse }
        foreach ($b in @('bootstrap\app.php','bootstrap\providers.php')) {
            if (Test-Path $b) {
                New-Item -ItemType Directory (Join-Path $tempDir (Split-Path $b)) -Force | Out-Null
                Copy-Item $b (Join-Path $tempDir $b) -Force
            }
        }

        Push-Location $tempDir
        tar -a -cf $zipPath *
        Pop-Location
    }
    finally {
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }

    $mb = [math]::Round((Get-Item $zipPath).Length / 1MB, 2)
    Write-Host ""
    Write-Host "OK: deploy-pack.zip ($mb MB)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Hostinger File Manager (TEZ UPDATE):"
    Write-Host "  1) hPanel -> Files -> File Manager"
    Write-Host "  2) admin.confostudy.com ka DOCUMENT ROOT kholo"
    Write-Host "     (aksar: domains/confostudy.com/confostudy/public  YA  public_html/admin)"
    Write-Host "  3) deploy-pack.zip upload karo (isi folder mein)"
    Write-Host "  4) ZIP extract / unzip"
    Write-Host "  5) build/ folder wali files public/build mein honi chahiye"
    Write-Host "  6) Browser: https://admin.confostudy.com/hostinger-clear-cache.php?key=ConfoStudy2026Setup"
    Write-Host ""
    Write-Host "NOTE: vendor / node_modules upload mat karo - isliye yeh zip chhota aur tez hai."
}
finally {
    Pop-Location
}
