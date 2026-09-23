-- Adds a proper Address / Barangay / City / Country breakdown to the
-- `users` table, on top of database/profile-details-migration.sql (bio,
-- hobbies, skills — run that one first if you haven't already).
--
-- Previously the Edit Profile modal saved one freeform "location" string
-- and had to guess the city/country back apart when reopened. This adds
-- four discrete columns instead — `location` now stores a computed,
-- human-readable join of them ("123 Sample St, Barangay Commonwealth,
-- Quezon City, Philippines") for quick display (View Profile, admin
-- listings), while the edit form binds directly to the four fields below
-- with no guessing. Widening `location` from varchar(120) to varchar(255)
-- gives that joined string room for all four parts.
--
-- Safe to run more than once — each ADD COLUMN is guarded the same way as
-- database/profile-details-migration.sql, and the MODIFY COLUMN for
-- `location` is naturally safe to repeat.
--
-- Run it the same way:
--   mysql -u root -p a_codeplayground < database/profile-address-migration.sql
-- or via phpMyAdmin -> Import -> choose this file -> Go.

ALTER TABLE `users` MODIFY COLUMN `location` VARCHAR(255) DEFAULT NULL;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'address'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `address` VARCHAR(190) DEFAULT NULL AFTER `location`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'barangay'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `barangay` VARCHAR(120) DEFAULT NULL AFTER `address`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'city'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `city` VARCHAR(120) DEFAULT NULL AFTER `barangay`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'country'
);
SET @add_col_sql = IF(@col_exists = 0,
    'ALTER TABLE `users` ADD COLUMN `country` VARCHAR(80) DEFAULT NULL AFTER `city`',
    'SELECT 1');
PREPARE add_col_stmt FROM @add_col_sql;
EXECUTE add_col_stmt;
DEALLOCATE PREPARE add_col_stmt;
