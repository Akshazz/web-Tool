<?php
/**
 * MySQL connection settings for A-Code Playground.
 *
 * Defaults match a fresh XAMPP install (MySQL on localhost, root user,
 * no password, database name from sql/a-codeplayground-schema.sql). Edit the
 * values below to match your own setup.
 *
 * Nothing else in the app needs to change — db.php reads this file to
 * build the shared PDO connection.
 */
return array(
    'host'    => '127.0.0.1',
    'port'    => 3306,
    'dbname'  => 'a_codeplayground',
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
     *            -> ALSO add {base_url}/gdrive.php as a second redirect URI
     *               and enable the "Google Drive API" — the same client ID and
     *               secret then power the per-account "Google Drive backup"
     *               in Settings (see README, "Google Drive backup").
     *   GitHub   https://github.com/settings/developers -> "OAuth Apps"
     *            -> Authorization callback URL: {base_url}/oauth.php?provider=github
     *   Facebook https://developers.facebook.com/apps -> "Facebook Login" product
     *            -> Valid OAuth Redirect URI: {base_url}/oauth.php?provider=facebook
     */
    'oauth' => array(
        // e.g. 'https://your-domain.com/A-CodePlayground' — no trailing slash.
        'base_url' => 'http://localhost/A-CodePlayground',
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

    /**
     * Outgoing mail — currently used only to email the confirmation code
     * for a password change (see sendPasswordChangeCode() in
     * core/auth-helpers.php). Sent with PHP's built-in mail() function, so
     * no extra library is required, but PHP itself needs a way to actually
     * hand the message off:
     *   - XAMPP on Windows: install a local relay like Mercury Mail or
     *     hMailServer, or point [mail function] in php.ini at a real SMTP
     *     relay (e.g. smtp.gmail.com) via a tool like sendmail.exe/fake
     *     sendmail — XAMPP does not send real email out of the box.
     *   - Linux: make sure sendmail/postfix is installed and running.
     * If mail() fails, the password change is not applied and the person
     * sees an error telling them to check this configuration.
     */
    'mail' => array(
        'from_email' => 'no-reply@localhost',
        'from_name'  => 'A-Code Playground',
    ),
);
