-- =========================================================
-- A-DevTools — MySQL schema
-- =========================================================
-- Import this BEFORE using the app with MySQL:
--   phpMyAdmin -> Import, or:
--   mysql -u root -p < sql/a-devtools-schema.sql
--
-- Community accounts and each account's projects/snippets/notes
-- are stored here. config.php holds the connection details;
-- db.php / auth-helpers.php / auth.php / save-data.php are the
-- only files that talk to this database.
-- =========================================================

CREATE DATABASE IF NOT EXISTS `a_devtools`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `a_devtools`;

-- ---------------------------------------------------------
-- Community accounts
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `id`               VARCHAR(32)  NOT NULL,       -- e.g. "u_6457e840a3aee287"
  `name`             VARCHAR(190) NOT NULL,
  `email`            VARCHAR(190) NOT NULL,
  `password_hash`    VARCHAR(255) DEFAULT NULL,   -- PHP password_hash() output; NULL for oauth-only accounts
  `oauth_provider`   VARCHAR(20)  DEFAULT NULL,   -- 'google' | 'github' | 'facebook'
  `oauth_id`         VARCHAR(190) DEFAULT NULL,   -- provider's unique user id
  `expertise_level`  ENUM('beginner','intermediate','professional') DEFAULT NULL, -- self-selected in the "How experienced are you?" modal; intermediate/professional require passing the exam first. Reference only — does not gate access.
  `expertise_set_at` DATETIME     DEFAULT NULL,   -- when expertise_level was last changed
  `joined_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_users_email` (`email`),
  UNIQUE KEY `uniq_users_oauth` (`oauth_provider`, `oauth_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Projects — one row per project, owned by a user
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `projects` (
  `id`          BIGINT UNSIGNED NOT NULL,      -- Date.now() from the browser
  `user_id`     VARCHAR(32)  NOT NULL,
  `name`        VARCHAR(190) NOT NULL,
  `tech`        VARCHAR(190) DEFAULT NULL,
  `description` TEXT,                          -- was "desc" in the old JSON (reserved word in SQL)
  `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`, `user_id`),
  KEY `idx_projects_user` (`user_id`),
  CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Notes
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notes` (
  `id`         BIGINT UNSIGNED NOT NULL,
  `user_id`    VARCHAR(32) NOT NULL,
  `title`      VARCHAR(190) NOT NULL,
  `body`       TEXT,                            -- was "text" in the old JSON
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`, `user_id`),
  KEY `idx_notes_user` (`user_id`),
  CONSTRAINT `fk_notes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------
-- Snippets
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS `snippets` (
  `id`         VARCHAR(64) NOT NULL,            -- Date.now() as a string
  `user_id`    VARCHAR(32) NOT NULL,
  `title`      VARCHAR(190) NOT NULL,
  `lang`       VARCHAR(64)  DEFAULT NULL,        -- e.g. "HTML + CSS", "JavaScript"
  `code`       LONGTEXT,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`, `user_id`),
  KEY `idx_snippets_user` (`user_id`),
  CONSTRAINT `fk_snippets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
