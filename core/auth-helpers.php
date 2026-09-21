<?php
/**
 * Shared account helpers for A-Code Playground "Community" accounts — MySQL
 * edition. Accounts live in the `users` table (see sql/a-codeplayground-schema.sql)
 * instead of a JSON file. Passwords are never stored in plain text
 * (password_hash/password_verify).
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/security.php';

function makeUserId() {
    return 'u_' . bin2hex(random_bytes(8));
}

/** Strips the password hash before a user record ever leaves the server. */
function publicUser($user) {
    if (!is_array($user)) { return null; }
    return array(
        'id' => $user['id'],
        'name' => $user['name'],
        'email' => $user['email'],
        'joinedAt' => isset($user['joined_at']) ? $user['joined_at'] : null,
        'expertiseLevel' => isset($user['expertise_level']) ? $user['expertise_level'] : null,
        'role' => isset($user['role']) ? $user['role'] : 'user',
    );
}

/** True if the given (public or raw) user record has the admin role. */
function isAdmin($user) {
    return is_array($user) && isset($user['role']) && $user['role'] === 'admin';
}

function findUserByEmail($email) {
    $stmt = getDb()->prepare('SELECT * FROM users WHERE email = ? LIMIT 1');
    $stmt->execute(array(trim((string)$email)));
    $user = $stmt->fetch();
    return $user ? $user : null;
}

function findUserById($id) {
    $stmt = getDb()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
    $stmt->execute(array($id));
    $user = $stmt->fetch();
    return $user ? $user : null;
}

function insertUser($name, $email, $passwordHash) {
    $id = makeUserId();
    $stmt = getDb()->prepare('INSERT INTO users (id, name, email, password_hash) VALUES (?, ?, ?, ?)');
    $stmt->execute(array($id, $name, trim((string)$email), $passwordHash));
    return findUserById($id);
}

function findUserByOAuth($provider, $oauthId) {
    $stmt = getDb()->prepare('SELECT * FROM users WHERE oauth_provider = ? AND oauth_id = ? LIMIT 1');
    $stmt->execute(array($provider, $oauthId));
    $user = $stmt->fetch();
    return $user ? $user : null;
}

/**
 * Finds the account for a "Sign in with..." callback, creating one if
 * needed. If an email/password account already exists with the same
 * email, the provider is linked onto that existing account instead of
 * creating a duplicate — so someone who signed up with a password can
 * later use "Sign in with Google" (same email) and land on the same
 * account.
 */
function findOrCreateOAuthUser($provider, $oauthId, $name, $email) {
    $existing = findUserByOAuth($provider, $oauthId);
    if ($existing) { return $existing; }

    $email = trim((string)$email);
    if ($email !== '') {
        $byEmail = findUserByEmail($email);
        if ($byEmail) {
            $stmt = getDb()->prepare('UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ? AND oauth_provider IS NULL');
            $stmt->execute(array($provider, $oauthId, $byEmail['id']));
            return findUserById($byEmail['id']);
        }
    }

    $id = makeUserId();
    // OAuth-only accounts may not have a usable email (e.g. GitHub users can
    // keep theirs private) — fall back to a unique placeholder so the
    // `email` column (NOT NULL + unique) stays satisfied.
    $storedEmail = $email !== '' ? $email : ($provider . '_' . $oauthId . '@users.noemail');
    $stmt = getDb()->prepare('INSERT INTO users (id, name, email, password_hash, oauth_provider, oauth_id) VALUES (?, ?, ?, NULL, ?, ?)');
    $stmt->execute(array($id, $name !== '' ? $name : ucfirst($provider) . ' user', $storedEmail, $provider, $oauthId));
    return findUserById($id);
}

/**
 * Reads an account's XP total / rank streak / last daily-bonus claim
 * date from the `points` table (see database/points-migration.sql).
 * Returns zeroed defaults both for a brand-new account (no row yet) and
 * for an install that hasn't run that migration yet, so a missing table
 * never breaks the page — it just means nobody has any XP on record.
 */
