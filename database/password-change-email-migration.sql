-- Adds the columns needed to gate a password change behind an emailed
-- confirmation code, instead of applying a new password the instant
-- someone submits Edit Profile.
--
-- How the flow works (see the `update-profile`, `confirm-password-change`,
-- `resend-password-change-code` and `cancel-password-change` actions in
-- auth.php, and sendPasswordChangeCode()/clearPendingPasswordChange() in
-- core/auth-helpers.php):
--   1. Edit Profile submits current + new password like before. Once the
--      current password checks out, the NEW password is hashed and parked
--      in `pending_password_hash` — `password_hash` itself is untouched.
--   2. A random 6-digit code is generated, hashed (SHA-256) into
--      `password_change_code_hash`, given a 10-minute expiry in
--      `password_change_code_expires`, and emailed to the account's
--      registered address.
--   3. The person enters that code in a follow-up modal. Only once the
--      hash matches (and hasn't expired / been guessed too many times,
--      tracked by `password_change_attempts`) does `pending_password_hash`
--      get copied into the real `password_hash` column and every one of
--      these columns gets cleared back to NULL.
-- `password_change_requested_at` is just a simple resend cooldown.
--
-- Safe to run more than once — each ADD COLUMN is guarded the same way as
-- database/profile-details-migration.sql.
--
-- Run it the same way:
--   mysql -u root -p a_codeplayground < database/password-change-email-migration.sql
-- or via phpMyAdmin -> Import -> choose this file -> Go.

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'pending_password_hash'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `pending_password_hash` VARCHAR(255) DEFAULT NULL AFTER `password_hash`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_change_code_hash'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `password_change_code_hash` VARCHAR(64) DEFAULT NULL AFTER `pending_password_hash`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_change_code_expires'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `password_change_code_expires` DATETIME DEFAULT NULL AFTER `password_change_code_hash`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_change_attempts'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `password_change_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `password_change_code_expires`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_change_requested_at'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `password_change_requested_at` DATETIME DEFAULT NULL AFTER `password_change_attempts`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
