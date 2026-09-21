<?php
/**
 * Admin Control API — the JSON backend behind admin-dashboard.php.
 *
 * This is deliberately independent of the regular Community account
 * session used by auth.php:
 *   1. The dashboard page (admin-dashboard.php) shows a full-page sign-in
 *      when locked. It asks for an account's email + password — the same
 *      password_hash()'d credential used for the normal login — but checks
 *      it independently of any existing app session.
 *   2. That account's `role` column must be 'admin'. Nothing in the UI can
 *      grant this to yourself; the first admin is created by running the
 *      UPDATE statement from database/admin-migration.sql against the DB.
 *   3. On success, $_SESSION['adminUnlocked'] and $_SESSION['adminUserId']
 *      are set (kept separate from $_SESSION['userId']).
 *   4. The unlock is throttled like the normal login (login_is_locked() in
 *      security.php) and the session now EXPIRES after ADMIN_IDLE_TIMEOUT
 *      seconds of inactivity (see core/auth-helpers.php).
 *   5. Every sign-in attempt and every state-changing action is written to
 *      data/.security/admin-audit.log (blocked from the web by
 *      data/.htaccess) and shown in the dashboard's Security tab.
 *
 * Actions
 *   read-only : status, stats (dashboard payload), audit
 *   session   : unlock, lock, ping
 *   users     : create-user, update-user, set-role, set-points,
 *               reset-password, delete-user, bulk-set-role, bulk-delete
 *   content   : update-content, delete-content
 *   security  : clear-lockout, clear-all-lockouts
 *   google    : google-save, google-clear, google-test,
 *               google-disconnect-user, google-disconnect-all
 *               (Integrations → Google Drive; see core/google.php)
 *   oauth     : oauth-save, oauth-clear, oauth-test  (provider = github | facebook)
 *               (sidebar → GitHub / Facebook pages; see core/oauth-providers.php)
 */
/* ----------------------------------------------------------------------
 * Failure reporting
 * A PHP fatal on shared hosting normally becomes a blank HTTP 500 with no
 * clue why. Turn that into a readable JSON error. Details (message, file,
 * line) are only included for an unlocked admin session; everyone else just
 * gets a generic message. PHP's own error display is forced off so warnings
 * can never corrupt the JSON, and errors still go to the server error log.
 * -------------------------------------------------------------------- */
@ini_set('display_errors', '0');
$ADMIN_WARNINGS = array();

function admin_report_failure($what) {
    while (ob_get_level() > 0) { @ob_end_clean(); }
    if (!headers_sent()) {
        http_response_code(200);
        header('Content-Type: application/json');
    }
    $detail = !empty($_SESSION['adminUnlocked']) ? (' ' . $what) : '';
    echo json_encode(array(
        'ok' => false,
        'serverError' => true,
        'error' => 'Server error while processing the request.' . $detail,
    ), JSON_INVALID_UTF8_SUBSTITUTE);
}

