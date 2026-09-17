<?php
/**
 * Central security bootstrap for A-DevTools.
 *
 * Every entry point that talks to the browser (index.php, guest.php,
 * auth.php, save-data.php) requires this file FIRST, before starting a
 * session or sending output. It provides:
 *
 *   - adevtools_start_session()   secure, hardened session_start()
 *   - adevtools_security_headers() baseline HTTP security headers
 *   - csrf_token() / csrf_verify() per-session CSRF protection
 *   - login_is_locked() / login_register_failure() / login_clear_failures()
 *     a small, file-backed brute-force throttle for the login endpoint
 *
 * Folder/file-level protection itself lives in .htaccess (root, data/,
 * data/backups/, database/) — this file is the session/request layer.
 */

if (!defined('ADEVTOOLS_SECURITY_LOADED')) {
define('ADEVTOOLS_SECURITY_LOADED', true);

/**
 * Starts the session with hardened cookie flags. Safe to call more than
 * once — a no-op if a session is already active. Must be called before
 * any output is sent.
 */
function adevtools_start_session() {
    if (session_status() === PHP_SESSION_ACTIVE) { return; }
    $isHttps = (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    session_set_cookie_params(array(
        'lifetime' => 0,
        'path'     => '/',
        'domain'   => '',
        'secure'   => $isHttps,   // only sent over HTTPS once you're on HTTPS
        'httponly' => true,       // not readable from JS — blunts XSS session theft
        'samesite' => 'Lax',      // blunts cross-site request forgery
    ));
    session_start();
}

/** Baseline security headers. Call once, before any output. */
function adevtools_security_headers() {
    header('X-Content-Type-Options: nosniff');
    header('X-Frame-Options: SAMEORIGIN');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header(
        "Content-Security-Policy: default-src 'self'; " .
        "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; " .
        "font-src 'self' https://cdnjs.cloudflare.com; " .
        "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://cdnjs.cloudflare.com; " .
        "img-src 'self' data:; " .
        "connect-src 'self'; " .
        "frame-ancestors 'self';"
    );
}

/** Returns this session's CSRF token, creating one on first use. */
function csrf_token() {
    adevtools_start_session();
    if (empty($_SESSION['csrfToken'])) {
        $_SESSION['csrfToken'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrfToken'];
}

/** Timing-safe check of a token submitted by the client. */
function csrf_verify($token) {
    adevtools_start_session();
    return !empty($_SESSION['csrfToken']) && is_string($token) && hash_equals($_SESSION['csrfToken'], $token);
}

/**
 * Small file-backed login throttle, keyed by email. Session-based
 * throttling can be wiped just by dropping cookies, so this instead
 * persists to a file the web server can't serve directly (see
 * data/.htaccess), and uses flock() so concurrent requests don't race.
 */
if (!defined('ADEVTOOLS_ROOT')) {
    // core/ sits one level below the app root — this constant lets any
    // file in core/ (or a future nested tier) find the app root reliably
    // no matter how deep it's stored, without hardcoding '..' everywhere.
    define('ADEVTOOLS_ROOT', dirname(__DIR__));
}
function adevtools_throttle_file() {
    $dir = ADEVTOOLS_ROOT . '/data/.security';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    return $dir . '/login-attempts.json';
}

function adevtools_throttle_read($fh) {
    rewind($fh);
    $raw = stream_get_contents($fh);
    $data = json_decode((string)$raw, true);
    return is_array($data) ? $data : array();
}

/** True if this email is currently locked out from logging in. */
function login_is_locked($email) {
    $key = strtolower(trim((string)$email));
    if ($key === '') { return false; }
    $file = adevtools_throttle_file();
    if (!is_file($file)) { return false; }
    $fh = fopen($file, 'c+');
    if (!$fh) { return false; }
    flock($fh, LOCK_SH);
    $data = adevtools_throttle_read($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    if (empty($data[$key])) { return false; }
    return time() < (int)$data[$key]['until'];
}

/** Seconds remaining in the current lockout (0 if not locked). */
function login_locked_seconds($email) {
    $key = strtolower(trim((string)$email));
    $file = adevtools_throttle_file();
    if ($key === '' || !is_file($file)) { return 0; }
    $fh = fopen($file, 'c+');
    if (!$fh) { return 0; }
    flock($fh, LOCK_SH);
    $data = adevtools_throttle_read($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    if (empty($data[$key])) { return 0; }
    return max(0, (int)$data[$key]['until'] - time());
}

/** Records a failed login attempt; locks the email out after 5 fails. */
function login_register_failure($email) {
    $key = strtolower(trim((string)$email));
    if ($key === '') { return; }
    $fh = fopen(adevtools_throttle_file(), 'c+');
    if (!$fh) { return; }
    flock($fh, LOCK_EX);
    $data = adevtools_throttle_read($fh);
    $count = isset($data[$key]['count']) ? (int)$data[$key]['count'] + 1 : 1;
    // Backs off further with each repeated failure, capped at 15 minutes.
    $lockSeconds = $count >= 5 ? min(900, 30 * pow(2, $count - 5)) : 0;
    $data[$key] = array('count' => $count, 'until' => $lockSeconds ? time() + $lockSeconds : 0);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    flock($fh, LOCK_UN);
    fclose($fh);
}

/** Clears the failure count for an email after a successful login. */
function login_clear_failures($email) {
    $key = strtolower(trim((string)$email));
    $file = adevtools_throttle_file();
    if ($key === '' || !is_file($file)) { return; }
    $fh = fopen($file, 'c+');
    if (!$fh) { return; }
    flock($fh, LOCK_EX);
    $data = adevtools_throttle_read($fh);
    unset($data[$key]);
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    flock($fh, LOCK_UN);
    fclose($fh);
}

} // ADEVTOOLS_SECURITY_LOADED
