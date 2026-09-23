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

/**
 * Allowed mastery levels for a skill entry — shared by publicUser() (reading)
 * and auth.php's update-profile action (writing), so the two can never drift.
 */
function profileSkillLevels() {
    return array('beginner', 'intermediate', 'advanced', 'expert');
}

/**
 * Parses the `skills` column's JSON into a clean array of
 * {name, level} pairs, dropping anything malformed rather than failing —
 * a hand-edited or half-written row should never break the profile modal.
 */
function decodeUserSkills($raw) {
    if (empty($raw)) { return array(); }
    $decoded = json_decode($raw, true);
    if (!is_array($decoded)) { return array(); }
    $levels = profileSkillLevels();
    $clean = array();
    foreach ($decoded as $s) {
        if (!is_array($s)) { continue; }
        $name = isset($s['name']) ? trim((string)$s['name']) : '';
        if ($name === '') { continue; }
        $level = isset($s['level']) ? trim((string)$s['level']) : '';
        if (!in_array($level, $levels, true)) { $level = 'intermediate'; }
        $clean[] = array('name' => $name, 'level' => $level);
    }
    return $clean;
}

/**
 * Joins the four Address/Barangay/City/Country parts into one
 * human-readable string ("123 Sample St, Barangay Commonwealth, Quezon
 * City, Philippines"), skipping any part that's empty. Used both when
 * saving (so the `location` column stays useful for simple listing/search
 * without needing to reassemble it) and when reading (so the display
 * string always matches the four fields, never a stale saved copy).
 */
function composeLocation($address, $barangay, $city, $country) {
    $parts = array();
    foreach (array($address, $barangay, $city, $country) as $p) {
        $p = trim((string)$p);
        if ($p !== '') { $parts[] = $p; }
    }
    return implode(', ', $parts);
}

/**
 * Joins First/Middle/Last name parts into the one freeform `name` string
 * every other page (admin dashboard, project/snippet ownership, etc.)
 * still reads for display — so those pages never need to know the name
 * is now edited as three separate fields. Blank parts are skipped.
 */
function composeFullName($firstName, $middleName, $lastName) {
    $parts = array();
    foreach (array($firstName, $middleName, $lastName) as $p) {
        $p = trim((string)$p);
        if ($p !== '') { $parts[] = $p; }
    }
    return implode(' ', $parts);
}

