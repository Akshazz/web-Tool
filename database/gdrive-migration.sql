-- Adds the `gdrive_links` table: one row per account that connected its own
-- Google Drive for backups (see gdrive.php). Holds the account's Google email,
-- its AES-256-GCM ENCRYPTED refresh token (the key lives in data/.security/,
-- never in the database), the Drive folder id, and sync bookkeeping.
--
-- OPTIONAL: gdrive.php creates this table by itself the first time it's used
-- (CREATE TABLE IF NOT EXISTS), so nothing breaks if you skip this file. Run
-- it to create the table up front, or to add the cascade foreign key so
-- deleting an account also removes its Drive link.
--
-- Safe to run more than once:
--   mysql -u root -p a_codeplayground < database/gdrive-migration.sql
-- or phpMyAdmin -> Import -> choose this file -> Go.

CREATE TABLE IF NOT EXISTS `gdrive_links` (
    `user_id`           VARCHAR(32) NOT NULL,
    `google_email`      VARCHAR(255) DEFAULT NULL,
    `refresh_token_enc` TEXT NOT NULL,
    `folder_id`         VARCHAR(128) DEFAULT NULL,
    `auto_sync`         TINYINT(1) NOT NULL DEFAULT 0,
    `last_sync_at`      DATETIME DEFAULT NULL,
    `last_hash`         VARCHAR(64) DEFAULT NULL,
    `last_file`         VARCHAR(255) DEFAULT NULL,
    `created_at`        DATETIME NOT NULL,
    PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'gdrive_links'
      AND CONSTRAINT_NAME = 'fk_gdrive_links_user'
);
SET @add_fk_sql = IF(
    @fk_exists = 0,
    'ALTER TABLE `gdrive_links` ADD CONSTRAINT `fk_gdrive_links_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE add_fk_stmt FROM @add_fk_sql;
EXECUTE add_fk_stmt;
DEALLOCATE PREPARE add_fk_stmt;
