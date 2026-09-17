<?php
/**
 * Local mirror + backup endpoint — MySQL edition.
 *
 * Projects/snippets/notes still live in the browser's localStorage as the
 * instant, offline working copy — but every create/update/delete is also
 * written here, into the `projects` / `snippets` / `notes` tables in the
 * `a_devtools` MySQL database, scoped to the logged-in community account
 * (see sql/a-devtools-schema.sql and config.php).
 *
 * Downloadable / on-disk backups are still plain JSON snapshot files
 * (data/backups/ by default) — that part hasn't changed, since a portable
 * export file is still the easiest way to move a workspace to another
 * computer or restore an older point in time. Only the day-to-day mirror
 * moved from JSON files to MySQL.
 *
 * The account's self-selected experience level (beginner / intermediate /
 * professional) is mirrored here too, in `users.expertise_level`, purely
 * as a reference field — it does not gate access to anything server-side.
 */
require_once __DIR__ . '/core/security.php';
adevtools_start_session();
adevtools_security_headers();
header('Content-Type: application/json');
require_once __DIR__ . '/core/db.php';
require_once __DIR__ . '/core/auth-helpers.php';

function respond($ok, $extra = array()) {
    echo json_encode(array_merge(array('ok' => $ok), $extra));
    exit;
}

$user = currentUser();
if (!$user) {
    respond(false, array('error' => 'Not logged in.'));
}
$userId = $user['id'];

// --- Backup snapshot folder (JSON export/import only — not primary storage) ---
$configFile = __DIR__ . '/save-config.json';

function resolveDefaultBackupsDir() {
    /* The default save spot is a plain "A-DevTools" folder directly on the
       C: drive's root — a fixed, easy-to-find path (C:\A-DevTools) rather
       than nesting it inside Desktop, since Apache/XAMPP on Windows often
       runs under a service account whose "current user" isn't the person
       actually sitting at the machine, which makes the real per-user
       Desktop path unreliable to detect from here — a root-level folder
       is one click away in File Explorer regardless.
       If C: doesn't exist or isn't writable (a different OS, a locked-
       down C:), fall back through the other local drive letters in
       order — "any local disk" — and only fall back to a folder inside
       the project itself as a last resort, so saving never breaks
       outright on a non-Windows host. */
    if (stripos(PHP_OS, 'WIN') === 0) {
        foreach (range('C', 'Z') as $letter) {
            $driveRoot = $letter . ':/';
            if (!is_dir($driveRoot)) { continue; } // that drive letter doesn't exist here
            $dir = $driveRoot . 'A-DevTools';
            if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
            if (is_dir($dir) && is_writable($dir)) { return $dir; }
        }
    }
    // Non-Windows host, or every drive letter above failed.
    $dir = __DIR__ . '/data/backups';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    return $dir;
}

function readConfiguredBackupsDir($configFile, $default) {
    if (is_file($configFile)) {
        $cfg = json_decode((string)@file_get_contents($configFile), true);
        if (is_array($cfg) && !empty($cfg['dataDir'])) {
            $dir = (string)$cfg['dataDir'];
            return preg_match('#^([A-Za-z]:[\\\\/]|/)#', $dir) ? rtrim($dir, '\\/') : (__DIR__ . '/' . trim($dir, '\\/'));
        }
    }
    return $default;
}

$defaultBackupsDir = resolveDefaultBackupsDir();
$backupsDir = readConfiguredBackupsDir($configFile, $defaultBackupsDir);
if (!is_dir($backupsDir)) { @mkdir($backupsDir, 0775, true); }
if (is_dir($backupsDir) && !file_exists($backupsDir . '/.htaccess')) {
    @file_put_contents($backupsDir . '/.htaccess', "Options -Indexes\n<IfModule mod_authz_core.c>\nRequire all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\nOrder deny,allow\nDeny from all\n</IfModule>\n");
}

