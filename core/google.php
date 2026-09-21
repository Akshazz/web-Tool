<?php
/**
 * Google connection settings — managed from the admin dashboard
 * (admin-dashboard.php → Integrations → Google Drive).
 *
 * Until now the Google OAuth client ID / secret had to be typed into
 * core/config.php by hand. This file lets the site administrator enter them
 * in the dashboard instead. Values are stored in
 *
 *     data/.security/google-settings.json      (blocked from the web by .htaccess)
 *
 * The client SECRET is encrypted at rest (AES-256-GCM) with the same key file
 * that already protects users' Drive refresh tokens (data/.security/gdrive.key).
 *
 * Precedence
 *   1. Settings saved from the dashboard (source = "dashboard")
 *   2. The 'oauth' → 'google' block in core/config.php   (source = "config")
 *   3. Nothing configured                                (source = "none")
 * So existing installs keep working unchanged until an admin saves settings.
 *
 * Used by: gdrive.php, oauth.php (Sign in with Google), core/auth-helpers.php
 * and admin.php. Never send the decrypted secret to the browser.
 */
if (!defined('ACODEPLAYGROUND_GOOGLE_LOADED')) {
define('ACODEPLAYGROUND_GOOGLE_LOADED', true);

if (!defined('ACODEPLAYGROUND_ROOT')) { define('ACODEPLAYGROUND_ROOT', dirname(__DIR__)); }

function google_security_dir() {
    $dir = ACODEPLAYGROUND_ROOT . '/data/.security';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    return $dir;
}

function google_settings_file() {
    return google_security_dir() . '/google-settings.json';
}

/* ---- encryption (same key + format as gdrive.php's refresh tokens) ---- */

function google_key() {
    $file = google_security_dir() . '/gdrive.key';
    if (!is_file($file)) {
        $ok = @file_put_contents($file, bin2hex(random_bytes(32)), LOCK_EX);
        if ($ok === false) { throw new RuntimeException('The server could not create its encryption key (is data/.security writable?).'); }
        @chmod($file, 0600);
    }
    $hex = trim((string)@file_get_contents($file));
    if (strlen($hex) !== 64 || !ctype_xdigit($hex)) { throw new RuntimeException('The encryption key file (data/.security/gdrive.key) is damaged.'); }
    return hex2bin($hex);
}

function google_encrypt($plain) {
    if (!function_exists('openssl_encrypt')) { throw new RuntimeException('PHP\'s OpenSSL extension is required to store the secret safely.'); }
    $iv = random_bytes(12);
    $tag = '';
    $ct = openssl_encrypt((string)$plain, 'aes-256-gcm', google_key(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($ct === false) { throw new RuntimeException('Could not encrypt the value.'); }
    return base64_encode($iv . $tag . $ct);
}

function google_decrypt($blob) {
    $raw = base64_decode((string)$blob, true);
    if ($raw === false || strlen($raw) < 29) { throw new RuntimeException('Stored value is unreadable.'); }
    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', google_key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    if ($plain === false) { throw new RuntimeException('Stored value is unreadable.'); }
    return $plain;
}

/* ---- settings ---- */

function google_settings_raw() {
    $file = google_settings_file();
    if (!is_file($file)) { return array(); }
    $data = json_decode((string)@file_get_contents($file), true);
    return is_array($data) ? $data : array();
}

/**
 * The effective settings for this request:
 *   source, enabled, client_id, client_secret, base_url, use_for_signin,
 *   keep_backups, auto_min_seconds, updated_at, updated_by, secret_error
 */
function google_settings() {
    $config = require __DIR__ . '/config.php';
    $oauth = (isset($config['oauth']) && is_array($config['oauth'])) ? $config['oauth'] : array();
    $g = (isset($oauth['google']) && is_array($oauth['google'])) ? $oauth['google'] : array();
    $cfgBase = isset($oauth['base_url']) ? rtrim((string)$oauth['base_url'], '/') : '';
    $cfgId = isset($g['client_id']) ? trim((string)$g['client_id']) : '';
    $cfgSecret = isset($g['client_secret']) ? trim((string)$g['client_secret']) : '';

    $out = array(
        'source' => ($cfgId !== '' || $cfgSecret !== '') ? 'config' : 'none',
        'enabled' => true,
        'client_id' => $cfgId,
        'client_secret' => $cfgSecret,
        'base_url' => $cfgBase,
        'use_for_signin' => true,
        'keep_backups' => 10,
        'auto_min_seconds' => 600,
        'updated_at' => null,
        'updated_by' => null,
        'secret_error' => false,
    );

    $raw = google_settings_raw();
    if ($raw) {
        $out['source'] = 'dashboard';
        $out['enabled'] = !isset($raw['enabled']) || !empty($raw['enabled']);
        $out['client_id'] = isset($raw['client_id']) ? trim((string)$raw['client_id']) : '';
        $out['client_secret'] = '';
        if (!empty($raw['client_secret_enc'])) {
            try { $out['client_secret'] = google_decrypt($raw['client_secret_enc']); }
            catch (Throwable $e) { $out['secret_error'] = true; }
        }
        if (!empty($raw['base_url'])) { $out['base_url'] = rtrim((string)$raw['base_url'], '/'); }
        $out['use_for_signin'] = !isset($raw['use_for_signin']) || !empty($raw['use_for_signin']);
        if (isset($raw['keep_backups'])) { $out['keep_backups'] = max(1, min(50, (int)$raw['keep_backups'])); }
        if (isset($raw['auto_min_minutes'])) { $out['auto_min_seconds'] = max(1, min(1440, (int)$raw['auto_min_minutes'])) * 60; }
        $out['updated_at'] = isset($raw['updated_at']) ? $raw['updated_at'] : null;
        $out['updated_by'] = isset($raw['updated_by']) ? $raw['updated_by'] : null;
    }
    return $out;
}

/** True when Drive backup can actually be offered to users. */
function google_is_configured($s = null) {
    if ($s === null) { $s = google_settings(); }
    return !empty($s['enabled']) && $s['client_id'] !== '' && $s['client_secret'] !== '' && $s['base_url'] !== '';
}

/** Writes the dashboard-managed settings file. Returns true on success. */
function google_settings_save($raw) {
    $json = json_encode($raw, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $file = google_settings_file();
    if (@file_put_contents($file, $json, LOCK_EX) === false) { return false; }
    @chmod($file, 0600);
    return true;
}

/** Removes the dashboard-managed settings (falls back to core/config.php). */
function google_settings_clear() {
    $file = google_settings_file();
    return !is_file($file) || @unlink($file);
}

/* ---- HTTP (used by the admin "Test connection" and token revocation) ---- */

/** Returns array('status' => int, 'body' => string, 'errno' => int). Never throws. */
function google_http($method, $url, $headers = array(), $body = null, $timeout = 15) {
    if (!function_exists('curl_init')) { return array('status' => 0, 'body' => '', 'errno' => -1); }
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 8);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($body !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, $body); }
    $resp = curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return array('status' => $status, 'body' => $resp === false ? '' : (string)$resp, 'errno' => $errno);
}

/** Best-effort: tell Google to invalidate a stored (encrypted) refresh token. */
function google_revoke_encrypted($blob) {
    try {
        $token = google_decrypt($blob);
        google_http('POST', 'https://oauth2.googleapis.com/revoke', array('Content-Type: application/x-www-form-urlencoded'), http_build_query(array('token' => $token)), 8);
        return true;
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * Asks Google's token endpoint about this client using a deliberately bogus
 * authorization code. Google answers differently depending on whether the
 * client ID/secret pair is valid, so no user account is ever touched.
 * Returns array('state' => ok|bad|warn, 'detail' => string).
 */
function google_probe_credentials($clientId, $clientSecret, $redirectUri) {
    $resp = google_http('POST', 'https://oauth2.googleapis.com/token',
        array('Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'),
        http_build_query(array(
            'code' => 'acp-connection-test', 'client_id' => $clientId, 'client_secret' => $clientSecret,
            'redirect_uri' => $redirectUri, 'grant_type' => 'authorization_code',
        )));
    if ($resp['errno'] === 60 || $resp['errno'] === 77) {
        return array('state' => 'bad', 'detail' => 'PHP could not verify Google\'s security certificate. Set curl.cainfo in php.ini to a cacert.pem file, then restart Apache.');
    }
    if ($resp['errno'] !== 0 || $resp['status'] === 0) {
        return array('state' => 'bad', 'detail' => 'Could not reach Google. Check this server\'s internet connection and firewall.');
    }
    $data = json_decode($resp['body'], true);
    $err = (is_array($data) && isset($data['error']) && is_string($data['error'])) ? $data['error'] : '';
    if ($err === 'invalid_grant') {
        return array('state' => 'ok', 'detail' => 'Google recognised the client ID and secret.');
    }
    if ($err === 'invalid_client' || $err === 'unauthorized_client') {
        return array('state' => 'bad', 'detail' => 'Google does not accept this client ID / secret pair. Re-copy both from Google Cloud Console → Credentials.');
    }
    if ($err === 'redirect_uri_mismatch') {
        return array('state' => 'bad', 'detail' => 'Google says ' . $redirectUri . ' is not registered for this client. Add it, exactly as written, under Authorised redirect URIs in Google Cloud Console.');
    }
    return array('state' => 'warn', 'detail' => 'Google answered unexpectedly' . ($err !== '' ? ' (' . $err . ')' : ' (HTTP ' . $resp['status'] . ')') . '.');
}

} // ACODEPLAYGROUND_GOOGLE_LOADED