set_exception_handler(function ($e) {
    error_log('admin.php uncaught ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    admin_report_failure(get_class($e) . ': ' . $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine());
});

register_shutdown_function(function () {
    $e = error_get_last();
    if ($e && in_array($e['type'], array(E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR, E_RECOVERABLE_ERROR), true)) {
        admin_report_failure('PHP fatal: ' . $e['message'] . ' @ ' . basename($e['file']) . ':' . $e['line']);
    }
});

/** Runs an optional part of the dashboard; on failure returns $fallback and records a warning instead of crashing. */
function admin_safe($label, $fn, $fallback) {
    try {
        return $fn();
    } catch (Throwable $e) {
        error_log('admin.php ' . $label . ' failed: ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        $GLOBALS['ADMIN_WARNINGS'][] = $label . ': ' . $e->getMessage() . ' (' . basename($e->getFile()) . ':' . $e->getLine() . ')';
        return $fallback;
    }
}

ob_start();

require_once __DIR__ . '/core/security.php';
acodeplayground_start_session();
acodeplayground_security_headers();
header('Content-Type: application/json');
header('Cache-Control: no-store');
require_once __DIR__ . '/core/auth-helpers.php';
require_once __DIR__ . '/core/db.php';
require_once __DIR__ . '/core/google.php';
require_once __DIR__ . '/core/oauth-providers.php';

function respond($ok, $extra = array()) {
    echo json_encode(array_merge(array('ok' => $ok), $extra), JSON_INVALID_UTF8_SUBSTITUTE);
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) { $body = array(); }
$action = isset($body['action']) ? $body['action'] : (isset($_GET['action']) ? $_GET['action'] : null);

// 'status' is a read-only check, safe without a CSRF token; every other
// action requires one.
if ($action !== 'status' && !csrf_verify(isset($body['csrf']) ? $body['csrf'] : null)) {
    respond(false, array('error' => 'Your session expired. Please refresh the page and try again.', 'csrf' => true));
}

/* ----------------------------------------------------------------------
 * Small helpers
 * -------------------------------------------------------------------- */

/** The admin account unlocked in *this* session, or null. */
function currentAdmin() {
    global $body;
    $passive = !empty($body['passive']);
    $admin = adminSessionUser(!$passive);
    if ($admin) { $GLOBALS['ADMIN_ACTOR'] = $admin['email']; }
    return $admin;
}

function requireAdmin() {
    $admin = currentAdmin();
    if (!$admin) {
        respond(false, array('error' => 'Admin Control is locked.', 'locked' => true));
    }
    return $admin;
}

function bodyStr($key, $default = '') {
    global $body;
    return isset($body[$key]) && !is_array($body[$key]) ? (string)$body[$key] : $default;
}

function validEmail($email) {
    return $email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL);
}

function validLevel($level) {
    return in_array($level, array('beginner', 'intermediate', 'professional'), true);
}

/* ---- audit log ------------------------------------------------------- */

function audit_file() {
    $dir = ACODEPLAYGROUND_ROOT . '/data/.security';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    return $dir . '/admin-audit.log';
}

/**
 * Appends one line of JSON to the audit log. Never throws and never stores
 * passwords. The log is trimmed to its newest 1000 entries once it grows
 * past ~512 KB, so it can't fill the disk.
 */
function audit_log($event, $detail = '', $ok = true, $actor = null) {
    $file = audit_file();
    if ($actor === null) { $actor = isset($GLOBALS['ADMIN_ACTOR']) ? $GLOBALS['ADMIN_ACTOR'] : ''; }
    $entry = array(
        't' => time(),
        'event' => $event,
        'ok' => (bool)$ok,
        'actor' => (string)$actor,
        'detail' => function_exists('mb_substr') ? mb_substr((string)$detail, 0, 240) : substr((string)$detail, 0, 240),
        'ip' => isset($_SERVER['REMOTE_ADDR']) ? (string)$_SERVER['REMOTE_ADDR'] : '',
    );
    @file_put_contents($file, json_encode($entry, JSON_INVALID_UTF8_SUBSTITUTE) . "\n", FILE_APPEND | LOCK_EX);
    clearstatcache(true, $file);
    if (@filesize($file) > 524288) {
        $lines = @file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if (is_array($lines) && count($lines) > 1000) {
            @file_put_contents($file, implode("\n", array_slice($lines, -1000)) . "\n", LOCK_EX);
        }
    }
}

/** Newest-first audit entries. */
function audit_read($limit = 300) {
    $file = audit_file();
    if (!is_file($file)) { return array(); }
    $lines = @file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    if (!is_array($lines)) { return array(); }
    $out = array();
    for ($i = count($lines) - 1; $i >= 0 && count($out) < $limit; $i--) {
        $row = json_decode($lines[$i], true);
        if (is_array($row)) { $out[] = $row; }
    }
    return $out;
}

/* ---- login throttle file (shared with the normal login form) --------- */

function read_lockouts() {
    $lockouts = array();
    $file = ACODEPLAYGROUND_ROOT . '/data/.security/login-attempts.json';
    if (is_file($file)) {
        $data = json_decode((string)file_get_contents($file), true);
        if (is_array($data)) {
            foreach ($data as $key => $entry) {
                if (!empty($entry['until']) && (int)$entry['until'] > time()) {
                    $lockouts[] = array(
                        'key' => $key,
                        'count' => isset($entry['count']) ? (int)$entry['count'] : null,
                        'secondsLeft' => (int)$entry['until'] - time(),
                    );
                }
            }
        }
    }
    return $lockouts;
}

/* ---- stats / dashboard payload -------------------------------------- */

/** Fills a per-day count array for the last $days days (oldest first). */
function daily_counts($db, $table, $column, $days) {
    $start = date('Y-m-d', strtotime('-' . ($days - 1) . ' days'));
    $stmt = $db->prepare('SELECT DATE(`' . $column . '`) AS d, COUNT(*) AS c FROM `' . $table . '` WHERE `' . $column . '` >= ? GROUP BY DATE(`' . $column . '`)');
    $stmt->execute(array($start . ' 00:00:00'));
    $map = array();
    foreach ($stmt->fetchAll() as $row) { $map[$row['d']] = (int)$row['c']; }
    $out = array();
    for ($i = $days - 1; $i >= 0; $i--) {
        $d = date('Y-m-d', strtotime('-' . $i . ' days'));
        $out[] = isset($map[$d]) ? $map[$d] : 0;
    }
    return $out;
}

function group_counts($db, $sql) {
    $out = array();
    try {
        foreach ($db->query($sql)->fetchAll() as $row) {
            $out[] = array('label' => (string)$row['label'], 'count' => (int)$row['c']);
        }
    } catch (PDOException $e) { /* column/table missing on an old install */ }
    return $out;
}

/** Google Drive connection details for the Integrations page. NEVER includes the client secret. */
function google_admin_payload($db) {
    $s = google_settings();
    $links = array();
    try {
        $rows = $db->query(
            'SELECT g.user_id, g.google_email, g.auto_sync, g.last_sync_at, g.last_file, g.created_at,
                    u.name AS user_name, u.email AS user_email
             FROM `gdrive_links` g JOIN users u ON u.id = g.user_id
             ORDER BY g.created_at DESC'
        )->fetchAll();
        foreach ($rows as $r) {
            $links[] = array(
                'userId' => $r['user_id'], 'userName' => $r['user_name'], 'userEmail' => $r['user_email'],
                'googleEmail' => $r['google_email'], 'auto' => ((int)$r['auto_sync'] === 1),
                'lastSyncAt' => $r['last_sync_at'], 'lastFile' => $r['last_file'], 'connectedAt' => $r['created_at'],
            );
        }
    } catch (PDOException $e) { /* gdrive_links is created the first time a user connects */ }
    $base = $s['base_url'];
    return array(
        'source' => $s['source'],
        'enabled' => (bool)$s['enabled'],
        'configured' => google_is_configured($s),
        'clientId' => $s['client_id'],
        'secretSet' => $s['client_secret'] !== '',
        'secretError' => (bool)$s['secret_error'],
        'baseUrl' => $base,
        'useForSignin' => (bool)$s['use_for_signin'],
        'keepBackups' => (int)$s['keep_backups'],
        'autoMinMinutes' => (int)round($s['auto_min_seconds'] / 60),
        'updatedAt' => $s['updated_at'],
        'updatedBy' => $s['updated_by'],
        'redirectUris' => array(
            'drive' => ($base !== '' ? $base : 'https://your-site.example') . '/gdrive.php',
            'signin' => ($base !== '' ? $base : 'https://your-site.example') . '/oauth.php?provider=google',
        ),
        'runtime' => array(
            'curl' => function_exists('curl_init'),
            'openssl' => function_exists('openssl_encrypt'),
            'writable' => is_writable(ACODEPLAYGROUND_ROOT . '/data'),
        ),
        'links' => $links,
    );
}

/** GitHub / Facebook sign-in details for the Integrations page. NEVER includes a client secret. */
function oauth_admin_payload() {
    $base = oauth_site_base_url();
    $out = array();
    foreach (oauth_provider_names() as $p) {
        $s = oauth_provider_settings($p);
        $out[$p] = array(
            'label' => oauth_provider_label($p),
            'source' => $s['source'],
            'enabled' => (bool)$s['enabled'],
            'configured' => oauth_provider_is_configured($s) && $base !== '',
            'clientId' => $s['client_id'],
            'secretSet' => $s['client_secret'] !== '',
            'secretError' => (bool)$s['secret_error'],
            'baseUrl' => $base,
            'updatedAt' => $s['updated_at'],
            'updatedBy' => $s['updated_by'],
            'redirectUri' => oauth_provider_redirect_uri($p, $base !== '' ? $base : 'https://your-site.example'),
        );
    }
    return $out;
}

function system_info($db, $lockoutCount, $adminCount) {
    $info = array(
        'php' => PHP_VERSION,
        'os' => PHP_OS_FAMILY,
        'server' => isset($_SERVER['SERVER_SOFTWARE']) ? $_SERVER['SERVER_SOFTWARE'] : '',
        'timezone' => date_default_timezone_get(),
        'memoryLimit' => ini_get('memory_limit'),
        'uploadMax' => ini_get('upload_max_filesize'),
        'maxExecution' => ini_get('max_execution_time'),
        'serverTime' => date('Y-m-d H:i:s'),
        'db' => array('version' => null, 'name' => null, 'tables' => array()),
        'disk' => array('free' => null, 'total' => null),
        'idleTimeout' => ADMIN_IDLE_TIMEOUT,
    );

    try {
        $info['db']['version'] = $db->query('SELECT VERSION() AS v')->fetch()['v'];
        $info['db']['name'] = $db->query('SELECT DATABASE() AS d')->fetch()['d'];
        $rows = $db->query(
            'SELECT table_name AS n, table_rows AS r, (data_length + index_length) AS s
             FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY (data_length + index_length) DESC'
        )->fetchAll();
        foreach ($rows as $r) {
            $info['db']['tables'][] = array('name' => $r['n'], 'rows' => (int)$r['r'], 'bytes' => (int)$r['s']);
        }
    } catch (PDOException $e) { /* information_schema unavailable */ }

    $free = @disk_free_space(ACODEPLAYGROUND_ROOT);
    $total = @disk_total_space(ACODEPLAYGROUND_ROOT);
    if ($free !== false) { $info['disk']['free'] = (float)$free; }
    if ($total !== false) { $info['disk']['total'] = (float)$total; }

    // Hardening checklist shown in Security → Health checks.
    $config = require __DIR__ . '/core/config.php';
    $isHttps = (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off')
        || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
    $isLocal = in_array(isset($_SERVER['SERVER_NAME']) ? $_SERVER['SERVER_NAME'] : '', array('localhost', '127.0.0.1', '::1'), true);
    $defaultCreds = (isset($config['user']) && $config['user'] === 'root' && (!isset($config['pass']) || $config['pass'] === ''));
    $displayErrors = filter_var(ini_get('display_errors'), FILTER_VALIDATE_BOOLEAN) || in_array(strtolower((string)ini_get('display_errors')), array('stdout', 'stderr'), true);
    $guardedDirs = array('core', 'data', 'database', 'cli');
    $unguarded = array();
    foreach ($guardedDirs as $dir) {
        if (is_dir(ACODEPLAYGROUND_ROOT . '/' . $dir) && !is_file(ACODEPLAYGROUND_ROOT . '/' . $dir . '/.htaccess')) { $unguarded[] = $dir . '/'; }
    }

    $checks = array();
    $checks[] = array('id' => 'https', 'label' => 'Encrypted connection (HTTPS)',
        'status' => $isHttps ? 'ok' : ($isLocal ? 'info' : 'bad'),
        'detail' => $isHttps ? 'This session is served over HTTPS.' : ($isLocal ? 'Plain HTTP on localhost is fine for development. Use HTTPS in production.' : 'Admin credentials are travelling unencrypted. Enable HTTPS before going live.'));
    $checks[] = array('id' => 'dbcreds', 'label' => 'Database credentials',
        'status' => $defaultCreds ? ($isLocal ? 'warn' : 'bad') : 'ok',
        'detail' => $defaultCreds ? 'core/config.php still uses the default root user with no password. Create a dedicated MySQL user before deploying.' : 'Not using the default root/no-password combination.');
    $checks[] = array('id' => 'htaccess', 'label' => 'Private folders blocked',
        'status' => count($unguarded) ? 'bad' : 'ok',
        'detail' => count($unguarded) ? 'Missing .htaccess in: ' . implode(', ', $unguarded) : 'core/, data/, database/ and cli/ each have an access-deny .htaccess.');
    $checks[] = array('id' => 'datadir', 'label' => 'Data folder writable',
        'status' => is_writable(ACODEPLAYGROUND_ROOT . '/data') ? 'ok' : 'bad',
        'detail' => is_writable(ACODEPLAYGROUND_ROOT . '/data') ? 'Backups, throttle and audit files can be written.' : 'The data/ folder is not writable — audit logging and login throttling will fail.');
    $checks[] = array('id' => 'errors', 'label' => 'PHP error display',
        'status' => $displayErrors ? ($isLocal ? 'info' : 'warn') : 'ok',
        'detail' => $displayErrors ? 'display_errors is on; stack traces may be visible to visitors. Turn it off in production.' : 'display_errors is off.');
    $checks[] = array('id' => 'admins', 'label' => 'Admin accounts',
        'status' => $adminCount === 0 ? 'bad' : ($adminCount > 3 ? 'warn' : 'ok'),
        'detail' => $adminCount . ' admin account' . ($adminCount === 1 ? '' : 's') . '. Keep this number small.');
    $checks[] = array('id' => 'lockouts', 'label' => 'Active login lockouts',
        'status' => $lockoutCount > 0 ? 'warn' : 'ok',
        'detail' => $lockoutCount > 0 ? $lockoutCount . ' account(s) are currently locked out — review them under Lockouts.' : 'No accounts are locked out right now.');
    $gs = google_settings();
    $checks[] = array('id' => 'gdrive', 'label' => 'Google Drive backup',
        'status' => google_is_configured($gs) ? 'ok' : 'info',
        'detail' => google_is_configured($gs) ? 'Users can link their own Google Drive (configured from ' . ($gs['source'] === 'dashboard' ? 'the dashboard' : 'core/config.php') . ').'
            : (($gs['client_id'] !== '' && !$gs['enabled']) ? 'Configured but switched off — users cannot back up to Drive.' : 'Not set up yet (optional). Add your Google client ID under Integrations.'));
    $checks[] = array('id' => 'idle', 'label' => 'Admin idle timeout',
        'status' => 'ok',
        'detail' => 'Admin sessions lock after ' . round(ADMIN_IDLE_TIMEOUT / 60) . ' minutes of inactivity.');
    $info['checks'] = $checks;

    return $info;
}

/* ----------------------------------------------------------------------
 * Actions
 * -------------------------------------------------------------------- */
try {

    if ($action === 'status') {
        $admin = adminSessionUser(false);
        respond(true, array('unlocked' => $admin !== null, 'secondsLeft' => $admin ? adminSessionSecondsLeft() : 0));
    }

    if ($action === 'unlock') {
        $email = trim(bodyStr('email'));
        $password = bodyStr('password');
        $throttleKey = 'admin:' . strtolower($email);

        if (login_is_locked($throttleKey)) {
            $wait = max(1, ceil(login_locked_seconds($throttleKey) / 60));
            audit_log('sign-in blocked', 'Throttled: ' . $email, false, $email);
            respond(false, array('error' => 'Too many attempts. Try again in about ' . $wait . ' minute(s).'));
        }

        $account = findUserByEmail($email);
        $valid = $account && !empty($account['password_hash']) && password_verify($password, $account['password_hash']);

        // Wrong credentials and "correct credentials but not an admin" get
        // the exact same generic error, so a mistyped password is
        // indistinguishable from "that account isn't an admin".
        if (!$valid || !isAdmin($account)) {
            login_register_failure($throttleKey);
            audit_log('sign-in failed', $email, false, $email);
            respond(false, array('error' => 'Incorrect email or password.'));
        }

        login_clear_failures($throttleKey);
        session_regenerate_id(true); // fresh session ID on privilege change
        $_SESSION['adminUnlocked'] = true;
        $_SESSION['adminUserId'] = $account['id'];
        $_SESSION['adminLastSeen'] = time();
        $_SESSION['adminUnlockedAt'] = time();
        $GLOBALS['ADMIN_ACTOR'] = $account['email'];
        audit_log('sign-in', 'Signed in to Admin Control', true);
        respond(true);
    }

    if ($action === 'lock') {
        $admin = adminSessionUser(false);
        if ($admin) { $GLOBALS['ADMIN_ACTOR'] = $admin['email']; audit_log('sign-out', 'Locked Admin Control'); }
        adminSessionClear();
        respond(true);
    }

    if ($action === 'ping') {
        requireAdmin();
        respond(true, array('secondsLeft' => adminSessionSecondsLeft()));
    }

    if ($action === 'audit') {
        requireAdmin();
        respond(true, array('audit' => audit_read(300)));
    }

    if ($action === 'stats') {
        $admin = requireAdmin();
        $db = getDb();

        $counts = array();
        foreach (array('users', 'projects', 'notes', 'snippets') as $table) {
            $counts[$table] = (int)$db->query('SELECT COUNT(*) c FROM `' . $table . '`')->fetch()['c'];
        }

        // Left-joins the `points` table so the Users tab can show XP/streak
        // inline. Falls back to the plain query if that migration hasn't
        // been run yet on this install.
        try {
            $users = $db->query(
                'SELECT u.id, u.name, u.email, u.role, u.expertise_level, u.joined_at, u.oauth_provider,
                        (u.password_hash IS NOT NULL) AS has_password,
                        COALESCE(p.total, 0) AS points_total,
                        COALESCE(p.streak, 0) AS points_streak,
                        p.last_claim_date
                 FROM users u LEFT JOIN `points` p ON p.user_id = u.id
                 ORDER BY u.joined_at DESC'
            )->fetchAll();
        } catch (PDOException $e) {
            $users = $db->query(
                'SELECT id, name, email, role, expertise_level, joined_at, oauth_provider,
                        (password_hash IS NOT NULL) AS has_password
                 FROM users ORDER BY joined_at DESC'
            )->fetchAll();
        }

        $projects = $db->query(
            'SELECT pr.id, pr.user_id, pr.name, pr.tech, pr.description, pr.created_at, pr.updated_at,
                    u.name AS owner_name, u.email AS owner_email
             FROM projects pr JOIN users u ON u.id = pr.user_id
             ORDER BY pr.updated_at DESC'
        )->fetchAll();

        $notes = $db->query(
            'SELECT n.id, n.user_id, n.title, n.body, n.created_at, n.updated_at,
                    u.name AS owner_name, u.email AS owner_email
             FROM notes n JOIN users u ON u.id = n.user_id
             ORDER BY n.updated_at DESC'
        )->fetchAll();

        $snippets = $db->query(
            'SELECT s.id, s.user_id, s.title, s.lang, s.code, s.created_at, s.updated_at,
                    u.name AS owner_name, u.email AS owner_email
             FROM snippets s JOIN users u ON u.id = s.user_id
             ORDER BY s.updated_at DESC'
        )->fetchAll();

        $lockouts = admin_safe('login lockouts', function () { return read_lockouts(); }, array());
        $adminCount = 0;
        foreach ($users as $u) { if ($u['role'] === 'admin') { $adminCount++; } }

        $days = 90;
        $dates = array();
        for ($i = $days - 1; $i >= 0; $i--) { $dates[] = date('Y-m-d', strtotime('-' . $i . ' days')); }
        $series = array(
            'days' => $dates,
            'users' => daily_counts($db, 'users', 'joined_at', $days),
            'projects' => daily_counts($db, 'projects', 'created_at', $days),
            'notes' => daily_counts($db, 'notes', 'created_at', $days),
            'snippets' => daily_counts($db, 'snippets', 'created_at', $days),
        );

        $distributions = array(
            'roles' => group_counts($db, "SELECT role AS label, COUNT(*) AS c FROM users GROUP BY role"),
            'levels' => group_counts($db, "SELECT COALESCE(expertise_level, 'not set') AS label, COUNT(*) AS c FROM users GROUP BY COALESCE(expertise_level, 'not set')"),
            'providers' => group_counts($db, "SELECT COALESCE(oauth_provider, 'email + password') AS label, COUNT(*) AS c FROM users GROUP BY COALESCE(oauth_provider, 'email + password')"),
            'languages' => group_counts($db, "SELECT COALESCE(NULLIF(lang, ''), 'Unspecified') AS label, COUNT(*) AS c FROM snippets GROUP BY COALESCE(NULLIF(lang, ''), 'Unspecified') ORDER BY c DESC LIMIT 8"),
            'techs' => group_counts($db, "SELECT COALESCE(NULLIF(tech, ''), 'Unspecified') AS label, COUNT(*) AS c FROM projects GROUP BY COALESCE(NULLIF(tech, ''), 'Unspecified') ORDER BY c DESC LIMIT 8"),
        );

        $xp = array('total' => 0, 'maxStreak' => 0);
        try {
            $row = $db->query('SELECT COALESCE(SUM(total), 0) AS t, COALESCE(MAX(streak), 0) AS m FROM `points`')->fetch();
            $xp = array('total' => (int)$row['t'], 'maxStreak' => (int)$row['m']);
        } catch (PDOException $e) { /* points table not created yet */ }

        respond(true, array(
            'counts' => $counts,
            'users' => $users,
            'lockouts' => $lockouts,
            'content' => array('projects' => $projects, 'notes' => $notes, 'snippets' => $snippets),
            'series' => $series,
            'distributions' => $distributions,
            'xp' => $xp,
            'system' => admin_safe('system info', function () use ($db, $lockouts, $adminCount) {
                return system_info($db, count($lockouts), $adminCount);
            }, array(
                'php' => PHP_VERSION, 'os' => '', 'server' => '', 'timezone' => '', 'memoryLimit' => '',
                'uploadMax' => '', 'maxExecution' => '', 'serverTime' => date('Y-m-d H:i:s'),
                'db' => array('version' => null, 'name' => null, 'tables' => array()),
                'disk' => array('free' => null, 'total' => null),
                'idleTimeout' => ADMIN_IDLE_TIMEOUT, 'checks' => array(),
            )),
            'audit' => admin_safe('audit log', function () { return audit_read(300); }, array()),
            'google' => admin_safe('google panel', function () use ($db) { return google_admin_payload($db); }, array(
                'source' => '', 'enabled' => false, 'configured' => false, 'clientId' => '', 'secretSet' => false,
                'secretError' => false, 'baseUrl' => '', 'useForSignin' => false, 'keepBackups' => 10, 'autoMinMinutes' => 10,
                'updatedAt' => null, 'updatedBy' => null, 'redirectUris' => array('drive' => '', 'signin' => ''),
                'runtime' => array('curl' => function_exists('curl_init'), 'openssl' => function_exists('openssl_encrypt'), 'writable' => false),
                'links' => array(),
            )),
            'oauth' => admin_safe('oauth panel', function () { return oauth_admin_payload(); }, array()),
            'admin' => array('id' => $admin['id'], 'name' => $admin['name'], 'email' => $admin['email']),
            'session' => array('secondsLeft' => adminSessionSecondsLeft(), 'timeout' => ADMIN_IDLE_TIMEOUT),
            'generatedAt' => time(),
            'warnings' => $GLOBALS['ADMIN_WARNINGS'],
        ));
    }

    /* ---- users ------------------------------------------------------- */

    if ($action === 'create-user') {
        requireAdmin();
        $name = trim(bodyStr('name'));
        $email = trim(bodyStr('email'));
        $password = bodyStr('password');
        $role = bodyStr('role', 'user');
        $level = bodyStr('expertiseLevel');

        if ($name === '') { respond(false, array('error' => 'Name cannot be empty.')); }
        if (!validEmail($email)) { respond(false, array('error' => 'Enter a valid email address.')); }
        if (strlen($password) < 8) { respond(false, array('error' => 'Password must be at least 8 characters.')); }
        if (!in_array($role, array('user', 'admin'), true)) { respond(false, array('error' => 'Invalid role.')); }
        if ($level !== '' && !validLevel($level)) { respond(false, array('error' => 'Invalid expertise level.')); }
        if (findUserByEmail($email)) { respond(false, array('error' => 'That email is already in use by another account.')); }

        $user = insertUser($name, $email, password_hash($password, PASSWORD_DEFAULT));
        $stmt = getDb()->prepare('UPDATE users SET role = ?, expertise_level = ? WHERE id = ?');
        $stmt->execute(array($role, $level === '' ? null : $level, $user['id']));
        audit_log('user created', $email . ' (' . $role . ')');
        respond(true, array('id' => $user['id']));
    }

    if ($action === 'update-user') {
        // Lets an admin correct a display name, fix a typo'd email, or
        // adjust the expertise level — separate from 'set-role' (privilege)
        // and 'set-points' (XP), so each stays a small, auditable change.
        requireAdmin();
        $userId = bodyStr('userId');
        $target = $userId !== '' ? findUserById($userId) : null;
        if (!$target) {
            respond(false, array('error' => 'No such user.'));
        }

        $name = array_key_exists('name', $body) ? trim((string)$body['name']) : $target['name'];
        $email = array_key_exists('email', $body) ? trim((string)$body['email']) : $target['email'];
        $expertise = array_key_exists('expertiseLevel', $body) ? (string)$body['expertiseLevel'] : $target['expertise_level'];

        if ($name === '') {
            respond(false, array('error' => 'Name cannot be empty.'));
        }
        if (!validEmail($email)) {
            respond(false, array('error' => 'Enter a valid email address.'));
        }
        if ($expertise !== null && $expertise !== '' && !validLevel($expertise)) {
            respond(false, array('error' => 'Invalid expertise level.'));
        }
        if ($expertise === '') { $expertise = null; }

        try {
            $stmt = getDb()->prepare('UPDATE users SET name = ?, email = ?, expertise_level = ? WHERE id = ?');
            $stmt->execute(array($name, $email, $expertise, $userId));
        } catch (PDOException $e) {
            respond(false, array('error' => 'That email is already in use by another account.'));
        }
        audit_log('user updated', $target['email'] . ($target['email'] !== $email ? ' → ' . $email : ''));
        respond(true);
    }

    if ($action === 'update-content') {
        // Edits a single project/note/snippet on behalf of its owner.
        // Scoped by (id AND user_id) together since snippet ids are
        // user-chosen slugs and can repeat across different accounts.
        requireAdmin();
        $type = bodyStr('type');
        $id = isset($body['id']) ? $body['id'] : null;
        $ownerId = bodyStr('userId');
        if ($id === null || $id === '' || $ownerId === '') {
            respond(false, array('error' => 'Missing content id.'));
        }

        $db = getDb();
        $label = '';
        if ($type === 'project') {
            $name = trim(bodyStr('name'));
            if ($name === '') { respond(false, array('error' => 'Name is required.')); }
            $stmt = $db->prepare('UPDATE projects SET name = ?, tech = ?, description = ? WHERE id = ? AND user_id = ?');
            $stmt->execute(array($name, bodyStr('tech'), bodyStr('description'), $id, $ownerId));
            $label = $name;
        } elseif ($type === 'note') {
            $title = trim(bodyStr('title'));
            if ($title === '') { respond(false, array('error' => 'Title is required.')); }
            $stmt = $db->prepare('UPDATE notes SET title = ?, body = ? WHERE id = ? AND user_id = ?');
            $stmt->execute(array($title, bodyStr('body'), $id, $ownerId));
            $label = $title;
        } elseif ($type === 'snippet') {
            $title = trim(bodyStr('title'));
            if ($title === '') { respond(false, array('error' => 'Title is required.')); }
            $stmt = $db->prepare('UPDATE snippets SET title = ?, lang = ?, code = ? WHERE id = ? AND user_id = ?');
            $stmt->execute(array($title, bodyStr('lang'), bodyStr('code'), $id, $ownerId));
            $label = $title;
        } else {
            respond(false, array('error' => 'Invalid content type.'));
        }
        audit_log($type . ' edited', $label);
        respond(true);
    }

    if ($action === 'delete-content') {
        requireAdmin();
        $type = bodyStr('type');
        $id = isset($body['id']) ? $body['id'] : null;
        $ownerId = bodyStr('userId');
        if ($id === null || $id === '' || $ownerId === '') {
            respond(false, array('error' => 'Missing content id.'));
        }
        $tables = array('project' => 'projects', 'note' => 'notes', 'snippet' => 'snippets');
        if (!isset($tables[$type])) {
            respond(false, array('error' => 'Invalid content type.'));
        }
        $stmt = getDb()->prepare('DELETE FROM `' . $tables[$type] . '` WHERE id = ? AND user_id = ?');
        $stmt->execute(array($id, $ownerId));
        audit_log($type . ' deleted', bodyStr('title', (string)$id));
        respond(true);
    }

    if ($action === 'set-role') {
        $admin = requireAdmin();
        $userId = bodyStr('userId');
        $role = bodyStr('role');
        if (!in_array($role, array('user', 'admin'), true)) {
            respond(false, array('error' => 'Invalid role.'));
        }
        if ($userId === $admin['id'] && $role !== 'admin') {
            respond(false, array('error' => "You can't remove your own admin access."));
        }
        $target = findUserById($userId);
        if (!$target) { respond(false, array('error' => 'No such user.')); }
        $stmt = getDb()->prepare('UPDATE users SET role = ? WHERE id = ?');
        $stmt->execute(array($role, $userId));
        audit_log('role changed', $target['email'] . ' → ' . $role);
        respond(true);
    }

    if ($action === 'bulk-set-role') {
        $admin = requireAdmin();
        $role = bodyStr('role');
        $ids = isset($body['userIds']) && is_array($body['userIds']) ? $body['userIds'] : array();
        if (!in_array($role, array('user', 'admin'), true)) {
            respond(false, array('error' => 'Invalid role.'));
        }
        $changed = 0;
        $stmt = getDb()->prepare('UPDATE users SET role = ? WHERE id = ?');
        foreach ($ids as $id) {
            $id = (string)$id;
            if ($id === '' || ($id === $admin['id'] && $role !== 'admin')) { continue; }
            $stmt->execute(array($role, $id));
            $changed += $stmt->rowCount();
        }
        audit_log('bulk role change', $changed . ' account(s) → ' . $role);
        respond(true, array('changed' => $changed));
    }

    if ($action === 'set-points') {
        // Lets an admin directly correct an account's XP/streak — e.g.
        // restoring a streak lost to a bug, or seeding a demo account.
        // Bypasses dailyBonusAmount() and the once-a-day check in
        // save-data.php on purpose: this is an override, not a claim.
        requireAdmin();
        $userId = bodyStr('userId');
        if ($userId === '') {
            respond(false, array('error' => 'Missing userId.'));
        }
        $target = findUserById($userId);
        if (!$target) {
            respond(false, array('error' => 'No such user.'));
        }

        $db = getDb();
        $stmt = $db->prepare('SELECT total, streak, last_claim_date FROM `points` WHERE user_id = ?');
        $stmt->execute(array($userId));
        $current = $stmt->fetch();
        $currentTotal = $current ? (int)$current['total'] : 0;
        $currentStreak = $current ? (int)$current['streak'] : 0;
        $currentLastClaim = $current ? $current['last_claim_date'] : null;

        // Every field is optional — send only what you want to change.
        $total = array_key_exists('total', $body) ? max(0, (int)$body['total']) : $currentTotal;
        $streak = array_key_exists('streak', $body) ? max(0, (int)$body['streak']) : $currentStreak;
        $lastClaimDate = array_key_exists('lastClaimDate', $body)
            ? (($body['lastClaimDate'] === null || $body['lastClaimDate'] === '') ? null : (string)$body['lastClaimDate'])
            : $currentLastClaim;
        if ($lastClaimDate !== null && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $lastClaimDate)) {
            respond(false, array('error' => 'Last claim date must look like YYYY-MM-DD.'));
        }

        $db->prepare(
            "INSERT INTO `points` (user_id, total, streak, last_claim_date) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE total = ?, streak = ?, last_claim_date = ?"
        )->execute(array($userId, $total, $streak, $lastClaimDate, $total, $streak, $lastClaimDate));

        audit_log('points set', $target['email'] . ': ' . $total . ' XP, streak ' . $streak);
        respond(true, array('points' => array('total' => $total, 'streak' => $streak, 'lastClaimDate' => $lastClaimDate)));
    }

    if ($action === 'reset-password') {
        requireAdmin();
        $userId = bodyStr('userId');
        $password = bodyStr('password');
        $target = $userId !== '' ? findUserById($userId) : null;
        if (!$target) { respond(false, array('error' => 'No such user.')); }
        if (strlen($password) < 8) { respond(false, array('error' => 'Password must be at least 8 characters.')); }
        $stmt = getDb()->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $stmt->execute(array(password_hash($password, PASSWORD_DEFAULT), $userId));
        login_clear_failures($target['email']); // let them try the new password straight away
        audit_log('password reset', $target['email']);
        respond(true);
    }

    if ($action === 'delete-user') {
        $admin = requireAdmin();
        $userId = bodyStr('userId');
        if ($userId === $admin['id']) {
            respond(false, array('error' => "You can't delete your own account from here."));
        }
        $target = findUserById($userId);
        if (!$target) { respond(false, array('error' => 'No such user.')); }
        // ON DELETE CASCADE (see the schema and database/points-migration.sql)
        // removes that user's projects/notes/snippets/points with the row.
        $stmt = getDb()->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute(array($userId));
        try { // the gdrive_links table may not have a cascade foreign key
            getDb()->prepare('DELETE FROM `gdrive_links` WHERE user_id = ?')->execute(array($userId));
        } catch (PDOException $e) { /* table not created yet */ }
        audit_log('user deleted', $target['email']);
        respond(true);
    }

    if ($action === 'bulk-delete') {
        $admin = requireAdmin();
        $type = bodyStr('type');
        $items = isset($body['items']) && is_array($body['items']) ? $body['items'] : array();
        $db = getDb();
        $deleted = 0;

        $db->beginTransaction();
        try {
            if ($type === 'user') {
                $stmt = $db->prepare('DELETE FROM users WHERE id = ?');
                foreach ($items as $id) {
                    $id = (string)$id;
                    if ($id === '' || $id === $admin['id']) { continue; } // never delete yourself
                    $stmt->execute(array($id));
                    $deleted += $stmt->rowCount();
                    try { $db->prepare('DELETE FROM `gdrive_links` WHERE user_id = ?')->execute(array($id)); }
                    catch (PDOException $e) { /* table not created yet */ }
                }
            } else {
                $tables = array('project' => 'projects', 'note' => 'notes', 'snippet' => 'snippets');
                if (!isset($tables[$type])) {
                    $db->rollBack();
                    respond(false, array('error' => 'Invalid content type.'));
                }
                $stmt = $db->prepare('DELETE FROM `' . $tables[$type] . '` WHERE id = ? AND user_id = ?');
                foreach ($items as $item) {
                    if (!is_array($item) || !isset($item['id']) || empty($item['userId'])) { continue; }
                    $stmt->execute(array($item['id'], (string)$item['userId']));
                    $deleted += $stmt->rowCount();
                }
            }
            $db->commit();
        } catch (PDOException $e) {
            if ($db->inTransaction()) { $db->rollBack(); }
            throw $e;
        }
        audit_log('bulk delete', $deleted . ' ' . $type . ($deleted === 1 ? '' : 's') . ' removed');
        respond(true, array('deleted' => $deleted));
    }

    /* ---- Google connection (Integrations → Google Drive) -------------- */

    if ($action === 'google-save') {
        $admin = requireAdmin();
        $eff = google_settings();
        $enabled = !empty($body['enabled']);
        $clientId = trim(bodyStr('clientId'));
        $secretIn = trim(bodyStr('clientSecret'));
        // People often paste the full redirect URI here; keep only the folder address.
        $baseUrl = rtrim(preg_replace('#/(gdrive|oauth|index|admin-dashboard)\.php.*$#i', '', trim(bodyStr('baseUrl'))), '/');
        $keep = max(1, min(50, (int)bodyStr('keepBackups', '10')));
        $mins = max(1, min(1440, (int)bodyStr('autoMinMinutes', '10')));
        $useSignin = !empty($body['useForSignin']);

        if ($clientId !== '' && !preg_match('/^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/', $clientId)) {
            respond(false, array('error' => 'The client ID should end with .apps.googleusercontent.com — copy it from Google Cloud Console → Credentials.'));
        }
        if ($secretIn !== '' && (strlen($secretIn) < 8 || strlen($secretIn) > 200 || preg_match('/\s/', $secretIn))) {
            respond(false, array('error' => 'That client secret doesn\'t look right. Paste it exactly as Google shows it, without spaces.'));
        }
        if ($baseUrl !== '') {
            $parts = parse_url($baseUrl);
            if (!filter_var($baseUrl, FILTER_VALIDATE_URL) || !$parts || !isset($parts['scheme'], $parts['host'])
                || !in_array(strtolower($parts['scheme']), array('http', 'https'), true) || isset($parts['query']) || isset($parts['fragment'])) {
                respond(false, array('error' => 'Enter the site address like https://your-domain.com/A-CodePlayground (no ? or #).'));
            }
        }
        $secret = $secretIn !== '' ? $secretIn : $eff['client_secret']; // blank = keep the saved secret
        if ($enabled && ($clientId === '' || $secret === '' || $baseUrl === '')) {
            respond(false, array('error' => 'Fill in the client ID, client secret and site address before switching Google Drive on.'));
        }

        try {
            $record = array(
                'enabled' => $enabled,
                'client_id' => $clientId,
                'client_secret_enc' => $secret !== '' ? google_encrypt($secret) : '',
                'base_url' => $baseUrl,
                'use_for_signin' => $useSignin,
                'keep_backups' => $keep,
                'auto_min_minutes' => $mins,
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $admin['email'],
            );
        } catch (RuntimeException $e) {
            respond(false, array('error' => $e->getMessage()));
        }
        if (!google_settings_save($record)) {
            respond(false, array('error' => 'Could not write data/.security/google-settings.json — make sure the data folder is writable.'));
        }
        audit_log('google settings saved', ($enabled ? 'Drive backup on' : 'Drive backup off') . ' · ' . ($clientId !== '' ? 'client ' . substr($clientId, 0, 14) . '…' : 'no client ID') . ($secretIn !== '' ? ' · secret updated' : ''));
        respond(true);
    }

    if ($action === 'google-clear') {
        requireAdmin();
        if (!google_settings_clear()) {
            respond(false, array('error' => 'Could not remove data/.security/google-settings.json.'));
        }
        audit_log('google settings removed', 'Dashboard settings cleared — falling back to core/config.php');
        respond(true);
    }

    if ($action === 'google-test') {
        requireAdmin();
        $s = google_settings();
        $checks = array();
        $curl = function_exists('curl_init');
        $ssl = function_exists('openssl_encrypt');
        $checks[] = array('id' => 'curl', 'label' => 'PHP cURL extension', 'status' => $curl ? 'ok' : 'bad',
            'detail' => $curl ? 'Available — the server can talk to Google.' : 'Missing. Enable extension=curl in php.ini and restart Apache.');
        $checks[] = array('id' => 'openssl', 'label' => 'PHP OpenSSL extension', 'status' => $ssl ? 'ok' : 'bad',
            'detail' => $ssl ? 'Available — tokens and the secret are stored encrypted.' : 'Missing. Enable extension=openssl in php.ini and restart Apache.');
        try {
            google_key();
            $checks[] = array('id' => 'key', 'label' => 'Encryption key', 'status' => 'ok', 'detail' => 'data/.security/gdrive.key is present and readable.');
        } catch (RuntimeException $e) {
            $checks[] = array('id' => 'key', 'label' => 'Encryption key', 'status' => 'bad', 'detail' => $e->getMessage());
        }
        if ($s['secret_error']) {
            $checks[] = array('id' => 'secret', 'label' => 'Stored client secret', 'status' => 'bad', 'detail' => 'The saved secret can\'t be decrypted (the key file changed). Enter the client secret again and save.');
        }
        if ($s['base_url'] === '') {
            $checks[] = array('id' => 'base', 'label' => 'Site address', 'status' => 'bad', 'detail' => 'No site address set. Google needs it to build the redirect URI.');
        } else {
            $p = parse_url($s['base_url']);
            $local = $p && isset($p['host']) && in_array(strtolower($p['host']), array('localhost', '127.0.0.1', '[::1]'), true);
            $https = $p && isset($p['scheme']) && strtolower($p['scheme']) === 'https';
            $checks[] = array('id' => 'base', 'label' => 'Site address', 'status' => ($https || $local) ? 'ok' : 'warn',
                'detail' => ($https || $local) ? $s['base_url'] : 'Google only accepts plain-HTTP redirect URIs for localhost. Use https:// for a real domain.');
        }
        if ($s['client_id'] === '' || $s['client_secret'] === '') {
            $checks[] = array('id' => 'creds', 'label' => 'Google credentials', 'status' => 'bad', 'detail' => 'Enter and save a client ID and client secret first.');
        } elseif ($curl) {
            $probe = google_probe_credentials($s['client_id'], $s['client_secret'], $s['base_url'] . '/gdrive.php');
            $checks[] = array('id' => 'creds', 'label' => 'Google accepts the credentials', 'status' => $probe['state'], 'detail' => $probe['detail']);
        }
        $checks[] = array('id' => 'redirect', 'label' => 'Redirect URIs (check in Google Console)', 'status' => 'info',
            'detail' => 'Google only lets you register these in its console, so they can\'t be verified from here. Add ' . ($s['base_url'] !== '' ? $s['base_url'] : 'your site') . '/gdrive.php' . ($s['use_for_signin'] ? ' and /oauth.php?provider=google' : '') . '.');
        $bad = 0; foreach ($checks as $c) { if ($c['status'] === 'bad') { $bad++; } }
        audit_log('google connection tested', $bad ? $bad . ' problem(s) found' : 'All checks passed', $bad === 0);
        respond(true, array('checks' => $checks, 'passed' => $bad === 0, 'testedAt' => time()));
    }

    if ($action === 'google-disconnect-user') {
        requireAdmin();
        $userId = bodyStr('userId');
        $target = $userId !== '' ? findUserById($userId) : null;
        $db = getDb();
        try {
            $stmt = $db->prepare('SELECT refresh_token_enc FROM `gdrive_links` WHERE user_id = ?');
            $stmt->execute(array($userId));
            $row = $stmt->fetch();
            if (!$row) { respond(false, array('error' => 'That account has no Google Drive link.')); }
            google_revoke_encrypted($row['refresh_token_enc']); // best effort; Drive files are left alone
            $db->prepare('DELETE FROM `gdrive_links` WHERE user_id = ?')->execute(array($userId));
        } catch (PDOException $e) {
            respond(false, array('error' => 'That account has no Google Drive link.'));
        }
        audit_log('drive disconnected', $target ? $target['email'] : $userId);
        respond(true);
    }

    if ($action === 'google-disconnect-all') {
        requireAdmin();
        $db = getDb();
        $count = 0;
        try {
            $rows = $db->query('SELECT refresh_token_enc FROM `gdrive_links`')->fetchAll();
            $count = count($rows);
            foreach (array_slice($rows, 0, 25) as $r) { google_revoke_encrypted($r['refresh_token_enc']); }
            $db->exec('DELETE FROM `gdrive_links`');
        } catch (PDOException $e) { /* table not created yet */ }
        audit_log('drive disconnected', 'All ' . $count . ' Google Drive link(s) removed');
        respond(true, array('disconnected' => $count));
    }

    /* ---- GitHub / Facebook sign-in (Integrations → Sign in with ...) --- */

    if ($action === 'oauth-save') {
        $admin = requireAdmin();
        $provider = bodyStr('provider');
        if (!in_array($provider, oauth_provider_names(), true)) { respond(false, array('error' => 'Unknown sign-in provider.')); }
        $label = oauth_provider_label($provider);
        $eff = oauth_provider_settings($provider);
        $enabled = !empty($body['enabled']);
        $clientId = trim(bodyStr('clientId'));
        $secretIn = trim(bodyStr('clientSecret'));

        if ($provider === 'github' && $clientId !== '' && !preg_match('/^[A-Za-z0-9._-]{10,64}$/', $clientId)) {
            respond(false, array('error' => 'That GitHub client ID doesn\'t look right. Copy it from GitHub → Settings → Developer settings → OAuth Apps (no spaces).'));
        }
        if ($provider === 'facebook' && $clientId !== '' && !preg_match('/^[0-9]{8,20}$/', $clientId)) {
            respond(false, array('error' => 'The Facebook App ID is a number (about 15–16 digits). Copy it from App settings → Basic.'));
        }
        if ($secretIn !== '' && (strlen($secretIn) < 8 || strlen($secretIn) > 200 || preg_match('/\s/', $secretIn))) {
            respond(false, array('error' => 'That ' . ($provider === 'facebook' ? 'App' : 'client') . ' secret doesn\'t look right. Paste it exactly as ' . $label . ' shows it, without spaces.'));
        }
        $secret = $secretIn !== '' ? $secretIn : $eff['client_secret']; // blank = keep the saved secret
        if ($enabled && ($clientId === '' || $secret === '')) {
            respond(false, array('error' => 'Fill in the ' . ($provider === 'facebook' ? 'App ID and App secret' : 'client ID and client secret') . ' before switching ' . $label . ' sign-in on.'));
        }
        if ($enabled && oauth_site_base_url() === '') {
            respond(false, array('error' => 'Set the Site address first (sidebar → Google → Site address). All sign-in providers share it.'));
        }

        try {
            $record = array(
                'enabled' => $enabled,
                'client_id' => $clientId,
                'client_secret_enc' => $secret !== '' ? google_encrypt($secret) : '',
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $admin['email'],
            );
        } catch (RuntimeException $e) {
            respond(false, array('error' => $e->getMessage()));
        }
        if (!oauth_provider_save($provider, $record)) {
            respond(false, array('error' => 'Could not write data/.security/oauth-settings.json — make sure the data folder is writable.'));
        }
        audit_log($provider . ' settings saved', ($enabled ? 'Sign-in on' : 'Sign-in off') . ' · ' . ($clientId !== '' ? 'client ' . substr($clientId, 0, 12) . '…' : 'no client ID') . ($secretIn !== '' ? ' · secret updated' : ''));
        respond(true);
    }

    if ($action === 'oauth-clear') {
        requireAdmin();
        $provider = bodyStr('provider');
        if (!in_array($provider, oauth_provider_names(), true)) { respond(false, array('error' => 'Unknown sign-in provider.')); }
        if (!oauth_provider_clear($provider)) {
            respond(false, array('error' => 'Could not update data/.security/oauth-settings.json.'));
        }
        audit_log($provider . ' settings removed', 'Dashboard settings cleared — falling back to core/config.php');
        respond(true);
    }

    if ($action === 'oauth-test') {
        requireAdmin();
        $provider = bodyStr('provider');
        if (!in_array($provider, oauth_provider_names(), true)) { respond(false, array('error' => 'Unknown sign-in provider.')); }
        $label = oauth_provider_label($provider);
        $s = oauth_provider_settings($provider);
        $base = oauth_site_base_url();
        $checks = array();
        $curl = function_exists('curl_init');
        $ssl = function_exists('openssl_encrypt');
        $checks[] = array('id' => 'curl', 'label' => 'PHP cURL extension', 'status' => $curl ? 'ok' : 'bad',
            'detail' => $curl ? 'Available — the server can talk to ' . $label . '.' : 'Missing. Enable extension=curl in php.ini and restart Apache.');
        $checks[] = array('id' => 'openssl', 'label' => 'PHP OpenSSL extension', 'status' => $ssl ? 'ok' : 'bad',
            'detail' => $ssl ? 'Available — the secret is stored encrypted.' : 'Missing. Enable extension=openssl in php.ini and restart Apache.');
        try {
            google_key();
            $checks[] = array('id' => 'key', 'label' => 'Encryption key', 'status' => 'ok', 'detail' => 'data/.security/gdrive.key is present and readable.');
        } catch (RuntimeException $e) {
            $checks[] = array('id' => 'key', 'label' => 'Encryption key', 'status' => 'bad', 'detail' => $e->getMessage());
        }
        if ($s['secret_error']) {
            $checks[] = array('id' => 'secret', 'label' => 'Stored secret', 'status' => 'bad', 'detail' => 'The saved secret can\'t be decrypted (the key file changed). Enter the secret again and save.');
        }
        if ($base === '') {
            $checks[] = array('id' => 'base', 'label' => 'Site address', 'status' => 'bad', 'detail' => 'No site address set. Save one on the Google page (sidebar); every provider uses it to build the redirect URI.');
        } else {
            $p = parse_url($base);
            $local = $p && isset($p['host']) && in_array(strtolower($p['host']), array('localhost', '127.0.0.1', '[::1]'), true);
            $https = $p && isset($p['scheme']) && strtolower($p['scheme']) === 'https';
            $checks[] = array('id' => 'base', 'label' => 'Site address', 'status' => ($https || $local) ? 'ok' : 'warn',
                'detail' => ($https || $local) ? $base : $label . ' expects https:// for a real domain (plain http is only accepted for localhost).');
        }
        if (!$s['enabled']) {
            $checks[] = array('id' => 'enabled', 'label' => 'Sign-in switch', 'status' => 'warn', 'detail' => 'Credentials are saved but ' . $label . ' sign-in is switched off, so the button shows “turned off”.');
        }
        if ($s['client_id'] === '' || $s['client_secret'] === '') {
            $checks[] = array('id' => 'creds', 'label' => $label . ' credentials', 'status' => 'bad', 'detail' => 'Enter and save the ' . ($provider === 'facebook' ? 'App ID and App secret' : 'client ID and client secret') . ' first.');
        } elseif ($curl) {
            $probe = oauth_provider_probe($provider, $s['client_id'], $s['client_secret']);
            $checks[] = array('id' => 'creds', 'label' => $label . ' accepts the credentials', 'status' => $probe['state'], 'detail' => $probe['detail']);
        }
        $redirect = oauth_provider_redirect_uri($provider, $base !== '' ? $base : 'https://your-site.example');
        $checks[] = array('id' => 'redirect', 'label' => 'Callback URL (check on ' . $label . ')', 'status' => 'info',
            'detail' => $label . ' only lets you register this on its own site, so it can\'t be verified from here. It must be exactly: ' . $redirect);
        $bad = 0; foreach ($checks as $c) { if ($c['status'] === 'bad') { $bad++; } }
        audit_log($provider . ' connection tested', $bad ? $bad . ' problem(s) found' : 'All checks passed', $bad === 0);
        respond(true, array('checks' => $checks, 'passed' => $bad === 0, 'testedAt' => time()));
    }

    /* ---- security ---------------------------------------------------- */

    if ($action === 'clear-lockout') {
        requireAdmin();
        $key = bodyStr('key');
        login_clear_failures($key);
        audit_log('lockout cleared', $key);
        respond(true);
    }

    if ($action === 'clear-all-lockouts') {
        requireAdmin();
        $cleared = 0;
        foreach (read_lockouts() as $l) {
            login_clear_failures($l['key']);
            $cleared++;
        }
        audit_log('lockouts cleared', $cleared . ' lockout(s) cleared');
        respond(true, array('cleared' => $cleared));
    }

} catch (PDOException $e) {
    error_log('admin.php database error: ' . $e->getMessage());
    respond(false, array('error' => 'Could not reach the database. Check config.php and make sure sql/a-codeplayground-schema.sql has been imported.'
        . (!empty($_SESSION['adminUnlocked']) ? ' (' . $e->getMessage() . ')' : '')));
} catch (Throwable $e) {
    error_log('admin.php error: ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    admin_report_failure(get_class($e) . ': ' . $e->getMessage() . ' @ ' . basename($e->getFile()) . ':' . $e->getLine());
    exit;
}

respond(false, array('error' => 'Unknown action'));