$types = array('projects', 'snippets', 'notes');
// Maps the JSON field names the frontend already uses -> real column names.
$columnMap = array(
    'projects' => array('name' => 'name', 'tech' => 'tech', 'desc' => 'description'),
    'notes'    => array('title' => 'title', 'text' => 'body'),
    'snippets' => array('title' => 'title', 'lang' => 'lang', 'code' => 'code'),
);

function safeId($id) {
    $id = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)$id);
    return $id === '' ? null : $id;
}

/** Reads one account's row from the `points` table, or zeroed defaults if it doesn't have one yet. */
function fetchPointsRow($pdo, $userId) {
    $stmt = $pdo->prepare('SELECT total, streak, last_claim_date FROM `points` WHERE user_id = ?');
    $stmt->execute(array($userId));
    $row = $stmt->fetch();
    if (!$row) { return array('total' => 0, 'streak' => 0, 'lastClaimDate' => null); }
    return array('total' => (int)$row['total'], 'streak' => (int)$row['streak'], 'lastClaimDate' => $row['last_claim_date']);
}

/* Same once-per-day streak bonus formula as dailyBonusAmount() in
   assets/js/app.js — kept in sync with it. Duplicated here (rather than
   trusting a client-supplied amount) so the daily claim is decided by
   the server's date and this account's row in `points`, not by
   whatever a browser's localStorage says. */
function dailyBonusAmount($streak) {
    return min(10 + (max($streak, 1) - 1) * 2, 30);
}

/* Extra "final benefits" reward stacked on top of the daily amount every
   time a run of claims completes a 7-day week (day 7, 14, 21...) — kept
   in sync with weeklyFinalBonus() in assets/js/app.js. */
function weeklyFinalBonus($streak) {
    return ($streak > 0 && $streak % 7 === 0) ? 15 : 0;
}

/** Replaces ALL of this user's rows for one type with a fresh set of items (used by backup/restore). */
function replaceUserItems($pdo, $type, $columnMap, $userId, $items) {
    $cols = $columnMap[$type];
    $pdo->prepare("DELETE FROM `$type` WHERE user_id = ?")->execute(array($userId));
    if (empty($items)) { return; }

    $colNames = array('id', 'user_id');
    foreach ($cols as $col) { $colNames[] = $col; }
    $placeholders = array_fill(0, count($colNames), '?');
    $sql = "INSERT INTO `$type` (`" . implode('`,`', $colNames) . "`) VALUES (" . implode(',', $placeholders) . ")";
    $stmt = $pdo->prepare($sql);

    foreach ($items as $item) {
        $id = isset($item['id']) ? safeId($item['id']) : null;
        if ($id === null) { continue; }
        $row = array($id, $userId);
        foreach ($cols as $jsonKey => $col) {
            $row[] = isset($item[$jsonKey]) ? $item[$jsonKey] : null;
        }
        $stmt->execute($row);
    }
}

