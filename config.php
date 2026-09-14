<?php
/**
 * MySQL connection settings for A-DevTools.
 *
 * Defaults match a fresh XAMPP install (MySQL on localhost, root user,
 * no password, database name from sql/a-devtools-schema.sql). Edit the
 * values below to match your own setup.
 *
 * Nothing else in the app needs to change — db.php reads this file to
 * build the shared PDO connection.
 */
return array(
    'host'    => '127.0.0.1',
    'port'    => 3306,
    'dbname'  => 'a_devtools',
    'user'    => 'root',
    'pass'    => '',
    'charset' => 'utf8mb4',
);
