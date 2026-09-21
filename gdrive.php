<?php
/**
 * Google Drive backup — every account can link its OWN Google Drive.
 *
 * How it works
 *   - The site administrator registers ONE Google OAuth client and enters its
 *     client ID / secret in the admin dashboard (Integrations → Google Drive;
 *     stored by core/google.php — core/config.php still works as a fallback).
 *     The same client can also power "Sign in with Google" as long as this
 *     file's redirect URI is added to it too:
 *         {base_url}/gdrive.php
 *   - Each user clicks "Connect Google Drive" in Settings, approves access
 *     with THEIR Google account, and their own refresh token is stored (AES
 *     encrypted) against their own row in `gdrive_links`. Nobody's Drive is
 *     shared with anyone else.
 *   - Only the narrow `drive.file` scope is requested: the app can see and
 *     manage ONLY the files it created itself (its backup folder), never the
 *     rest of the person's Drive.
 *   - All Google calls happen here on the server (PHP + cURL), so the
 *     browser's Content-Security-Policy (connect-src 'self') is untouched and
 *     tokens never reach the browser.
 *
 * What is (and isn't) backed up
 *   Projects, snippets and notes only. XP / rank / streak are deliberately NOT
 *   part of a backup: they live in the `points` table and can't be edited or
 *   restored from a file, so a backup can't be used to cheat.
 *
 * Endpoints
 *   GET  gdrive.php?action=connect&csrf=...   start the Google consent flow
 *   GET  gdrive.php?code=...&state=...        Google's redirect back (callback)
 *   POST gdrive.php?action=status|backup|list|restore-file|set-auto|disconnect
 */
require_once __DIR__ . '/core/security.php';
acodeplayground_start_session();
acodeplayground_security_headers();
require_once __DIR__ . '/core/db.php';
require_once __DIR__ . '/core/auth-helpers.php';
require_once __DIR__ . '/core/google.php';

/** Errors safe to show to the person. Anything else becomes a generic message. */
class GdriveUserError extends RuntimeException {}

/* Google connection: managed from the admin dashboard (Integrations → Google Drive),
   falling back to core/config.php. See core/google.php. */
$GDRIVE_SETTINGS = google_settings();

/* Retention: newest N backups are kept in the person's Drive folder (admin-configurable). */
if (!defined('GDRIVE_KEEP_BACKUPS')) { define('GDRIVE_KEEP_BACKUPS', $GDRIVE_SETTINGS['keep_backups']); }
/* Automatic (debounced) backups: at most one per this many seconds (admin-configurable). */
if (!defined('GDRIVE_AUTO_MIN_SECONDS')) { define('GDRIVE_AUTO_MIN_SECONDS', $GDRIVE_SETTINGS['auto_min_seconds']); }
/* Manual backups: minimum gap, just to stop accidental double-clicks. */
if (!defined('GDRIVE_MANUAL_MIN_SECONDS')) { define('GDRIVE_MANUAL_MIN_SECONDS', 8); }
/* Refuse to restore anything bigger than this. */
if (!defined('GDRIVE_MAX_BYTES')) { define('GDRIVE_MAX_BYTES', 10 * 1024 * 1024); }
if (!defined('GDRIVE_FOLDER_NAME')) { define('GDRIVE_FOLDER_NAME', 'A-Code Playground Backups'); }

$GDRIVE_CLIENT_ID     = $GDRIVE_SETTINGS['client_id'];
$GDRIVE_CLIENT_SECRET = $GDRIVE_SETTINGS['client_secret'];
$GDRIVE_BASE_URL      = $GDRIVE_SETTINGS['base_url'];
$GDRIVE_REDIRECT_URI  = $GDRIVE_BASE_URL . '/gdrive.php';

/** Drive backup is offered only when credentials are present AND the admin hasn't switched it off. */
function gdrive_configured() {
    global $GDRIVE_SETTINGS;
    return google_is_configured($GDRIVE_SETTINGS);
}

