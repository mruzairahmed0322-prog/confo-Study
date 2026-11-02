<?php

namespace App\Console\Commands;

use App\Models\School;
use App\Models\User;
use Illuminate\Console\Command;

class CreateSuperAdminCommand extends Command
{
    protected $signature = 'app:create-superadmin
                            {--email=mruzairahmed0322@gmail.com : Super admin email}
                            {--name=Sir Ronald : Full name}
                            {--password= : Password (min 8 chars)}';

    protected $description = 'Create or update a school-owner (Super Admin) account';

    public function handle(): int
    {
        $email = $this->option('email') ?: $this->ask('Email');
        $name = $this->option('name') ?: $this->ask('Full name');
        $password = $this->option('password') ?: $this->secret('Password');

        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Invalid email address.');

            return self::FAILURE;
        }

        if (strlen($password) < 8) {
            $this->error('Password must be at least 8 characters.');

            return self::FAILURE;
        }

        $schoolId = School::query()->value('id') ?? 1;

        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'school_id' => $schoolId,
                'name' => $name,
                'password' => $password,
                'email_verified_at' => now(),
                'account_status' => 'active',
                'approval_status' => 'approved',
                'fee_cleared' => true,
                'approved_at' => now(),
                'gender' => 'male',
            ]
        );

        $user->syncRoles(['school-owner']);

        $this->info("Super Admin ready: {$user->name} <{$user->email}>");

        return self::SUCCESS;
    }
}
