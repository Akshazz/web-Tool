-- Splits the single `name` column into First / Middle / Last name parts,
-- and adds an optional `username`, for the Edit Profile modal (see
-- viewProfileForm() in assets/js/app.js and the update-profile action in
-- auth.php).
--
-- `name` itself is kept as-is and is still the column every other page
-- reads for display (admin dashboard, project/snippet ownership, etc.) —
-- it's now simply recomputed from first/middle/last on every save
-- (composeFullName() in core/auth-helpers.php) instead of being typed
-- directly. Existing accounts keep their current `name` untouched until
-- the person next saves their profile from the new form.
--
-- `username` is optional and unique when set — a NULL username never
-- collides with another NULL one under a UNIQUE index, so existing
-- accounts (all NULL until someone picks a username) are unaffected.
--
-- Safe to run more than once: each ADD COLUMN / ADD INDEX only runs if it
-- isn't already there (same guarded style as
-- database/profile-details-migration.sql), so re-importing this file
-- doesn't error out on a "duplicate column" or "duplicate key" the second
-- time.
--
-- Run it the same way:
--   mysql -u root -p a_codeplayground < database/name-username-migration.sql
-- or via phpMyAdmin -> Import -> choose this file -> Go.

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'first_name'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `first_name` VARCHAR(80) DEFAULT NULL AFTER `name`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'middle_name'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `middle_name` VARCHAR(80) DEFAULT NULL AFTER `first_name`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'last_name'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `last_name` VARCHAR(80) DEFAULT NULL AFTER `middle_name`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'username'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `username` VARCHAR(30) DEFAULT NULL AFTER `last_name`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND INDEX_NAME = 'users_username_unique'
);
SET @add_idx_sql = IF(@idx_exists = 0,
    'ALTER TABLE `users` ADD UNIQUE INDEX `users_username_unique` (`username`)',
    'SELECT 1');
PREPARE add_idx_stmt FROM @add_idx_sql;
EXECUTE add_idx_stmt;
DEALLOCATE PREPARE add_idx_stmt;

-- Best-effort backfill so existing accounts aren't left with blank name
-- parts the first time they open Edit Profile: splits the current `name`
-- on the first space into first_name / last_name (anything after the
-- first word becomes the last name; middle_name is left blank — there's
-- no reliable way to guess it from a single freeform string). Only runs
-- for rows that don't have a first_name yet, so it never overwrites
-- someone who already saved the new fields.
UPDATE `users`
SET `first_name` = TRIM(SUBSTRING_INDEX(`name`, ' ', 1)),
    `last_name` = TRIM(SUBSTRING(`name`, LENGTH(SUBSTRING_INDEX(`name`, ' ', 1)) + 1))
WHERE (`first_name` IS NULL OR `first_name` = '') AND `name` IS NOT NULL AND `name` <> '';
