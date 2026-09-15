<?php
/**
 * Shared account helpers for A-DevTools "Community" accounts — MySQL
 * edition. Accounts live in the `users` table (see sql/a-devtools-schema.sql)
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
    );
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

/** Reads the logged-in user (if any) for the current session, or null. */
function currentUser() {
    adevtools_start_session();
    if (empty($_SESSION['userId'])) { return null; }
    $user = findUserById($_SESSION['userId']);
    if (!$user) {
        // Session points at a user that no longer exists.
        unset($_SESSION['userId']);
        return null;
    }
    return publicUser($user);
}
