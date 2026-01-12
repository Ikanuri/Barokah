<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        env('FRONTEND_URL', 'http://localhost:3000'),
        // Add your local network IP or ngrok URL here if needed
        // Example: 'http://192.168.1.100:3000',
        // Example: 'https://abc123.ngrok-free.app',
    ],

    'allowed_origins_patterns' => [
        '/^http:\/\/localhost:\d+$/',           // localhost with any port
        '/^http:\/\/127\.0\.0\.1:\d+$/',        // 127.0.0.1 with any port
        '/^http:\/\/10\.\d+\.\d+\.\d+:\d+$/',   // 10.x.x.x network (your LAN)
        '/^http:\/\/192\.168\.\d+\.\d+:\d+$/',  // 192.168.x.x network
        '/^https:\/\/.*\.ngrok-free\.app$/',    // Ngrok free domains
        '/^https:\/\/.*\.ngrok\.io$/',          // Ngrok legacy domains
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,  // Disable for HTTP

];
