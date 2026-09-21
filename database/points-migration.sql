-- Adds the `points` table: one row per account holding their XP total,
-- daily-bonus streak and the date they last claimed it. This is what
-- backs the "Rank" shown next to the profile avatar and on the
-- dashboard (see RANKS in assets/js/app.js for the XP thresholds).
--
-- Before this migration, XP/rank only lived in the browser's
-- localStorage, so it reset on a new browser or device. It's now mirrored
-- into MySQL the same way projects/snippets/notes already are, scoped to
-- the logged-in account (see save-data.php).
--
-- `user_id` matches `users`.`id` exactly (varchar(32),
-- utf8mb4_unicode_ci) and carries the same ON DELETE CASCADE / ON UPDATE
-- CASCADE foreign key as notes/projects/snippets, so deleting an account
-- removes its points row along with everything else automatically.
--
-- Safe to run more than once, and safe to run on a brand-new install too
-- (CREATE TABLE IF NOT EXISTS) — same style as database/admin-migration.sql.
--
-- Run it the same way:
--   mysql -u root -p a_codeplayground < database/points-migration.sql
-- or via phpMyAdmin -> Import -> choose this file -> Go.

CREATE TABLE IF NOT EXISTS `points` (
    `user_id`         VARCHAR(32) NOT NULL,
    `total`           INT NOT NULL DEFAULT 0,
    `streak`          INT NOT NULL DEFAULT 0,
    `last_claim_date` DATE DEFAULT NULL,
    `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Added separately (rather than inline above) so this migration still
-- succeeds up to this point on an install where, for some reason, the
-- `users` table or its `id` column doesn't match — same defensive spirit
-- as the rest of this file. Wrapped in a existence check (rather than a
-- plain ALTER TABLE) so re-running this file doesn't fail on "duplicate
-- constraint name" the second time.
SET @fk_exists = (
    SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'points'
      AND CONSTRAINT_NAME = 'fk_points_user'
);
SET @add_fk_sql = IF(
    @fk_exists = 0,
    'ALTER TABLE `points` ADD CONSTRAINT `fk_points_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT 1'
);
PREPARE add_fk_stmt FROM @add_fk_sql;
EXECUTE add_fk_stmt;
DEALLOCATE PREPARE add_fk_stmt;
