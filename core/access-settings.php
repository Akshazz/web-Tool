<?php
/**
 * Sign in / Sign up availability — managed from the admin dashboard
 * (admin-dashboard.php → sidebar → Security → "Access").
 *
 * Lets an administrator temporarily switch the Community "Sign in" and/or
 * "Join Community" (sign up) flows off — for example while a feature is
 * under review — without touching any code. When a flow is off:
 *   - The email/password form AND the "Sign in with …" / "Sign up with …"
 *     OAuth buttons for that flow are replaced with a notice on the public
 *     pages (see guest.php).
 *   - The matching action in auth.php (login / register) and the matching
 *     intent in oauth.php refuse the request server-side too, so the
 *     feature is actually off even if someone bypasses the UI.
 *
 * Settings are stored in
 *
 *     data/.security/access-settings.json      (blocked from the web by .htaccess)
 *
 * Both flows default to enabled (true) so an install with no saved file
 * behaves exactly as before this feature existed.
 *
 * Used by: auth.php, oauth.php, guest.php and admin.php.
 */
if (!defined('ACODEPLAYGROUND_ACCESS_SETTINGS_LOADED')) {
define('ACODEPLAYGROUND_ACCESS_SETTINGS_LOADED', true);

require_once __DIR__ . '/google.php'; // google_security_dir()

/** The friendly message shown/returned when a flow is switched off. Kept in
 *  one place so the public page, the JSON API and the OAuth redirect agree. */
function access_unavailable_message($flow) {
    $what = $flow === 'signup' ? 'Creating a new account' : 'Signing in';
    return $what . ' is not available right now — this feature is currently under review. Please check back soon.';
}

function access_settings_file() {
    return google_security_dir() . '/access-settings.json';
}

/** The effective settings on this request: signinEnabled, signupEnabled, updatedAt, updatedBy. */
function access_settings() {
    $out = array(
        'signinEnabled' => true,
        'signupEnabled' => true,
        'updatedAt' => null,
        'updatedBy' => null,
    );
    $file = access_settings_file();
    if (is_file($file)) {
        $data = json_decode((string)@file_get_contents($file), true);
        if (is_array($data)) {
            if (array_key_exists('signinEnabled', $data)) { $out['signinEnabled'] = !empty($data['signinEnabled']); }
            if (array_key_exists('signupEnabled', $data)) { $out['signupEnabled'] = !empty($data['signupEnabled']); }
            if (!empty($data['updatedAt'])) { $out['updatedAt'] = (string)$data['updatedAt']; }
            if (!empty($data['updatedBy'])) { $out['updatedBy'] = (string)$data['updatedBy']; }
        }
    }
    return $out;
}

/** Persists both flags. Returns true on success. */
function access_settings_save($signinEnabled, $signupEnabled, $updatedBy) {
    $record = array(
        'signinEnabled' => (bool)$signinEnabled,
        'signupEnabled' => (bool)$signupEnabled,
        'updatedAt' => date('Y-m-d H:i:s'),
        'updatedBy' => (string)$updatedBy,
    );
    $json = json_encode($record, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $file = access_settings_file();
    if (@file_put_contents($file, $json, LOCK_EX) === false) { return false; }
    @chmod($file, 0600);
    return true;
}

} // ACODEPLAYGROUND_ACCESS_SETTINGS_LOADED
