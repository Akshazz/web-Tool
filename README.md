# A-DevTools — Beginner-Friendly Native PHP Edition

A-DevTools is a local development workspace built with **Native PHP, HTML5, CSS3 and Vanilla JavaScript**. Workspace data is stored in your browser with `localStorage`.

## 1. Install it

1. Install **XAMPP**.
2. Start **Apache** from the XAMPP Control Panel.
3. Extract this folder into:
   `C:\xampp\htdocs\a-devtools\`
4. Open your browser and go to:
   `http://localhost/a-devtools/`

> You do **not** need MySQL for the current version. Projects, snippets and notes are saved in the browser.

## 2. If you are a beginner, start here

Open **Snippets** first.

1. Choose a starter that looks useful.
2. Click **Preview** to understand the result.
3. Click **Run** to load the starter into Code Playground.
4. In Playground, change one small thing.
5. Click **Run my code**.
6. Look at the preview on the right.
7. If something goes wrong, click **Reset** and try again.

## 3. What each editor means

- **HTML** = the content and structure: headings, text, buttons, forms and sections.
- **CSS** = the appearance: colors, spacing, size, borders and layout.
- **JavaScript** = behavior: clicks, menus, modals and other interactions.
- **Run my code** = rebuilds the preview using your current code.
- **Preview** = shows the result without changing your real PHP files.

## 4. Suggested learning order

**HTML → CSS → JavaScript → Responsive design → Save as a snippet → Build a project**

The application includes contextual beginner tips so you can learn from the interface instead of having to read a separate manual first.

## 5. New: accessibility & beginner-journey features

- **Guided tour** — shows automatically the first time you open A-DevTools, and can be replayed any time from **Settings → Beginner guide → Replay guided tour**, or via the **?** icon in the top bar.
- **Getting Started checklist** on the Dashboard — 4 real steps (view a snippet, run code, save a snippet, create a project) that tick themselves off as you actually do them, so beginners always know what to try next.
- **Text size control** — **A−** / **A+** buttons in the top bar make all text bigger or smaller instantly; your choice is remembered. Reset it from Settings.
- **Keyboard & screen-reader support** — a "Skip to main content" link, `aria-current` on the active nav item, visible focus outlines, a trapped/returning focus in dialogs, and reduced-motion support for anyone sensitive to animation.
- **Mobile search** — the search icon in the top bar opens a full search field on small screens, where it was previously hidden.
- Higher-contrast text colors and larger minimum font sizes throughout, so labels and captions are easier to read.

## 6. Level-up exam

Choosing **Intermediate** or **Professional** as your experience level now requires passing a short 6-question multiple-choice exam (70% or higher) from **Settings → Experience level → Change experience level**, or the level pill in the top bar. Beginner still needs no exam. Once a level is passed it's remembered in your browser, so you won't be re-quizzed for it again. Exam results are shown with an animated score ring and a smoother, rotating loading indicator while your answers are graded.

## 7. Code Playground editor

The Playground now uses **CodeMirror** for a real code-editor feel:

- Syntax highlighting for HTML, CSS and JavaScript, with real (not decorative) line numbers
- Matching brackets, auto-closing brackets, and a highlighted current line
- **Wrap** toggle in the editor toolbar — on by default, so long lines flow instead of forcing horizontal scrolling
- **Format** button — beautifies the active tab's code (HTML/CSS/JS) using js-beautify
- **Clear** button — empties just the active tab
- **Reset** button (top of the page) — restores all three tabs to the original starting example
- The character count and "Running…/Up to date" status now update live
- Clicking **Run** on any snippet or starter template now correctly loads that code into the Playground (this was previously broken — the code was saved but never displayed)

This adds a few CDN dependencies (CodeMirror + js-beautify from cdnjs), so an internet connection is needed the first time each is cached by your browser; everything else about A-DevTools still runs fully offline via XAMPP.

## 8. Local disk backup

A-DevTools no longer keeps your work only inside the browser:

- **Where it saves by default** — the first time you run A-DevTools, it automatically creates an `A-DevTools-Data` folder on your **Desktop** and saves there — no setup required. If the Desktop can't be found or written to (some locked-down accounts), it falls back to `C:\A-DevTools-Data`, then your user home folder, then a `data/` folder next to `index.php`. If you're upgrading an install that already had data in that last `data/` folder, it keeps using that folder as the default so nothing appears to move.
- Every time you create, edit or delete a **project**, **snippet** or **note**, it's saved into that type's single JSON file in that folder (`projects.json`, `snippets.json`, `notes.json`) — a real file on your local drive, not just `localStorage`. Each save **rewrites** that one file with your current list; it never creates a new file per item, so the folder stays tidy no matter how many items you add. (If you're upgrading from an older version that used one file per item, those old files are automatically folded into the new single file the first time you open the app, then removed.) Projects and notes can now be edited (not just created and deleted), and each edit instantly updates the file on disk — you don't need to run a manual backup for day-to-day changes to be saved.
- A **backup reminder banner** appears once you have some data, on every page, until you dismiss it or download a backup. It's a nudge to save a personal copy somewhere safe (your Desktop or any other drive).
- From **Settings → Local disk backup** you can:
  - See how many items are currently mirrored to disk and when the last full backup ran.
  - Click **Save backup to disk now** to write a timestamped snapshot into `data/backups/` on this computer.
  - Click **Download backup file** to get a `.json` copy through your browser's normal save dialog — pick your Desktop, a USB drive, cloud folder, anywhere you like.
- All of this is handled by the small `save-data.php` endpoint included in this folder; it only ever reads and writes inside the configured data folder on this machine, nothing is sent anywhere else.
- **Configurable save location** — from **Settings → Local disk backup → Save location** you can point saving at a different folder instead of the automatic default (e.g. a folder name like `my-backups`, or a full path like `D:/A-DevTools-Data`). The choice is remembered in `save-config.json` next to `index.php`. Leave the field blank and click **Reset to default** to go back to the automatic default. Changing the location does not move files already saved under the old one.
- **Import / Export** — **Download backup file** (above) exports everything as a portable `.json` file. **Import backup file**, next to it, loads one back in: you choose whether to *merge* it with what you already have (matching items get overwritten, everything else stays) or *replace* your current projects, snippets and notes with the file's contents. This makes it straightforward to move your workspace to another computer or restore an older copy.

- **Set-up status on the Dashboard** — the first time you open A-DevTools, the Dashboard shows a **Set up local saving** notice; click **Use default location** (or choose a custom folder from Settings) to confirm it. From then on — and automatically for anyone who already has saved data — the Dashboard instead shows a **Connected** status indicating projects, snippets and notes are saving to disk automatically. If `save-data.php` can't be reached (e.g. you opened the file directly instead of through Apache/XAMPP), a warning is shown there instead.

The Code Playground runs code inside a sandboxed iframe. It is intended for front-end experiments. It does not execute PHP inside the playground.

## 9. Community accounts (sign up / log in)

A-DevTools now sits behind a free account:

- Visiting the app with no session shows a **landing page** with a **Get Started** button.
- **Get Started** leads to **Join Community** (sign up: name, email, password). **I already have an account** leads to **Log in**.
- Once logged in, the topbar avatar shows your initial; click it for your name/email and a **Log out** button.
- Accounts are handled by `auth.php` (register/login/logout) and `auth-helpers.php`, using PHP sessions and `password_hash()` — no plain-text passwords are ever stored.

## 10. Using MySQL instead of JSON files

By default, accounts and workspace data are stored in MySQL (this requires the setup below). If you'd rather not set up MySQL, see "Falling back to JSON files" at the end of this section.

**Setup (once):**

1. Start **Apache** and **MySQL** from the XAMPP Control Panel.
2. Import the schema: open **phpMyAdmin → Import**, choose `sql/a-devtools-schema.sql`, and click **Go**. (Or from a terminal: `mysql -u root -p < sql/a-devtools-schema.sql`.) This creates the `a_devtools` database with `users`, `projects`, `notes` and `snippets` tables.
3. Open `config.php` and check the connection details match your MySQL setup. The defaults (`root`, no password, `127.0.0.1:3306`) match a fresh XAMPP install, so most people won't need to change anything.

**What's stored where:**

- **Accounts** (`users` table) — created the moment someone signs up.
- **Projects / snippets / notes** — still kept in the browser's `localStorage` for instant, offline use, and mirrored into MySQL (scoped to your account) on every create/edit/delete, via `save-data.php`.
- **Downloadable backups** (Settings → Local disk backup) are unchanged — still plain `.json` snapshot files in `data/backups/`, so you can move a copy to another computer or restore an older point in time regardless of where the live data lives.

**Migrating old data:** if you used A-DevTools before accounts existed, `data/projects.json`, `data/notes.json` and `data/snippets.json` may still hold real work that isn't tied to any account yet. After signing up, assign that old data to your new account from a terminal:

```
php migrate.php you@example.com
```

This copies those three files into MySQL under that account. It's safe to run more than once (existing rows are updated, not duplicated) and it never deletes the original `.json` files.

**Falling back to JSON files:** if you don't want to set up MySQL, revert `auth.php`, `auth-helpers.php` and `save-data.php` to file-based storage (accounts in `data/users.json`, workspace data in `data/*.json`, same approach as the original local-only version of this app) — ask whoever built this fork for that version, or keep a copy of it before migrating.
