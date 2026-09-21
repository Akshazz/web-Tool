-- Adds the `xp_ledger` table: the server-side record of every XP award, one
-- row per (account, action fingerprint). Its primary key is what enforces
-- "the same content can only be rewarded once" no matter what the browser
-- says — renaming back and forth, deleting and recreating identical content,
-- clearing localStorage or replaying a request by hand all earn nothing.
-- It also backs the burst limit (awards per minute) and the daily XP cap
-- (see XP_BURST_LIMIT / XP_DAILY_ACTION_CAP in save-data.php).
--
-- OPTIONAL: save-data.php creates this table by itself the first time an XP
-- award is made (CREATE TABLE IF NOT EXISTS), so nothing breaks if you skip
-- this file. Run it if you'd rather create the table up front, or to add the
-- cascade foreign key so deleting an account also removes its ledger.
--
-- Safe to run more than once:
--   mysql -u root -p a_codeplayground < database/xp-ledger-migration.sql
-- or phpMyAdmin -> Import -> choose this file -> Go.

CREATE TABLE IF NOT EXISTS `xp_ledger` (
    `user_id`    VARCHAR(32) NOT NULL,
    `action_key` VARCHAR(96) NOT NULL,
    `xp`         INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL,
    PRIMARY KEY (`user_id`, `action_key`),
    KEY `idx_xp_ledger_user_time` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'xp_ledger'
      AND CONSTRAINT_NAME = 'fk_xp_ledger_user'
);
SET @add_fk_sql = IF(
    @fk_exists = 0,
    'ALTER TABLE `xp_ledger` ADD CONSTRAINT `fk_xp_ledger_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE add_fk_stmt FROM @add_fk_sql;
EXECUTE add_fk_stmt;
DEALLOCATE PREPARE add_fk_stmt;
