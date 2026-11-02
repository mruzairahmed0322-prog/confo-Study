@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

title ConfoStudy — Dev Server

if exist "C:\laragon\bin\php" (
    for /d %%P in ("C:\laragon\bin\php\php-*") do set "LARAGON_PHP=%%P"
)
if defined LARAGON_PHP (
    set "PATH=!LARAGON_PHP!;C:\laragon\bin\composer;C:\laragon\bin\nodejs;!PATH!"
)

where php >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PHP not found. Laragon "Start All" pehle dabayein.
    pause
    exit /b 1
)

echo.
echo  ConfoStudy dev server starting...
echo  URL: http://127.0.0.1:8000/app
echo  Press Ctrl+C to stop.
echo.

call composer dev
