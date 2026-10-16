<?php
// Copy to /home/CPANEL_USER/web_read_config.php and fill values on the server.
// Keep the real file outside public_html and out of Git.
return [
    'db_host' => 'localhost',
    'db_port' => 3306,
    'db_name' => '',
    'db_user' => '',
    'db_password' => '',
    'app_session_secret' => '',
    'google_client_id' => '',
    'google_client_secret' => '',
    'google_redirect_uri' => 'https://thedeceiver.site/api/auth/google/callback',
    'analytics_admin_emails' => ['nguyentranhaiphong2@gmail.com'],
    'online_story_upstream_base' => '',
    // Usually blank on cPanel. Set only when PHP needs a custom CA bundle.
    'online_story_ca_bundle' => '',
];
