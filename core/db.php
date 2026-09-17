<?php
/**
 * Returns a single shared PDO connection for the request, built from
 * config.php. Every file that talks to MySQL (auth.php, auth-helpers.php,
 * save-data.php) goes through this one function.
 */
function getDb() {
    static $pdo = null;
    if ($pdo !== null) { return $pdo; }
    $config = require __DIR__ . '/config.php';
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'], $config['port'], $config['dbname'], $config['charset']
    );
    $pdo = new PDO($dsn, $config['user'], $config['pass'], array(
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ));
    return $pdo;
}
