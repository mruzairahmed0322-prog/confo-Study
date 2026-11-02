@echo off
REM ConfoStudy — Quick Setup for Laragon (Windows)
REM Requires PHP 8.2+ in PATH (Laragon: Menu > PHP > Version)

echo ============================================
echo  ConfoStudy — Setup
echo ============================================

where php >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: PHP not found in PATH.
    echo Use Laragon terminal or add PHP to PATH.
    exit /b 1
)

php -r "if (version_compare(PHP_VERSION, '8.2.0', '<')) { echo 'ERROR: PHP 8.2+ required. Current: '.PHP_VERSION.PHP_EOL; exit(1); }"

echo [1/6] Installing Composer dependencies...
call composer install --no-interaction
if %ERRORLEVEL% NEQ 0 exit /b 1

echo [2/6] Installing npm dependencies...
call npm install
if %ERRORLEVEL% NEQ 0 exit /b 1

echo [3/6] Copying environment file...
if not exist .env copy .env.example .env

echo [4/6] Generating application key...
php artisan key:generate

echo [5/6] Running migrations and seeders...
php artisan migrate --seed --force

echo [6/6] Linking storage...
php artisan storage:link

echo.
echo ============================================
echo  Setup complete!
echo  Run: composer dev   (Laravel + Vite + queue + logs)
echo  Or:  php artisan serve  +  npm run dev
echo  URL: http://127.0.0.1:8000
echo  SPA: http://127.0.0.1:8000/app
echo  Login: owner@school.com / password
echo ============================================
