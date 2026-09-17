<?php
/**
 * MySQL connection settings for A-DevTools.
 *
 * Defaults match a fresh XAMPP install (MySQL on localhost, root user,
 * no password, database name from sql/a-devtools-schema.sql). Edit the
 * values below to match your own setup.
 *
 * Nothing else in the app needs to change — db.php reads this file to
 * build the shared PDO connection.
 */
return array(
    'host'    => '127.0.0.1',
    'port'    => 3306,
    'dbname'  => 'a_devtools',
    'user'    => 'root',
    'pass'    => '',
    'charset' => 'utf8mb4',

    /**
     * "Sign in with..." (OAuth) settings. Leave a provider's client_id
     * blank to keep its button in the UI but disabled — clicking it will
     * show a friendly "not set up yet" message instead of erroring.
     *
     * Where to get these, and what redirect URI to register with each
     * provider (must match exactly, including http/https and no trailing
     * slash difference):
     *   Google   https://console.cloud.google.com/apis/credentials
     *            -> redirect URI: {base_url}/oauth.php?provider=google
     *   GitHub   https://github.com/settings/developers -> "OAuth Apps"
     *            -> Authorization callback URL: {base_url}/oauth.php?provider=github
     *   Facebook https://developers.facebook.com/apps -> "Facebook Login" product
     *            -> Valid OAuth Redirect URI: {base_url}/oauth.php?provider=facebook
     */
    'oauth' => array(
        // e.g. 'https://your-domain.com/A-DevTools' — no trailing slash.
        'base_url' => 'http://localhost/A-DevTools',
        'google' => array(
            'client_id'     => '',
            'client_secret' => '',
        ),
        'github' => array(
            'client_id'     => '',
            'client_secret' => '',
        ),
        'facebook' => array(
            'client_id'     => '',
            'client_secret' => '',
        ),
    ),
);
