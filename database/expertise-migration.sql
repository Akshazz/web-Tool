-- =========================================================
-- A-DevTools — expertise level migration
-- =========================================================
-- Run this ONCE if your `users` table already exists (i.e. you installed
-- A-DevTools before the experience level was mirrored to the database).
-- A brand-new install already gets these columns from
-- a-devtools-schema.sql and does NOT need this file.
--
--   mysql -u root -p a_devtools < database/expertise-migration.sql
-- =========================================================

USE `a_devtools`;

ALTER TABLE `users`
  ADD COLUMN `expertise_level`  ENUM('beginner','intermediate','professional') DEFAULT NULL AFTER `oauth_id`,
  ADD COLUMN `expertise_set_at` DATETIME DEFAULT NULL AFTER `expertise_level`;