/** Strips the password hash before a user record ever leaves the server. */
function publicUser($user) {
    if (!is_array($user)) { return null; }
    $address = isset($user['address']) ? $user['address'] : '';
    $barangay = isset($user['barangay']) ? $user['barangay'] : '';
    $city = isset($user['city']) ? $user['city'] : '';
    $country = isset($user['country']) ? $user['country'] : '';
    return array(
        'id' => $user['id'],
        'name' => $user['name'],
        // First/Middle/Last are the editable breakdown behind `name` (see
        // database/name-username-migration.sql) — `name` itself stays the
        // source of truth for every page that only wants one display string.
        'firstName' => isset($user['first_name']) ? $user['first_name'] : '',
        'middleName' => isset($user['middle_name']) ? $user['middle_name'] : '',
        'lastName' => isset($user['last_name']) ? $user['last_name'] : '',
        'username' => isset($user['username']) ? $user['username'] : '',
        'email' => $user['email'],
        'joinedAt' => isset($user['joined_at']) ? $user['joined_at'] : null,
        'expertiseLevel' => isset($user['expertise_level']) ? $user['expertise_level'] : null,
        'role' => isset($user['role']) ? $user['role'] : 'user',
        // Optional "About" fields — all blank until the person fills them in
        // from Edit Profile (see database/profile-details-migration.sql and
        // database/profile-address-migration.sql).
        'bio' => isset($user['bio']) ? $user['bio'] : '',
        'address' => $address,
        'barangay' => $barangay,
        'city' => $city,
        'country' => $country,
        'location' => composeLocation($address, $barangay, $city, $country),
        'hobbies' => isset($user['hobbies']) ? $user['hobbies'] : '',
        'skills' => decodeUserSkills(isset($user['skills']) ? $user['skills'] : null),
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

/** Case-insensitive lookup used to enforce the unique-username rule in
 *  auth.php's update-profile action. Returns null for a blank username
 *  rather than matching every other blank one. */
function findUserByUsername($username) {
    $username = trim((string)$username);
    if ($username === '') { return null; }
    $stmt = getDb()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
    $stmt->execute(array($username));
    $user = $stmt->fetch();
    return $user ? $user : null;
}

/**
 * ---------------------------------------------------------------------
 * Email-confirmed password change
 * ---------------------------------------------------------------------
 * A new password is never written to `password_hash` the moment someone
 * submits Edit Profile — it's hashed and parked in `pending_password_hash`
 * until they prove they read a one-time code sent to their registered
 * email (see database/password-change-email-migration.sql and the
 * update-profile / confirm-password-change / resend-password-change-code /
 * cancel-password-change actions in auth.php).
 */

/** How long an emailed code stays valid before the person needs a new one. */
function passwordChangeCodeTtlMinutes() {
    return 10;
}

/** Reads the 'mail' section of config.php, filling in sane defaults so
 *  callers never have to null-check it. */
function acodeplayground_mail_config() {
    static $cfg = null;
    if ($cfg !== null) { return $cfg; }
    $config = require __DIR__ . '/config.php';
    $mail = (isset($config['mail']) && is_array($config['mail'])) ? $config['mail'] : array();
    $cfg = array(
        'from_email' => !empty($mail['from_email']) ? $mail['from_email'] : 'no-reply@localhost',
        'from_name'  => !empty($mail['from_name']) ? $mail['from_name'] : 'A-Code Playground',
    );
    return $cfg;
}

/** A random 6-digit numeric code — easy to read and type back in on a
 *  phone, and short-lived enough (see passwordChangeCodeTtlMinutes) that
 *  the small keyspace isn't a practical concern. */
function generatePasswordChangeCode() {
    return str_pad((string)random_int(0, 999999), 6, '0', STR_PAD_LEFT);
}

/** The code itself is never stored — only this hash — so a leaked/backed-up
 *  database row can't be used to complete someone else's password change. */
function hashPasswordChangeCode($code) {
    return hash('sha256', (string)$code);
}

/** Emails the one-time code. Returns false (without throwing) if PHP's
 *  mail() couldn't hand the message off — callers turn that into a plain
 *  "check your mail server settings" error rather than silently pretending
 *  to have sent it. */
function sendPasswordChangeCode($toEmail, $toName, $code) {
    $mailCfg = acodeplayground_mail_config();
    $subject = 'Your password change confirmation code';
    $body = "Hi " . ($toName !== '' ? $toName : 'there') . ",\n\n"
        . "We received a request to change the password on your A-Code Playground account (" . $toEmail . ").\n\n"
        . "Confirmation code: " . $code . "\n\n"
        . "Enter this in the app to finish changing your password. It expires in "
        . passwordChangeCodeTtlMinutes() . " minutes.\n\n"
        . "If you didn't request this, you can safely ignore this email — your password will not be changed.\n";
    $headers = "From: " . $mailCfg['from_name'] . " <" . $mailCfg['from_email'] . ">\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n";
    return @mail($toEmail, $subject, $body, $headers);
}

/** Wipes any in-progress password change — used on successful
 *  confirmation, on an expired/over-guessed code, and when the person
 *  explicitly cancels. */
function clearPendingPasswordChange($userId) {
    $stmt = getDb()->prepare('UPDATE users SET pending_password_hash = NULL, password_change_code_hash = NULL, password_change_code_expires = NULL, password_change_attempts = 0, password_change_requested_at = NULL WHERE id = ?');
    $stmt->execute(array($userId));
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
