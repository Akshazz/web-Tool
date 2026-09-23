<?php
/**
 * Community account endpoint — register / login / logout.
 * Accounts are stored in MySQL (see sql/a-codeplayground-schema.sql and config.php).
 */
require_once __DIR__ . '/core/security.php';
acodeplayground_start_session();
acodeplayground_security_headers();
header('Content-Type: application/json');
require_once __DIR__ . '/core/auth-helpers.php';
require_once __DIR__ . '/core/access-settings.php';

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
        respond(true, array('user' => currentUser(), 'access' => access_settings()));
    }

    if ($action === 'register') {
        $access = access_settings();
        if (!$access['signupEnabled']) {
            respond(false, array('error' => access_unavailable_message('signup'), 'accessDisabled' => true));
        }
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
        $access = access_settings();
        if (!$access['signinEnabled']) {
            respond(false, array('error' => access_unavailable_message('signin'), 'accessDisabled' => true));
        }
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

        // The registered email never changes here — the Edit Profile form
        // shows it disabled, and the server ignores whatever it's sent
        // rather than trusting the client to keep it untouched.
        $email = $raw['email'];
        $firstName = trim((string)(isset($body['firstName']) ? $body['firstName'] : ''));
        $middleName = trim((string)(isset($body['middleName']) ? $body['middleName'] : ''));
        $lastName = trim((string)(isset($body['lastName']) ? $body['lastName'] : ''));
        $username = trim((string)(isset($body['username']) ? $body['username'] : ''));
        $currentPassword = (string)(isset($body['currentPassword']) ? $body['currentPassword'] : '');
        $newPassword = (string)(isset($body['newPassword']) ? $body['newPassword'] : '');
        // "About" fields are all optional — an empty value just clears them.
        $bio = trim((string)(isset($body['bio']) ? $body['bio'] : ''));
        $address = trim((string)(isset($body['address']) ? $body['address'] : ''));
        $barangay = trim((string)(isset($body['barangay']) ? $body['barangay'] : ''));
        $city = trim((string)(isset($body['city']) ? $body['city'] : ''));
        $country = trim((string)(isset($body['country']) ? $body['country'] : ''));
        $hobbies = trim((string)(isset($body['hobbies']) ? $body['hobbies'] : ''));
        $skillsInput = (isset($body['skills']) && is_array($body['skills'])) ? $body['skills'] : array();

        if ($firstName === '' || $lastName === '') {
            respond(false, array('error' => 'First name and last name cannot be empty.'));
        }
        if (mb_strlen($firstName) > 80) {
            respond(false, array('error' => 'First name is too long.'));
        }
        if (mb_strlen($middleName) > 80) {
            respond(false, array('error' => 'Middle name is too long.'));
        }
        if (mb_strlen($lastName) > 80) {
            respond(false, array('error' => 'Last name is too long.'));
        }
        if ($username !== '') {
            if (!preg_match('/^[a-zA-Z0-9_.]{3,30}$/', $username)) {
                respond(false, array('error' => 'Username can only use letters, numbers, "_" and ".", and needs to be 3–30 characters.'));
            }
            $existing = findUserByUsername($username);
            if ($existing && $existing['id'] !== $raw['id']) {
                respond(false, array('error' => 'That username is already taken.'));
            }
        }
        $name = composeFullName($firstName, $middleName, $lastName);
        if (mb_strlen($bio) > 280) {
            respond(false, array('error' => 'Bio needs to be 280 characters or fewer.'));
        }
        if (mb_strlen($address) > 190) {
            respond(false, array('error' => 'Address needs to be 190 characters or fewer.'));
        }
        if (mb_strlen($barangay) > 120) {
            respond(false, array('error' => 'Barangay needs to be 120 characters or fewer.'));
        }
        if (mb_strlen($city) > 120) {
            respond(false, array('error' => 'City needs to be 120 characters or fewer.'));
        }
        if (mb_strlen($country) > 80) {
            respond(false, array('error' => 'Country needs to be 80 characters or fewer.'));
        }
        if (mb_strlen($hobbies) > 255) {
            respond(false, array('error' => 'Hobbies need to be 255 characters or fewer — try shortening the list.'));
        }

        // Skills come in as [{name, level}, ...]; keep only well-formed
        // entries (a bad row from the client is dropped, not fatal) and cap
        // the count so nobody can pad the column with an unbounded list.
        $skillLevels = profileSkillLevels();
        $skills = array();
        foreach ($skillsInput as $s) {
            if (count($skills) >= 25) { break; }
            if (!is_array($s)) { continue; }
            $skillName = trim((string)(isset($s['name']) ? $s['name'] : ''));
            if ($skillName === '') { continue; }
            if (mb_strlen($skillName) > 40) {
                respond(false, array('error' => 'Skill names need to be 40 characters or fewer.'));
            }
            $skillLevel = trim((string)(isset($s['level']) ? $s['level'] : 'intermediate'));
            if (!in_array($skillLevel, $skillLevels, true)) { $skillLevel = 'intermediate'; }
            $skills[] = array('name' => $skillName, 'level' => $skillLevel);
        }
        $skillsJson = empty($skills) ? null : json_encode($skills);

        // The new password is NOT written to password_hash here — it's
        // hashed and parked in pending_password_hash until the person
        // confirms the code we email them (confirm-password-change below).
        // password_hash itself is left exactly as it was.
        $passwordHash = $raw['password_hash'];
        $passwordChangePending = false;
        $passwordChangeError = null;
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
            $pendingHash = password_hash($newPassword, PASSWORD_DEFAULT);
            $code = generatePasswordChangeCode();
            if (sendPasswordChangeCode($raw['email'], $name, $code)) {
                $stmt = getDb()->prepare('UPDATE users SET pending_password_hash = ?, password_change_code_hash = ?, password_change_code_expires = DATE_ADD(NOW(), INTERVAL ' . (int)passwordChangeCodeTtlMinutes() . ' MINUTE), password_change_attempts = 0, password_change_requested_at = NOW() WHERE id = ?');
                $stmt->execute(array($pendingHash, hashPasswordChangeCode($code), $raw['id']));
                $passwordChangePending = true;
            } else {
                $passwordChangeError = 'Could not send the confirmation email — check the mail settings in core/config.php. Your password was not changed; everything else below was still saved.';
            }
        }

        $stmt = getDb()->prepare('UPDATE users SET name = ?, first_name = ?, middle_name = ?, last_name = ?, username = ?, password_hash = ?, bio = ?, location = ?, address = ?, barangay = ?, city = ?, country = ?, hobbies = ?, skills = ? WHERE id = ?');
        $stmt->execute(array(
            $name,
            $firstName,
            $middleName !== '' ? $middleName : null,
            $lastName,
            $username !== '' ? $username : null,
            $passwordHash,
            $bio !== '' ? $bio : null,
            composeLocation($address, $barangay, $city, $country) ?: null,
            $address !== '' ? $address : null,
            $barangay !== '' ? $barangay : null,
            $city !== '' ? $city : null,
            $country !== '' ? $country : null,
            $hobbies !== '' ? $hobbies : null,
            $skillsJson,
            $raw['id'],
        ));

        $extra = array('user' => publicUser(findUserById($raw['id'])));
        if ($passwordChangePending) { $extra['passwordChangePending'] = true; }
        if ($passwordChangeError !== null) { $extra['passwordChangeError'] = $passwordChangeError; }
        respond(true, $extra);
    }

    // Step 2 of a password change — checks the code emailed by
    // update-profile and only then promotes pending_password_hash into
    // the real password_hash column.
    if ($action === 'confirm-password-change') {
        $me = currentUser();
        if (!$me) {
            respond(false, array('error' => 'You need to be logged in.'));
        }
        $raw = findUserById($me['id']);
        if (!$raw) {
            respond(false, array('error' => 'Account not found.'));
        }
        $code = trim((string)(isset($body['code']) ? $body['code'] : ''));
        if ($code === '') {
            respond(false, array('error' => 'Enter the code we emailed you.'));
        }
        if (empty($raw['pending_password_hash']) || empty($raw['password_change_code_hash'])) {
            respond(false, array('error' => 'No password change is waiting for confirmation. Start again from Edit Profile.'));
        }
        if (empty($raw['password_change_code_expires']) || strtotime($raw['password_change_code_expires']) < time()) {
            clearPendingPasswordChange($raw['id']);
            respond(false, array('error' => 'That code has expired. Please request a new one.'));
        }
        if ((int)$raw['password_change_attempts'] >= 5) {
            clearPendingPasswordChange($raw['id']);
            respond(false, array('error' => 'Too many incorrect attempts. Please request a new code.'));
        }
        if (!hash_equals($raw['password_change_code_hash'], hashPasswordChangeCode($code))) {
            $stmt = getDb()->prepare('UPDATE users SET password_change_attempts = password_change_attempts + 1 WHERE id = ?');
            $stmt->execute(array($raw['id']));
            respond(false, array('error' => 'That code is incorrect.'));
        }
        $stmt = getDb()->prepare('UPDATE users SET password_hash = ?, pending_password_hash = NULL, password_change_code_hash = NULL, password_change_code_expires = NULL, password_change_attempts = 0, password_change_requested_at = NULL WHERE id = ?');
        $stmt->execute(array($raw['pending_password_hash'], $raw['id']));
        respond(true, array('user' => publicUser(findUserById($raw['id']))));
    }

    // Sends a fresh code for an in-progress password change (e.g. the
    // first email didn't arrive). A one-minute cooldown keeps someone from
    // spamming their own inbox — or a shared mail server — via this action.
    if ($action === 'resend-password-change-code') {
        $me = currentUser();
        if (!$me) {
            respond(false, array('error' => 'You need to be logged in.'));
        }
        $raw = findUserById($me['id']);
        if (!$raw) {
            respond(false, array('error' => 'Account not found.'));
        }
        if (empty($raw['pending_password_hash'])) {
            respond(false, array('error' => 'No password change is waiting for confirmation. Start again from Edit Profile.'));
        }
        if (!empty($raw['password_change_requested_at']) && (time() - strtotime($raw['password_change_requested_at'])) < 60) {
            respond(false, array('error' => 'Please wait a bit before requesting another code.'));
        }
        $code = generatePasswordChangeCode();
        if (!sendPasswordChangeCode($raw['email'], $raw['name'], $code)) {
            respond(false, array('error' => 'Could not send the confirmation email — check the mail settings in core/config.php.'));
        }
        $stmt = getDb()->prepare('UPDATE users SET password_change_code_hash = ?, password_change_code_expires = DATE_ADD(NOW(), INTERVAL ' . (int)passwordChangeCodeTtlMinutes() . ' MINUTE), password_change_attempts = 0, password_change_requested_at = NOW() WHERE id = ?');
        $stmt->execute(array(hashPasswordChangeCode($code), $raw['id']));
        respond(true);
    }

    // Abandons an in-progress password change (the person closed the code
    // prompt without finishing it) — password_hash was never touched, this
    // just clears the parked new password and code so a stale one can't
    // later be confirmed by surprise.
    if ($action === 'cancel-password-change') {
        $me = currentUser();
        if (!$me) {
            respond(false, array('error' => 'You need to be logged in.'));
        }
        clearPendingPasswordChange($me['id']);
        respond(true);
    }

} catch (PDOException $e) {
    respond(false, array('error' => 'Could not reach the database. Check config.php and make sure sql/a-codeplayground-schema.sql has been imported.'));
}

respond(false, array('error' => 'Unknown action'));