try {
    $pdo = getDb();
    $action = isset($_GET['action']) ? $_GET['action'] : null;

    if ($action === 'status') {
        $counts = array();
        foreach ($types as $t) {
            if ($t === 'snippets') {
                // The `snippets` table holds both saved code snippets and
                // saved UI components (components have always used a
                // 'component-' id prefix) — split the one table into the
                // two counts the sidebar and dashboard actually display.
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM `snippets` WHERE user_id = ? AND id NOT LIKE 'component-%'");
                $stmt->execute(array($userId));
                $counts['snippets'] = (int)$stmt->fetchColumn();
                $stmt = $pdo->prepare("SELECT COUNT(*) FROM `snippets` WHERE user_id = ? AND id LIKE 'component-%'");
                $stmt->execute(array($userId));
                $counts['components'] = (int)$stmt->fetchColumn();
                continue;
            }
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM `$t` WHERE user_id = ?");
            $stmt->execute(array($userId));
            $counts[$t] = (int)$stmt->fetchColumn();
        }
        $backups = glob($backupsDir . '/*.json');
        $lastBackup = null;
        if ($backups) {
            usort($backups, function ($a, $b) { return filemtime($b) - filemtime($a); });
            $lastBackup = array('file' => basename($backups[0]), 'savedAt' => filemtime($backups[0]) * 1000);
        }
        respond(true, array(
            'writable'   => is_writable($backupsDir),
            'path'       => str_replace('\\', '/', $backupsDir),
            'default'    => str_replace('\\', '/', $defaultBackupsDir),
            'isCustom'   => rtrim(str_replace('\\', '/', $backupsDir), '/') !== rtrim(str_replace('\\', '/', $defaultBackupsDir), '/'),
            'counts'     => $counts,
            'lastBackup' => $lastBackup,
        ));
    }

    // Read-only, same as 'status' above — no CSRF token needed.
    if ($action === 'get-points') {
        respond(true, array('points' => fetchPointsRow($pdo, $userId)));
    }

    // Read-only leaderboard: the top 10 accounts by total XP, plus this
    // account's own rank/total even when it isn't in that top 10. Ties are
    // broken by whoever reached that total first (earliest joined_at),
    // matching the ORDER BY below, so "my rank" and "the top list" always
    // agree on ordering.
    if ($action === 'leaderboard') {
        $stmt = $pdo->prepare(
            "SELECT u.id, u.name, p.total
             FROM `points` p
             JOIN `users` u ON u.id = p.user_id
             ORDER BY p.total DESC, u.joined_at ASC
             LIMIT 10"
        );
        $stmt->execute();
        $rows = $stmt->fetchAll();

        $top = array();
        foreach ($rows as $row) {
            $top[] = array(
                'name'  => $row['name'],
                'total' => (int)$row['total'],
                'isYou' => $row['id'] === $userId,
            );
        }

        $me = fetchPointsRow($pdo, $userId);
        $rankStmt = $pdo->prepare(
            "SELECT COUNT(*) + 1 FROM `points` p2
             JOIN `users` u2 ON u2.id = p2.user_id
             WHERE p2.total > ?
                OR (p2.total = ? AND u2.joined_at < (SELECT joined_at FROM `users` WHERE id = ?))"
        );
        $rankStmt->execute(array($me['total'], $me['total'], $userId));
        $myRank = (int)$rankStmt->fetchColumn();

        respond(true, array(
            'top' => $top,
            'you' => array('name' => $user['name'], 'total' => $me['total'], 'rank' => $myRank),
        ));
    }

    $raw = file_get_contents('php://input');
    $body = json_decode($raw, true);
    if (!is_array($body)) { $body = array(); }
    if ($action === null) { $action = isset($body['action']) ? $body['action'] : null; }

    // Every action below this point changes data, so it needs a valid CSRF
    // token ('status' above is a read and doesn't).
    if (!csrf_verify(isset($body['csrf']) ? $body['csrf'] : null)) {
        respond(false, array('error' => 'Your session expired. Please refresh the page and try again.'));
    }

    if ($action === 'open-folder') {
        if (!is_dir($backupsDir)) {
            respond(false, array('error' => 'The backup folder does not exist yet.'));
        }
        if (!function_exists('exec')) {
            respond(false, array('error' => 'Opening folders is disabled on this server (exec() is unavailable).', 'path' => str_replace('\\', '/', $backupsDir)));
        }

        $ok = false;
        if (stripos(PHP_OS, 'WIN') === 0) {
            // Launching Explorer goes through a real .bat script (scripts/
            // open-folder.bat) rather than an inline shell command, so
            // there's one place to see/adjust exactly what runs on the
            // user's machine. The script itself calls "start" so PHP's
            // exec() doesn't block waiting on a GUI window.
            $winPath = str_replace('/', '\\', $backupsDir);
            $script = str_replace('/', '\\', __DIR__ . '\\scripts\\open-folder.bat');
            exec('cmd /c ' . escapeshellarg($script) . ' ' . escapeshellarg($winPath) . ' 2>&1', $out, $code);
            $ok = true; // explorer.exe commonly returns non-zero even on success
        } elseif (stripos(PHP_OS, 'DARWIN') === 0) {
            exec('open ' . escapeshellarg($backupsDir) . ' > /dev/null 2>&1 &', $out, $code);
            $ok = ($code === 0);
        } else {
            exec('xdg-open ' . escapeshellarg($backupsDir) . ' > /dev/null 2>&1 &', $out, $code);
            $ok = ($code === 0);
        }

        if ($ok) {
            respond(true, array('path' => str_replace('\\', '/', $backupsDir)));
        }
        respond(false, array('error' => 'Could not open a file browser on this server.', 'path' => str_replace('\\', '/', $backupsDir)));
    }

    if ($action === 'set-location') {
        $newDir = isset($body['dataDir']) ? trim((string)$body['dataDir']) : '';
        if ($newDir === '') {
            @unlink($configFile);
            respond(true, array('path' => str_replace('\\', '/', $defaultBackupsDir), 'isCustom' => false));
        }
        $resolved = preg_match('#^([A-Za-z]:[\\\\/]|/)#', $newDir) ? rtrim($newDir, '\\/') : (__DIR__ . '/' . trim($newDir, '\\/'));
        if (!is_dir($resolved) && !@mkdir($resolved, 0775, true)) {
            respond(false, array('error' => 'Could not create or access that folder. Check the path and permissions.'));
        }
        if (!is_writable($resolved)) {
            respond(false, array('error' => 'That folder exists but is not writable.'));
        }
        file_put_contents($configFile, json_encode(array('dataDir' => $newDir), JSON_PRETTY_PRINT));
        respond(true, array('path' => str_replace('\\', '/', $resolved), 'isCustom' => true));
    }

    if ($action === 'save-item') {
        $type = isset($body['type']) ? $body['type'] : '';
        $item = isset($body['item']) ? $body['item'] : null;
        $id = isset($item['id']) ? safeId($item['id']) : null;
        if (!isset($columnMap[$type]) || !is_array($item) || $id === null) {
            respond(false, array('error' => 'Invalid payload'));
        }

        $cols = $columnMap[$type];
        $colNames = array('id', 'user_id');
        $placeholders = array(':id', ':user_id');
        $updates = array();
        $params = array('id' => $id, 'user_id' => $userId);
        foreach ($cols as $jsonKey => $col) {
            $colNames[] = "`$col`";
            $placeholders[] = ":$col";
            $updates[] = "`$col` = VALUES(`$col`)";
            $params[$col] = isset($item[$jsonKey]) ? $item[$jsonKey] : null;
        }
        $sql = "INSERT INTO `$type` (" . implode(',', $colNames) . ") VALUES (" . implode(',', $placeholders) . ")
                ON DUPLICATE KEY UPDATE " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP";
        $pdo->prepare($sql)->execute($params);

        $count = $pdo->prepare("SELECT COUNT(*) FROM `$type` WHERE user_id = ?");
        $count->execute(array($userId));
        respond(true, array('count' => (int)$count->fetchColumn()));
    }

    if ($action === 'delete-item') {
        $type = isset($body['type']) ? $body['type'] : '';
        $id = isset($body['id']) ? safeId($body['id']) : null;
        if (!isset($columnMap[$type]) || $id === null) { respond(false); }
        $pdo->prepare("DELETE FROM `$type` WHERE id = ? AND user_id = ?")->execute(array($id, $userId));

        $count = $pdo->prepare("SELECT COUNT(*) FROM `$type` WHERE user_id = ?");
        $count->execute(array($userId));
        respond(true, array('count' => (int)$count->fetchColumn()));
    }

    if ($action === 'backup' || $action === 'restore') {
        $snapshot = isset($body['snapshot']) ? $body['snapshot'] : null;
        if (!is_array($snapshot)) { respond(false, array('error' => 'No data supplied')); }

        $pdo->beginTransaction();
        foreach ($types as $t) {
            if (isset($snapshot[$t]) && is_array($snapshot[$t])) {
                replaceUserItems($pdo, $t, $columnMap, $userId, $snapshot[$t]);
            }
        }
        $pdo->commit();

        // A dated JSON snapshot is still kept on disk, purely for portability.
        $ts = date('Y-m-d_His');
        $file = $backupsDir . '/' . ($action === 'restore' ? 'import-' : 'backup-') . $ts . '.json';
        file_put_contents($file, json_encode($snapshot, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        respond(true, array('file' => basename($file), 'savedAt' => time() * 1000));
    }

    if ($action === 'set-expertise') {
        $validLevels = array('beginner', 'intermediate', 'professional');
        $level = isset($body['level']) ? $body['level'] : null;
        if (!in_array($level, $validLevels, true)) {
            respond(false, array('error' => 'Invalid expertise level'));
        }
        $pdo->prepare("UPDATE `users` SET `expertise_level` = ?, `expertise_set_at` = CURRENT_TIMESTAMP WHERE `id` = ?")
            ->execute(array($level, $userId));
        respond(true, array('level' => $level));
    }

    // Mirrors one XP award (running code, saving a snippet, a getting-started
    // milestone...) into the `points` table. The frontend already applied
    // this to its local copy for instant feedback (see awardPoints() in
    // assets/js/app.js) — this just keeps the account's row in sync so the
    // rank isn't only ever known to this one browser.
    if ($action === 'award-points') {
        $amount = isset($body['amount']) ? (int)$body['amount'] : 0;
        // Clamped to the largest single award the UI ever hands out (the
        // "completed the beginner journey" bonus is 20) with headroom, so a
        // tampered request can't hand out an outsized chunk of a rank in
        // one call.
        $amount = max(-50, min(50, $amount));
        if ($amount === 0) {
            respond(true, array('points' => fetchPointsRow($pdo, $userId)));
        }

        $pdo->prepare(
            "INSERT INTO `points` (user_id, total) VALUES (?, GREATEST(0, ?))
             ON DUPLICATE KEY UPDATE total = GREATEST(0, total + ?)"
        )->execute(array($userId, $amount, $amount));

        respond(true, array('points' => fetchPointsRow($pdo, $userId)));
    }

    // The once-a-day bonus (see claimDailyBonus() in assets/js/app.js).
    // Decided here from this account's own row and the server's date —
    // not from whatever a browser's localStorage claims — so it can't be
    // re-claimed by clearing local storage or by tampering with the date.
    if ($action === 'claim-daily-bonus') {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));

        $pdo->beginTransaction();
        $stmt = $pdo->prepare('SELECT total, streak, last_claim_date FROM `points` WHERE user_id = ? FOR UPDATE');
        $stmt->execute(array($userId));
        $row = $stmt->fetch();
        $total = $row ? (int)$row['total'] : 0;
        $streak = $row ? (int)$row['streak'] : 0;
        $lastClaim = $row ? $row['last_claim_date'] : null;

        if ($lastClaim === $today) {
            $pdo->commit();
            respond(false, array(
                'error' => 'Already claimed today.',
                'points' => array('total' => $total, 'streak' => $streak, 'lastClaimDate' => $lastClaim),
            ));
        }

        $newStreak = ($lastClaim === $yesterday) ? $streak + 1 : 1;
        $finalBonus = weeklyFinalBonus($newStreak);
        $bonus = dailyBonusAmount($newStreak) + $finalBonus;
        $newTotal = $total + $bonus;

        $pdo->prepare(
            "INSERT INTO `points` (user_id, total, streak, last_claim_date) VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE total = ?, streak = ?, last_claim_date = ?"
        )->execute(array($userId, $newTotal, $newStreak, $today, $newTotal, $newStreak, $today));
        $pdo->commit();

        respond(true, array(
            'amount' => $bonus,
            'isFinalDay' => $finalBonus > 0,
            'points' => array('total' => $newTotal, 'streak' => $newStreak, 'lastClaimDate' => $today),
        ));
    }

    respond(false, array('error' => 'Unknown action'));

} catch (PDOException $e) {
    respond(false, array('error' => 'Could not reach the database. Check config.php and make sure sql/a-devtools-schema.sql has been imported.'));
}
