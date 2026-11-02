@echo off

setlocal EnableDelayedExpansion

cd /d "%~dp0"



title ConfoStudy — Export Local Database



echo.

echo  ============================================

echo   school_mgmt Export (Hostinger Import)

echo  ============================================

echo.



set "MYSQL_BIN="

for /d %%D in ("C:\laragon\bin\mysql\mysql-*") do set "MYSQL_BIN=%%D\bin"



if not exist "%MYSQL_BIN%\mysqldump.exe" (

    echo  [ERROR] mysqldump not found. Start Laragon first.

    pause

    exit /b 1

)



set "OUT=%~dp0school_mgmt_export.sql"



echo  Exporting school_mgmt to:

echo  %OUT%

echo.



"%MYSQL_BIN%\mysqldump.exe" -u root --routines --triggers --single-transaction school_mgmt > "%OUT%"

if %ERRORLEVEL% NEQ 0 (

    echo  [ERROR] Export failed. Is MySQL running in Laragon?

    pause

    exit /b 1

)



echo  Done! File ready for Hostinger phpMyAdmin import.

echo.

pause

