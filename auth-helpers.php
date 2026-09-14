<?php
/**
 * Shared account helpers for A-DevTools "Community" accounts — MySQL
 * edition. Accounts live in the `users` table (see sql/a-devtools-schema.sql)
 * instead of a JSON file. Passwords are never stored in plain text
 * (password_hash/password_verify).
 */
require_once __DIR__ . '/db.php';

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

/** Reads the logged-in user (if any) for the current session, or null. */
function currentUser() {
    if (session_status() !== PHP_SESSION_ACTIVE) { session_start(); }
    if (empty($_SESSION['userId'])) { return null; }
    $user = findUserById($_SESSION['userId']);
    if (!$user) {
        // Session points at a user that no longer exists.
        unset($_SESSION['userId']);
        return null;
    }
    return publicUser($user);
}
