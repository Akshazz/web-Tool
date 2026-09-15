-- =========================================================
-- A-DevTools — OAuth migration
-- =========================================================
-- Run this ONCE if your `users` table already exists (i.e. you installed
-- A-DevTools before "Sign in with Google/GitHub/Facebook" was added).
-- A brand-new install already gets these columns from
-- a-devtools-schema.sql and does NOT need this file.
--
--   mysql -u root -p a_devtools < database/oauth-migration.sql
-- =========================================================

USE `a_devtools`;

ALTER TABLE `users`
  MODIFY `password_hash` VARCHAR(255) DEFAULT NULL,
  ADD COLUMN `oauth_provider` VARCHAR(20)  DEFAULT NULL AFTER `password_hash`,
  ADD COLUMN `oauth_id`       VARCHAR(190) DEFAULT NULL AFTER `oauth_provider`,
  ADD UNIQUE KEY `uniq_users_oauth` (`oauth_provider`, `oauth_id`);
