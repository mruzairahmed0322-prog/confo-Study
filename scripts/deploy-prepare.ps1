# ConfoStudy - Create deploy folder + ZIP for Hostinger (no SSH)
# Usage: powershell -ExecutionPolicy Bypass -File scripts\deploy-prepare.ps1

param(
    [string]$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"

$outputDir = Join-Path $ProjectRoot "confostudy-deploy"
$zipPath = Join-Path $ProjectRoot "confostudy-deploy.zip"

$excludeDirNames = @(
    "node_modules", ".git", "tests", "deploy-staging", "confostudy-deploy",
    "HOSTINGER-UPLOAD", "youtube-hostinger-patch",
    ".cursor", ".idea", ".vscode"
)
$excludeFileNames = @(
    ".env", ".phpunit.result.cache", "confostudy-deploy.zip",
    "youtube-hostinger-patch.zip", "school_mgmt_export.sql",
    "deploy-staging", ".env.backup"
)

Write-Host ""
Write-Host "  ConfoStudy - Deploy pack builder"
Write-Host "  ================================="
Write-Host ""

function ShouldSkip {
    param([string]$Name, [bool]$IsDirectory, [string]$ParentPath)

    if ($IsDirectory -and $excludeDirNames -contains $Name) { return $true }
    if (-not $IsDirectory -and $excludeFileNames -contains $Name) { return $true }
    if (-not $IsDirectory -and $Name -eq "hot" -and $ParentPath -match "public$") { return $true }
    return $false
}

function Copy-Project {
    param([string]$Source, [string]$Destination, [ref]$FileCount)

    if (-not (Test-Path $Destination)) {
        New-Item -ItemType Directory -Path $Destination -Force | Out-Null
    }

    Get-ChildItem -LiteralPath $Source -Force | ForEach-Object {
        if (ShouldSkip -Name $_.Name -IsDirectory $_.PSIsContainer -ParentPath $Source) { return }

        $target = Join-Path $Destination $_.Name
        if ($_.PSIsContainer) {
            Copy-Project -Source $_.FullName -Destination $target -FileCount $FileCount
        } else {
            Copy-Item -LiteralPath $_.FullName -Destination $target -Force
            $FileCount.Value++
            if ($FileCount.Value % 500 -eq 0) {
                Write-Host "    copied $($FileCount.Value) files..."
            }
        }
    }
}

Write-Host "  [1/3] Preparing output folder: confostudy-deploy"
if (Test-Path $outputDir) {
    Write-Host "    removing old folder..."
    Remove-Item $outputDir -Recurse -Force
}
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

$fileCount = 0
Write-Host "  [2/3] Copying project files (vendor included, may take 2-5 min)..."
Copy-Project -Source $ProjectRoot -Destination $outputDir -FileCount ([ref]$fileCount)
Write-Host "    done - $fileCount files copied."

Write-Host "  [3/3] Creating confostudy-deploy.zip (Linux-compatible via tar)..."
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Push-Location $outputDir
& tar -a -cf $zipPath *
$tarExit = $LASTEXITCODE
Pop-Location

if ($tarExit -ne 0) {
    throw "ZIP creation failed. Upload the folder manually: $outputDir"
}

# Quick sanity check: zip must use forward slashes, not backslash filenames
$badEntries = & tar -tf $zipPath 2>$null | Select-String '\\'
if ($badEntries) {
    Remove-Item $zipPath -Force
    throw "ZIP has Windows backslash paths - aborting. Use tar on Windows 10+."
}

$sizeMb = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)

Write-Host ""
Write-Host "  SUCCESS!"
Write-Host "  Folder: $outputDir"
Write-Host "  ZIP:    $zipPath ($sizeMb MB)"
Write-Host ""
Write-Host "  Hostinger upload (no SSH):"
Write-Host "  1. DELETE broken files in confostudy (names with backslash \)"
Write-Host "  2. File Manager -> confostudy folder"
Write-Host "  3. Upload confostudy-deploy.zip -> Extract"
Write-Host "     Must see folders: app, vendor, public (NOT vendor\app\...)"
Write-Host "  4. Run hostinger-setup.php in public_html/admin/"
Write-Host ""
