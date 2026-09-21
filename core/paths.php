<?php
/**
 * Backup-folder path helpers (used by save-data.php).
 *
 * Three jobs, kept together so the rules live in exactly one place:
 *
 *   backup_validate_dir($raw)  -> tidy + validate what the user typed
 *   backup_resolve_dir($dir)   -> turn a stored/typed value into a real path
 *   backup_display_path($path) -> format a path the way the OS shows it
 *
 * Display format matters: Windows users expect C:\A-CodePlayground\BackupFiles,
 * not C:/A-CodePlayground/BackupFiles. PHP accepts either separator
 * internally, so paths are stored/handled with whatever is convenient and
 * only converted for what the person reads on screen.
 */

if (!function_exists('backup_validate_dir')) {

if (!function_exists('backup_is_windows_host')) {
    function backup_is_windows_host() {
        return stripos(PHP_OS, 'WIN') === 0;
    }
}

/**
 * Formats a path for display. Drive-letter paths (C:\...) use backslashes,
 * everything else (relative or /unix/style) uses forward slashes. Repeated
 * separators are collapsed.
 */
function backup_display_path($path) {
    $path = (string)$path;
    if (preg_match('#^[A-Za-z]:#', $path)) {
        return preg_replace('#[\\\\/]+#', '\\', $path);
    }
    return preg_replace('#[\\\\/]+#', '/', $path);
}

/**
 * Cleans and validates a folder path typed into the "Save location" box.
 *
 * Returns array(ok, cleanedValue, errorMessage). A blank value is valid and
 * means "use the automatic default", so cleanedValue is '' in that case.
 *
 * Accepted:  C:\Backups  ·  D:/A-CodePlayground  ·  /var/backups  ·  my-backups
 * Tidied:    surrounding quotes (Explorer's "Copy as path"), mixed or doubled
 *            slashes, a trailing slash
 * Rejected:  "C:foo" (no slash after the drive), \\server\share, "..",
 *            characters Windows forbids in folder names, reserved names
 *            (CON, NUL, COM1...), control characters, very long paths, and
 *            drive-letter paths on a non-Windows server.
 */
function backup_validate_dir($raw) {
    $p = trim((string)$raw);
    // Explorer's "Copy as path" wraps the path in double quotes.
    if (preg_match('/^(["\'])(.*)\1$/s', $p, $m)) { $p = trim($m[2]); }
    if ($p === '') { return array(true, '', null); }

    if (preg_match('/[\x00-\x1f]/', $p)) {
        return array(false, '', 'The path contains invalid characters.');
    }
    if (strlen($p) > 240) {
        return array(false, '', 'That path is too long (240 characters maximum).');
    }
    if (strpos($p, '\\\\') === 0) {
        return array(false, '', 'Network paths (\\\\server\\share) are not supported. Use a drive letter, e.g. D:\\A-CodePlayground.');
    }

    $hasDrive = (bool)preg_match('#^[A-Za-z]:[\\\\/]#', $p);
    if (!$hasDrive && preg_match('#^[A-Za-z]:#', $p)) {
        return array(false, '', 'Add a backslash after the drive letter, e.g. C:\\A-CodePlayground.');
    }
    if ($hasDrive && !backup_is_windows_host()) {
        return array(false, '', 'Drive-letter paths (like C:\\...) only work when the server runs on Windows. Use a /path/style folder instead.');
    }

    // Normalise separators: backslashes for drive paths, forward slashes otherwise.
    $p = $hasDrive ? preg_replace('#[\\\\/]+#', '\\', $p) : preg_replace('#[\\\\/]+#', '/', $p);
    // Drop a trailing separator, but keep a bare root ("C:\" or "/").
    if (!preg_match('#^([A-Za-z]:\\\\|/)$#', $p)) { $p = rtrim($p, '\\/'); }

    $checkWinRules = $hasDrive || backup_is_windows_host();
    $body = $hasDrive ? substr($p, 3) : $p;
    foreach (preg_split('#[\\\\/]+#', $body, -1, PREG_SPLIT_NO_EMPTY) as $seg) {
        if ($seg === '.') { continue; }
        if ($seg === '..') {
            return array(false, '', '".." is not allowed. Enter the full folder path instead.');
        }
        if ($checkWinRules) {
            if (preg_match('#[<>:"|?*]#', $seg)) {
                return array(false, '', 'Folder names cannot contain any of these characters: < > : " | ? *');
            }
            if (preg_match('#[ .]$#', $seg)) {
                return array(false, '', 'Folder names cannot end with a space or a dot.');
            }
            if (preg_match('#^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$#i', $seg)) {
                return array(false, '', '"' . $seg . '" is a reserved name on Windows. Pick a different folder name.');
            }
        }
    }
    return array(true, $p, null);
}

/**
 * Resolves a stored/typed folder value to a usable path: absolute paths
 * (C:\..., D:/..., /...) are used as-is, anything else is treated as a
 * folder name inside the project directory.
 */
function backup_resolve_dir($dir, $projectRoot) {
    $dir = (string)$dir;
    if (preg_match('#^([A-Za-z]:[\\\\/]|/)#', $dir)) {
        return preg_match('#^([A-Za-z]:[\\\\/]?|/)$#', $dir) ? $dir : rtrim($dir, '\\/');
    }
    return rtrim($projectRoot, '\\/') . '/' . trim($dir, '\\/');
}

}
