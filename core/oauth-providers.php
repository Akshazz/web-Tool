<?php
/**
 * GitHub + Facebook sign-in settings — managed from the admin dashboard
 * (admin-dashboard.php → sidebar → GitHub / Facebook).
 *
 * This is the same idea as core/google.php: instead of typing the client ID /
 * secret into core/config.php by hand, the site administrator enters them in
 * the dashboard. Values are stored in
 *
 *     data/.security/oauth-settings.json      (blocked from the web by .htaccess)
 *
 * The client SECRET is encrypted at rest (AES-256-GCM) with the very same key
 * file that protects the Google secret and users' Drive refresh tokens
 * (data/.security/gdrive.key) — the helpers are reused from core/google.php.
 *
 * Precedence, per provider
 *   1. Settings saved from the dashboard  (source = "dashboard")
 *   2. The 'oauth' → '<provider>' block in core/config.php  (source = "config")
 *   3. Nothing configured                 (source = "none")
 * So an install that already has keys in config.php keeps working unchanged.
 *
 * The Site address is shared with Google (sidebar → Google): the one
 * saved there — or 'oauth' → 'base_url' in config.php — builds every redirect URI.
 *
 * Used by: oauth.php (the sign-in endpoint) and admin.php (the dashboard API).
 * Never send the decrypted secret to the browser.
 */
