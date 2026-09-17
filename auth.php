<?php
/**
 * Community account endpoint — register / login / logout.
 * Accounts are stored in MySQL (see sql/a-devtools-schema.sql and config.php).
 */
require_once __DIR__ . '/core/security.php';
adevtools_start_session();
adevtools_security_headers();
header('Content-Type: application/json');
require_once __DIR__ . '/core/auth-helpers.php';

function respond($ok, $extra = array()) {
    echo json_encode(array_merge(array('ok' => $ok), $extra));
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) { $body = array(); }
$action = isset($body['action']) ? $body['action'] : (isset($_GET['action']) ? $_GET['action'] : null);

// whoami is a read-only check and safe without a CSRF token (no state
// changes); every other action here changes session/account state.
if ($action !== 'whoami' && !csrf_verify(isset($body['csrf']) ? $body['csrf'] : null)) {
    respond(false, array('error' => 'Your session expired. Please refresh the page and try again.'));
}

try {

    if ($action === 'whoami') {
        respond(true, array('user' => currentUser()));
    }

    if ($action === 'register') {
        $name = trim((string)(isset($body['name']) ? $body['name'] : ''));
        $email = trim((string)(isset($body['email']) ? $body['email'] : ''));
        $password = (string)(isset($body['password']) ? $body['password'] : '');

        if ($name === '' || $email === '' || $password === '') {
            respond(false, array('error' => 'Please fill in your name, email and password.'));
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(false, array('error' => 'That email address doesn\'t look right.'));
        }
        if (strlen($password) < 6) {
            respond(false, array('error' => 'Password needs to be at least 6 characters.'));
        }
        if (findUserByEmail($email)) {
            respond(false, array('error' => 'An account with that email already exists. Try logging in instead.'));
        }

        $user = insertUser($name, $email, password_hash($password, PASSWORD_DEFAULT));
        session_regenerate_id(true); // fresh session ID on privilege change — blocks session fixation
        $_SESSION['userId'] = $user['id'];
        respond(true, array('user' => publicUser($user)));
    }

    if ($action === 'login') {
        $email = trim((string)(isset($body['email']) ? $body['email'] : ''));
        $password = (string)(isset($body['password']) ? $body['password'] : '');

        if (login_is_locked($email)) {
            $wait = max(1, ceil(login_locked_seconds($email) / 60));
            respond(false, array('error' => 'Too many failed attempts. Try again in about ' . $wait . ' minute(s).'));
        }

        $user = findUserByEmail($email);
        if (!$user || !password_verify($password, $user['password_hash'])) {
            login_register_failure($email);
            respond(false, array('error' => 'Email or password is incorrect.'));
        }

        login_clear_failures($email);
        session_regenerate_id(true); // fresh session ID on privilege change — blocks session fixation
        $_SESSION['userId'] = $user['id'];
        respond(true, array('user' => publicUser($user)));
    }

    if ($action === 'logout') {
        unset($_SESSION['userId']);
        session_destroy();
        respond(true);
    }

    // Edit Profile (account dropdown) — updates name/email, and optionally
    // the password when both currentPassword and newPassword are supplied.
    if ($action === 'update-profile') {
        $me = currentUser();
        if (!$me) {
            respond(false, array('error' => 'You need to be logged in.'));
        }
        $raw = findUserById($me['id']);
        if (!$raw) {
            respond(false, array('error' => 'Account not found.'));
        }

        $name = trim((string)(isset($body['name']) ? $body['name'] : ''));
        $email = trim((string)(isset($body['email']) ? $body['email'] : ''));
        $currentPassword = (string)(isset($body['currentPassword']) ? $body['currentPassword'] : '');
        $newPassword = (string)(isset($body['newPassword']) ? $body['newPassword'] : '');

        if ($name === '' || $email === '') {
            respond(false, array('error' => 'Name and email cannot be empty.'));
        }
        if (mb_strlen($name) > 80) {
            respond(false, array('error' => 'Name is too long.'));
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(false, array('error' => 'That email address doesn\'t look right.'));
        }
        if (strcasecmp($email, $raw['email']) !== 0) {
            $existing = findUserByEmail($email);
            if ($existing && $existing['id'] !== $raw['id']) {
                respond(false, array('error' => 'Another account already uses that email.'));
            }
        }

        $passwordHash = $raw['password_hash'];
        if ($newPassword !== '') {
            if (empty($raw['password_hash'])) {
                respond(false, array('error' => 'This account signs in via OAuth and has no password to change.'));
            }
            if (!password_verify($currentPassword, $raw['password_hash'])) {
                respond(false, array('error' => 'Current password is incorrect.'));
            }
            if (strlen($newPassword) < 6) {
                respond(false, array('error' => 'New password needs to be at least 6 characters.'));
            }
            $passwordHash = password_hash($newPassword, PASSWORD_DEFAULT);
        }

        $stmt = getDb()->prepare('UPDATE users SET name = ?, email = ?, password_hash = ? WHERE id = ?');
        $stmt->execute(array($name, $email, $passwordHash, $raw['id']));

        respond(true, array('user' => publicUser(findUserById($raw['id']))));
    }

} catch (PDOException $e) {
    respond(false, array('error' => 'Could not reach the database. Check config.php and make sure sql/a-devtools-schema.sql has been imported.'));
}

respond(false, array('error' => 'Unknown action'));
