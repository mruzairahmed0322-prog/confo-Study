<?php

/**
 * Cross-platform dev server launcher.
 * Uses Laravel Pail when pcntl is available; falls back to tail-log.php on Windows.
 */

$commands = [
    'php artisan serve --host=0.0.0.0',
    'php artisan queue:listen --tries=1',
    function_exists('pcntl_fork')
        ? 'php artisan pail --timeout=0'
        : 'php scripts/tail-log.php',
    'npm run dev',
];

$quoted = array_map(
    static fn (string $command): string => '"' . $command . '"',
    $commands
);

$cmd = sprintf(
    'npx concurrently -c "#93c5fd,#c4b5fd,#fb7185,#fdba74" %s --names=server,queue,logs,vite',
    implode(' ', $quoted)
);

passthru($cmd, $exitCode);

exit($exitCode);
