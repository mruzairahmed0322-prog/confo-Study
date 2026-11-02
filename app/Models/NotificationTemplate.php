<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NotificationTemplate extends Model
{
    protected $fillable = [
        'school_id',
        'type',
        'name',
        'title_template',
        'body_template',
        'audience',
        'icon',
        'is_active',
        'is_system',
    ];

    protected function casts(): array
    {
        return [
            'audience' => 'array',
            'is_active' => 'boolean',
            'is_system' => 'boolean',
        ];
    }

    public function school(): BelongsTo
    {
        return $this->belongsTo(School::class);
    }

    public function render(array $vars): array
    {
        $title = $this->title_template;
        $body = $this->body_template;

        foreach ($vars as $key => $value) {
            $title = str_replace('{'.$key.'}', (string) $value, $title);
            $body = str_replace('{'.$key.'}', (string) $value, $body);
        }

        return ['title' => $title, 'body' => $body];
    }
}
