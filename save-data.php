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
 */
require_once __DIR__ . '/security.php';
adevtools_start_session();
adevtools_security_headers();
header('Content-Type: application/json');
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth-helpers.php';

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
    $dir = __DIR__ . '/data/backups';
    if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
    return $dir;
}

function readConfiguredBackupsDir($configFile, $default) {
    if (is_file($configFile)) {
        $cfg = json_decode((string)@file_get_contents($configFile), true);
        if (is_array($cfg) && !empty($cfg['dataDir'])) {
            $dir = (string)$cfg['dataDir'];
            $base = preg_match('#^([A-Za-z]:[\\\\/]|/)#', $dir) ? rtrim($dir, '\\/') : (__DIR__ . '/' . trim($dir, '\\/'));
            return $base . '/backups';
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
            'path'       => 'MySQL (a_devtools) \u2014 backups saved to ' . str_replace('\\', '/', $backupsDir),
            'default'    => str_replace('\\', '/', $defaultBackupsDir),
            'isCustom'   => rtrim(str_replace('\\', '/', $backupsDir), '/') !== rtrim(str_replace('\\', '/', $defaultBackupsDir), '/'),
            'counts'     => $counts,
            'lastBackup' => $lastBackup,
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

    if ($action === 'set-location') {
        $newDir = isset($body['dataDir']) ? trim((string)$body['dataDir']) : '';
        if ($newDir === '') {
            @unlink($configFile);
            respond(true, array('path' => str_replace('\\', '/', $defaultBackupsDir), 'isCustom' => false));
        }
        $resolvedBase = preg_match('#^([A-Za-z]:[\\\\/]|/)#', $newDir) ? rtrim($newDir, '\\/') : (__DIR__ . '/' . trim($newDir, '\\/'));
        $resolved = $resolvedBase . '/backups';
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

    respond(false, array('error' => 'Unknown action'));

} catch (PDOException $e) {
    respond(false, array('error' => 'Could not reach the database. Check config.php and make sure sql/a-devtools-schema.sql has been imported.'));
}