if (!defined('ACODEPLAYGROUND_OAUTH_PROVIDERS_LOADED')) {
define('ACODEPLAYGROUND_OAUTH_PROVIDERS_LOADED', true);

require_once __DIR__ . '/google.php'; // AES helpers, key file, google_http(), google_settings()

/** Graph API version used for Facebook sign-in (oauth.php and the connection test). */
if (!defined('ACODEPLAYGROUND_FB_GRAPH_VERSION')) { define('ACODEPLAYGROUND_FB_GRAPH_VERSION', 'v25.0'); }

/** Providers managed by this file (Google has its own file: core/google.php). */
function oauth_provider_names() {
    return array('github', 'facebook');
}

function oauth_provider_label($provider) {
    return $provider === 'github' ? 'GitHub' : ($provider === 'facebook' ? 'Facebook' : ucfirst((string)$provider));
}

function oauth_settings_file() {
    return google_security_dir() . '/oauth-settings.json';
}

/** The whole settings file as array('github' => array(...), 'facebook' => array(...)). */
function oauth_settings_raw() {
    $file = oauth_settings_file();
    if (!is_file($file)) { return array(); }
    $data = json_decode((string)@file_get_contents($file), true);
    return is_array($data) ? $data : array();
}

/** The site address every redirect URI is built from (shared with Google). */
function oauth_site_base_url() {
    $gs = google_settings(); // dashboard value if saved, else 'oauth' → 'base_url' from config.php
    return isset($gs['base_url']) ? rtrim((string)$gs['base_url'], '/') : '';
}

function oauth_provider_redirect_uri($provider, $baseUrl) {
    return rtrim((string)$baseUrl, '/') . '/oauth.php?provider=' . $provider;
}

/**
 * The effective settings for one provider on this request:
 *   source, enabled, client_id, client_secret, secret_error, updated_at, updated_by
 */
function oauth_provider_settings($provider) {
    $config = require __DIR__ . '/config.php';
    $oauth = (isset($config['oauth']) && is_array($config['oauth'])) ? $config['oauth'] : array();
    $c = (isset($oauth[$provider]) && is_array($oauth[$provider])) ? $oauth[$provider] : array();
    $cfgId = isset($c['client_id']) ? trim((string)$c['client_id']) : '';
    $cfgSecret = isset($c['client_secret']) ? trim((string)$c['client_secret']) : '';

    $out = array(
        'source' => ($cfgId !== '' || $cfgSecret !== '') ? 'config' : 'none',
        'enabled' => true,
        'client_id' => $cfgId,
        'client_secret' => $cfgSecret,
        'secret_error' => false,
        'updated_at' => null,
        'updated_by' => null,
    );

    $all = oauth_settings_raw();
    if (isset($all[$provider]) && is_array($all[$provider]) && $all[$provider]) {
        $raw = $all[$provider];
        $out['source'] = 'dashboard';
        $out['enabled'] = !isset($raw['enabled']) || !empty($raw['enabled']);
        $out['client_id'] = isset($raw['client_id']) ? trim((string)$raw['client_id']) : '';
        $out['client_secret'] = '';
        if (!empty($raw['client_secret_enc'])) {
            try { $out['client_secret'] = google_decrypt($raw['client_secret_enc']); }
            catch (Throwable $e) { $out['secret_error'] = true; }
        }
        $out['updated_at'] = isset($raw['updated_at']) ? $raw['updated_at'] : null;
        $out['updated_by'] = isset($raw['updated_by']) ? $raw['updated_by'] : null;
    }
    return $out;
}

/** True when the provider has credentials and is switched on. */
function oauth_provider_is_configured($s) {
    return !empty($s['enabled']) && $s['client_id'] !== '' && $s['client_secret'] !== '';
}

/** Writes one provider's dashboard-managed record. Returns true on success. */
function oauth_provider_save($provider, $record) {
    $all = oauth_settings_raw();
    $all[$provider] = $record;
    return oauth_settings_write($all);
}

/** Removes one provider's dashboard-managed settings (falls back to core/config.php). */
function oauth_provider_clear($provider) {
    $all = oauth_settings_raw();
    unset($all[$provider]);
    if (!$all) {
        $file = oauth_settings_file();
        return !is_file($file) || @unlink($file);
    }
    return oauth_settings_write($all);
}

function oauth_settings_write($all) {
    $json = json_encode($all, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    $file = oauth_settings_file();
    if (@file_put_contents($file, $json, LOCK_EX) === false) { return false; }
    @chmod($file, 0600);
    return true;
}

/**
 * Asks the provider about this client without touching any user account.
 * Returns array('state' => ok|bad|warn, 'detail' => string).
 *
 *   GitHub   POSTs a deliberately bogus authorization code. GitHub answers
 *            "bad_verification_code" when the client ID + secret pair is valid
 *            and "incorrect_client_credentials" when it isn't.
 *   Facebook Requests an app access token (client_credentials). It only
 *            succeeds when the App ID + App secret pair is valid.
 */
function oauth_provider_probe($provider, $clientId, $clientSecret) {
    if ($provider === 'github') {
        $resp = google_http('POST', 'https://github.com/login/oauth/access_token',
            array('Content-Type: application/x-www-form-urlencoded', 'Accept: application/json', 'User-Agent: A-DevTools'),
            http_build_query(array('client_id' => $clientId, 'client_secret' => $clientSecret, 'code' => 'acp-connection-test')));
        $where = 'GitHub';
    } else {
        $resp = google_http('GET', 'https://graph.facebook.com/' . ACODEPLAYGROUND_FB_GRAPH_VERSION . '/oauth/access_token?' . http_build_query(array(
                'client_id' => $clientId, 'client_secret' => $clientSecret, 'grant_type' => 'client_credentials')),
            array('Accept: application/json'));
        $where = 'Facebook';
    }

    if ($resp['errno'] === 60 || $resp['errno'] === 77) {
        return array('state' => 'bad', 'detail' => 'PHP could not verify ' . $where . '\'s security certificate. Set curl.cainfo in php.ini to a cacert.pem file, then restart Apache.');
    }
    if ($resp['errno'] !== 0 || $resp['status'] === 0) {
        return array('state' => 'bad', 'detail' => 'Could not reach ' . $where . '. Check this server\'s internet connection and firewall.');
    }
    $data = json_decode($resp['body'], true);

    if ($provider === 'github') {
        $err = (is_array($data) && isset($data['error']) && is_string($data['error'])) ? $data['error'] : '';
        if ($err === 'bad_verification_code') {
            return array('state' => 'ok', 'detail' => 'GitHub recognised the client ID and secret.');
        }
        if ($err === 'incorrect_client_credentials') {
            return array('state' => 'bad', 'detail' => 'GitHub does not accept this client ID / secret pair. Re-copy both from GitHub → Settings → Developer settings → OAuth Apps (generate a new secret if unsure).');
        }
        if ($err === 'application_suspended') {
            return array('state' => 'bad', 'detail' => 'GitHub says this OAuth app is suspended.');
        }
        return array('state' => 'warn', 'detail' => 'GitHub answered unexpectedly' . ($err !== '' ? ' (' . $err . ')' : ' (HTTP ' . $resp['status'] . ')') . '.');
    }

    // Facebook
    if (is_array($data) && !empty($data['access_token'])) {
        return array('state' => 'ok', 'detail' => 'Facebook recognised the App ID and App secret.');
    }
    $msg = (is_array($data) && isset($data['error']['message']) && is_string($data['error']['message'])) ? $data['error']['message'] : '';
    if ($msg !== '') {
        return array('state' => 'bad', 'detail' => 'Facebook rejected these credentials: ' . $msg . ' Re-copy the App ID and App secret from App settings → Basic.');
    }
    return array('state' => 'warn', 'detail' => 'Facebook answered unexpectedly (HTTP ' . $resp['status'] . ').');
}

} // ACODEPLAYGROUND_OAUTH_PROVIDERS_LOADED
