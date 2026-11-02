<?php

/**
 * Simple log tailer for environments without the pcntl extension (e.g. Windows).
 * Used as a drop-in replacement for `php artisan pail` in local dev.
 */

$logFile = dirname(__DIR__) . '/storage/logs/laravel.log';

if (! is_dir(dirname($logFile))) {
    mkdir(dirname($logFile), 0755, true);
}

if (! file_exists($logFile)) {
    touch($logFile);
}

echo "Tailing {$logFile}" . PHP_EOL;
echo 'Press Ctrl+C to stop.' . PHP_EOL . PHP_EOL;

$handle = fopen($logFile, 'r');

if ($handle === false) {
    fwrite(STDERR, "Unable to open log file: {$logFile}" . PHP_EOL);
    exit(1);
}

fseek($handle, 0, SEEK_END);

while (true) {
    $line = fgets($handle);

    if ($line !== false) {
        echo $line;
        continue;
    }

    usleep(100_000);
    clearstatcache(true, $logFile);

    if (! file_exists($logFile)) {
        touch($logFile);
        fclose($handle);
        $handle = fopen($logFile, 'r');

        if ($handle === false) {
            fwrite(STDERR, "Unable to reopen log file: {$logFile}" . PHP_EOL);
            exit(1);
        }

        fseek($handle, 0, SEEK_END);
    }
}
