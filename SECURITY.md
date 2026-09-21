# Folder layout, by security level

The app root (`a-codeplayground/`, wherever it sits under `htdocs/`) is entirely
web-reachable by default in a XAMPP install, so the folders below are
organized from **most exposed** to **most protected**, and every tier below
"Public" is closed off with its own `.htaccess` (`Require all denied`) in
addition to whatever the app itself checks.

## 1. Public — meant to be requested directly
```
index.php              main app shell (session/auth-gated per page)
auth.php               login / register / logout endpoint
oauth.php              "Sign in with..." callback endpoint
guest.php              landing page (included by index.php)
save-data.php          AJAX save/backup endpoint (session-gated)
gdrive.php             Google Drive backup endpoint (session-gated, CSRF-checked; tokens encrypted at rest, key in data/.security/)
admin-dashboard.php    admin dashboard page (full-page sign-in, role gated)
admin.php              admin dashboard JSON API (password + role gated, see below)
service-worker.js, manifest.webmanifest   PWA files
assets/                CSS, JS, icons — static, non-sensitive
downloads/             the Android APK drop folder + its own README
```
`admin-dashboard.php` and `admin.php` stay web-reachable because they are the
browser-facing admin backend, but neither reveals anything without a correct
admin password: the dashboard page checks the session on the server *before*
sending any markup (signed-out visitors only ever get the sign-in screen), and
every API action re-checks it. Protection is at the application layer: a
throttled, `password_hash()`-verified check against a user with
`role = 'admin'` (see `core/security.php`'s `login_is_locked()` family, shared
with the regular login form), an idle timeout (`ADMIN_IDLE_TIMEOUT` in
`core/auth-helpers.php`, 20 minutes by default), CSRF tokens on every action,
and an audit log of sign-ins and changes in `data/.security/admin-audit.log`
(blocked from the web by `data/.htaccess`).

## 2. Internal-only PHP — never requested, only `require`d
```
core/
  config.php          MySQL host/user/password + OAuth client secrets
  db.php              shared PDO connection, built from config.php
  security.php        sessions, CSRF, security headers, login throttle
  google.php          Google OAuth settings saved from the admin dashboard
                      (data/.security/google-settings.json; secret AES-encrypted)
  oauth-providers.php GitHub + Facebook sign-in settings saved from the admin dashboard
                      (data/.security/oauth-settings.json; secrets AES-encrypted with
                      the same key as Google's)
  auth-helpers.php     account lookups/creation (uses db.php)
```
Blocked by `core/.htaccess`. Every public entry point pulls these in with
`require_once __DIR__ . '/core/<file>.php'`; nothing outside `core/` should
need to know more than that.

## 3. Command-line only
```
cli/
  migrate.php          one-time JSON → MySQL import, run as:
                        php cli/migrate.php you@example.com
```
Blocked by `cli/.htaccess`, and the script itself also refuses to run
outside `php_sapi_name() === 'cli'` (defense in depth: folder rule +
in-code check).

## 4. SQL schema / migrations — imported by hand, never fetched
```
sql/        e.g. a-codeplayground-schema.sql       (initial schema)
database/   e.g. admin-migration.sql          (adds the `role` column)
            e.g. points-migration.sql         (adds the `points` table)
```
Both are blocked outright by their own `.htaccess`. Import these through
phpMyAdmin or `mysql -u root -p < path/to/file.sql` from a terminal —
they're never meant to be loaded by the web server.

## 5. Persisted data — the most sensitive tier
```
data/
  .security/login-attempts.json   brute-force throttle state, keyed by email
  backups/                        timestamped local backup snapshots
  (legacy *.json files, if ever falling back to file-based storage)
```
Blocked by `data/.htaccess` (whole folder), with `data/.security/.htaccess`
and `data/backups/.htaccess` as belt-and-suspenders duplicates in case a
future refactor ever splits this folder across a different vhost.

## Per-user data, not per-browser
`data/` and MySQL hold the durable, server-side copy of each account's
projects/snippets/notes, and — as of `database/points-migration.sql` — its
XP total and daily-bonus streak too (`points` table), decided against the
server's own date rather than the browser's. The browser also keeps a
fast local copy in `localStorage` for instant offline use — the activity
feed, getting-started progress, exam results, and run counts live only
there, since none of those need to follow the account across devices.
Since a shared computer can have more than one community account sign in,
`assets/js/app.js` namespaces every one of those `localStorage` keys under
the signed-in account's id (printed into the page as
`window.CURRENT_USER_ID`, right next to the CSRF token). Logging in as a
different person always starts from that person's own XP and activity —
never a shared or previous account's — and logging back into the first
account picks its own history back up. Pure device settings (dark mode,
text size, sidebar state) are intentionally left un-scoped, since those
are preferences for the computer, not the account.

## Everything else at the root
`README.md`, `LICENSE`, `SECURITY.md` — documentation only, safe to be
readable, no secrets.

## Defense in depth, summarized
- **Folder-level:** `.htaccess` denies all direct requests to `core/`,
  `cli/`, `database/`, `sql/`, and `data/`.
- **File-level:** `save-config.json` (holds a filesystem path) is denied
  individually in the root `.htaccess` since it has to live at the root.
- **App-level:** sessions are hardened (`httponly`, `samesite=Lax`,
  `secure` on HTTPS), all state-changing requests check a per-session CSRF
  token, passwords are never stored or logged in plain text, and both the
  regular login and the admin unlock step share the same file-backed
  brute-force throttle.
