-- Adds optional "About" fields to the `users` table: a short bio,
-- location, freeform hobbies, and a list of programming skills with a
-- mastery level for each. These power the extra section on the View
-- Profile / Edit Profile modals (see viewProfileForm() / editProfileForm()
-- in assets/js/app.js) — all four are optional and blank by default, so
-- existing accounts are unaffected until someone fills them in.
--
-- `skills` stores a small JSON array, e.g.:
--   [{"name":"JavaScript","level":"advanced"},{"name":"PHP","level":"intermediate"}]
-- encoded/decoded in auth.php and core/auth-helpers.php — no separate
-- table needed for such a short, per-account list.
--
-- Safe to run more than once: each ADD COLUMN only runs if the column
-- isn't already there (same guarded style as database/points-migration.sql),
-- so re-importing this file doesn't error out on a "duplicate column" the
-- second time.
--
-- Run it the same way:
--   mysql -u root -p a_codeplayground < database/profile-details-migration.sql
-- or via phpMyAdmin -> Import -> choose this file -> Go.

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'bio'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `bio` VARCHAR(280) DEFAULT NULL AFTER `joined_at`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'location'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `location` VARCHAR(120) DEFAULT NULL AFTER `bio`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'hobbies'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `hobbies` VARCHAR(255) DEFAULT NULL AFTER `location`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'skills'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `skills` TEXT DEFAULT NULL AFTER `hobbies`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
