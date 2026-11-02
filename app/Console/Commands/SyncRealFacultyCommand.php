<?php

namespace App\Console\Commands;

use Database\Seeders\RealFacultyAccountsSeeder;
use Illuminate\Console\Command;

class SyncRealFacultyCommand extends Command
{
    protected $signature = 'app:sync-real-faculty';

    protected $description = 'Sync real teachers, courses, boards + create name-based login accounts (writes docs/SECRET_CREDENTIALS.md)';

    public function handle(): int
    {
        $this->info('Syncing real ConfoStudy faculty, courses, boards, and accounts…');
        $this->call('db:seed', ['--class' => RealFacultyAccountsSeeder::class, '--force' => true]);
        $this->info('Done. See docs/SECRET_CREDENTIALS.md');

        return self::SUCCESS;
    }
}
