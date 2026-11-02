@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

title ConfoStudy — Starting...

REM ── Laragon paths (PHP, Composer, Node) ──────────────────────────
if exist "C:\laragon\bin\php" (
    for /d %%P in ("C:\laragon\bin\php\php-*") do set "LARAGON_PHP=%%P"
)
if defined LARAGON_PHP (
    set "PATH=!LARAGON_PHP!;C:\laragon\bin\composer;C:\laragon\bin\nodejs;!PATH!"
)

where php >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] PHP not found.
    echo  Open Laragon, click "Start All", then run this file again.
    echo  Or use: Laragon Menu ^> Terminal ^> then START.bat
    echo.
    pause
    exit /b 1
)

echo.
echo  ============================================
echo   ConfoStudy — One-Click Start
echo  ============================================
echo.

REM ── Stop stale dev servers from a previous run ───────────────────
echo  [0] Clearing stale dev server ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>&1

REM ── .env ─────────────────────────────────────────────────────────
if not exist .env (
    echo  [1] Creating .env from example...
    copy /Y .env.example .env >nul
    php artisan key:generate --force
) else (
    echo  [1] .env OK
)

REM ── Dependencies (first run only) ────────────────────────────────
if not exist vendor (
    echo  [2] Installing Composer packages ^(first time^)...
    call composer install --no-interaction
) else (
    echo  [2] Composer packages OK
)

if not exist node_modules (
    echo  [3] Installing npm packages ^(first time^)...
    call npm install
) else (
    echo  [3] npm packages OK
)

REM ── Database: create missing tables + demo data ──────────────────
echo  [4] Checking database and creating missing tables...
php artisan migrate --force
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] Database migration failed.
    echo  Make sure Laragon MySQL is running and database "school_mgmt" exists.
    echo.
    pause
    exit /b 1
)

echo  [5] Ensuring demo users and sample data...
php artisan db:seed --force
if %ERRORLEVEL% NEQ 0 (
    echo  [WARN] Seeder had issues — app may still run.
)

if not exist public\storage (
    echo  [6] Linking storage...
    php artisan storage:link
) else (
    echo  [6] Storage link OK
)

echo.
echo  ============================================
echo   Ready! Opening browser...
echo   Login: owner@school.com / password
echo   URL:   http://127.0.0.1:8000/login
echo  ============================================
echo.
echo  Press Ctrl+C to stop the server.
echo.

REM Open login page once the dev server responds (127.0.0.1 avoids IPv6 localhost issues)
start "" cmd /c "powershell -nop -c \"$u='http://127.0.0.1:8000/login'; for($i=0;$i -lt 60;$i++){ try { Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 2 | Out-Null; Start-Process $u; break } catch { Start-Sleep 1 } }\""

call composer dev
