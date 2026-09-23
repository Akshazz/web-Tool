<?php
require_once __DIR__ . '/core/security.php';
acodeplayground_start_session();
acodeplayground_security_headers();
require_once __DIR__ . '/core/auth-helpers.php';
require_once __DIR__ . '/core/legal-content.php';
$currentUser = currentUser();

// Landing / login / signup are public "Community" pages with their own
// lightweight template (no sidebar/topbar app shell) — see guest.php.
$guestPages = array('landing', 'login', 'signup', 'terms', 'privacy');
$loggedInRedirectPages = array('landing', 'login', 'signup');
$requestedPage = isset($_GET['page']) ? $_GET['page'] : null;

if (in_array($requestedPage, $guestPages, true)) {
    // Terms/Privacy stay readable even for a logged-in user; landing/login/
    // signup send them straight to the dashboard instead.
    if ($currentUser && in_array($requestedPage, $loggedInRedirectPages, true)) { header('Location: ?page=dashboard'); exit; }
    $page = $requestedPage;
    $cssVersion = file_exists(__DIR__ . '/assets/css/app.css') ? filemtime(__DIR__ . '/assets/css/app.css') : time();
    $i18nVersion = file_exists(__DIR__ . '/assets/js/i18n.js') ? filemtime(__DIR__ . '/assets/js/i18n.js') : time();
    $pwaVersion  = file_exists(__DIR__ . '/assets/js/pwa.js') ? filemtime(__DIR__ . '/assets/js/pwa.js') : time();
    require __DIR__ . '/guest.php';
    exit;
}

if (!$currentUser) {
    header('Location: ?page=landing');
    exit;
}