function getUserPoints($userId) {
    try {
        $stmt = getDb()->prepare('SELECT total, streak, last_claim_date FROM points WHERE user_id = ?');
        $stmt->execute(array($userId));
        $row = $stmt->fetch();
    } catch (PDOException $e) {
        $row = false;
    }
    if (!$row) {
        return array('total' => 0, 'streak' => 0, 'lastClaimDate' => null);
    }
    return array(
        'total' => (int)$row['total'],
        'streak' => (int)$row['streak'],
        'lastClaimDate' => $row['last_claim_date'],
    );
}

/**
 * Whether Google Drive backup is set up on this server and linked for this
 * account, for index.php to hand to the browser (see gdrive.php). Never
 * throws — the gdrive_links table may not exist yet on an older install.
 */
function getGdriveSummary($userId) {
    require_once __DIR__ . '/google.php';
    $gs = google_settings(); // dashboard-managed settings, falling back to config.php
    $configured = google_is_configured($gs);
    $summary = array('configured' => $configured, 'connected' => false, 'auto' => false,
        'disabled' => (!$gs['enabled'] && $gs['client_id'] !== ''));
    if (!$configured) { return $summary; }
    try {
        $stmt = getDb()->prepare('SELECT auto_sync FROM gdrive_links WHERE user_id = ?');
        $stmt->execute(array($userId));
        $row = $stmt->fetch();
        if ($row) { $summary['connected'] = true; $summary['auto'] = ((int)$row['auto_sync'] === 1); }
    } catch (PDOException $e) { /* table not created yet */ }
    return $summary;
}

/** Reads the logged-in user (if any) for the current session, or null. */
function currentUser() {
    acodeplayground_start_session();
    if (empty($_SESSION['userId'])) { return null; }
    $user = findUserById($_SESSION['userId']);
    if (!$user) {
        // Session points at a user that no longer exists.
        unset($_SESSION['userId']);
        return null;
    }
    return publicUser($user);
}

/**
 * ---------------------------------------------------------------------
 * Admin Control session helpers (used by admin.php and admin-dashboard.php)
 * ---------------------------------------------------------------------
 * The admin unlock is a separate session flag from the normal Community
 * login ($_SESSION['userId']). It now also expires after a period of
 * inactivity (ADMIN_IDLE_TIMEOUT seconds, default 20 minutes — kept below
 * PHP's default 24-minute session garbage-collection window).
 */
if (!defined('ADMIN_IDLE_TIMEOUT')) { define('ADMIN_IDLE_TIMEOUT', 1200); }

function adminSessionClear() {
    unset($_SESSION['adminUnlocked'], $_SESSION['adminUserId'], $_SESSION['adminLastSeen'], $_SESSION['adminUnlockedAt']);
}

/**
 * The raw admin user row unlocked in this session, or null. Pass
 * $touch = false for background polling that must NOT count as activity
 * (so an open-but-idle dashboard still times out).
 */
function adminSessionUser($touch = true) {
    acodeplayground_start_session();
    if (empty($_SESSION['adminUnlocked']) || empty($_SESSION['adminUserId'])) { return null; }
    $last = isset($_SESSION['adminLastSeen']) ? (int)$_SESSION['adminLastSeen'] : 0;
    if ($last > 0 && (time() - $last) > ADMIN_IDLE_TIMEOUT) {
        adminSessionClear();
        return null;
    }
    $raw = findUserById($_SESSION['adminUserId']);
    if (!$raw || !isAdmin($raw)) {
        // Role was revoked (or the account was deleted) after unlocking.
        adminSessionClear();
        return null;
    }
    if ($touch) { $_SESSION['adminLastSeen'] = time(); }
    return $raw;
}

/** Seconds until the admin session expires from inactivity (0 if locked). */
function adminSessionSecondsLeft() {
    if (empty($_SESSION['adminUnlocked'])) { return 0; }
    $last = isset($_SESSION['adminLastSeen']) ? (int)$_SESSION['adminLastSeen'] : time();
    return max(0, ADMIN_IDLE_TIMEOUT - (time() - $last));
}
