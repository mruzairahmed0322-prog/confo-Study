<?php

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "Database: ".config('database.connections.mysql.database')."\n";
echo "Connection: ".(Illuminate\Support\Facades\DB::connection()->getPdo() ? 'OK' : 'FAILED')."\n\n";

echo "=== Tables & Row Counts ===\n";
$tables = ['users', 'schools', 'system_settings', 'roles', 'model_has_roles'];
foreach ($tables as $table) {
    try {
        $count = Illuminate\Support\Facades\DB::table($table)->count();
        echo str_pad($table, 20).": {$count} rows\n";
    } catch (Throwable $e) {
        echo str_pad($table, 20).": (table not found)\n";
    }
}

echo "\n=== Your Super Admin ===\n";
$user = App\Models\User::where('email', 'mruzairahmed0322@gmail.com')->first();
if ($user) {
    echo "Name   : {$user->name}\n";
    echo "Email  : {$user->email}\n";
    echo "Status : {$user->account_status}\n";
    echo "Role   : {$user->primaryRoleName()}\n";
    echo "Created: {$user->created_at}\n";
} else {
    echo "NOT FOUND\n";
}

echo "\n=== All Users ===\n";
foreach (App\Models\User::select('id','name','email','account_status')->get() as $u) {
    echo "#{$u->id} | {$u->name} | {$u->email} | {$u->account_status}\n";
}
