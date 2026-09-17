<?php
/**
 * Admin Control endpoint — everything behind the shield icon in the
 * landing page footer (guest.php).
 *
 * This is deliberately independent of the regular Community account
 * session used by auth.php:
 *   1. It is only reachable while logged out (a logged-in visitor is
 *      redirected away from the landing page by index.php).
 *   2. Clicking the shield asks directly for an account's email +
 *      password. It's the same password_hash()'d credential used for
 *      the normal login — nothing new to create or leak — but it is
 *      checked independently of any existing app session.
 *   3. That account's `role` column (see database/admin-migration.sql)
 *      must be 'admin'. Nothing in the UI can set this — it's granted
 *      by running the UPDATE statement in that migration file directly
 *      against the database.
 *   4. On success, $_SESSION['adminUnlocked'] and $_SESSION['adminUserId']
 *      are set (kept separate from $_SESSION['userId'], the regular
 *      login session key) and the panel opens.
 *
 * The unlock step is throttled the same way as normal login (see
 * login_is_locked() in security.php) so it can't be brute-forced.
 */
require_once __DIR__ . '/core/security.php';
adevtools_start_session();
adevtools_security_headers();
header('Content-Type: application/json');
require_once __DIR__ . '/core/auth-helpers.php';
require_once __DIR__ . '/core/db.php';

function respond($ok, $extra = array()) {
    echo json_encode(array_merge(array('ok' => $ok), $extra));
    exit;
}

$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) { $body = array(); }
$action = isset($body['action']) ? $body['action'] : (isset($_GET['action']) ? $_GET['action'] : null);

// 'status' is a read-only check, safe without a CSRF token (mirrors
// 'whoami' in auth.php); every state-changing action below requires one.
if ($action !== 'status' && !csrf_verify(isset($body['csrf']) ? $body['csrf'] : null)) {
    respond(false, array('error' => 'Your session expired. Please refresh the page and try again.'));
}

/** The admin account unlocked in *this* session, or null. */
function currentAdmin() {
    if (empty($_SESSION['adminUnlocked']) || empty($_SESSION['adminUserId'])) { return null; }
    $raw = findUserById($_SESSION['adminUserId']);
    if (!$raw || !isAdmin($raw)) {
        // Role was revoked (or the account was deleted) after unlocking.
        unset($_SESSION['adminUnlocked'], $_SESSION['adminUserId']);
        return null;
    }
    return $raw;
}

function requireAdmin() {
    $admin = currentAdmin();
    if (!$admin) {
        respond(false, array('error' => 'Admin Control is locked.'));
    }
    return $admin;
}

