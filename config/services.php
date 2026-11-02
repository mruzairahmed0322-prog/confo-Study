<?php

return [

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('YOUTUBE_REDIRECT_URI', env('APP_URL').'/integrations/youtube/callback'),
    ],

    'wordpress' => [
        // Guest mobile tabs load this WordPress site (auto-updates with WP content).
        'home_url' => env('WORDPRESS_HOME_URL', 'https://confostudy.com/'),
        // wordpress = in-app WebView of confostudy.com (default)
        // cms = legacy Laravel CMS cards (disabled in admin UI)
        'guest_home_mode' => env('GUEST_HOME_MODE', 'wordpress'),
    ],

];