/** A friendly explanation for why Drive backup isn't available right now. */
function gdrive_unavailable_message() {
    global $GDRIVE_SETTINGS;
    if (!$GDRIVE_SETTINGS['enabled'] && $GDRIVE_SETTINGS['client_id'] !== '') {
        return 'Google Drive backup is turned off by the site administrator.';
    }
    return 'Google Drive backup isn\'t set up yet. Ask the site administrator to add the Google connection (Admin dashboard → Integrations → Google Drive).';
}

function gdrive_runtime_ok() {
    return function_exists('curl_init') && function_exists('openssl_encrypt') && function_exists('random_bytes');
}

function gdrive_json($ok, $extra = array()) {
    header('Content-Type: application/json');
    echo json_encode(array_merge(array('ok' => $ok), $extra));
    exit;
}

/** Sends the browser back to Settings with a result the page shows as a toast. */
function gdrive_back($status, $message = '') {
    $url = 'index.php?page=settings&gdrive=' . rawurlencode($status);
    if ($message !== '') { $url .= '&gdrive_msg=' . rawurlencode($message); }
    header('Location: ' . $url . '#googleDriveBackup');
    exit;
}

/* ------------------------------------------------------------------ */
/* Storage: one row per account. Created on first use so it works even */
/* if database/gdrive-migration.sql was never run.                     */
/* ------------------------------------------------------------------ */
function gdrive_ensure_table($pdo) {
    static $done = false;
    if ($done) { return; }
    $pdo->exec(
        "CREATE TABLE IF NOT EXISTS `gdrive_links` (
            `user_id`           VARCHAR(32) NOT NULL,
            `google_email`      VARCHAR(255) DEFAULT NULL,
            `refresh_token_enc` TEXT NOT NULL,
            `folder_id`         VARCHAR(128) DEFAULT NULL,
            `auto_sync`         TINYINT(1) NOT NULL DEFAULT 0,
            `last_sync_at`      DATETIME DEFAULT NULL,
            `last_hash`         VARCHAR(64) DEFAULT NULL,
            `last_file`         VARCHAR(255) DEFAULT NULL,
            `created_at`        DATETIME NOT NULL,
            PRIMARY KEY (`user_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
    );
    $done = true;
}

function gdrive_get_link($pdo, $userId) {
    gdrive_ensure_table($pdo);
    $stmt = $pdo->prepare('SELECT * FROM `gdrive_links` WHERE user_id = ?');
    $stmt->execute(array($userId));
    $row = $stmt->fetch();
    return $row ? $row : null;
}

/* ------------------------------------------------------------------ */
/* Refresh tokens are encrypted at rest (AES-256-GCM). The key lives in */
/* data/.security/, which .htaccess blocks from the web.               */
/* ------------------------------------------------------------------ */
function gdrive_key() {
    $dir = ACODEPLAYGROUND_ROOT . '/data/.security';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    $file = $dir . '/gdrive.key';
    if (!is_file($file)) {
        $ok = @file_put_contents($file, bin2hex(random_bytes(32)), LOCK_EX);
        if ($ok === false) { throw new GdriveUserError('The server could not create its encryption key (is data/.security writable?).'); }
        @chmod($file, 0600);
    }
    $hex = trim((string)@file_get_contents($file));
    if (strlen($hex) !== 64 || !ctype_xdigit($hex)) { throw new GdriveUserError('The Google Drive encryption key file is damaged.'); }
    return hex2bin($hex);
}

function gdrive_encrypt($plain) {
    $iv = random_bytes(12);
    $tag = '';
    $ct = openssl_encrypt($plain, 'aes-256-gcm', gdrive_key(), OPENSSL_RAW_DATA, $iv, $tag);
    if ($ct === false) { throw new GdriveUserError('Could not encrypt the Google token.'); }
    return base64_encode($iv . $tag . $ct);
}

function gdrive_decrypt($blob) {
    $raw = base64_decode((string)$blob, true);
    if ($raw === false || strlen($raw) < 29) { throw new GdriveUserError('Stored Google token is unreadable — please reconnect Google Drive.'); }
    $plain = openssl_decrypt(substr($raw, 28), 'aes-256-gcm', gdrive_key(), OPENSSL_RAW_DATA, substr($raw, 0, 12), substr($raw, 12, 16));
    if ($plain === false) { throw new GdriveUserError('Stored Google token is unreadable — please reconnect Google Drive.'); }
    return $plain;
}

/* ------------------------------------------------------------------ */
/* HTTP + Google API helpers                                           */
/* ------------------------------------------------------------------ */
/** Returns array('status' => int, 'body' => string). Throws GdriveUserError if the request can't be made. */
function gdrive_http($method, $url, $headers = array(), $body = null, $timeout = 30) {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($body !== null) { curl_setopt($ch, CURLOPT_POSTFIELDS, $body); }
    $resp = curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($resp === false || $errno !== 0) {
        if ($errno === 60 || $errno === 77) {
            throw new GdriveUserError('PHP could not verify Google\'s security certificate. In php.ini set curl.cainfo to a cacert.pem file (see the README), then restart Apache.');
        }
        throw new GdriveUserError('Could not reach Google. Check this computer\'s internet connection.');
    }
    return array('status' => $status, 'body' => (string)$resp);
}

function gdrive_google_error($resp, $fallback) {
    $data = json_decode($resp['body'], true);
    if (is_array($data) && isset($data['error']) && is_array($data['error']) && isset($data['error']['message'])) {
        return $fallback . ' (' . $data['error']['message'] . ')';
    }
    return $fallback . ' (HTTP ' . $resp['status'] . ')';
}

/** Exchanges this person's stored refresh token for a short-lived access token. */
function gdrive_access_token($pdo, $userId, $link) {
    global $GDRIVE_CLIENT_ID, $GDRIVE_CLIENT_SECRET;
    $resp = gdrive_http('POST', 'https://oauth2.googleapis.com/token',
        array('Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'),
        http_build_query(array(
            'client_id'     => $GDRIVE_CLIENT_ID,
            'client_secret' => $GDRIVE_CLIENT_SECRET,
            'refresh_token' => gdrive_decrypt($link['refresh_token_enc']),
            'grant_type'    => 'refresh_token',
        ))
    );
    $data = json_decode($resp['body'], true);
    if ($resp['status'] === 200 && is_array($data) && !empty($data['access_token'])) {
        return $data['access_token'];
    }
    if (is_array($data) && isset($data['error']) && $data['error'] === 'invalid_grant') {
        // The person revoked access in their Google account (or the token expired).
        $pdo->prepare('DELETE FROM `gdrive_links` WHERE user_id = ?')->execute(array($userId));
        throw new GdriveUserError('Google Drive access was removed. Please connect Google Drive again.');
    }
    throw new GdriveUserError(gdrive_google_error($resp, 'Google would not refresh access'));
}

/** Calls the Drive REST API and returns the decoded JSON body. */
function gdrive_api($method, $url, $token, $jsonBody = null) {
    $headers = array('Authorization: Bearer ' . $token, 'Accept: application/json');
    $payload = null;
    if ($jsonBody !== null) {
        $headers[] = 'Content-Type: application/json; charset=UTF-8';
        $payload = json_encode($jsonBody);
    }
    $resp = gdrive_http($method, $url, $headers, $payload);
    if ($resp['status'] >= 400) {
        $e = new GdriveUserError(gdrive_google_error($resp, 'Google Drive rejected the request'));
        if ($resp['status'] === 404) { throw new GdriveUserError('NOT_FOUND'); }
        throw $e;
    }
    $data = json_decode($resp['body'], true);
    return is_array($data) ? $data : array();
}

/** Finds (or creates) this account's backup folder in its own Drive and remembers its id. */
function gdrive_ensure_folder($pdo, $userId, &$link, $token) {
    if (!empty($link['folder_id'])) {
        try {
            $f = gdrive_api('GET', 'https://www.googleapis.com/drive/v3/files/' . rawurlencode($link['folder_id']) . '?fields=id,trashed', $token);
            if (isset($f['id']) && empty($f['trashed'])) { return $link['folder_id']; }
        } catch (GdriveUserError $e) {
            if ($e->getMessage() !== 'NOT_FOUND') { throw $e; }
        }
    }
    // Reconnecting shouldn't create a second folder: look for the one this app made before.
    $q = "name = '" . GDRIVE_FOLDER_NAME . "' and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    $found = gdrive_api('GET', 'https://www.googleapis.com/drive/v3/files?' . http_build_query(array('q' => $q, 'fields' => 'files(id)', 'pageSize' => 1)), $token);
    if (!empty($found['files'][0]['id'])) {
        $folderId = $found['files'][0]['id'];
    } else {
        $made = gdrive_api('POST', 'https://www.googleapis.com/drive/v3/files?fields=id', $token,
            array('name' => GDRIVE_FOLDER_NAME, 'mimeType' => 'application/vnd.google-apps.folder'));
        if (empty($made['id'])) { throw new GdriveUserError('Could not create the backup folder in Google Drive.'); }
        $folderId = $made['id'];
    }
    $pdo->prepare('UPDATE `gdrive_links` SET folder_id = ? WHERE user_id = ?')->execute(array($folderId, $userId));
    $link['folder_id'] = $folderId;
    return $folderId;
}

function gdrive_list_backups($token, $folderId, $limit) {
    $q = "'" . $folderId . "' in parents and trashed = false and mimeType = 'application/json'";
    $data = gdrive_api('GET', 'https://www.googleapis.com/drive/v3/files?' . http_build_query(array(
        'q' => $q,
        'orderBy' => 'createdTime desc',
        'pageSize' => $limit,
        'fields' => 'files(id,name,createdTime,size)',
    )), $token);
    return isset($data['files']) && is_array($data['files']) ? $data['files'] : array();
}

/* ------------------------------------------------------------------ */
/* Snapshot validation — only the three data lists ever go in or out.  */
/* ------------------------------------------------------------------ */
function gdrive_clean_snapshot($snapshot) {
    if (!is_array($snapshot)) { return null; }
    $out = array();
    $any = false;
    $total = 0;
    foreach (array('projects', 'snippets', 'notes') as $k) {
        $list = array();
        if (isset($snapshot[$k]) && is_array($snapshot[$k])) {
            $any = true;
            foreach ($snapshot[$k] as $item) {
                if (is_array($item) && isset($item['id'])) { $list[] = $item; $total++; }
                if ($total > 20000) { return null; }
            }
        }
        $out[$k] = $list;
    }
    return $any ? $out : null;
}

function gdrive_hash($clean) {
    return hash('sha256', json_encode($clean));
}

/** Google's id_token is a JWT delivered straight from Google over TLS; we only read the email claim. */
function gdrive_email_from_id_token($idToken) {
    $parts = explode('.', (string)$idToken);
    if (count($parts) < 2) { return null; }
    $json = base64_decode(strtr($parts[1], '-_', '+/'), false);
    $claims = json_decode((string)$json, true);
    return (is_array($claims) && !empty($claims['email'])) ? substr((string)$claims['email'], 0, 255) : null;
}

/* ================================================================== */
$user = currentUser();
$action = isset($_GET['action']) ? (string)$_GET['action'] : '';

/* ---------- Leg 1: send the browser to Google's consent screen ---------- */
if ($action === 'connect') {
    if (!$user) { header('Location: index.php'); exit; }
    if (!csrf_verify(isset($_GET['csrf']) ? $_GET['csrf'] : null)) {
        gdrive_back('error', 'Your session expired. Reload the page and try again.');
    }
    if (!gdrive_configured()) {
        gdrive_back('error', gdrive_unavailable_message());
    }
    if (!gdrive_runtime_ok()) {
        gdrive_back('error', 'This server\'s PHP is missing the cURL or OpenSSL extension, which Google Drive backup needs.');
    }
    $state = bin2hex(random_bytes(24));
    $_SESSION['gdriveState'] = array('s' => $state, 'u' => $user['id'], 't' => time());
    $params = array(
        'client_id'     => $GDRIVE_CLIENT_ID,
        'redirect_uri'  => $GDRIVE_REDIRECT_URI,
        'response_type' => 'code',
        // drive.file = only files this app creates. openid+email = show which Google account is linked.
        'scope'         => 'https://www.googleapis.com/auth/drive.file openid email',
        'access_type'   => 'offline',
        'prompt'        => 'consent',   // always returns a refresh token, even when re-linking
        'state'         => $state,
    );
    header('Location: https://accounts.google.com/o/oauth2/v2/auth?' . http_build_query($params));
    exit;
}

/* ---------- Leg 2: Google sends the browser back here ---------- */
if (isset($_GET['code']) || isset($_GET['error'])) {
    if (!$user) { header('Location: index.php'); exit; }
    $st = isset($_SESSION['gdriveState']) ? $_SESSION['gdriveState'] : null;
    unset($_SESSION['gdriveState']);   // single use

    if (isset($_GET['error'])) { gdrive_back('error', 'Google Drive was not connected (sign-in was cancelled).'); }
    if (!is_array($st) || !isset($_GET['state']) || !hash_equals((string)$st['s'], (string)$_GET['state'])
        || (string)$st['u'] !== (string)$user['id'] || (time() - (int)$st['t']) > 900) {
        gdrive_back('error', 'The Google sign-in session expired. Please try connecting again.');
    }

    try {
        $pdo = getDb();
        gdrive_ensure_table($pdo);
        $resp = gdrive_http('POST', 'https://oauth2.googleapis.com/token',
            array('Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'),
            http_build_query(array(
                'code'          => (string)$_GET['code'],
                'client_id'     => $GDRIVE_CLIENT_ID,
                'client_secret' => $GDRIVE_CLIENT_SECRET,
                'redirect_uri'  => $GDRIVE_REDIRECT_URI,
                'grant_type'    => 'authorization_code',
            ))
        );
        $tok = json_decode($resp['body'], true);
        if ($resp['status'] !== 200 || !is_array($tok) || empty($tok['access_token'])) {
            throw new GdriveUserError(gdrive_google_error($resp, 'Google would not complete the connection'));
        }
        // On Google's consent screen people can untick individual permissions — make sure Drive access was really granted.
        if (strpos(isset($tok['scope']) ? (string)$tok['scope'] : '', 'auth/drive.file') === false) {
            throw new GdriveUserError('Drive access was not granted. Please try again and leave the Google Drive permission ticked.');
        }
        $existing = gdrive_get_link($pdo, $user['id']);
        if (!empty($tok['refresh_token'])) {
            $enc = gdrive_encrypt($tok['refresh_token']);
        } elseif ($existing) {
            $enc = $existing['refresh_token_enc'];
        } else {
            throw new GdriveUserError('Google did not return a long-lived access token. Remove this app at myaccount.google.com/permissions, then connect again.');
        }
        $email = gdrive_email_from_id_token(isset($tok['id_token']) ? $tok['id_token'] : '');
        $pdo->prepare(
            'INSERT INTO `gdrive_links` (user_id, google_email, refresh_token_enc, created_at) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE google_email = VALUES(google_email), refresh_token_enc = VALUES(refresh_token_enc)'
        )->execute(array($user['id'], $email, $enc, date('Y-m-d H:i:s')));
    } catch (GdriveUserError $e) {
        gdrive_back('error', $e->getMessage());
    } catch (Throwable $e) {
        gdrive_back('error', 'Could not save the Google Drive connection.');
    }
    gdrive_back('connected');
}

/* ---------- JSON actions (POST + CSRF) ---------- */
header('Content-Type: application/json');
if (!$user) { gdrive_json(false, array('error' => 'Not logged in.')); }
$userId = $user['id'];

$raw = file_get_contents('php://input');
$body = json_decode((string)$raw, true);
if (!is_array($body)) { $body = array(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !csrf_verify(isset($body['csrf']) ? $body['csrf'] : null)) {
    gdrive_json(false, array('error' => 'Session expired. Reload the page and try again.'));
}

try {
    $pdo = getDb();
    gdrive_ensure_table($pdo);
    $link = gdrive_get_link($pdo, $userId);

    if ($action === 'status') {
        gdrive_json(true, array(
            'configured' => gdrive_configured(),
            'disabled'   => (!$GDRIVE_SETTINGS['enabled'] && $GDRIVE_SETTINGS['client_id'] !== ''),
            'runtimeOk'  => gdrive_runtime_ok(),
            'connected'  => (bool)$link,
            'email'      => $link ? $link['google_email'] : null,
            'auto'       => $link ? ((int)$link['auto_sync'] === 1) : false,
            'lastSyncAt' => ($link && $link['last_sync_at']) ? strtotime($link['last_sync_at']) * 1000 : null,
            'lastFile'   => $link ? $link['last_file'] : null,
            'keep'       => GDRIVE_KEEP_BACKUPS,
        ));
    }

    if (!gdrive_runtime_ok()) { throw new GdriveUserError('This server\'s PHP is missing the cURL or OpenSSL extension.'); }
    if (!gdrive_configured()) { throw new GdriveUserError(gdrive_unavailable_message()); }

    if ($action === 'set-auto') {
        if (!$link) { throw new GdriveUserError('Connect Google Drive first.'); }
        $on = !empty($body['on']) ? 1 : 0;
        $pdo->prepare('UPDATE `gdrive_links` SET auto_sync = ? WHERE user_id = ?')->execute(array($on, $userId));
        gdrive_json(true, array('auto' => $on === 1));
    }

    if ($action === 'disconnect') {
        if ($link) {
            // Best effort: tell Google to invalidate the token too. Files already in Drive are left alone.
            try {
                gdrive_http('POST', 'https://oauth2.googleapis.com/revoke',
                    array('Content-Type: application/x-www-form-urlencoded'),
                    http_build_query(array('token' => gdrive_decrypt($link['refresh_token_enc']))), 10);
            } catch (Throwable $e) { /* not fatal */ }
            $pdo->prepare('DELETE FROM `gdrive_links` WHERE user_id = ?')->execute(array($userId));
        }
        gdrive_json(true, array('connected' => false));
    }

    // Everything below needs a linked account.
    if (!$link) { throw new GdriveUserError('Connect Google Drive first.'); }

    if ($action === 'backup') {
        $clean = gdrive_clean_snapshot(isset($body['snapshot']) ? $body['snapshot'] : null);
        if ($clean === null) { throw new GdriveUserError('There was no valid data to back up.'); }
        $auto = !empty($body['auto']);
        $hash = gdrive_hash($clean);
        $lastTs = $link['last_sync_at'] ? strtotime($link['last_sync_at']) : 0;

        if ($auto) {
            // Automatic backups stay quiet: skip if a backup just happened, or nothing changed since the last one.
            if ($lastTs && (time() - $lastTs) < GDRIVE_AUTO_MIN_SECONDS) { gdrive_json(true, array('skipped' => 'recent')); }
            if (!empty($link['last_hash']) && hash_equals($link['last_hash'], $hash)) { gdrive_json(true, array('skipped' => 'unchanged')); }
        } elseif ($lastTs && (time() - $lastTs) < GDRIVE_MANUAL_MIN_SECONDS) {
            throw new GdriveUserError('A backup just finished — give it a few seconds.');
        }

        $token = gdrive_access_token($pdo, $userId, $link);
        $folderId = gdrive_ensure_folder($pdo, $userId, $link, $token);

        $name = 'a-codeplayground-backup-' . date('Y-m-d_His') . ($auto ? '-auto' : '') . '.json';
        $content = json_encode(array_merge($clean, array(
            'app' => 'A-Code Playground',
            'savedAt' => (int)round(microtime(true) * 1000),
        )), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if (strlen($content) > GDRIVE_MAX_BYTES) { throw new GdriveUserError('Your workspace is too large to back up to Drive in one file (over 10 MB).'); }

        $boundary = 'acp' . bin2hex(random_bytes(8));
        $meta = json_encode(array('name' => $name, 'parents' => array($folderId), 'mimeType' => 'application/json'));
        $multipart = "--$boundary\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n$meta\r\n"
                   . "--$boundary\r\nContent-Type: application/json\r\n\r\n$content\r\n--$boundary--";
        $resp = gdrive_http('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
            array('Authorization: Bearer ' . $token, 'Accept: application/json', 'Content-Type: multipart/related; boundary=' . $boundary),
            $multipart, 60);
        if ($resp['status'] >= 400) { throw new GdriveUserError(gdrive_google_error($resp, 'Google Drive would not accept the backup')); }

        // Keep only the newest GDRIVE_KEEP_BACKUPS files; older backups are deleted from the app's own folder.
        try {
            $all = gdrive_list_backups($token, $folderId, 100);
            foreach (array_slice($all, GDRIVE_KEEP_BACKUPS) as $old) {
                if (isset($old['id'])) { gdrive_http('DELETE', 'https://www.googleapis.com/drive/v3/files/' . rawurlencode($old['id']), array('Authorization: Bearer ' . $token), null, 15); }
            }
        } catch (Throwable $e) { /* pruning is best-effort */ }

        $now = date('Y-m-d H:i:s');
        $pdo->prepare('UPDATE `gdrive_links` SET last_sync_at = ?, last_hash = ?, last_file = ? WHERE user_id = ?')
            ->execute(array($now, $hash, $name, $userId));
        gdrive_json(true, array('skipped' => false, 'file' => $name, 'savedAt' => strtotime($now) * 1000));
    }

    if ($action === 'list') {
        $token = gdrive_access_token($pdo, $userId, $link);
        $folderId = gdrive_ensure_folder($pdo, $userId, $link, $token);
        $files = gdrive_list_backups($token, $folderId, GDRIVE_KEEP_BACKUPS);
        $out = array();
        foreach ($files as $f) {
            $out[] = array(
                'id'        => isset($f['id']) ? $f['id'] : '',
                'name'      => isset($f['name']) ? $f['name'] : '',
                'createdAt' => isset($f['createdTime']) ? strtotime($f['createdTime']) * 1000 : null,
                'size'      => isset($f['size']) ? (int)$f['size'] : 0,
            );
        }
        gdrive_json(true, array('files' => $out));
    }

    if ($action === 'restore-file') {
        $fileId = isset($body['id']) ? (string)$body['id'] : '';
        if (!preg_match('/^[A-Za-z0-9_-]{10,128}$/', $fileId)) { throw new GdriveUserError('That backup could not be found.'); }
        $token = gdrive_access_token($pdo, $userId, $link);
        $folderId = gdrive_ensure_folder($pdo, $userId, $link, $token);

        // Only files inside THIS account's backup folder can be restored.
        try {
            $meta = gdrive_api('GET', 'https://www.googleapis.com/drive/v3/files/' . rawurlencode($fileId) . '?fields=id,size,parents,trashed', $token);
        } catch (GdriveUserError $e) {
            throw new GdriveUserError($e->getMessage() === 'NOT_FOUND' ? 'That backup no longer exists in Google Drive.' : $e->getMessage());
        }
        if (!empty($meta['trashed']) || !isset($meta['parents']) || !in_array($folderId, $meta['parents'], true)) {
            throw new GdriveUserError('That file is not one of your A-Code Playground backups.');
        }
        if (isset($meta['size']) && (int)$meta['size'] > GDRIVE_MAX_BYTES) { throw new GdriveUserError('That backup is too large to restore.'); }

        $resp = gdrive_http('GET', 'https://www.googleapis.com/drive/v3/files/' . rawurlencode($fileId) . '?alt=media',
            array('Authorization: Bearer ' . $token), null, 60);
        if ($resp['status'] >= 400) { throw new GdriveUserError(gdrive_google_error($resp, 'Google Drive would not return that backup')); }
        $clean = gdrive_clean_snapshot(json_decode($resp['body'], true));
        if ($clean === null) { throw new GdriveUserError('That file does not look like an A-Code Playground backup.'); }
        // Only projects/snippets/notes come back — never XP, rank or streak.
        gdrive_json(true, array('snapshot' => $clean));
    }

    gdrive_json(false, array('error' => 'Unknown action.'));

} catch (GdriveUserError $e) {
    gdrive_json(false, array('error' => $e->getMessage() === 'NOT_FOUND' ? 'Google Drive could not find that item.' : $e->getMessage()));
} catch (Throwable $e) {
    gdrive_json(false, array('error' => 'Something went wrong talking to Google Drive. Please try again.'));
}