$pages = array(
    'dashboard' => 'Dashboard',
    'code' => 'Code Playground',
    'php' => 'PHP Playground',
    'sql' => 'SQL Playground',
    'playground' => 'Combined Playground',
    'php-sample' => 'PHP Examples',
    'components' => 'Components',
    'snippets' => 'Code Snippets',
    'projects' => 'My Projects',
    'notes' => 'My Notes',
    'settings' => 'Settings',
    'ui-guide' => 'Design Guide'
);
// "Saved" pages live in their own sidebar section (not the WORKSPACE loop
// above), but are otherwise normal pages with their own body — kept in a
// separate map so they don't also render as WORKSPACE nav items.
$savedPages = array(
    'saved-snippets' => 'Saved Snippets',
    'saved-components' => 'Saved Components'
);
$page = isset($requestedPage) ? $requestedPage : 'dashboard';
if (!isset($pages[$page]) && !isset($savedPages[$page])) { $page = 'dashboard'; }
$validExperienceLevels = array('beginner', 'intermediate', 'professional');
$cookieExperience = (isset($_COOKIE['experienceLevel']) && in_array($_COOKIE['experienceLevel'], $validExperienceLevels, true)) ? $_COOKIE['experienceLevel'] : null;
$dbExperience = (isset($currentUser['expertiseLevel']) && in_array($currentUser['expertiseLevel'], $validExperienceLevels, true)) ? $currentUser['expertiseLevel'] : null;
// The database value is authoritative once set — it's what survives a
// cleared cookie/localStorage or a switch to a new browser. Fall back to the
// cookie for accounts that picked a level before this was persisted to the
// database.
$experienceLevel = $dbExperience !== null ? $dbExperience : $cookieExperience;
// XP / rank / daily-bonus streak, read from the `points` table so it's
// the same for this account on any browser or device (see
// database/points-migration.sql and getUserPoints() in auth-helpers.php).
$serverPoints = getUserPoints($currentUser['id']);
// Google Drive backup: is it set up on this server, and linked for this account? (see gdrive.php)
$gdriveSummary = getGdriveSummary($currentUser['id']);
$experienceLabels = array('beginner' => 'Beginner', 'intermediate' => 'Intermediate', 'professional' => 'Professional');
$experienceLabel = isset($experienceLabels[$experienceLevel]) ? $experienceLabels[$experienceLevel] : 'Not set';
$cssVersion = file_exists(__DIR__ . '/assets/css/app.css') ? filemtime(__DIR__ . '/assets/css/app.css') : time();
$jsVersion  = file_exists(__DIR__ . '/assets/js/app.js') ? filemtime(__DIR__ . '/assets/js/app.js') : time();
$componentsVersion = file_exists(__DIR__ . '/assets/js/components.js') ? filemtime(__DIR__ . '/assets/js/components.js') : time();
$componentsPhpVersion = file_exists(__DIR__ . '/assets/js/components-php.js') ? filemtime(__DIR__ . '/assets/js/components-php.js') : time();
$phpBasicsVersion = file_exists(__DIR__ . '/assets/js/php-basics.js') ? filemtime(__DIR__ . '/assets/js/php-basics.js') : time();
$phpPlaygroundVersion = file_exists(__DIR__ . '/assets/js/php-playground.js') ? filemtime(__DIR__ . '/assets/js/php-playground.js') : time();
$sqlPlaygroundVersion = file_exists(__DIR__ . '/assets/js/sql-playground.js') ? filemtime(__DIR__ . '/assets/js/sql-playground.js') : time();
$playgroundVersion = file_exists(__DIR__ . '/assets/js/playground.js') ? filemtime(__DIR__ . '/assets/js/playground.js') : time();
$i18nVersion = file_exists(__DIR__ . '/assets/js/i18n.js') ? filemtime(__DIR__ . '/assets/js/i18n.js') : time();
$pwaVersion  = file_exists(__DIR__ . '/assets/js/pwa.js') ? filemtime(__DIR__ . '/assets/js/pwa.js') : time();
function e($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
/* One sidebar nav link. Shared by the flat WORKSPACE items and the Playgrounds
   dropdown so a link always renders the same way in both places. */
if (!function_exists('render_nav_link')) {
    function render_nav_link($key, $label, $page, $icons) {
        $active = ($page === $key);
        echo '<a class="nav-item' . ($active ? ' active' : '') . '" href="?page=' . e($key) . '" title="' . e($label) . '"'
            . ($active ? ' aria-current="page"' : '') . '>'
            . '<span class="nav-icon"><i class="' . e($icons[$key === 'ui-guide' ? 'guide' : $key]) . '"></i></span>'
            . '<span class="nav-text" data-i18n="nav.' . e($key) . '">' . e($label) . '</span>'
            . '</a>' . "\n";
    }
}
/* Small uppercase divider inside the Playgrounds dropdown, grouping the four
   playgrounds by where the code they teach actually runs: Code Playground is
   client-side (HTML/CSS/JS in the browser); PHP and SQL Playground are
   server-side languages (run here via WebAssembly, not a real server, but
   the language and skills are backend); Combined Playground touches both in
   one editor, so it gets its own "Full-Stack" group rather than either. */
if (!function_exists('render_nav_category_label')) {
    function render_nav_category_label($text, $i18nKey) {
        echo '<div class="nav-sub-label"' . ($i18nKey ? ' data-i18n="' . e($i18nKey) . '"' : '') . '>' . e($text) . '</div>' . "\n";
    }
}
$icons = array(
    'dashboard' => 'bx bx-grid-alt',
    'code' => 'bx bx-code-alt',
    'playground' => 'bx bx-terminal',
    'php' => 'bx bxl-php',
    'sql' => 'bx bx-data',
    'php-sample' => 'bx bx-table',
    'components' => 'bx bx-layer',
    'snippets' => 'bx bx-code-curly',
    'projects' => 'bx bx-folder-open',
    'notes' => 'bx bx-note',
    'settings' => 'bx bx-cog',
    'guide' => 'bx bx-book-open'
);
?>
<!doctype html>
<html lang="en"<?php echo $experienceLevel !== null ? ' data-experience="' . e($experienceLevel) . '"' : ''; ?>>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111214">
<title>A-Code Playground — Personal Development Tool</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="assets/icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="A-Code Playground">
<link rel="preconnect" href="https://cdnjs.cloudflare.com">

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/boxicons/2.1.4/css/boxicons.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/material-darker.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/neat.min.css">
<link rel="stylesheet" href="assets/css/app.css?v=<?php echo $cssVersion; ?>">
</head>
<body>
<a href="#mainContent" class="skip-link">Skip to main content</a>
<div class="app-shell">
    <header class="topbar">
        <button class="icon-btn" id="sidebarToggle" title="Toggle sidebar" aria-label="Toggle sidebar" data-i18n-title="topbar.sidebarToggle"><i class="bx bx-menu"></i></button>
        <a class="brand" href="?page=dashboard" aria-label="A-Code Playground home"><span class="brand-mark"><i class="bx bx-code-alt"></i></span><span>A-Code Playground</span></a>
        <div class="topbar-search" id="topbarSearch">
            <i class="bx bx-search"></i>
            <input id="globalSearch" placeholder="Search projects, snippets, notes..." autocomplete="off" aria-label="Global search" data-i18n-placeholder="topbar.searchPlaceholder">
        </div>
        <div class="top-actions">
            <button class="icon-btn mobile-only" id="mobileSearchToggle" title="Search" aria-label="Open search" data-i18n-title="topbar.search"><i class="bx bx-search"></i></button>
            <div class="quick-controls-group" id="quickControlsGroup">
                <button class="icon-btn" id="themeToggle" title="Toggle theme" aria-label="Toggle dark mode" data-i18n-title="topbar.theme"><i class="bx bx-moon"></i><span class="quick-row-label" id="themeToggleLabel" data-i18n="topbar.themeDark">Dark mode</span></button>
                <button class="pill-btn" id="experienceBtn" title="Change experience level" aria-label="Change experience level"><i class="bx bx-user-voice" id="experienceBtnIcon"></i><span id="experienceBtnLabel"><?php echo e($experienceLabel); ?></span></button>
                <div class="lang-picker" id="langPicker">
                    <button type="button" class="pill-btn lang-btn" id="langBtn" title="Change language" aria-label="Change language" aria-haspopup="true" aria-expanded="false" data-i18n-title="lang.picker">
                        <span class="lang-flag-current" id="langFlagCurrent" aria-hidden="true">🇬🇧</span><span id="langCode">EN</span><i class="bx bx-chevron-down"></i>
                    </button>
                    <div class="lang-dropdown" id="langDropdown" role="menu" aria-label="Choose language" hidden>
                        <div class="lang-dropdown-title">Choose language</div>
                        <button type="button" class="lang-option active" data-lang="en" role="menuitemradio" aria-checked="true" tabindex="0"><span class="lang-flag">🇬🇧</span><span class="lang-text"><span class="lang-native">English</span><small class="lang-english">English</small></span><i class="bx bx-check lang-check"></i></button>
                        <button type="button" class="lang-option" data-lang="es" role="menuitemradio" aria-checked="false" tabindex="-1"><span class="lang-flag">🇪🇸</span><span class="lang-text"><span class="lang-native">Español</span><small class="lang-english">Spanish</small></span><i class="bx bx-check lang-check"></i></button>
                        <button type="button" class="lang-option" data-lang="fr" role="menuitemradio" aria-checked="false" tabindex="-1"><span class="lang-flag">🇫🇷</span><span class="lang-text"><span class="lang-native">Français</span><small class="lang-english">French</small></span><i class="bx bx-check lang-check"></i></button>
                        <button type="button" class="lang-option" data-lang="de" role="menuitemradio" aria-checked="false" tabindex="-1"><span class="lang-flag">🇩🇪</span><span class="lang-text"><span class="lang-native">Deutsch</span><small class="lang-english">German</small></span><i class="bx bx-check lang-check"></i></button>
                        <button type="button" class="lang-option" data-lang="tl" role="menuitemradio" aria-checked="false" tabindex="-1"><span class="lang-flag">🇵🇭</span><span class="lang-text"><span class="lang-native">Filipino</span><small class="lang-english">Filipino</small></span><i class="bx bx-check lang-check"></i></button>
                    </div>
                    <div class="lang-backdrop" id="langBackdrop" hidden></div>
                </div>
            </div>
            <span id="quickControlsAnchor" hidden aria-hidden="true"></span>
            <button class="icon-btn" id="helpBtn" title="Help & guided tour" aria-label="Help and guided tour" data-i18n-title="topbar.help"><i class="bx bx-help-circle"></i></button>
            <div class="notification-menu" id="notificationMenu">
                <button class="icon-btn" id="notificationBtn" title="Activity" aria-label="View recent activity" aria-haspopup="true" aria-expanded="false" data-i18n-title="topbar.activity"><i class="bx bx-bell"></i><span class="notif-dot" id="notifDot" hidden></span></button>
                <div class="notification-dropdown" id="notificationDropdown" hidden>
                    <div class="notification-dropdown-header"><b>Recent activity</b><a href="?page=settings" class="text-link">View all</a></div>
                    <div id="notificationList" class="notification-list"><div class="empty">No activity yet.</div></div>
                </div>
            </div>
            <div class="account-menu" id="accountMenu">
                <button class="avatar" id="accountMenuBtn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu"><?php echo e(strtoupper(substr($currentUser['name'], 0, 1))); ?></button>
                <div class="account-dropdown" id="accountDropdown" hidden>
                    <div class="account-dropdown-header">
                        <div class="account-avatar-ring rank-junior" id="accountAvatarRing">
                            <span class="account-avatar-initial"><?php echo e(strtoupper(substr($currentUser['name'], 0, 1))); ?></span>
                            <span class="account-avatar-badge" id="accountAvatarBadge"><i class="bx bx-code-alt"></i></span>
                        </div>
                        <div class="account-dropdown-id">
                            <div class="account-dropdown-name"><?php echo e($currentUser['name']); ?></div>
                            <div class="account-dropdown-email muted"><?php echo e($currentUser['email']); ?></div>
                        </div>
                    </div>
                    <div class="account-rank-row" id="accountRankText"><i class="bx bx-code-alt"></i> <b>Junior Developer</b> <span class="rank-sub-badge rank-junior">V</span> <span class="muted">· 0 XP</span></div>
                    <div class="xp-bar" role="progressbar" aria-label="XP progress to next rank" aria-valuemin="0" aria-valuemax="100"><div class="xp-bar-fill" id="xpBarFill" style="width:0%"></div></div>
                    <div class="xp-bar-label" id="xpBarLabel">Earn XP to rank up</div>
                    <div class="account-quick-settings-wrap" id="accountQuickSettingsWrap">
                        <div class="account-dropdown-divider">Quick settings</div>
                        <div class="account-quick-settings" id="quickControlsMobileSlot"></div>
                    </div>
                    <button type="button" class="ghost-btn account-edit-btn" id="viewProfileBtn"><i class="bx bx-id-card"></i> View Profile</button>
                    <button class="ghost-btn account-logout" id="logoutBtn"><i class="bx bx-log-out"></i> <span data-i18n="topbar.logout">Log out</span></button>
                </div>
            </div>
        </div>
    </header>
    <div class="mobile-search-panel" id="mobileSearchPanel" hidden>
        <div class="topbar-search">
            <i class="bx bx-search"></i>
            <input id="globalSearchMobile" placeholder="Search projects, snippets, notes..." autocomplete="off" aria-label="Global search (mobile)">
        </div>
        <button class="icon-btn" id="mobileSearchClose" aria-label="Close search"><i class="bx bx-x"></i></button>
    </div>

    <aside class="sidebar" id="sidebar" role="navigation" aria-label="Workspace navigation">
        <div class="sidebar-scroll">
        <button type="button" class="nav-item side-cta" id="newProject" title="New Project"><span class="nav-icon"><i class="bx bx-plus"></i></span><span class="nav-text" data-i18n="qt.newProject">New Project</span></button>
        <div class="side-section">
            <div class="side-label" data-i18n="side.workspace">WORKSPACE</div>
            <?php
            /* The four playgrounds share one collapsible "Playgrounds" dropdown, placed where the
               first of them used to sit. It renders open only while one of them is the current
               page (so the active item is never hidden) and closed on every other page - the
               open/closed state is deliberately not remembered. Other pages stay plain flat items. */
            $playgroundKeys = array('code', 'php', 'sql', 'playground');
            $playgroundGroupDone = false;
            $groupOpen = in_array($page, $playgroundKeys, true);
            foreach ($pages as $key => $label):
                if (in_array($key, $playgroundKeys, true)):
                    if ($playgroundGroupDone) { continue; }
                    $playgroundGroupDone = true;
            ?>
                <div class="nav-group<?php echo $groupOpen ? ' open' : ''; ?>" id="navGroupPlaygrounds">
                    <button type="button" class="nav-item nav-group-toggle<?php echo $groupOpen ? ' has-active' : ''; ?>" id="navGroupToggle" aria-haspopup="true" aria-expanded="<?php echo $groupOpen ? 'true' : 'false'; ?>" aria-controls="navGroupBody" title="Playgrounds">
                        <span class="nav-icon"><i class="bx bx-play-circle"></i></span>
                        <span class="nav-text" data-i18n="nav.playgrounds">Playgrounds</span>
                        <span class="nav-chevron" aria-hidden="true"><i class="bx bx-chevron-down"></i></span>
                    </button>
                    <div class="nav-group-body" id="navGroupBody" role="group" aria-label="Playgrounds">
                        <div class="nav-sub"><div class="nav-sub-list">
                            <?php render_nav_category_label('Frontend', 'nav.groupFrontend'); ?>
                            <?php render_nav_link('code', 'PLAY Code', $page, $icons); ?>
                            <?php render_nav_category_label('Backend', 'nav.groupBackend'); ?>
                            <?php render_nav_link('php', 'PLAY PHP', $page, $icons); ?>
                            <?php render_nav_link('sql', 'PLAY SQL', $page, $icons); ?>
                            <?php render_nav_category_label('Full-Stack', 'nav.groupFullstack'); ?>
                            <?php render_nav_link('playground', 'PLAY All', $page, $icons); ?>
                        </div></div>
                    </div>
                </div>
            <?php
                    continue;
                endif;
                // Settings now lives only as the gear icon in the sidebar footer
                // (next to "Local workspace · <level>"), not as a WORKSPACE row —
                // ?page=settings stays a valid page either way.
                if ($key === 'settings') { continue; }
                render_nav_link($key, $label, $page, $icons);
            endforeach;
            ?>
        </div>
        <div class="side-section">
            <div class="side-label" data-i18n="side.saved">SAVED</div>
            <a class="nav-item <?php echo $page === 'saved-snippets' ? 'active' : ''; ?>" id="sidebarSavedSnippets" href="?page=saved-snippets" title="Saved Snippets"<?php echo $page === 'saved-snippets' ? ' aria-current="page"' : ''; ?>>
                <span class="nav-icon"><i class="bx bx-code-curly"></i></span>
                <span class="nav-text" data-i18n="side.savedSnippets">Saved Snippets</span>
                <span class="nav-count" id="sidebarSnippetCount">0</span>
            </a>
            <a class="nav-item <?php echo $page === 'saved-components' ? 'active' : ''; ?>" id="sidebarSavedComponents" href="?page=saved-components" title="Saved Components"<?php echo $page === 'saved-components' ? ' aria-current="page"' : ''; ?>>
                <span class="nav-icon"><i class="bx bx-layer"></i></span>
                <span class="nav-text" data-i18n="side.savedComponents">Saved Components</span>
                <span class="nav-count" id="sidebarComponentCount">0</span>
            </a>
        </div>
        <div class="side-section">
            <div class="side-label" data-i18n="side.quickTools">QUICK TOOLS</div>
            <button class="nav-item" id="recycleBinBtn" title="Recycle Bin"><span class="nav-icon"><i class="bx bx-trash"></i></span><span class="nav-text">Recycle Bin</span><span class="nav-count hidden" id="trashCount">0</span></button>
            <?php if ($experienceLevel === null || $experienceLevel === 'beginner'): ?>
            <button class="nav-item" id="quickTour" title="Take a Tour"><span class="nav-icon"><i class="bx bx-compass"></i></span><span class="nav-text" data-i18n="qt.guidedTour">Take a Tour</span></button>
            <?php endif; ?>
        </div>
        </div>
        <div class="sidebar-bottom"><a class="nav-item sidebar-bottom-settings<?php echo $page === 'settings' ? ' active' : ''; ?>" id="sidebarBottomSettings" href="?page=settings" title="Settings"<?php echo $page === 'settings' ? ' aria-current="page"' : ''; ?>><span class="nav-icon"><i class="bx bx-cog"></i></span><span class="nav-text" data-i18n="nav.settings">Settings</span></a></div>
    </aside>
    <?php /* Shown instead of the inline dropdown while the sidebar is minimized to its icon rail. Kept
             outside <aside> so the rail's icons-only styles don't apply to it. Hidden by the browser
             until opened; see the "Playgrounds popover" block in app.js. */ ?>
    <div class="nav-flyout" id="navFlyout" popover="manual" role="group" aria-label="Playgrounds">
        <div class="nav-flyout-title" data-i18n="nav.playgrounds">Playgrounds</div>
        <?php render_nav_category_label('Frontend', 'nav.groupFrontend'); ?>
        <?php render_nav_link('code', 'PLAY Code', $page, $icons); ?>
        <?php render_nav_category_label('Backend', 'nav.groupBackend'); ?>
        <?php render_nav_link('php', 'PLAY PHP', $page, $icons); ?>
        <?php render_nav_link('sql', 'PLAY SQL', $page, $icons); ?>
        <?php render_nav_category_label('Full-Stack', 'nav.groupFullstack'); ?>
        <?php render_nav_link('playground', 'PLAY All', $page, $icons); ?>
    </div>
    <div class="sidebar-backdrop" id="sidebarBackdrop" hidden></div>

    <main class="main" id="mainContent" tabindex="-1">
        <div class="page-wrap">
        <div class="backup-notice" id="backupNotice" hidden>
            <i class="bx bx-hdd"></i>
            <div class="backup-notice-text"><b>Back up your work to disk</b><span>Projects, snippets and notes auto-save to a dedicated local folder on this computer (<code>C:\A-CodePlayground\BackupFiles</code>, by default). You can also save a personal copy to your Desktop or any drive.</span></div>
            <div class="backup-notice-actions">
                <button class="small-btn" id="backupNoticeDownload"><i class="bx bx-download"></i> Download backup</button>
                <button class="icon-btn" id="backupNoticeDismiss" aria-label="Dismiss backup reminder" title="Dismiss"><i class="bx bx-x"></i></button>
            </div>
        </div>
        <?php if ($page === 'dashboard'): ?>
        <div class="save-setup-banner" id="saveSetupBanner" hidden>
            <i class="bx bx-cloud-upload"></i>
            <div class="save-setup-text"><b>Set up local saving</b><span>Confirm where A-Code Playground should save your projects, snippets and notes on this computer.</span></div>
            <div class="save-setup-actions">
                <button class="small-btn primary-btn" id="saveSetupConfirm"><i class="bx bx-check"></i> Use default location</button>
                <a class="small-btn ghost-btn" href="?page=settings#localDiskBackup"><i class="bx bx-cog"></i> Choose a custom folder</a>
            </div>
        </div>
        <div class="save-setup-banner save-setup-warning" id="saveSetupWarning" hidden>
            <i class="bx bx-error-circle"></i>
            <div class="save-setup-text"><b>Local saving unavailable</b><span>Run A-Code Playground through Apache (e.g. via XAMPP) so <code>save-data.php</code> can write your files to disk.</span></div>
        </div>
        <div class="save-status-card" id="saveStatusCard" hidden>
            <span class="status-dot"></span>
            <div><b>Connected</b><span id="saveStatusText">Saving projects, snippets and notes automatically.</span></div>
        </div>
        <?php endif; ?>
        <?php if ($page === 'dashboard' && $experienceLevel === 'professional'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="dash.pro.eyebrow">WORKSPACE</div><h1 data-i18n="dash.pro.title">Dashboard</h1><p data-i18n="dash.pro.subtitle">Projects, snippets, notes and the playground, in one local workspace.</p></div></section>
            <section class="panel streak-week-panel streak-week-compact" id="streakWeekPanel">
                <div class="panel-head">
                    <div><h2><i class="bx bx-calendar-check"></i> Daily Login</h2><p class="muted" style="margin:4px 0 0">Log in once a day — Day 7 unlocks a final bonus, then the week starts again.</p></div>
                    <span class="progress-label" id="streakDayLabel"><i class="bx bxs-flame"></i> Day 1 of 7</span>
                </div>
                <div class="streak-week-grid" id="streakWeekGrid">
                    <?php for ($d = 1; $d <= 7; $d++): $isFinal = $d === 7; ?>
                    <div class="streak-day<?php echo $isFinal ? ' streak-day-final' : ''; ?> locked" data-streak-day="<?php echo $d; ?>">
                        <span class="streak-day-num">Day <?php echo $d; ?></span>
                        <span class="streak-day-icon"><i class="bx <?php echo $isFinal ? 'bx-crown' : 'bx-gift'; ?>"></i></span>
                        <span class="streak-day-xp">+<?php echo 10 + ($d - 1) * 2; ?> XP</span>
                        <?php if ($isFinal): ?><span class="streak-final-badge">Final Bonus</span><?php endif; ?>
                    </div>
                    <?php endfor; ?>
                </div>
                <button type="button" class="ghost-btn claim-bonus-btn streak-claim-btn" id="streakClaimBtn"><i class="bx bx-gift"></i> Claim Daily Bonus</button>
            </section>
            <div class="stats-grid">
                <a href="?page=projects" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-projects"><i class="bx bx-folder-open"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.projects">Projects</span><strong id="projectCount">0</strong><small data-i18n="stat.projectsDesc">saved locally</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <a href="?page=snippets" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-snippets"><i class="bx bx-code-curly"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.snippets">Snippets</span><strong id="snippetCount">0</strong><small data-i18n="stat.snippetsDesc">code references</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <a href="?page=notes" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-notes"><i class="bx bx-note"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.notes">Notes</span><strong id="noteCount">0</strong><small data-i18n="stat.notesDesc">development notes</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <div class="stat-card stat-card-storage">
                    <span class="stat-card-icon stat-icon-storage"><i class="bx bx-hdd"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.storage">Storage</span><strong data-i18n="stat.local">Local</strong><small data-i18n="stat.storageDesc">browser storage</small><button type="button" class="stat-folder-btn" id="viewBackupFolderBtn"><i class='bx bx-folder-open'></i> <span data-i18n="stat.viewFolder">View folder</span></button></span>
                </div>
            </div>
                            <section class="panel"><div class="panel-head"><h2>Shortcuts</h2></div><div class="quick-grid">
                    <a href="?page=code" class="quick-card"><b><i class="bx bx-code-alt"></i></b><span data-i18n="quick.code">Code Playground</span><small data-i18n="quick.codeDesc">Write and preview HTML/CSS/JS</small></a>
                    <a href="?page=php" class="quick-card"><b><i class="bx bxl-php"></i></b><span data-i18n="quick.php">PHP Playground</span><small data-i18n="quick.phpDesc">Run real PHP in your browser</small></a>
                    <a href="?page=components" class="quick-card"><b><i class="bx bx-layer"></i></b><span data-i18n="quick.components">UI Components</span><small data-i18n="quick.componentsDesc">Reusable interface patterns</small></a>
                    <a href="?page=snippets" class="quick-card"><b><i class="bx bx-code-curly"></i></b><span data-i18n="quick.snippets">Snippets</span><small data-i18n="quick.snippetsDesc">Save frequently used code</small></a>
                    <a href="?page=notes" class="quick-card"><b><i class="bx bx-note"></i></b><span data-i18n="quick.notes">Development Notes</span><small data-i18n="quick.notesDesc">Keep ideas and references</small></a>
                </div></section>
            <section class="panel dash-level-panel dash-level-compact">
                <div class="panel-head"><h2><i class="bx bx-trophy"></i> Your Rank</h2><span class="muted">Every action earns XP</span></div>
                <div class="dash-level-row">
                    <div class="dash-rank-icon-wrap"><i class="bx bx-code-alt" id="dashRankIcon"></i></div>
                    <div class="dash-level-info">
                        <div class="dash-rank-label" id="dashRankLabel">Junior Developer <span class="rank-sub-badge rank-junior">V</span></div>
                        <div class="xp-bar large"><div class="xp-bar-fill" id="dashXpFill" style="width:0%"></div></div>
                        <div class="xp-bar-label" id="dashXpLabel">0 XP</div>
                    </div>
                </div>
            </section>
            <section class="panel xp-leaderboard-panel xp-leaderboard-compact" id="xpLeaderboardPanel">
                <div class="panel-head"><h2><i class="bx bx-medal"></i> Leaderboard</h2><span class="muted">Ranked by total XP</span></div>
                <div class="xp-leaderboard-you" id="xpLeaderboardYou">
                    <span class="xp-leaderboard-you-pos" id="xpLeaderboardYouPos">#—</span>
                    <span class="avatar xp-leaderboard-avatar" id="xpLeaderboardYouAvatar">?</span>
                    <div class="xp-leaderboard-you-info">
                        <b id="xpLeaderboardYouName">You</b>
                        <small class="muted" id="xpLeaderboardYouXp">0 XP</small>
                    </div>
                    <span class="xp-session-pill" id="xpSessionPill" title="XP earned since you opened the app this session"><i class="bx bxs-bolt"></i> +0 XP this session</span>
                </div>
                <ol class="xp-leaderboard-list" id="xpLeaderboardList"><li class="empty">Loading leaderboard…</li></ol>
            </section>
        <?php elseif ($page === 'dashboard' && $experienceLevel === 'intermediate'): ?>
            <section class="hero">
                <div><div class="eyebrow" data-i18n="dash.hero.eyebrow">PERSONAL DEVELOPMENT WORKSPACE</div><h1 data-i18n="dash.hero.title">Build. Test. Learn. Ship.</h1><p data-i18n="dash.inter.subtitle">Jump back into your projects, snippets and notes, or open the Playground to keep experimenting.</p></div>
            </section>
            <section class="panel streak-week-panel streak-week-compact" id="streakWeekPanel">
                <div class="panel-head">
                    <div><h2><i class="bx bx-calendar-check"></i> Daily Login</h2><p class="muted" style="margin:4px 0 0">Log in once a day — Day 7 unlocks a final bonus, then the week starts again.</p></div>
                    <span class="progress-label" id="streakDayLabel"><i class="bx bxs-flame"></i> Day 1 of 7</span>
                </div>
                <div class="streak-week-grid" id="streakWeekGrid">
                    <?php for ($d = 1; $d <= 7; $d++): $isFinal = $d === 7; ?>
                    <div class="streak-day<?php echo $isFinal ? ' streak-day-final' : ''; ?> locked" data-streak-day="<?php echo $d; ?>">
                        <span class="streak-day-num">Day <?php echo $d; ?></span>
                        <span class="streak-day-icon"><i class="bx <?php echo $isFinal ? 'bx-crown' : 'bx-gift'; ?>"></i></span>
                        <span class="streak-day-xp">+<?php echo 10 + ($d - 1) * 2; ?> XP</span>
                        <?php if ($isFinal): ?><span class="streak-final-badge">Final Bonus</span><?php endif; ?>
                    </div>
                    <?php endfor; ?>
                </div>
                <button type="button" class="ghost-btn claim-bonus-btn streak-claim-btn" id="streakClaimBtn"><i class="bx bx-gift"></i> Claim Daily Bonus</button>
            </section>
            <div class="stats-grid">
                <a href="?page=projects" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-projects"><i class="bx bx-folder-open"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.projects">Projects</span><strong id="projectCount">0</strong><small data-i18n="stat.projectsDesc">saved locally</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <a href="?page=snippets" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-snippets"><i class="bx bx-code-curly"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.snippets">Snippets</span><strong id="snippetCount">0</strong><small data-i18n="stat.snippetsDesc">code references</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <a href="?page=notes" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-notes"><i class="bx bx-note"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.notes">Notes</span><strong id="noteCount">0</strong><small data-i18n="stat.notesDesc">development notes</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <div class="stat-card stat-card-storage">
                    <span class="stat-card-icon stat-icon-storage"><i class="bx bx-hdd"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.storage">Storage</span><strong data-i18n="stat.local">Local</strong><small data-i18n="stat.storageDesc">browser storage</small><button type="button" class="stat-folder-btn" id="viewBackupFolderBtn"><i class='bx bx-folder-open'></i> <span data-i18n="stat.viewFolder">View folder</span></button></span>
                </div>
            </div>
                            <section class="panel"><div class="panel-head"><h2>Quick start</h2></div><div class="quick-grid">
                    <a href="?page=code" class="quick-card"><b><i class="bx bx-code-alt"></i></b><span data-i18n="quick.code">Code Playground</span><small data-i18n="quick.codeDesc">Write and preview HTML/CSS/JS</small></a>
                    <a href="?page=php" class="quick-card"><b><i class="bx bxl-php"></i></b><span data-i18n="quick.php">PHP Playground</span><small data-i18n="quick.phpDesc">Run real PHP in your browser</small></a>
                    <a href="?page=components" class="quick-card"><b><i class="bx bx-layer"></i></b><span data-i18n="quick.components">UI Components</span><small data-i18n="quick.componentsDesc">Reusable interface patterns</small></a>
                    <a href="?page=snippets" class="quick-card"><b><i class="bx bx-code-curly"></i></b><span data-i18n="quick.snippets">Snippets</span><small data-i18n="quick.snippetsDesc">Save frequently used code</small></a>
                    <a href="?page=notes" class="quick-card"><b><i class="bx bx-note"></i></b><span data-i18n="quick.notes">Development Notes</span><small data-i18n="quick.notesDesc">Keep ideas and references</small></a>
                </div></section>
            <section class="panel"><div class="panel-head"><h2>Need a refresher?</h2></div><p class="muted">Replay the guided tour or revisit the beginner steps anytime from <a class="text-link" href="?page=settings">Settings</a>.</p></section>
            <section class="panel dash-level-panel dash-level-compact">
                <div class="panel-head"><h2><i class="bx bx-trophy"></i> Your Rank</h2><span class="muted">Every action earns XP</span></div>
                <div class="dash-level-row">
                    <div class="dash-rank-icon-wrap"><i class="bx bx-code-alt" id="dashRankIcon"></i></div>
                    <div class="dash-level-info">
                        <div class="dash-rank-label" id="dashRankLabel">Junior Developer <span class="rank-sub-badge rank-junior">V</span></div>
                        <div class="xp-bar large"><div class="xp-bar-fill" id="dashXpFill" style="width:0%"></div></div>
                        <div class="xp-bar-label" id="dashXpLabel">0 XP</div>
                    </div>
                </div>
            </section>
            <section class="panel xp-leaderboard-panel xp-leaderboard-compact" id="xpLeaderboardPanel">
                <div class="panel-head"><h2><i class="bx bx-medal"></i> Leaderboard</h2><span class="muted">Ranked by total XP</span></div>
                <div class="xp-leaderboard-you" id="xpLeaderboardYou">
                    <span class="xp-leaderboard-you-pos" id="xpLeaderboardYouPos">#—</span>
                    <span class="avatar xp-leaderboard-avatar" id="xpLeaderboardYouAvatar">?</span>
                    <div class="xp-leaderboard-you-info">
                        <b id="xpLeaderboardYouName">You</b>
                        <small class="muted" id="xpLeaderboardYouXp">0 XP</small>
                    </div>
                    <span class="xp-session-pill" id="xpSessionPill" title="XP earned since you opened the app this session"><i class="bx bxs-bolt"></i> +0 XP this session</span>
                </div>
                <ol class="xp-leaderboard-list" id="xpLeaderboardList"><li class="empty">Loading leaderboard…</li></ol>
            </section>
        <?php elseif ($page === 'dashboard'): ?>
            <section class="hero">
                <div><div class="eyebrow" data-i18n="dash.hero.eyebrow">PERSONAL DEVELOPMENT WORKSPACE</div><h1 data-i18n="dash.hero.title">Build. Test. Learn. Ship.</h1><p data-i18n="dash.beg.subtitle">A self-hosted workspace for organizing code, UI experiments, reusable snippets, projects and development notes.</p></div>
            </section>
            <section class="panel streak-week-panel streak-week-compact" id="streakWeekPanel">
                <div class="panel-head">
                    <div><h2><i class="bx bx-calendar-check"></i> Daily Login</h2><p class="muted" style="margin:4px 0 0">Log in once a day — Day 7 unlocks a final bonus, then the week starts again.</p></div>
                    <span class="progress-label" id="streakDayLabel"><i class="bx bxs-flame"></i> Day 1 of 7</span>
                </div>
                <div class="streak-week-grid" id="streakWeekGrid">
                    <?php for ($d = 1; $d <= 7; $d++): $isFinal = $d === 7; ?>
                    <div class="streak-day<?php echo $isFinal ? ' streak-day-final' : ''; ?> locked" data-streak-day="<?php echo $d; ?>">
                        <span class="streak-day-num">Day <?php echo $d; ?></span>
                        <span class="streak-day-icon"><i class="bx <?php echo $isFinal ? 'bx-crown' : 'bx-gift'; ?>"></i></span>
                        <span class="streak-day-xp">+<?php echo 10 + ($d - 1) * 2; ?> XP</span>
                        <?php if ($isFinal): ?><span class="streak-final-badge">Final Bonus</span><?php endif; ?>
                    </div>
                    <?php endfor; ?>
                </div>
                <button type="button" class="ghost-btn claim-bonus-btn streak-claim-btn" id="streakClaimBtn"><i class="bx bx-gift"></i> Claim Daily Bonus</button>
            </section>
            <div class="stats-grid">
                <a href="?page=projects" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-projects"><i class="bx bx-folder-open"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.projects">Projects</span><strong id="projectCount">0</strong><small data-i18n="stat.projectsDesc">saved locally</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <a href="?page=snippets" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-snippets"><i class="bx bx-code-curly"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.snippets">Snippets</span><strong id="snippetCount">0</strong><small data-i18n="stat.snippetsDesc">code references</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <a href="?page=notes" class="stat-card stat-card-link">
                    <span class="stat-card-icon stat-icon-notes"><i class="bx bx-note"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.notes">Notes</span><strong id="noteCount">0</strong><small data-i18n="stat.notesDesc">development notes</small></span>
                    <i class="bx bx-chevron-right stat-card-arrow"></i>
                </a>
                <div class="stat-card stat-card-storage">
                    <span class="stat-card-icon stat-icon-storage"><i class="bx bx-hdd"></i></span>
                    <span class="stat-card-body"><span data-i18n="stat.storage">Storage</span><strong data-i18n="stat.local">Local</strong><small data-i18n="stat.storageDesc">browser storage</small><button type="button" class="stat-folder-btn" id="viewBackupFolderBtn"><i class='bx bx-folder-open'></i> <span data-i18n="stat.viewFolder">View folder</span></button></span>
                </div>
            </div>
            <section class="panel getting-started" id="gettingStarted">
                <div class="panel-head">
                    <div><h2>Your beginner journey</h2><p class="muted gs-sub">New here? Follow these 4 steps in order — each one unlocks understanding for the next.</p></div>
                    <span class="progress-label" id="gsProgressLabel"><i class="bx bx-check-circle"></i> 0 of 4 done</span>
                </div>
                <ol class="gs-steps" id="gsSteps">
                    <li class="gs-step" data-gs="viewedSnippet"><span class="gs-num">1</span><div class="gs-body"><b>Look at a snippet</b><small>Open the Snippets page and preview a starter to see finished code.</small><a class="text-link" href="?page=snippets">Go to Snippets <i class="bx bx-right-arrow-alt"></i></a></div><span class="gs-check" aria-hidden="true"><i class="bx bx-check"></i></span></li>
                    <li class="gs-step" data-gs="ranCode"><span class="gs-num">2</span><div class="gs-body"><b>Run code in the Playground</b><small>Change one small thing and press "Run my code" to see it update live.</small><a class="text-link" href="?page=code">Go to Playground <i class="bx bx-right-arrow-alt"></i></a></div><span class="gs-check" aria-hidden="true"><i class="bx bx-check"></i></span></li>
                    <li class="gs-step" data-gs="savedSnippet"><span class="gs-num">3</span><div class="gs-body"><b>Save your own snippet</b><small>Turn code you like into something you can reuse later.</small><a class="text-link" href="?page=snippets">Go to Snippets <i class="bx bx-right-arrow-alt"></i></a></div><span class="gs-check" aria-hidden="true"><i class="bx bx-check"></i></span></li>
                    <li class="gs-step" data-gs="createdProject"><span class="gs-num">4</span><div class="gs-body"><b>Start your first project</b><small>Give your work a name so you can track it as it grows.</small><a class="text-link" href="?page=projects">Go to Projects <i class="bx bx-right-arrow-alt"></i></a></div><span class="gs-check" aria-hidden="true"><i class="bx bx-check"></i></span></li>
                </ol>
            </section>
                            <section class="panel"><div class="panel-head"><h2>Quick start</h2></div><div class="quick-grid">
                    <a href="?page=code" class="quick-card"><b><i class="bx bx-code-alt"></i></b><span data-i18n="quick.code">Code Playground</span><small data-i18n="quick.codeDesc">Write and preview HTML/CSS/JS</small></a>
                    <a href="?page=php" class="quick-card"><b><i class="bx bxl-php"></i></b><span data-i18n="quick.php">PHP Playground</span><small data-i18n="quick.phpDesc">Run real PHP in your browser</small></a>
                    <a href="?page=components" class="quick-card"><b><i class="bx bx-layer"></i></b><span data-i18n="quick.components">UI Components</span><small data-i18n="quick.componentsDesc">Reusable interface patterns</small></a>
                    <a href="?page=snippets" class="quick-card"><b><i class="bx bx-code-curly"></i></b><span data-i18n="quick.snippets">Snippets</span><small data-i18n="quick.snippetsDesc">Save frequently used code</small></a>
                    <a href="?page=notes" class="quick-card"><b><i class="bx bx-note"></i></b><span data-i18n="quick.notes">Development Notes</span><small data-i18n="quick.notesDesc">Keep ideas and references</small></a>
                </div></section>
            <section class="panel dash-level-panel dash-level-compact">
                <div class="panel-head"><h2><i class="bx bx-trophy"></i> Your Rank</h2><span class="muted">Every action earns XP</span></div>
                <div class="dash-level-row">
                    <div class="dash-rank-icon-wrap"><i class="bx bx-code-alt" id="dashRankIcon"></i></div>
                    <div class="dash-level-info">
                        <div class="dash-rank-label" id="dashRankLabel">Junior Developer <span class="rank-sub-badge rank-junior">V</span></div>
                        <div class="xp-bar large"><div class="xp-bar-fill" id="dashXpFill" style="width:0%"></div></div>
                        <div class="xp-bar-label" id="dashXpLabel">0 XP</div>
                    </div>
                </div>
            </section>
            <section class="panel xp-leaderboard-panel xp-leaderboard-compact" id="xpLeaderboardPanel">
                <div class="panel-head"><h2><i class="bx bx-medal"></i> Leaderboard</h2><span class="muted">Ranked by total XP</span></div>
                <div class="xp-leaderboard-you" id="xpLeaderboardYou">
                    <span class="xp-leaderboard-you-pos" id="xpLeaderboardYouPos">#—</span>
                    <span class="avatar xp-leaderboard-avatar" id="xpLeaderboardYouAvatar">?</span>
                    <div class="xp-leaderboard-you-info">
                        <b id="xpLeaderboardYouName">You</b>
                        <small class="muted" id="xpLeaderboardYouXp">0 XP</small>
                    </div>
                    <span class="xp-session-pill" id="xpSessionPill" title="XP earned since you opened the app this session"><i class="bx bxs-bolt"></i> +0 XP this session</span>
                </div>
                <ol class="xp-leaderboard-list" id="xpLeaderboardList"><li class="empty">Loading leaderboard…</li></ol>
            </section>
        <?php elseif ($page === 'code'): ?>
            <section class="page-head playground-head">
                <div><div class="eyebrow" data-i18n="code.eyebrow">LEARN · BUILD · RUN</div><h1 data-i18n="code.title">Code Playground</h1><p data-i18n="code.subtitle">New to coding? Follow the 4 steps below. You can change the example safely and see the result immediately.</p></div>
            </section>
            <section class="beginner-guide panel" id="playgroundGuide">
                <div class="guide-intro"><div><span class="section-kicker">BEGINNER GUIDE</span><h2>Your first playground test</h2><p>You do not need to understand everything at once. Start with the HTML, change one word, press <b>Run my code</b>, then check the preview.</p></div><button class="small-btn guide-toggle" data-target="playgroundGuideSteps"><i class="bx bx-chevron-up"></i> Hide guide</button></div>
                <div class="guide-steps" id="playgroundGuideSteps">
                    <button class="guide-step active" data-step="1"><span>1</span><b>HTML</b><small>Change the content</small></button>
                    <button class="guide-step" data-step="2"><span>2</span><b>CSS</b><small>Change the appearance</small></button>
                    <button class="guide-step" data-step="3"><span>3</span><b>JavaScript</b><small>Add interaction</small></button>
                    <button class="guide-step" data-step="4"><span>4</span><b>Run & preview</b><small>See your result</small></button>
                </div>
                <div class="guide-tip" id="playgroundTip"><i class="bx bx-bulb"></i><div><strong>Start here:</strong> Open the HTML tab and change <code>Hello A-Code Playground</code> to your own title. You are editing a safe local copy, so you can always press Reset.</div></div>
            </section>
            <div class="playground-shell">
                <div class="editor-panel">
                    <div class="editor-topbar"><div class="editor-file"><span class="file-dot html" id="fileDot"></span><strong id="editorTitle">index.html</strong><small id="editorDirty">Saved locally</small></div><div class="editor-tools"><button class="editor-tool active" id="wrapToggle" title="Toggle line wrap" aria-pressed="true"><i class="bx bx-text"></i></button><button class="editor-tool" id="formatCode" title="Format active editor"><i class="bx bx-align-left"></i></button><button class="editor-tool" id="clearEditor" title="Clear active editor"><i class="bx bx-eraser"></i></button><button class="editor-tool" id="downloadCode" title="Download as ZIP (index.html + assets/css + assets/js)"><i class="bx bx-download"></i></button></div></div>
                    <div class="tabs editor-tabs"><button class="tab active" data-tab="html"><i class="bx bx-code"></i> HTML<span class="tab-dot" aria-hidden="true"></span></button><button class="tab" data-tab="css"><i class="bx bx-palette"></i> CSS<span class="tab-dot" aria-hidden="true"></span></button><button class="tab" data-tab="js"><i class="bx bxs-bolt"></i> JavaScript<span class="tab-dot" aria-hidden="true"></span></button></div>
                    <div class="editor-body">
                        <textarea id="htmlCode" class="code-editor" spellcheck="false" aria-label="HTML editor"><!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <main class="demo">
    <span class="eyebrow">DEV DESK</span>
    <h1>Hello A-Code Playground</h1>
    <p>Edit HTML, CSS and JavaScript, then press Run.</p>
    <button id="demoButton">Test interaction</button>
  </main>
</body>
</html></textarea>
                        <textarea id="cssCode" class="code-editor hidden" spellcheck="false" aria-label="CSS editor">:root{font-family:Inter,system-ui,sans-serif;color:#15171a}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f6f8}
.demo{width:min(520px,calc(100% - 40px));padding:32px;background:white;border:1px solid #e3e6ea;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.08)}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#68707a}
h1{margin:8px 0;font-size:38px;letter-spacing:-.04em}
p{color:#68707a;line-height:1.6}
button{border:0;border-radius:10px;padding:11px 16px;background:#15171a;color:#fff;font-weight:700;cursor:pointer}
button:hover{transform:translateY(-1px)}

/* @media = a mobile-responsive rule: everything inside it only applies
   when the browser (or, here, the preview) is narrower than 480px.
   Switch the preview to "Mobile" above to see it turn on. */
@media (max-width: 480px){
  .demo{padding:22px;border-radius:14px}
  h1{font-size:28px}
  button{width:100%}
}</textarea>
                        <textarea id="jsCode" class="code-editor hidden" spellcheck="false" aria-label="JavaScript editor">document.getElementById('demoButton')?.addEventListener('click',()=>{
  document.getElementById('demoButton').textContent='It works!';
});</textarea>
                    </div>
                    <div class="editor-statusbar"><span><i class="bx bx-check-circle"></i> Local sandbox</span><span id="charCount">0 chars</span></div>
                </div>
                <div class="preview-panel">
                    <div class="preview-head"><div class="preview-head-label"><span class="preview-live-dot"></span><strong>LIVE</strong><small id="previewMeta">Sandboxed iframe</small><span class="run-status" id="runStatus"><i></i> Ready</span></div><div class="preview-tools"><div class="preview-tools-actions"><button class="ghost-btn" id="resetCode"><i class="bx bx-reset"></i> <span data-i18n="code.reset">Reset</span></button><button class="primary-btn" id="runCode"><i class="bx bx-play"></i> <span data-i18n="code.run">Run my code</span></button></div><div class="device-switch"><button class="device-btn active" data-device="desktop" title="Desktop preview" aria-pressed="true"><i class="bx bx-desktop"></i></button><button class="device-btn" data-device="tablet" title="Tablet preview" aria-pressed="false"><i class="bx bx-mobile-alt"></i></button><button class="device-btn" data-device="mobile" title="Mobile preview" aria-pressed="false"><i class="bx bx-mobile"></i></button></div><button class="ghost-btn" id="openPreview" title="Open in new tab"><i class="bx bx-window-open"></i> <span class="open-label">Open</span></button></div></div>
                    <div class="preview-stage" id="previewStage"><div class="device-frame" id="deviceFrame"><div class="device-frame-bar" id="deviceFrameBar"><span class="device-dot" style="background:#ff5f57"></span><span class="device-dot" style="background:#febc2e"></span><span class="device-dot" style="background:#28c840"></span><span class="device-frame-url">preview</span></div><div class="device-frame-body" id="deviceFrameBody"><iframe id="preview" sandbox="allow-scripts"></iframe></div></div></div>
                </div>
            </div>
            <section class="panel playground-leaderboard">
                <div class="panel-head"><h2><i class="bx bx-trophy"></i> Most Popular</h2><span class="points-summary">Rank: <span id="pointsRankVal">Junior Developer <span class="rank-sub-badge rank-junior">V</span></span> &nbsp;·&nbsp; <b id="pointsTotalVal">0</b> XP total</span></div>
                <div id="leaderboardList" class="leaderboard-list"><div class="empty">Run a starter or a snippet to see rankings here.</div></div>
            </section>
        <?php elseif ($page === 'php'): ?>
            <section class="page-head playground-head">
                <div><div class="eyebrow" data-i18n="php.eyebrow">RUN REAL PHP</div><h1 data-i18n="php.title">PHP Playground</h1><p data-i18n="php.subtitle">Write real PHP and run it instantly. A full PHP engine runs locally in your browser &mdash; no server needed.</p></div>
            </section>
            <section class="beginner-guide panel" id="phpPlaygroundGuide">
                <div class="guide-intro">
                    <div><span class="section-kicker">HOW IT WORKS</span><h2>Real PHP, no XAMPP needed for this page</h2><p>This playground runs an actual PHP engine (compiled to WebAssembly) directly inside this browser tab. Pick a sample on the left of the editor, press <b>Run code</b>, and read the output on the right.</p></div>
                </div>
                <div class="guide-tip"><i class="bx bx-bulb"></i><div><strong>Good to know:</strong> this is for learning core PHP syntax — variables, loops, functions, classes and more. A built-in <code>getDb()</code> gives you a real PDO connection for practicing SQL (SELECT/INSERT/UPDATE/DELETE), backed by a private SQLite database that lives only in this browser tab. It's seeded with sample data and resets on reload — it never reaches your real MySQL database. For the rest of A-Code Playground (accounts, saved data), keep using Apache/XAMPP as usual.</div></div>
            </section>
            <div class="playground-shell php-playground-shell">
                <div class="editor-panel">
                    <div class="editor-topbar">
                        <div class="editor-file"><span class="file-dot php" id="phpFileDot"></span><strong>playground.php</strong><small id="phpEditorDirty">Local only</small></div>
                        <div class="editor-tools">
                            <select class="filter-select php-sample-select" id="phpSampleSelect" aria-label="Sample snippet"></select>
                        </div>
                    </div>
                    <div class="editor-body">
                        <textarea id="phpCode" class="code-editor" spellcheck="false" aria-label="PHP editor"></textarea>
                    </div>
                    <div class="editor-statusbar"><span><i class="bx bx-check-circle"></i> Runs in your browser (WebAssembly) — nothing is sent to a server</span><span id="phpCharCount">0 chars</span></div>
                </div>
                <div class="preview-panel">
                    <div class="preview-head"><div class="preview-head-label"><span class="preview-live-dot" id="phpOutputDot"></span><strong>OUTPUT</strong><small>stdout / stderr</small><span class="run-status" id="phpEngineStatus"><i class="engine-loading" style="background:#f59e0b"></i> <span id="phpEngineStatusText">Loading engine…</span></span></div><div class="preview-tools"><div class="preview-tools-actions"><button class="ghost-btn" id="phpReset"><i class="bx bx-reset"></i> <span data-i18n="php.reset">Reset</span></button><button class="primary-btn" id="phpRun" disabled><i class="bx bx-play"></i> <span data-i18n="php.run">Run code</span></button><button class="ghost-btn" id="phpClearOutput"><i class="bx bx-eraser"></i> Clear</button></div></div></div>
                    <div class="preview-stage php-console-stage"><pre id="phpConsole" class="php-console"><span class="php-console-placeholder">Run your code to see the output here…</span></pre></div>
                </div>
            </div>
        <?php elseif ($page === 'sql'): ?>
            <section class="page-head playground-head">
                <div><div class="eyebrow" data-i18n="sql.eyebrow">RUN REAL SQL</div><h1 data-i18n="sql.title">SQL Playground</h1><p data-i18n="sql.subtitle">Write MySQL-style queries against a sample store database and see the result set instantly &mdash; no XAMPP, no server, nothing to set up.</p></div>
            </section>
            <section class="beginner-guide panel" id="sqlPlaygroundGuide">
                <div class="guide-intro">
                    <div><span class="section-kicker">HOW IT WORKS</span><h2>A practice database that lives in this tab</h2><p>Pick a sample query on the left, press <b>Run query</b> (or <kbd>Ctrl</kbd> + <kbd>Enter</kbd>), and the rows come back on the right. Write several statements separated by semicolons and each one gets its own result block. Your edits to the data stick around until you press <b>Reset database</b> or reload the page.</p></div>
                </div>
                <div class="guide-tip"><i class="bx bx-bulb"></i><div><strong>About the engine:</strong> a MySQL <em>server</em> can't run inside a browser, so queries execute against a private SQLite database in the same WebAssembly sandbox as the PHP playground, taught to speak MySQL &mdash; <code>NOW()</code>, <code>CONCAT()</code>, <code>IF()</code>, <code>DATE_FORMAT()</code>, <code>YEAR()</code>, <code>SHOW TABLES</code> and <code>DESCRIBE</code> all work, and <code>AUTO_INCREMENT</code>/<code>ENGINE=</code> in your DDL are accepted. Everyday MySQL runs unchanged; server-only features (stored procedures, users and grants, <code>ENUM</code>) do not. Nothing here touches your real MySQL database.</div></div>
            </section>
            <div class="playground-shell sql-playground-shell">
                <div class="editor-panel">
                    <div class="editor-topbar">
                        <div class="editor-file"><span class="file-dot sql" id="sqlFileDot"></span><strong>query.sql</strong><small id="sqlEditorDirty">Local only</small></div>
                        <div class="editor-tools">
                            <select class="filter-select php-sample-select" id="sqlSampleSelect" aria-label="Sample query"></select>
                        </div>
                    </div>
                    <div class="editor-body">
                        <div class="line-gutter" id="sqlLineGutter" aria-hidden="true">1</div>
                        <textarea id="sqlCode" class="code-editor" spellcheck="false" aria-label="SQL editor" placeholder="SELECT * FROM customers;"></textarea>
                    </div>
                    <div class="editor-statusbar"><span><i class="bx bx-check-circle"></i> <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run &mdash; nothing is sent to a server</span><span id="sqlCharCount">0 chars</span></div>
                </div>
                <div class="preview-panel">
                    <div class="preview-head"><div class="preview-head-label"><span class="preview-live-dot" id="sqlOutputDot"></span><strong>RESULT</strong><small>result set</small><span class="run-status" id="sqlEngineStatus"><i class="engine-loading" style="background:#f59e0b"></i> <span id="sqlEngineStatusText">Loading engine&hellip;</span></span></div><div class="preview-tools"><div class="preview-tools-actions"><button class="ghost-btn" id="sqlResetDb" title="Rebuild the sample database"><i class="bx bx-refresh"></i> <span data-i18n="sql.resetDb">Reset database</span></button><button class="ghost-btn" id="sqlReset"><i class="bx bx-reset"></i> <span data-i18n="sql.reset">Reset query</span></button><button class="primary-btn" id="sqlRun" disabled><i class="bx bx-play"></i> <span data-i18n="sql.run">Run query</span></button><button class="ghost-btn" id="sqlClearOutput"><i class="bx bx-eraser"></i> Clear</button></div></div></div>
                    <div class="preview-stage sql-result-stage">
                        <div class="sql-results" id="sqlResults"><div class="sql-placeholder">Run a query to see your result set here&hellip;</div></div>
                        <aside class="sql-schema-panel"><div class="sql-schema-head"><i class="bx bx-sitemap"></i> Tables</div><div id="sqlSchema"><div class="muted">Loading&hellip;</div></div></aside>
                    </div>
                </div>
            </div>
        <?php elseif ($page === 'playground'): ?>
            <section class="page-head playground-head">
                <div><div class="eyebrow" data-i18n="playground.eyebrow">LEARN · BUILD · RUN</div><h1 data-i18n="playground.title">Combined Playground</h1><p data-i18n="playground.subtitle">One editor for HTML, CSS, JavaScript, PHP and SQL. Pick a language, write or load a sample, then press Run.</p></div>
            </section>
            <section class="beginner-guide panel" id="playgroundGuide">
                <div class="guide-intro"><div><span class="section-kicker">BEGINNER GUIDE</span><h2>One editor, every language</h2><p>Everything runs inside this browser tab. Put HTML, CSS and JavaScript in one file, or switch to <b>PHP</b> or <b>SQL</b>. A PHP file can hold HTML, CSS, JavaScript and SQL together, and its <b>Page</b> view shows it rendered.</p></div></div>
                <div class="pg-steps">
                    <div class="guide-step static"><span>1</span><b>Pick a language</b><small>HTML · CSS · JS, PHP or SQL</small></div>
                    <div class="guide-step static"><span>2</span><b>Choose a sample</b><small>Or paste your own code</small></div>
                    <div class="guide-step static"><span>3</span><b>Press Run</b><small>Or Ctrl + Enter</small></div>
                    <div class="guide-step static"><span>4</span><b>Read the result</b><small>Preview, output or rows</small></div>
                </div>
            </section>
            <div class="playground-shell pg-shell" id="pgShell">
                <div class="editor-panel">
                    <div class="editor-topbar">
                        <div class="editor-file"><span class="file-dot html" id="pgFileDot"></span><strong id="pgFileName">index.html</strong><small id="pgDirty">Saved locally</small></div>
                        <div class="editor-tools">
                            <select class="filter-select php-sample-select pg-sample-select" id="pgSample" aria-label="Sample"></select>
                            <button class="editor-tool active" id="pgWrap" title="Toggle line wrap" aria-pressed="true"><i class="bx bx-text"></i></button>
                            <button class="editor-tool" id="pgFormat" title="Format code (HTML, CSS, JS)"><i class="bx bx-align-left"></i></button>
                            <button class="editor-tool" id="pgClear" title="Clear editor"><i class="bx bx-eraser"></i></button>
                            <button class="editor-tool" id="pgDownload" title="Download as ZIP (categorized by file type)"><i class="bx bx-download"></i></button>
                        </div>
                    </div>
                    <div class="tabs editor-tabs" id="pgLangTabs" role="tablist" aria-label="Language">
                        <button class="tab active" data-lang="web" role="tab" aria-selected="true"><i class="bx bx-code"></i> HTML · CSS · JS</button>
                        <button class="tab" data-lang="php" role="tab" aria-selected="false"><i class="bx bxl-php"></i> PHP</button>
                        <button class="tab" data-lang="sql" role="tab" aria-selected="false"><i class="bx bx-data"></i> SQL</button>
                    </div>
                    <div class="editor-body">
                        <textarea id="pgCode" class="code-editor" spellcheck="false" aria-label="Code editor"></textarea>
                    </div>
                    <div class="editor-statusbar"><span id="pgStatusInfo"><i class="bx bx-check-circle"></i> Local sandbox &middot; <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run</span><span id="pgCharCount">0 chars</span></div>
                </div>
                <div class="preview-panel">
                    <div class="preview-head" data-pg-head="web"><div class="preview-head-label"><span class="preview-live-dot"></span><strong>LIVE</strong><small id="previewMeta">Sandboxed iframe</small><span class="run-status" id="runStatus"><i></i> Ready</span></div><div class="preview-tools"><div class="preview-tools-actions"><button class="ghost-btn" id="pgResetWeb"><i class="bx bx-reset"></i> <span data-i18n="code.reset">Reset</span></button><button class="primary-btn" id="pgRunWeb"><i class="bx bx-play"></i> <span data-i18n="code.run">Run my code</span></button></div><div class="device-switch"><button class="device-btn active" data-device="desktop" title="Desktop preview" aria-pressed="true"><i class="bx bx-desktop"></i></button><button class="device-btn" data-device="tablet" title="Tablet preview" aria-pressed="false"><i class="bx bx-mobile-alt"></i></button><button class="device-btn" data-device="mobile" title="Mobile preview" aria-pressed="false"><i class="bx bx-mobile"></i></button></div><button class="ghost-btn" id="openPreview" title="Open in new tab"><i class="bx bx-window-open"></i> <span class="open-label">Open</span></button></div></div>
                    <div class="preview-head" data-pg-head="php" hidden><div class="preview-head-label"><span class="preview-live-dot" id="phpOutputDot"></span><strong>OUTPUT</strong><small>PHP</small><span class="run-status" id="phpEngineStatus"><i class="engine-loading" style="background:#f59e0b"></i> <span id="phpEngineStatusText">Loading engine…</span></span></div><div class="preview-tools"><div class="preview-tools-actions"><div class="pg-view-switch" id="phpViewSwitch" role="group" aria-label="Output view"><button type="button" class="active" data-view="console">Console</button><button type="button" data-view="page">Page</button></div><button class="ghost-btn" id="phpReset"><i class="bx bx-reset"></i> <span data-i18n="php.reset">Reset</span></button><button class="primary-btn" id="phpRun" disabled><i class="bx bx-play"></i> <span data-i18n="php.run">Run code</span></button><button class="ghost-btn" id="phpClearOutput"><i class="bx bx-eraser"></i> Clear</button></div></div></div>
                    <div class="preview-head" data-pg-head="sql" hidden><div class="preview-head-label"><span class="preview-live-dot" id="sqlOutputDot"></span><strong>RESULT</strong><small>result set</small><span class="run-status" id="sqlEngineStatus"><i class="engine-loading" style="background:#f59e0b"></i> <span id="sqlEngineStatusText">Loading engine&hellip;</span></span></div><div class="preview-tools"><div class="preview-tools-actions"><button class="ghost-btn" id="sqlResetDb" title="Rebuild the sample database"><i class="bx bx-refresh"></i> <span data-i18n="sql.resetDb">Reset database</span></button><button class="ghost-btn" id="sqlReset"><i class="bx bx-reset"></i> <span data-i18n="sql.reset">Reset query</span></button><button class="primary-btn" id="sqlRun" disabled><i class="bx bx-play"></i> <span data-i18n="sql.run">Run query</span></button><button class="ghost-btn" id="sqlClearOutput"><i class="bx bx-eraser"></i> Clear</button></div></div></div>
                    <div class="preview-stage" id="previewStage" data-pg-stage="web"><div class="device-frame" id="deviceFrame"><div class="device-frame-bar" id="deviceFrameBar"><span class="device-dot" style="background:#ff5f57"></span><span class="device-dot" style="background:#febc2e"></span><span class="device-dot" style="background:#28c840"></span><span class="device-frame-url">preview</span></div><div class="device-frame-body" id="deviceFrameBody"><iframe id="preview" sandbox="allow-scripts"></iframe></div></div></div>
                    <div class="preview-stage php-console-stage" id="phpStage" data-pg-stage="php" hidden><pre id="phpConsole" class="php-console"><span class="php-console-placeholder">Run your code to see the output here…</span></pre><iframe id="phpPage" class="pg-php-page" sandbox="allow-scripts" title="Rendered PHP page" hidden></iframe></div>
                    <div class="preview-stage sql-result-stage" data-pg-stage="sql" hidden>
                        <div class="sql-results" id="sqlResults"><div class="sql-placeholder">Run a query to see your result set here&hellip;</div></div>
                        <aside class="sql-schema-panel"><div class="sql-schema-head"><i class="bx bx-sitemap"></i> Tables</div><div id="sqlSchema"><div class="muted">Loading&hellip;</div></div></aside>
                    </div>
                </div>
            </div>
            <div class="pg-engine-host" aria-hidden="true">
                <textarea id="phpCode" tabindex="-1"></textarea><select id="phpSampleSelect" tabindex="-1"></select><span id="phpCharCount"></span><small id="phpEditorDirty"></small><span id="phpFileDot"></span>
                <textarea id="sqlCode" tabindex="-1"></textarea><div id="sqlLineGutter"></div><select id="sqlSampleSelect" tabindex="-1"></select><span id="sqlCharCount"></span><small id="sqlEditorDirty"></small>
            </div>
            <section class="panel playground-leaderboard">
                <div class="panel-head"><h2><i class="bx bx-trophy"></i> Most Popular</h2><span class="points-summary">Rank: <span id="pointsRankVal">Junior Developer <span class="rank-sub-badge rank-junior">V</span></span> &nbsp;·&nbsp; <b id="pointsTotalVal">0</b> XP total</span></div>
                <div id="leaderboardList" class="leaderboard-list"><div class="empty">Run a starter or a snippet to see rankings here.</div></div>
            </section>
        <?php elseif ($page === 'php-sample'): ?>
            <section class="page-head">
                <div>
                    <div class="eyebrow" data-i18n="phpsample.eyebrow">PHP LIBRARY</div>
                    <h1 data-i18n="phpsample.title">PHP Sample</h1>
                    <p data-i18n="phpsample.subtitle">Basic PHP by category, plus CRUD with PDO. See the output, copy the code, or run it in the PHP Playground.</p>
                </div>
            </section>

            <div class="cmp-toolbar">
                <div class="cmp-search">
                    <i class="bx bx-search"></i>
                    <input id="componentSearch" placeholder="Search PHP samples" aria-label="Search PHP samples" autocomplete="off">
                </div>
                <span class="cmp-count" id="componentCount"></span>
            </div>

            <div id="componentLibrary" data-catalog="php-sample">
                <div class="cmp-cats" id="componentCats" role="group" aria-label="Filter by category"></div>
                <div class="cmp-grid" id="componentGrid"></div>
            </div>

        <?php elseif ($page === 'components'): ?>
            <section class="page-head">
                <div>
                    <div class="eyebrow" data-i18n="components.eyebrow">UI LIBRARY</div>
                    <h1 data-i18n="components.title">UI Components</h1>
                    <p data-i18n="components.subtitle">Practical HTML5/CSS3 patterns you can reuse in your projects.</p>
                </div>
            </section>

            <div class="cmp-toolbar">
                <div class="cmp-search">
                    <i class="bx bx-search"></i>
                    <input id="componentSearch" placeholder="Search components" aria-label="Search components" autocomplete="off">
                </div>
                <span class="cmp-count" id="componentCount"></span>
            </div>

            <div id="componentLibrary">
                <div class="cmp-cats" id="componentCats" role="group" aria-label="Filter by category"></div>
                <div class="cmp-grid" id="componentGrid"></div>
            </div>

        <?php elseif ($page === 'snippets'): ?>
            <section class="snippet-hero">
                <div class="snippet-hero-copy">
                    <div class="eyebrow">LEARN · COPY · CUSTOMIZE</div>
                    <h1>Snippets made for beginners.</h1>
                    <p>Do not know where to start? Pick a starter, read what it teaches, preview it, then open it in the playground. You can learn by changing one small part at a time.</p>
                    <div class="snippet-hero-actions">
                        <button class="primary-btn" id="addSnippet"><i class="bx bx-plus"></i> Add Snippet</button>
                        <a class="ghost-btn" href="?page=code"><i class="bx bx-code-alt"></i> Open Playground</a>
                    </div>
                </div>
                <div class="snippet-hero-orbit" aria-hidden="true">
                    <div class="orbit-card"><i class="bx bx-code-alt"></i><span>HTML</span></div>
                    <div class="orbit-card orbit-card-2"><i class="bx bx-palette"></i><span>CSS</span></div>
                    <div class="orbit-card orbit-card-3"><i class="bx bx-bolt-circle"></i><span>JS</span></div>
                    <div class="orbit-core"><i class="bx bx-play"></i></div>
                </div>
            </section>
            <section class="beginner-guide snippet-learning panel">
                <div class="guide-intro"><div><span class="section-kicker">HOW TO USE SNIPPETS</span><h2>Follow this simple workflow</h2><p>Think of a snippet as a ready-made lesson. You can use it without knowing every line of code.</p></div><span class="progress-label"><i class="bx bx-check-circle"></i> 4 easy steps</span></div>
                <div class="guide-steps snippet-steps">
                    <div class="guide-step static"><span>1</span><b>Choose a starter</b><small>Pick a design that looks close to what you need.</small></div>
                    <div class="guide-step static"><span>2</span><b>Preview it</b><small>See what the finished component does before editing.</small></div>
                    <div class="guide-step static"><span>3</span><b>Run in Playground</b><small>Open the complete code and experiment safely.</small></div>
                    <div class="guide-step static"><span>4</span><b>Save your version</b><small>Turn your changes into a reusable snippet.</small></div>
                </div>
                <div class="guide-tip"><i class="bx bx-bulb"></i><div><strong>Beginner tip:</strong> Never edit everything at once. Change the text first, then colors, then spacing, then JavaScript. If something breaks, use <b>Reset</b> in the playground.</div></div>
            </section>
            <section class="snippet-section">
                <div class="section-title-row"><div><span class="section-kicker">STARTER LIBRARY</span><h2>Runnable UI starters</h2><p>Choose a pattern, preview it, then open it in the playground and make it yours.</p></div><select id="starterSort" class="filter-select" aria-label="Sort starters"><option value="featured">Featured order</option><option value="popular">Most popular</option></select><span class="library-hint"><i class="bx bxs-zap"></i> Every starter can run</span></div>
                <div class="starter-grid">
                    <article class="starter-card"><div class="starter-preview preview-dashboard" data-template="dashboard"><div class="sp-top"></div><div class="sp-columns"><div class="sp-side"></div><div class="sp-content"><i></i><i></i><i></i><i></i></div></div></div><div class="starter-info"><div><span class="rank-badge" data-rank-badge hidden></span><span class="tag">HTML + CSS</span><h3>Admin Dashboard</h3><p>Navbar, sidebar, stats and responsive cards.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: layout + cards</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="dashboard"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="dashboard"><i class="bx bx-play"></i> Run</button><button class="small-btn save-template" data-template="dashboard"><i class="bx bx-bookmark"></i> Save</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-landing" data-template="landing"><div class="lp-nav"></div><div class="lp-hero"><i></i><b></b></div><div class="lp-cards"><i></i><i></i><i></i></div></div><div class="starter-info"><div><span class="rank-badge" data-rank-badge hidden></span><span class="tag">HTML + CSS</span><h3>Landing Page</h3><p>Hero, navigation and responsive feature cards.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: hierarchy + spacing</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="landing"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="landing"><i class="bx bx-play"></i> Run</button><button class="small-btn save-template" data-template="landing"><i class="bx bx-bookmark"></i> Save</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-form" data-template="form"><div class="form-line wide"></div><div class="form-line"></div><div class="form-line"></div><div class="form-button"></div></div><div class="starter-info"><div><span class="rank-badge" data-rank-badge hidden></span><span class="tag">HTML + CSS</span><h3>Form Page</h3><p>Clean fields and validation-ready actions.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: inputs + labels</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="form"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="form"><i class="bx bx-play"></i> Run</button><button class="small-btn save-template" data-template="form"><i class="bx bx-bookmark"></i> Save</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-table" data-template="table"><div class="table-row head"></div><div class="table-row"></div><div class="table-row"></div><div class="table-row"></div></div><div class="starter-info"><div><span class="rank-badge" data-rank-badge hidden></span><span class="tag">HTML + CSS</span><h3>Data Table</h3><p>Responsive data with status and actions.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: structured data</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="table"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="table"><i class="bx bx-play"></i> Run</button><button class="small-btn save-template" data-template="table"><i class="bx bx-bookmark"></i> Save</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-modal" data-template="modal"><div class="modal-mini"><b></b><i></i><i></i><span></span></div></div><div class="starter-info"><div><span class="rank-badge" data-rank-badge hidden></span><span class="tag">HTML + JS</span><h3>Interactive Modal</h3><p>A real working dialog with open and close actions.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: JavaScript events</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="modal"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="modal"><i class="bx bx-play"></i> Run</button><button class="small-btn save-template" data-template="modal"><i class="bx bx-bookmark"></i> Save</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-navbar" data-template="navbar"><div class="nav-mini"><b></b><i></i><i></i><i></i></div><div class="nav-body"><b></b><b></b></div></div><div class="starter-info"><div><span class="rank-badge" data-rank-badge hidden></span><span class="tag">HTML + CSS + JS</span><h3>Responsive Navigation</h3><p>Mobile navigation with a working menu toggle.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: responsive JS</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="navbar"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="navbar"><i class="bx bx-play"></i> Run</button><button class="small-btn save-template" data-template="navbar"><i class="bx bx-bookmark"></i> Save</button></div></div></article>
                </div>
            </section>
        <?php elseif ($page === 'saved-snippets'): ?>
            <section class="page-head">
                <div>
                    <div class="eyebrow">YOUR LIBRARY</div>
                    <h1>Saved Snippets</h1>
                    <p>Copy, preview, edit, or run the snippets you've saved, in a clean sandbox.</p>
                </div>
                <a class="ghost-btn" href="?page=snippets"><i class="bx bx-code-alt"></i> Browse Starter Library</a>
            </section>
            <section class="snippet-toolbar panel">
                <div class="toolbar-search"><i class="bx bx-search"></i><input id="savedSnippetsSearch" placeholder="Search your saved snippets..." autocomplete="off"></div>
                <select id="savedSnippetsFilter" class="filter-select"><option value="all">All languages</option><option value="HTML + CSS">HTML + CSS</option><option value="HTML + JS">HTML + JS</option><option value="HTML + CSS + JS">HTML + CSS + JS</option><option value="CSS">CSS</option><option value="JavaScript">JavaScript</option></select>
                <select id="savedSnippetsSort" class="filter-select"><option value="recent">Recently added</option><option value="popular">Most run</option><option value="name">Name A–Z</option><option value="language">Language</option></select>
                <div class="view-switch"><button class="view-btn active" data-view="grid"><i class="bx bx-grid-alt"></i> Grid</button><button class="view-btn" data-view="list"><i class="bx bx-list-ul"></i> List</button></div>
            </section>
            <section class="snippet-section">
                <div class="section-title-row"><div><span class="section-kicker">SNIPPETS</span><h2>Saved <span class="count-pill" id="savedSnippetsPageCount">0</span></h2><p>Everything you've saved from the Snippets page or the Playground.</p></div></div>
                <div id="savedSnippetsGrid" class="snippet-grid-groups"></div>
            </section>
        <?php elseif ($page === 'saved-components'): ?>
            <section class="page-head">
                <div>
                    <div class="eyebrow">YOUR LIBRARY</div>
                    <h1>Saved Components</h1>
                    <p>Copy, preview, or run the UI components you've saved to your own library.</p>
                </div>
                <a class="ghost-btn" href="?page=components"><i class="bx bx-layer"></i> Browse UI Components</a>
            </section>
            <section class="snippet-toolbar panel">
                <div class="toolbar-search"><i class="bx bx-search"></i><input id="savedComponentsSearch" placeholder="Search your saved components..." autocomplete="off"></div>
                <select id="savedComponentsFilter" class="filter-select"><option value="all">All languages</option><option value="HTML + CSS">HTML + CSS</option><option value="HTML + JS">HTML + JS</option><option value="HTML + CSS + JS">HTML + CSS + JS</option><option value="CSS">CSS</option><option value="JavaScript">JavaScript</option></select>
                <select id="savedComponentsSort" class="filter-select"><option value="recent">Recently added</option><option value="popular">Most run</option><option value="name">Name A–Z</option><option value="language">Language</option></select>
                <div class="view-switch"><button class="view-btn active" data-view="grid"><i class="bx bx-grid-alt"></i> Grid</button><button class="view-btn" data-view="list"><i class="bx bx-list-ul"></i> List</button></div>
            </section>
            <section class="snippet-section">
                <div class="section-title-row"><div><span class="section-kicker">COMPONENTS</span><h2>Saved <span class="count-pill" id="savedComponentsPageCount">0</span></h2><p>Everything you've saved from the UI Components page.</p></div></div>
                <div id="savedComponentsGrid" class="snippet-grid-groups"></div>
            </section>
        <?php elseif ($page === 'projects'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="projects.eyebrow">WORKSPACE</div><h1 data-i18n="projects.title">Projects</h1><p data-i18n="projects.subtitle">Track your personal development projects and ideas.</p></div><button class="primary-btn" id="newProjectPage"><i class="bx bx-plus"></i> <span data-i18n="common.newProject">New Project</span></button></section><div id="projectGrid" class="project-grid"></div>
        <?php elseif ($page === 'notes'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="notes.eyebrow">KNOWLEDGE</div><h1 data-i18n="notes.title">Development Notes</h1><p data-i18n="notes.subtitle">Keep technical notes without leaving your workspace.</p></div><button class="primary-btn" id="addNote"><i class="bx bx-plus"></i> <span data-i18n="common.addNote">Add Note</span></button></section><div id="noteGrid" class="note-grid"></div>
        <?php elseif ($page === 'ui-guide'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="uiGuide.eyebrow">REFERENCE</div><h1 data-i18n="uiGuide.title">UI/UX Guide</h1><p data-i18n="uiGuide.subtitle">Use these patterns as a practical guide while building Native PHP interfaces.</p></div></section>
            <div class="guide-layout"><nav class="guide-nav panel"><strong>Guide sections</strong><a href="#overview">Project overview</a><a href="#shell">Application shell</a><a href="#layout">Layout</a><a href="#forms">Forms</a><a href="#tables">Tables</a><a href="#responsive">Responsive</a><a href="#data">Data &amp; recovery</a></nav><div class="guide-content">
                <section class="guide-section panel" id="overview"><span class="section-kicker">00 · OVERVIEW</span><h2>What's inside A-Code Playground</h2><p class="muted">A-Code Playground is a self-hosted, local-first workspace for one person's own development work — not a team tool with shared logins or shared data. It's built around two kinds of pages: a set of live coding playgrounds (HTML/CSS/JS, PHP and SQL) for experimenting right in the browser, and a personal library (Projects, Notes, Snippets and Components) for keeping the results of that experimenting organized. Everything described below is a real, working area of this app — not a mockup — so you can click through to any of it from the sidebar.</p><div class="guide-cards"><div class="guide-demo-card"><b>Projects</b><span>A lightweight tracker for your own projects and ideas — not a full project-management tool. Each entry has a name, a free-text technology field (with quick-pick chips for common stacks like PHP, React or MySQL), a status of Planning / In Progress / Completed / On Hold shown as a colored badge, and a short description.</span></div><div class="guide-demo-card"><b>Snippets &amp; Components</b><span>Snippets are reusable blocks of code you save from a playground run, tagged by language, that you can re-run, copy or preview later. Components are saved pieces from the UI Components library; both live in the same underlying list but appear as separate "Saved Snippets" and "Saved Components" pages with their own counts.</span></div><div class="guide-demo-card"><b>Notes</b><span>Short technical references or decisions — the kind of thing you'd otherwise leave in a scratch file. Each note has a title and a real code editor with a language switcher (Plain text, Markdown, PHP, JavaScript, HTML, CSS, SQL) that highlights syntax as you type.</span></div><div class="guide-demo-card"><b>Playgrounds</b><span>Three live environments: an HTML/CSS/JS playground with a split editor and live preview, a PHP sample runner, and a SQL playground for trying queries. Code runs instantly in the browser with no separate build step.</span></div><div class="guide-demo-card"><b>Recycle Bin</b><span>Deleting a project, note, snippet or component always asks for confirmation first, then moves it here rather than erasing it immediately. The bin groups items into All / Projects / Notes / Snippets / Components tabs, and each item can be restored to exactly where it came from or deleted permanently.</span></div><div class="guide-demo-card"><b>Points, streaks &amp; leaderboard</b><span>Every real action — creating, editing or renaming, deleting, running, copying — earns the same small amount of XP, and only when something actually changed: renaming to the same name, saving without edits, or recreating identical content earns nothing. A once-a-day claim rewards a running streak with a growing bonus, and your total ranks you against other accounts on the leaderboard.</span></div><div class="guide-demo-card"><b>Local backup &amp; sync</b><span>Every change is written instantly to the browser's local storage, then mirrored in the background to a local database tied to your account. From Settings you can also save or download a dated JSON snapshot, and import one back in later.</span></div><div class="guide-demo-card"><b>Guided Tour &amp; starters</b><span>New accounts can replay a short guided tour of the workspace from Settings at any time, and the Playground pages offer ready-made starter templates (like a landing page layout) you can preview, run or save straight into your Snippets.</span></div><div class="guide-demo-card"><b>Multi-language UI</b><span>The interface itself — labels, buttons, page titles — switches between English, Spanish, French, German and Filipino from the flag picker in the topbar, independent of whatever language your code or notes are written in.</span></div></div></section>
                <section class="guide-section panel" id="shell"><span class="section-kicker">01 · SHELL</span><h2>Keep navigation predictable</h2><p class="muted">Use a stable topbar, one primary sidebar and a focused content area. Hide secondary navigation on small screens rather than squeezing everything into one row.</p><div class="wireframe"><div class="wf-top">TOP NAVIGATION</div><div class="wf-body"><div class="wf-side">Dashboard<br>Projects<br>Snippets<br>Notes<br>Settings</div><div class="wf-main">Page heading<br><br>Primary content</div></div></div></section>
                <section class="guide-section panel" id="layout"><span class="section-kicker">02 · LAYOUT</span><h2>Build with reusable regions</h2><div class="guide-cards"><div class="guide-demo-card"><b>Cards</b><span>Use consistent padding, borders and spacing for independent content.</span></div><div class="guide-demo-card"><b>Toolbar</b><span>Keep search, filters and actions together above dense content.</span></div><div class="guide-demo-card"><b>Hierarchy</b><span>Use eyebrow → heading → supporting text before the main action.</span></div></div></section>
                <section class="guide-section panel" id="forms"><span class="section-kicker">03 · FORMS</span><h2>Make input intent obvious</h2><form class="form-demo" onsubmit="return false"><label for="guideName">Project name</label><input class="input" id="guideName" placeholder="My project"><label for="guideType">Project type</label><select class="input" id="guideType"><option>Website</option><option>Web application</option></select><button class="primary-btn">Save example</button></form></section>
                <section class="guide-section panel" id="tables"><span class="section-kicker">04 · TABLES</span><h2>Protect dense data with overflow</h2><div class="table-scroll"><table class="guide-table"><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody><tr><td>001</td><td>Project A</td><td><span class="badge">Active</span></td><td><button class="small-btn">View</button></td></tr><tr><td>002</td><td>Project B</td><td><span class="badge">Draft</span></td><td><button class="small-btn">Edit</button></td></tr></tbody></table></div></section>
                <section class="guide-section panel" id="responsive"><span class="section-kicker">05 · RESPONSIVE</span><h2>Design for the narrow screen first</h2><ul class="guide-list"><li>Use CSS Grid with <code>minmax()</code> or <code>auto-fit</code> for cards.</li><li>Allow tables to scroll horizontally instead of breaking the page.</li><li>Collapse or slide the sidebar below the desktop breakpoint.</li><li>Keep touch targets comfortable and avoid tiny controls.</li></ul></section>
                <section class="guide-section panel" id="data"><span class="section-kicker">06 · DATA &amp; RECOVERY</span><h2>Where your work actually lives</h2><p class="muted">This workspace is built local-first on purpose: every click should feel instant, and a slow or unreachable server should never be the reason you lose something you just wrote. That means there are three layers underneath the interface, each with a different job.</p><h3>Local-first storage</h3><ul class="guide-list"><li>Every create, edit, status change or delete writes straight to the browser's local storage first — there's no spinner waiting on a network round-trip for ordinary use.</li><li>The same change is then mirrored in the background to a local database row scoped to your account, so the data survives clearing the browser or switching devices where that database is reachable.</li><li>If the network mirror ever fails, the local copy is still the source of truth for what you see — the app doesn't block you from working.</li></ul><h3>Recycle Bin lifecycle</h3><ul class="guide-list"><li>Deleting a project, note, snippet or component always shows a confirmation dialog first, naming the item, before anything moves.</li><li>Confirmed deletes go to the Recycle Bin, not straight to permanent deletion — the bin groups everything into All / Projects / Notes / Snippets / Components tabs so mixed clean-up stays easy to scan.</li><li>From the bin, Restore puts an item back into its original list exactly as it was; Delete Forever (or Empty Recycle Bin) removes it for good and cannot be undone, so that action asks for confirmation a second time.</li></ul><h3>Backup, export &amp; import</h3><ul class="guide-list"><li>Settings → Local disk backup can save a dated JSON snapshot of your whole workspace to disk on demand, in addition to the automatic per-item mirroring described above.</li><li>That same snapshot file can be imported back in later — either to restore an earlier point in time, or to move your projects, snippets and notes to a different computer entirely.</li><li>Because the snapshot is plain JSON, it's also readable outside the app if you ever need to inspect or script against your own exported data.</li></ul></section>
            </div></div>
        <?php else: ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="settings.eyebrow">CONFIGURATION</div><h1 data-i18n="settings.title">Settings</h1><p data-i18n="settings.subtitle">Configure the local development workspace.</p></div></section>
            <?php
              $levelOrder = array('beginner', 'intermediate', 'professional');
              $levelIcons = array('beginner' => 'bx-leaf', 'intermediate' => 'bx-trending-up', 'professional' => 'bx-medal');
              $curLevelIdx = array_search($experienceLevel, $levelOrder, true);
              if ($curLevelIdx === false) { $curLevelIdx = -1; }
            ?>
            <div class="settings-grid"><section class="panel"><h2 data-i18n="settings.appearance">Appearance</h2><label class="switch-row"><span data-i18n="settings.darkMode">Dark mode</span> <input type="checkbox" id="darkSetting"><span class="switch"></span></label><p class="muted" data-i18n="settings.themeNote">Theme is stored locally in your browser.</p></section><section class="panel"><h2 data-i18n="settings.experienceLevel">Experience level</h2><p class="muted"><span data-i18n="settings.currentLevel">Current level:</span> <span class="experience-badge" id="experienceBadge"><?php echo e($experienceLabel); ?></span></p><div class="level-trail" id="levelTrail"><?php foreach ($levelOrder as $i => $lvl): ?><?php if ($i > 0): ?><div class="level-trail-line<?php echo $i - 1 < $curLevelIdx ? ' done' : ''; ?>"></div><?php endif; ?><button type="button" class="level-trail-step<?php echo $i <= $curLevelIdx ? ' done' : ''; ?><?php echo $i === $curLevelIdx ? ' current' : ''; ?>" title="<?php echo e(ucfirst($lvl)); ?>"><span class="trail-dot"><i class="bx <?php echo $levelIcons[$lvl]; ?>"></i></span><span class="trail-label"><?php echo e(ucfirst($lvl)); ?></span></button><?php endforeach; ?></div><p class="muted" data-i18n="settings.experienceNote">This decides how much guidance is shown across the workspace.</p><button class="ghost-btn" id="changeExperienceBtn"><i class="bx bx-user-check"></i> <span data-i18n="settings.changeExperience">Change experience level</span></button><button class="ghost-btn" id="replayTour"><i class="bx bx-play"></i> <span data-i18n="settings.replayTour">Replay guided tour</span></button></section><section class="panel" id="localDiskBackup"><h2 data-i18n="settings.localBackup">Local disk backup</h2><p class="muted">Every project, snippet and note is mirrored to a dedicated folder on this computer — <code>C:\A-CodePlayground\BackupFiles</code> by default — so your work lives on disk, not only inside the browser.</p><div class="disk-status" id="diskStatusBody"><p class="muted">Checking local save status…</p></div><div class="disk-actions"><button class="ghost-btn" id="saveBackupBtn"><i class="bx bx-save"></i> <span data-i18n="settings.saveBackupNow">Save backup to disk now</span></button><button class="ghost-btn" id="downloadBackupBtn"><i class="bx bx-download"></i> <span data-i18n="settings.downloadBackupFile">Download backup file</span></button></div><div class="form-grid" style="margin-top:14px"><label class="full">Save location<input id="dataLocationInput" class="input" placeholder="Loading default location…" spellcheck="false" autocomplete="off" aria-describedby="dataLocationHint"></label><p class="field-hint is-error full" id="dataLocationHint" role="alert" hidden><i class="bx bx-x-circle"></i><span></span></p></div><p class="muted">Leave blank to use the automatic default (a dedicated <code>C:\A-CodePlayground\BackupFiles</code> folder, created for you the first time this runs — or the next available local drive if <code>C:</code> isn't usable), or enter a relative folder name (e.g. <code>my-backups</code>) or a full path (e.g. <code>D:\A-CodePlayground</code>) to save somewhere else instead. Pasting a path straight from Explorer’s “Copy as path” works too. Existing files are not moved automatically.</p><div class="disk-actions"><button class="ghost-btn" id="saveLocationBtn"><i class="bx bx-folder"></i> <span data-i18n="settings.saveLocation">Save location</span></button><button class="ghost-btn" id="resetLocationBtn"><i class="bx bx-reset"></i> <span data-i18n="settings.resetLocation">Reset to default</span></button></div><hr style="border:0;border-top:1px solid var(--border,#e5e7eb);margin:16px 0"><p class="muted"><b>Export / Import</b> — move your workspace to another computer, or restore an older copy.</p><div class="disk-actions"><button class="ghost-btn" id="importBackupBtn"><i class="bx bx-upload"></i> <span data-i18n="settings.importBackup">Import backup file</span></button><input type="file" id="importBackupInput" accept="application/json,.json" hidden></div></section><section class="panel" id="googleDriveBackup"><h2><i class="bx bxl-google"></i> Google Drive backup</h2><p class="muted">Sync a backup of your projects, snippets and notes to <b>your own</b> Google Drive. Each account connects its own Google account, and the app can only see the backup files it creates — never the rest of your Drive. XP and rank are not part of a backup.</p><div class="disk-status" id="gdriveBody"><p class="muted">Checking Google Drive…</p></div></section><section class="panel legal-panel" id="aboutLegal"><h2 data-i18n="settings.aboutLegal">About &amp; Legal</h2><h3 class="legal-panel-subtitle"><i class="bx bx-lock-alt"></i> <span data-i18n="settings.privacyDpa">Privacy Policy &mdash; Data Privacy Act of 2012</span></h3><div class="legal-page" id="legalPageBody"><?php render_privacy_policy_intro(); ?><?php render_privacy_policy_sections(); ?></div></section><section class="panel"><div class="panel-head"><h2>Workspace activity</h2><span class="muted">Local</span></div><div id="activityList" class="activity-list"><div class="empty">No activity yet.</div></div></section></div>
        <?php endif; ?>
        </div>
    </main>
</div>
<div class="modal-backdrop" id="modal" aria-hidden="true"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><button class="modal-close" id="modalClose" aria-label="Close"><i class="bx bx-x"></i></button><div id="modalBody"></div></div></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/xml/xml.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/css/css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/javascript/javascript.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/htmlmixed/htmlmixed.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/clike/clike.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/php/php.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/mode/sql/sql.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/selection/active-line.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/display/placeholder.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/2.0.3/beautify.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/2.0.3/beautify-css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/2.0.3/beautify-html.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
<script>window.CSRF_TOKEN = <?php echo json_encode(csrf_token()); ?>;
window.IDLE_TIMEOUT_MS = <?php echo (int)ACODEPLAYGROUND_IDLE_TIMEOUT * 1000; ?>;
window.SERVER_EXPERIENCE_LEVEL = <?php echo json_encode($experienceLevel); ?>;
window.CURRENT_USER_ID = <?php echo json_encode($currentUser['id']); ?>;
window.CURRENT_USER_JOINED_AT = <?php echo json_encode($currentUser['joinedAt']); ?>;
window.CURRENT_USER_PROFILE = <?php echo json_encode(array(
    'firstName' => isset($currentUser['firstName']) ? $currentUser['firstName'] : '',
    'middleName' => isset($currentUser['middleName']) ? $currentUser['middleName'] : '',
    'lastName' => isset($currentUser['lastName']) ? $currentUser['lastName'] : '',
    'username' => isset($currentUser['username']) ? $currentUser['username'] : '',
    'bio' => isset($currentUser['bio']) ? $currentUser['bio'] : '',
    'address' => isset($currentUser['address']) ? $currentUser['address'] : '',
    'barangay' => isset($currentUser['barangay']) ? $currentUser['barangay'] : '',
    'city' => isset($currentUser['city']) ? $currentUser['city'] : '',
    'country' => isset($currentUser['country']) ? $currentUser['country'] : '',
    'location' => isset($currentUser['location']) ? $currentUser['location'] : '',
    'hobbies' => isset($currentUser['hobbies']) ? $currentUser['hobbies'] : '',
    'skills' => isset($currentUser['skills']) ? $currentUser['skills'] : array(),
)); ?>;
window.SERVER_POINTS = <?php echo json_encode($serverPoints); ?>;
window.GDRIVE = <?php echo json_encode($gdriveSummary); ?>;
window.SERVER_CLOCK = <?php echo json_encode(array('now' => (int)round(microtime(true) * 1000), 'offset' => (int)date('Z'))); ?>;</script>
<script src="assets/js/app.js?v=<?php echo $jsVersion; ?>"></script>
<script src="assets/js/i18n.js?v=<?php echo $i18nVersion; ?>"></script>
<script src="assets/js/gdrive.js?v=<?php echo file_exists(__DIR__ . '/assets/js/gdrive.js') ? filemtime(__DIR__ . '/assets/js/gdrive.js') : time(); ?>"></script>
<?php if ($page === 'components' || $page === 'php-sample'): ?>
<?php if ($page === 'php-sample'): ?>
<script src="assets/js/php-basics.js?v=<?php echo $phpBasicsVersion; ?>"></script>
<script src="assets/js/components-php.js?v=<?php echo $componentsPhpVersion; ?>"></script>
<?php endif; ?>
<script src="assets/js/components.js?v=<?php echo $componentsVersion; ?>"></script>
<?php endif; ?>
<?php if ($page === 'php'): ?>
<script src="assets/js/php-playground.js?v=<?php echo $phpPlaygroundVersion; ?>"></script>
<?php endif; ?>
<?php if ($page === 'sql'): ?>
<script src="assets/js/sql-playground.js?v=<?php echo $sqlPlaygroundVersion; ?>"></script>
<?php endif; ?>
<?php if ($page === 'playground'): ?>
<script>window.ADEV_LAZY_ENGINES = true;</script>
<script src="assets/js/php-playground.js?v=<?php echo $phpPlaygroundVersion; ?>"></script>
<script src="assets/js/sql-playground.js?v=<?php echo $sqlPlaygroundVersion; ?>"></script>
<script src="assets/js/playground.js?v=<?php echo $playgroundVersion; ?>"></script>
<?php endif; ?>
<script src="assets/js/pwa.js?v=<?php echo $pwaVersion; ?>"></script>
</body>
</html>