try {

    if ($action === 'status') {
        respond(true, array('unlocked' => currentAdmin() !== null));
    }

    if ($action === 'unlock') {
        $email = trim((string)(isset($body['email']) ? $body['email'] : ''));
        $password = (string)(isset($body['password']) ? $body['password'] : '');
        $throttleKey = 'admin:' . strtolower($email);

        if (login_is_locked($throttleKey)) {
            $wait = max(1, ceil(login_locked_seconds($throttleKey) / 60));
            respond(false, array('error' => 'Too many attempts. Try again in about ' . $wait . ' minute(s).'));
        }

        $account = findUserByEmail($email);
        $valid = $account && !empty($account['password_hash']) && password_verify($password, $account['password_hash']);

        // Wrong credentials and "correct credentials but not an admin"
        // get the exact same generic error — this keeps a mistyped
        // password indistinguishable from "that account isn't an admin".
        if (!$valid || !isAdmin($account)) {
            login_register_failure($throttleKey);
            respond(false, array('error' => 'Incorrect email or password.'));
        }

        login_clear_failures($throttleKey);
        session_regenerate_id(true); // fresh session ID on privilege change
        $_SESSION['adminUnlocked'] = true;
        $_SESSION['adminUserId'] = $account['id'];
        respond(true);
    }

    if ($action === 'lock') {
        unset($_SESSION['adminUnlocked'], $_SESSION['adminUserId']);
        respond(true);
    }

    if ($action === 'stats') {
        requireAdmin();
        $db = getDb();

        $counts = array();
        foreach (array('users', 'projects', 'notes', 'snippets') as $table) {
            $counts[$table] = (int)$db->query('SELECT COUNT(*) c FROM `' . $table . '`')->fetch()['c'];
        }

        // Left-joins the `points` table so the Users tab can show XP/streak
        // inline without a second round-trip. Falls back to the plain
        // query if that migration hasn't been run yet on this install.
        try {
            $users = $db->query(
                'SELECT u.id, u.name, u.email, u.role, u.expertise_level, u.joined_at,
                        COALESCE(p.total, 0) AS points_total,
                        COALESCE(p.streak, 0) AS points_streak,
                        p.last_claim_date
                 FROM users u LEFT JOIN `points` p ON p.user_id = u.id
                 ORDER BY u.joined_at DESC'
            )->fetchAll();
        } catch (PDOException $e) {
            $users = $db->query(
                'SELECT id, name, email, role, expertise_level, joined_at FROM users ORDER BY joined_at DESC'
            )->fetchAll();
        }

        // All content, joined with its owner's name/email, so the admin
        // panel's Projects/Notes/Snippets tabs can list, search, edit and
        // delete anyone's content without a per-user lookup.
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

        // Currently-locked-out login attempts (the same throttle file used
        // by both the regular login and this unlock step).
        $lockouts = array();
        $file = __DIR__ . '/data/.security/login-attempts.json';
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

        respond(true, array(
            'counts' => $counts,
            'users' => $users,
            'lockouts' => $lockouts,
            'content' => array('projects' => $projects, 'notes' => $notes, 'snippets' => $snippets),
        ));
    }

    if ($action === 'update-user') {
        // Lets an admin correct a display name, fix a typo'd email, or
        // adjust the expertise level shown to a user — separate from
        // 'set-role' (privilege) and 'set-points' (XP), so each stays a
        // small, auditable change.
        requireAdmin();
        $userId = (string)(isset($body['userId']) ? $body['userId'] : '');
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
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            respond(false, array('error' => 'Enter a valid email address.'));
        }
        $validLevels = array('beginner', 'intermediate', 'professional');
        if ($expertise !== null && $expertise !== '' && !in_array($expertise, $validLevels, true)) {
            respond(false, array('error' => 'Invalid expertise level.'));
        }
        if ($expertise === '') { $expertise = null; }

        try {
            $stmt = getDb()->prepare('UPDATE users SET name = ?, email = ?, expertise_level = ? WHERE id = ?');
            $stmt->execute(array($name, $email, $expertise, $userId));
        } catch (PDOException $e) {
            respond(false, array('error' => 'That email is already in use by another account.'));
        }
        respond(true);
    }

    if ($action === 'update-content') {
        // Edits a single project/note/snippet on behalf of its owner.
        // Scoped by (id AND user_id) together since snippet ids are
        // user-chosen slugs and can repeat across different accounts.
        requireAdmin();
        $type = (string)(isset($body['type']) ? $body['type'] : '');
        $id = isset($body['id']) ? $body['id'] : null;
        $ownerId = (string)(isset($body['userId']) ? $body['userId'] : '');
        if ($id === null || $id === '' || $ownerId === '') {
            respond(false, array('error' => 'Missing content id.'));
        }

        $db = getDb();
        if ($type === 'project') {
            $name = trim((string)(isset($body['name']) ? $body['name'] : ''));
            if ($name === '') { respond(false, array('error' => 'Name is required.')); }
            $tech = isset($body['tech']) ? (string)$body['tech'] : null;
            $description = isset($body['description']) ? (string)$body['description'] : null;
            $stmt = $db->prepare('UPDATE projects SET name = ?, tech = ?, description = ? WHERE id = ? AND user_id = ?');
            $stmt->execute(array($name, $tech, $description, $id, $ownerId));
        } elseif ($type === 'note') {
            $title = trim((string)(isset($body['title']) ? $body['title'] : ''));
            if ($title === '') { respond(false, array('error' => 'Title is required.')); }
            $noteBody = isset($body['body']) ? (string)$body['body'] : null;
            $stmt = $db->prepare('UPDATE notes SET title = ?, body = ? WHERE id = ? AND user_id = ?');
            $stmt->execute(array($title, $noteBody, $id, $ownerId));
        } elseif ($type === 'snippet') {
            $title = trim((string)(isset($body['title']) ? $body['title'] : ''));
            if ($title === '') { respond(false, array('error' => 'Title is required.')); }
            $lang = isset($body['lang']) ? (string)$body['lang'] : null;
            $code = isset($body['code']) ? (string)$body['code'] : null;
            $stmt = $db->prepare('UPDATE snippets SET title = ?, lang = ?, code = ? WHERE id = ? AND user_id = ?');
            $stmt->execute(array($title, $lang, $code, $id, $ownerId));
        } else {
            respond(false, array('error' => 'Invalid content type.'));
        }
        respond(true);
    }

    if ($action === 'delete-content') {
        requireAdmin();
        $type = (string)(isset($body['type']) ? $body['type'] : '');
        $id = isset($body['id']) ? $body['id'] : null;
        $ownerId = (string)(isset($body['userId']) ? $body['userId'] : '');
        if ($id === null || $id === '' || $ownerId === '') {
            respond(false, array('error' => 'Missing content id.'));
        }
        $tables = array('project' => 'projects', 'note' => 'notes', 'snippet' => 'snippets');
        if (!isset($tables[$type])) {
            respond(false, array('error' => 'Invalid content type.'));
        }
        $stmt = getDb()->prepare('DELETE FROM `' . $tables[$type] . '` WHERE id = ? AND user_id = ?');
        $stmt->execute(array($id, $ownerId));
        respond(true);
    }

    if ($action === 'set-role') {
        $admin = requireAdmin();
        $userId = (string)(isset($body['userId']) ? $body['userId'] : '');
        $role = (string)(isset($body['role']) ? $body['role'] : '');
        if (!in_array($role, array('user', 'admin'), true)) {
            respond(false, array('error' => 'Invalid role.'));
        }
        if ($userId === $admin['id'] && $role !== 'admin') {
            respond(false, array('error' => "You can't remove your own admin access."));
        }
        $stmt = getDb()->prepare('UPDATE users SET role = ? WHERE id = ?');
        $stmt->execute(array($role, $userId));
        respond(true);
    }

    if ($action === 'set-points') {
        // Lets an admin directly correct an account's XP/streak — e.g.
        // restoring a streak that was lost to a bug, or seeding a demo
        // account — without hand-editing the `points` table over SQL.
        // Bypasses dailyBonusAmount() and the once-a-day check in
        // save-data.php on purpose: this is an override, not a claim.
        $admin = requireAdmin();
        $userId = (string)(isset($body['userId']) ? $body['userId'] : '');
        if ($userId === '') {
            respond(false, array('error' => 'Missing userId.'));
        }
        if (!findUserById($userId)) {
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
            ? ($body['lastClaimDate'] === null ? null : (string)$body['lastClaimDate'])
            : $currentLastClaim;

        $db->prepare(
            "INSERT INTO `points` (user_id, total, streak, last_claim_date) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE total = ?, streak = ?, last_claim_date = ?"
        )->execute(array($userId, $total, $streak, $lastClaimDate, $total, $streak, $lastClaimDate));

        respond(true, array('points' => array('total' => $total, 'streak' => $streak, 'lastClaimDate' => $lastClaimDate)));
    }

    if ($action === 'delete-user') {
        $admin = requireAdmin();
        $userId = (string)(isset($body['userId']) ? $body['userId'] : '');
        if ($userId === $admin['id']) {
            respond(false, array('error' => "You can't delete your own account from here."));
        }
        // ON DELETE CASCADE (see a-devtools-schema.sql and
        // database/points-migration.sql) removes that user's
        // projects/notes/snippets/points along with the row.
        $stmt = getDb()->prepare('DELETE FROM users WHERE id = ?');
        $stmt->execute(array($userId));
        respond(true);
    }

    if ($action === 'clear-lockout') {
        requireAdmin();
        $key = (string)(isset($body['key']) ? $body['key'] : '');
        login_clear_failures($key);
        respond(true);
    }

} catch (PDOException $e) {
    respond(false, array('error' => 'Could not reach the database. Check config.php and make sure sql/a-devtools-schema.sql has been imported.'));
}

respond(false, array('error' => 'Unknown action'));
