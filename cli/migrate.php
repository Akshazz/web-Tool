<?php
/**
 * One-time migration: copies the old data/projects.json, data/notes.json
 * and data/snippets.json files into the MySQL tables created by
 * sql/a-devtools-schema.sql.
 *
 * Those files predate the "Community" accounts feature, so they don't
 * belong to anyone yet — you choose which account should own them.
 *
 * Run from the command line, from the app root folder (one level up
 *   from this file, alongside index.php):
 *   php cli/migrate.php you@example.com
 *
 * (Create that account first by signing up in the app, then run this.)
 * Safe to run more than once — existing rows are updated, not duplicated.
 */

if (php_sapi_name() !== 'cli') {
    http_response_code(403);
    exit("This script is meant to be run from the command line:\n  php cli/migrate.php you@example.com\n");
}

require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/auth-helpers.php';

$email = isset($argv[1]) ? trim($argv[1]) : '';
if ($email === '') {
    fwrite(STDERR, "Usage: php cli/migrate.php you@example.com\n");
    fwrite(STDERR, "(Sign up in the app first so that account exists.)\n");
    exit(1);
}

$user = findUserByEmail($email);
if (!$user) {
    fwrite(STDERR, "No account found for \"$email\". Sign up in the app first, then re-run this.\n");
    exit(1);
}
$userId = $user['id'];

$pdo = getDb();

function safeId($id) {
    $id = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)$id);
    return $id === '' ? null : $id;
}

function loadJson($file) {
    if (!is_file($file)) { return array(); }
    $items = json_decode((string)@file_get_contents($file), true);
    return is_array($items) ? $items : array();
}

$dataDir = dirname(__DIR__) . '/data';
$plan = array(
    'projects' => array(
        'file' => $dataDir . '/projects.json',
        'cols' => array('name' => 'name', 'tech' => 'tech', 'desc' => 'description'),
    ),
    'notes' => array(
        'file' => $dataDir . '/notes.json',
        'cols' => array('title' => 'title', 'text' => 'body'),
    ),
    'snippets' => array(
        'file' => $dataDir . '/snippets.json',
        'cols' => array('title' => 'title', 'lang' => 'lang', 'code' => 'code'),
    ),
);

echo "Migrating legacy JSON data into MySQL for {$user['name']} <{$email}>...\n";

foreach ($plan as $type => $spec) {
    $items = loadJson($spec['file']);
    if (!$items) {
        echo "  {$type}: nothing to migrate (no file or empty)\n";
        continue;
    }

    $colNames = array('id', 'user_id');
    $placeholders = array(':id', ':user_id');
    $updates = array();
    foreach ($spec['cols'] as $col) {
        $colNames[] = "`$col`";
        $placeholders[] = ":$col";
        $updates[] = "`$col` = VALUES(`$col`)";
    }
    $sql = "INSERT INTO `$type` (" . implode(',', $colNames) . ") VALUES (" . implode(',', $placeholders) . ")
            ON DUPLICATE KEY UPDATE " . implode(', ', $updates);
    $stmt = $pdo->prepare($sql);

    $count = 0;
    foreach ($items as $item) {
        $id = isset($item['id']) ? safeId($item['id']) : null;
        if ($id === null) { continue; }
        $params = array('id' => $id, 'user_id' => $userId);
        foreach ($spec['cols'] as $jsonKey => $col) {
            $params[$col] = isset($item[$jsonKey]) ? $item[$jsonKey] : null;
        }
        $stmt->execute($params);
        $count++;
    }
    echo "  {$type}: migrated {$count} item(s) from " . basename($spec['file']) . "\n";
}

echo "Done. The old data/*.json files were left untouched — safe to keep as a backup or delete once you've verified the data in MySQL.\n";
