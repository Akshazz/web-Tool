<?php
require_once __DIR__ . '/security.php';
adevtools_start_session();
adevtools_security_headers();
require_once __DIR__ . '/auth-helpers.php';
$currentUser = currentUser();

// Landing / login / signup are public "Community" pages with their own
// lightweight template (no sidebar/topbar app shell) — see guest.php.
$guestPages = array('landing', 'login', 'signup');
$requestedPage = isset($_GET['page']) ? $_GET['page'] : null;

if (in_array($requestedPage, $guestPages, true)) {
    if ($currentUser) { header('Location: ?page=dashboard'); exit; }
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
    'components' => 'UI Components',
    'snippets' => 'Snippets',
    'projects' => 'Projects',
    'notes' => 'Notes',
    'settings' => 'Settings',
    'ui-guide' => 'UI/UX Guide'
);
$page = isset($requestedPage) ? $requestedPage : 'dashboard';
if (!isset($pages[$page])) { $page = 'dashboard'; }
$validExperienceLevels = array('beginner', 'intermediate', 'professional');
$experienceLevel = (isset($_COOKIE['experienceLevel']) && in_array($_COOKIE['experienceLevel'], $validExperienceLevels, true)) ? $_COOKIE['experienceLevel'] : null;
$experienceLabels = array('beginner' => 'Beginner', 'intermediate' => 'Intermediate', 'professional' => 'Professional');
$experienceLabel = isset($experienceLabels[$experienceLevel]) ? $experienceLabels[$experienceLevel] : 'Set level';
$cssVersion = file_exists(__DIR__ . '/assets/css/app.css') ? filemtime(__DIR__ . '/assets/css/app.css') : time();
$jsVersion  = file_exists(__DIR__ . '/assets/js/app.js') ? filemtime(__DIR__ . '/assets/js/app.js') : time();
$i18nVersion = file_exists(__DIR__ . '/assets/js/i18n.js') ? filemtime(__DIR__ . '/assets/js/i18n.js') : time();
$pwaVersion  = file_exists(__DIR__ . '/assets/js/pwa.js') ? filemtime(__DIR__ . '/assets/js/pwa.js') : time();
function e($value) { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
$icons = array(
    'dashboard' => 'bx bx-grid-alt',
    'code' => 'bx bx-code-alt',
    'components' => 'bx bx-layer',
    'snippets' => 'bx bx-code-curly',
    'projects' => 'bx bx-folder-open',
    'notes' => 'bx bx-note',
    'settings' => 'bx bx-cog',
    'guide' => 'bx bx-book-open'
);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111214">
<title>A-DevTools — Personal Development Tool</title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="assets/icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="A-DevTools">
<link rel="preconnect" href="https://cdnjs.cloudflare.com">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/boxicons/2.1.4/css/boxicons.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/codemirror.min.css">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/theme/material-darker.min.css">
<link rel="stylesheet" href="assets/css/app.css?v=<?php echo $cssVersion; ?>">
</head>
<body>
<a href="#mainContent" class="skip-link">Skip to main content</a>
<div class="app-shell">
    <header class="topbar">
        <button class="icon-btn" id="sidebarToggle" title="Toggle sidebar" aria-label="Toggle sidebar" data-i18n-title="topbar.sidebarToggle"><i class="bx bx-menu"></i></button>
        <a class="brand" href="?page=dashboard" aria-label="A-DevTools home"><span class="brand-mark"><i class="bx bx-code-alt"></i></span><span>A-DevTools</span></a>
        <div class="topbar-search" id="topbarSearch">
            <i class="bx bx-search"></i>
            <input id="globalSearch" placeholder="Search projects, snippets, notes..." autocomplete="off" aria-label="Global search" data-i18n-placeholder="topbar.searchPlaceholder">
            <kbd>Ctrl K</kbd>
        </div>
        <div class="top-actions">
            <button class="icon-btn mobile-only" id="mobileSearchToggle" title="Search" aria-label="Open search" data-i18n-title="topbar.search"><i class="bx bx-search"></i></button>
            <div class="text-size-group" role="group" aria-label="Text size">
                <button class="icon-btn" id="textSizeDown" title="Decrease text size" aria-label="Decrease text size" data-i18n-title="topbar.textDown"><i class="bx bx-minus"></i></button>
                <button class="icon-btn" id="textSizeUp" title="Increase text size" aria-label="Increase text size" data-i18n-title="topbar.textUp"><i class="bx bx-plus"></i></button>
            </div>
            <button class="icon-btn" id="themeToggle" title="Toggle theme" aria-label="Toggle dark mode" data-i18n-title="topbar.theme"><i class="bx bx-moon"></i></button>
            <button class="pill-btn" id="experienceBtn" title="Change experience level" aria-label="Change experience level"><i class="bx bx-user-voice"></i><span id="experienceBtnLabel"><?php echo e($experienceLabel); ?></span></button>
            <div class="lang-picker" id="langPicker">
                <button type="button" class="pill-btn lang-btn" id="langBtn" title="Change language" aria-label="Change language" aria-haspopup="true" aria-expanded="false" data-i18n-title="lang.picker">
                    <span class="lang-icon">A</span><span id="langCode">EN</span><i class="bx bx-chevron-down"></i>
                </button>
                <div class="lang-dropdown" id="langDropdown" role="menu" hidden>
                    <button type="button" class="lang-option active" data-lang="en" role="menuitem"><span class="lang-flag">🇬🇧</span> English</button>
                    <button type="button" class="lang-option" data-lang="es" role="menuitem"><span class="lang-flag">🇪🇸</span> Español</button>
                    <button type="button" class="lang-option" data-lang="fr" role="menuitem"><span class="lang-flag">🇫🇷</span> Français</button>
                    <button type="button" class="lang-option" data-lang="de" role="menuitem"><span class="lang-flag">🇩🇪</span> Deutsch</button>
                    <button type="button" class="lang-option" data-lang="tl" role="menuitem"><span class="lang-flag">🇵🇭</span> Filipino</button>
                </div>
            </div>
            <button type="button" class="pill-btn install-btn" id="pwaInstallBtn" title="Install A-DevTools as an app" aria-label="Install A-DevTools as an app" data-i18n-title="pwa.installTitle">
                <i class="bx bx-download"></i><span class="pwa-install-label" data-i18n="pwa.install">Install App</span>
            </button>
            <button type="button" class="icon-btn apk-btn" id="apkDownloadBtn" title="Download Android APK" aria-label="Download Android APK" data-i18n-title="pwa.apkTitle"><i class="bx bx-cloud-download"></i></button>
            <button class="icon-btn" id="helpBtn" title="Help & guided tour" aria-label="Help and guided tour" data-i18n-title="topbar.help"><i class="bx bx-help-circle"></i></button>
            <button class="icon-btn" id="notificationBtn" title="Activity" aria-label="View recent activity" data-i18n-title="topbar.activity"><i class="bx bx-bell"></i></button>
            <div class="account-menu" id="accountMenu">
                <button class="avatar" id="accountMenuBtn" aria-haspopup="true" aria-expanded="false" aria-label="Account menu"><?php echo e(strtoupper(substr($currentUser['name'], 0, 1))); ?></button>
                <div class="account-dropdown" id="accountDropdown" hidden>
                    <div class="account-dropdown-name"><?php echo e($currentUser['name']); ?></div>
                    <div class="account-dropdown-email muted"><?php echo e($currentUser['email']); ?></div>
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
        <div class="side-section">
            <div class="side-label" data-i18n="side.workspace">WORKSPACE</div>
            <?php foreach ($pages as $key => $label): ?>
                <a class="nav-item <?php echo $page === $key ? 'active' : ''; ?>" href="?page=<?php echo e($key); ?>" title="<?php echo e($label); ?>"<?php echo $page === $key ? ' aria-current="page"' : ''; ?>>
                    <span class="nav-icon"><i class="<?php echo e($icons[$key === 'ui-guide' ? 'guide' : $key]); ?>"></i></span>
                    <span class="nav-text" data-i18n="nav.<?php echo e($key); ?>"><?php echo e($label); ?></span>
                </a>
            <?php endforeach; ?>
        </div>
        <div class="side-section">
            <div class="side-label" data-i18n="side.quickTools">QUICK TOOLS</div>
            <button class="nav-item" id="quickCommand" title="Command Palette"><span class="nav-icon"><i class="bx bx-command"></i></span><span class="nav-text" data-i18n="qt.commandPalette">Command Palette</span><kbd>Ctrl K</kbd></button>
            <button class="nav-item" id="newProject" title="New Project"><span class="nav-icon"><i class="bx bx-plus"></i></span><span class="nav-text" data-i18n="qt.newProject">New Project</span></button>
            <?php if ($experienceLevel === null || $experienceLevel === 'beginner'): ?>
            <button class="nav-item" id="quickTour" title="Guided Tour"><span class="nav-icon"><i class="bx bx-compass"></i></span><span class="nav-text" data-i18n="qt.guidedTour">Guided Tour</span></button>
            <?php endif; ?>
        </div>
        <div class="sidebar-bottom"><span class="status-dot"></span><span><span data-i18n="side.localWorkspace">Local workspace</span> · <?php echo e($experienceLabel); ?></span></div>
    </aside>

    <main class="main" id="mainContent" tabindex="-1">
        <div class="page-wrap">
        <div class="backup-notice" id="backupNotice" hidden>
            <i class="bx bx-hdd"></i>
            <div class="backup-notice-text"><b>Back up your work to disk</b><span>Projects, snippets and notes auto-save to a dedicated local folder on this computer (your Desktop, by default). You can also save a personal copy to your Desktop or any drive.</span></div>
            <div class="backup-notice-actions">
                <button class="small-btn" id="backupNoticeDownload"><i class="bx bx-download"></i> Download backup</button>
                <button class="icon-btn" id="backupNoticeDismiss" aria-label="Dismiss backup reminder" title="Dismiss"><i class="bx bx-x"></i></button>
            </div>
        </div>
        <?php if ($page === 'dashboard'): ?>
        <div class="save-setup-banner" id="saveSetupBanner" hidden>
            <i class="bx bx-cloud-upload"></i>
            <div class="save-setup-text"><b>Set up local saving</b><span>Confirm where A-DevTools should save your projects, snippets and notes on this computer.</span></div>
            <div class="save-setup-actions">
                <button class="small-btn primary-btn" id="saveSetupConfirm"><i class="bx bx-check"></i> Use default location</button>
                <a class="small-btn ghost-btn" href="?page=settings#localDiskBackup"><i class="bx bx-cog"></i> Choose a custom folder</a>
            </div>
        </div>
        <div class="save-setup-banner save-setup-warning" id="saveSetupWarning" hidden>
            <i class="bx bx-error-circle"></i>
            <div class="save-setup-text"><b>Local saving unavailable</b><span>Run A-DevTools through Apache (e.g. via XAMPP) so <code>save-data.php</code> can write your files to disk.</span></div>
        </div>
        <div class="save-status-card" id="saveStatusCard" hidden>
            <span class="status-dot"></span>
            <div><b>Connected</b><span id="saveStatusText">Saving projects, snippets and notes automatically.</span></div>
        </div>
        <?php endif; ?>
        <?php if ($page === 'dashboard' && $experienceLevel === 'professional'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="dash.pro.eyebrow">WORKSPACE</div><h1 data-i18n="dash.pro.title">Dashboard</h1><p data-i18n="dash.pro.subtitle">Projects, snippets, notes and the playground, in one local workspace.</p></div><button class="primary-btn" id="newProjectHero"><i class="bx bx-plus"></i> <span data-i18n="common.newProject">New Project</span></button></section>
            <div class="stats-grid">
                <div class="stat-card"><span data-i18n="stat.projects">Projects</span><strong id="projectCount">0</strong><small data-i18n="stat.projectsDesc">saved locally</small></div>
                <div class="stat-card"><span data-i18n="stat.snippets">Snippets</span><strong id="snippetCount">0</strong><small data-i18n="stat.snippetsDesc">code references</small></div>
                <div class="stat-card"><span data-i18n="stat.notes">Notes</span><strong id="noteCount">0</strong><small data-i18n="stat.notesDesc">development notes</small></div>
                <div class="stat-card"><span data-i18n="stat.storage">Storage</span><strong data-i18n="stat.local">Local</strong><small data-i18n="stat.storageDesc">browser storage</small></div>
            </div>
            <div class="grid-2">
                <section class="panel"><div class="panel-head"><h2>Shortcuts</h2><span class="muted"><kbd>Ctrl K</kbd> for command palette</span></div><div class="quick-grid">
                    <a href="?page=code" class="quick-card"><b><i class="bx bx-code-alt"></i></b><span data-i18n="quick.code">Code Playground</span><small data-i18n="quick.codeDesc">Write and preview HTML/CSS/JS</small></a>
                    <a href="?page=components" class="quick-card"><b><i class="bx bx-layer"></i></b><span data-i18n="quick.components">UI Components</span><small data-i18n="quick.componentsDesc">Reusable interface patterns</small></a>
                    <a href="?page=snippets" class="quick-card"><b><i class="bx bx-file-code"></i></b><span data-i18n="quick.snippets">Snippets</span><small data-i18n="quick.snippetsDesc">Save frequently used code</small></a>
                    <a href="?page=notes" class="quick-card"><b><i class="bx bx-note"></i></b><span data-i18n="quick.notes">Development Notes</span><small data-i18n="quick.notesDesc">Keep ideas and references</small></a>
                </div></section>
                <section class="panel"><div class="panel-head"><h2>Workspace activity</h2><span class="muted">Local</span></div><div id="activityList" class="activity-list"><div class="empty">No activity yet.</div></div></section>
            </div>
        <?php elseif ($page === 'dashboard' && $experienceLevel === 'intermediate'): ?>
            <section class="hero">
                <div><div class="eyebrow" data-i18n="dash.hero.eyebrow">PERSONAL DEVELOPMENT WORKSPACE</div><h1 data-i18n="dash.hero.title">Build. Test. Learn. Ship.</h1><p data-i18n="dash.inter.subtitle">Jump back into your projects, snippets and notes, or open the Playground to keep experimenting.</p></div>
                <button class="primary-btn" id="newProjectHero"><i class="bx bx-plus"></i> <span data-i18n="common.newProject">New Project</span></button>
            </section>
            <div class="stats-grid">
                <div class="stat-card"><span data-i18n="stat.projects">Projects</span><strong id="projectCount">0</strong><small data-i18n="stat.projectsDesc">saved locally</small></div>
                <div class="stat-card"><span data-i18n="stat.snippets">Snippets</span><strong id="snippetCount">0</strong><small data-i18n="stat.snippetsDesc">code references</small></div>
                <div class="stat-card"><span data-i18n="stat.notes">Notes</span><strong id="noteCount">0</strong><small data-i18n="stat.notesDesc">development notes</small></div>
                <div class="stat-card"><span data-i18n="stat.storage">Storage</span><strong data-i18n="stat.local">Local</strong><small data-i18n="stat.storageDesc">browser storage</small></div>
            </div>
            <div class="grid-2">
                <section class="panel"><div class="panel-head"><h2>Quick start</h2></div><div class="quick-grid">
                    <a href="?page=code" class="quick-card"><b><i class="bx bx-code-alt"></i></b><span data-i18n="quick.code">Code Playground</span><small data-i18n="quick.codeDesc">Write and preview HTML/CSS/JS</small></a>
                    <a href="?page=components" class="quick-card"><b><i class="bx bx-layer"></i></b><span data-i18n="quick.components">UI Components</span><small data-i18n="quick.componentsDesc">Reusable interface patterns</small></a>
                    <a href="?page=snippets" class="quick-card"><b><i class="bx bx-file-code"></i></b><span data-i18n="quick.snippets">Snippets</span><small data-i18n="quick.snippetsDesc">Save frequently used code</small></a>
                    <a href="?page=notes" class="quick-card"><b><i class="bx bx-note"></i></b><span data-i18n="quick.notes">Development Notes</span><small data-i18n="quick.notesDesc">Keep ideas and references</small></a>
                </div></section>
                <section class="panel"><div class="panel-head"><h2>Workspace activity</h2><span class="muted">Local</span></div><div id="activityList" class="activity-list"><div class="empty">No activity yet.</div></div></section>
            </div>
            <section class="panel"><div class="panel-head"><h2>Need a refresher?</h2></div><p class="muted">Replay the guided tour or revisit the beginner steps anytime from <a class="text-link" href="?page=settings">Settings</a>.</p></section>
        <?php elseif ($page === 'dashboard'): ?>
            <section class="hero">
                <div><div class="eyebrow" data-i18n="dash.hero.eyebrow">PERSONAL DEVELOPMENT WORKSPACE</div><h1 data-i18n="dash.hero.title">Build. Test. Learn. Ship.</h1><p data-i18n="dash.beg.subtitle">A self-hosted workspace for organizing code, UI experiments, reusable snippets, projects and development notes.</p></div>
                <button class="primary-btn" id="newProjectHero"><i class="bx bx-plus"></i> <span data-i18n="common.newProject">New Project</span></button>
            </section>
            <div class="stats-grid">
                <div class="stat-card"><span data-i18n="stat.projects">Projects</span><strong id="projectCount">0</strong><small data-i18n="stat.projectsDesc">saved locally</small></div>
                <div class="stat-card"><span data-i18n="stat.snippets">Snippets</span><strong id="snippetCount">0</strong><small data-i18n="stat.snippetsDesc">code references</small></div>
                <div class="stat-card"><span data-i18n="stat.notes">Notes</span><strong id="noteCount">0</strong><small data-i18n="stat.notesDesc">development notes</small></div>
                <div class="stat-card"><span data-i18n="stat.storage">Storage</span><strong data-i18n="stat.local">Local</strong><small data-i18n="stat.storageDesc">browser storage</small></div>
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
            <div class="grid-2">
                <section class="panel"><div class="panel-head"><h2>Quick start</h2></div><div class="quick-grid">
                    <a href="?page=code" class="quick-card"><b><i class="bx bx-code-alt"></i></b><span data-i18n="quick.code">Code Playground</span><small data-i18n="quick.codeDesc">Write and preview HTML/CSS/JS</small></a>
                    <a href="?page=components" class="quick-card"><b><i class="bx bx-layer"></i></b><span data-i18n="quick.components">UI Components</span><small data-i18n="quick.componentsDesc">Reusable interface patterns</small></a>
                    <a href="?page=snippets" class="quick-card"><b><i class="bx bx-file-code"></i></b><span data-i18n="quick.snippets">Snippets</span><small data-i18n="quick.snippetsDesc">Save frequently used code</small></a>
                    <a href="?page=notes" class="quick-card"><b><i class="bx bx-note"></i></b><span data-i18n="quick.notes">Development Notes</span><small data-i18n="quick.notesDesc">Keep ideas and references</small></a>
                </div></section>
                <section class="panel"><div class="panel-head"><h2>Workspace activity</h2><span class="muted">Local</span></div><div id="activityList" class="activity-list"><div class="empty">No activity yet.</div></div></section>
            </div>
        <?php elseif ($page === 'code'): ?>
            <section class="page-head playground-head">
                <div><div class="eyebrow" data-i18n="code.eyebrow">LEARN · BUILD · RUN</div><h1 data-i18n="code.title">Code Playground</h1><p data-i18n="code.subtitle">New to coding? Follow the 4 steps below. You can change the example safely and see the result immediately.</p></div>
                <div class="playground-actions"><span class="run-status" id="runStatus"><i></i> Ready</span><button class="ghost-btn" id="resetCode"><i class="bx bx-reset"></i> <span data-i18n="code.reset">Reset</span></button><button class="primary-btn" id="runCode"><i class="bx bx-play"></i> <span data-i18n="code.run">Run my code</span></button></div>
            </section>
            <section class="beginner-guide panel" id="playgroundGuide">
                <div class="guide-intro"><div><span class="section-kicker">BEGINNER GUIDE</span><h2>Your first playground test</h2><p>You do not need to understand everything at once. Start with the HTML, change one word, press <b>Run my code</b>, then check the preview.</p></div><button class="small-btn guide-toggle" data-target="playgroundGuideSteps"><i class="bx bx-chevron-up"></i> Hide guide</button></div>
                <div class="guide-steps" id="playgroundGuideSteps">
                    <button class="guide-step active" data-step="1"><span>1</span><b>HTML</b><small>Change the content</small></button>
                    <button class="guide-step" data-step="2"><span>2</span><b>CSS</b><small>Change the appearance</small></button>
                    <button class="guide-step" data-step="3"><span>3</span><b>JavaScript</b><small>Add interaction</small></button>
                    <button class="guide-step" data-step="4"><span>4</span><b>Run & preview</b><small>See your result</small></button>
                </div>
                <div class="guide-tip" id="playgroundTip"><i class="bx bx-bulb"></i><div><strong>Start here:</strong> Open the HTML tab and change <code>Hello A-DevTools</code> to your own title. You are editing a safe local copy, so you can always press Reset.</div></div>
            </section>
            <div class="playground-shell">
                <div class="editor-panel">
                    <div class="editor-topbar"><div class="editor-file"><span class="file-dot html" id="fileDot"></span><strong id="editorTitle">index.html</strong><small id="editorDirty">Saved locally</small></div><div class="editor-tools"><button class="editor-tool active" id="wrapToggle" title="Toggle line wrap" aria-pressed="true"><i class="bx bx-text"></i></button><button class="editor-tool" id="formatCode" title="Format active editor"><i class="bx bx-align-left"></i></button><button class="editor-tool" id="clearEditor" title="Clear active editor"><i class="bx bx-eraser"></i></button><button class="editor-tool" id="downloadCode" title="Download combined HTML file"><i class="bx bx-download"></i></button></div></div>
                    <div class="tabs editor-tabs"><button class="tab active" data-tab="html"><i class="bx bx-code"></i> HTML<span class="tab-dot" aria-hidden="true"></span></button><button class="tab" data-tab="css"><i class="bx bx-palette"></i> CSS<span class="tab-dot" aria-hidden="true"></span></button><button class="tab" data-tab="js"><i class="bx bx-bolt"></i> JavaScript<span class="tab-dot" aria-hidden="true"></span></button></div>
                    <div class="editor-body">
                        <textarea id="htmlCode" class="code-editor" spellcheck="false" aria-label="HTML editor"><!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <main class="demo">
    <span class="eyebrow">DEV DESK</span>
    <h1>Hello A-DevTools</h1>
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
button:hover{transform:translateY(-1px)}</textarea>
                        <textarea id="jsCode" class="code-editor hidden" spellcheck="false" aria-label="JavaScript editor">document.getElementById('demoButton')?.addEventListener('click',()=>{
  document.getElementById('demoButton').textContent='It works!';
});</textarea>
                    </div>
                    <div class="editor-statusbar"><span><i class="bx bx-check-circle"></i> Local sandbox</span><span id="charCount">0 chars</span></div>
                </div>
                <div class="preview-panel">
                    <div class="preview-head"><div><span class="preview-live-dot"></span><strong>LIVE PREVIEW</strong><small id="previewMeta">Sandboxed iframe</small></div><div class="preview-tools"><button class="device-btn active" data-device="desktop" title="Desktop preview" aria-pressed="true"><i class="bx bx-desktop"></i></button><button class="device-btn" data-device="tablet" title="Tablet preview" aria-pressed="false"><i class="bx bx-tablet"></i></button><button class="device-btn" data-device="mobile" title="Mobile preview" aria-pressed="false"><i class="bx bx-mobile"></i></button><button class="ghost-btn" id="openPreview"><i class="bx bx-window-open"></i> Open</button></div></div>
                    <div class="preview-stage" id="previewStage"><iframe id="preview" sandbox="allow-scripts"></iframe></div>
                </div>
            </div>
        <?php elseif ($page === 'components'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="components.eyebrow">UI LIBRARY</div><h1 data-i18n="components.title">UI Components</h1><p data-i18n="components.subtitle">Practical HTML5/CSS3 patterns you can reuse in your projects.</p></div></section>
            <div class="component-grid">
                <section class="panel"><h2>Buttons</h2><div class="demo-row"><button class="primary-btn">Primary</button><button class="ghost-btn">Secondary</button><button class="danger-btn">Danger</button></div></section>
                <section class="panel"><h2>Form controls</h2><label>Project name<input class="input" placeholder="My project"></label><label>Technology<select class="input"><option>Native PHP</option><option>JavaScript</option><option>HTML5 / CSS3</option></select></label></section>
                <section class="panel"><h2>Cards</h2><div class="mini-card"><b>Responsive card</b><p>Scales from desktop to mobile.</p></div></section>
                <section class="panel"><h2>Alerts</h2><div class="notice">Information message</div><div class="notice success">Success message</div></section>
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
            <section class="snippet-toolbar panel">
                <div class="toolbar-search"><i class="bx bx-search"></i><input id="snippetSearch" placeholder="Search snippets, UI patterns, language..." autocomplete="off"></div>
                <select id="snippetFilter" class="filter-select"><option value="all">All languages</option><option value="HTML + CSS">HTML + CSS</option><option value="HTML + JS">HTML + JS</option><option value="HTML + CSS + JS">HTML + CSS + JS</option><option value="CSS">CSS</option><option value="JavaScript">JavaScript</option></select>
                <select id="snippetSort" class="filter-select"><option value="recent">Recently added</option><option value="name">Name A–Z</option><option value="language">Language</option></select>
                <div class="view-switch"><button class="view-btn active" data-view="grid"><i class="bx bx-grid-alt"></i> Grid</button><button class="view-btn" data-view="list"><i class="bx bx-list-ul"></i> List</button></div>
            </section>
            <section class="snippet-section">
                <div class="section-title-row"><div><span class="section-kicker">STARTER LIBRARY</span><h2>Runnable UI starters</h2><p>Choose a pattern, preview it, then open it in the playground and make it yours.</p></div><span class="library-hint"><i class="bx bx-zap"></i> Every starter can run</span></div>
                <div class="starter-grid">
                    <article class="starter-card"><div class="starter-preview preview-dashboard" data-template="dashboard"><div class="sp-top"></div><div class="sp-columns"><div class="sp-side"></div><div class="sp-content"><i></i><i></i><i></i><i></i></div></div></div><div class="starter-info"><div><span class="tag">HTML + CSS</span><h3>Admin Dashboard</h3><p>Navbar, sidebar, stats and responsive cards.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: layout + cards</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="dashboard"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="dashboard"><i class="bx bx-play"></i> Run</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-landing" data-template="landing"><div class="lp-nav"></div><div class="lp-hero"><i></i><b></b></div><div class="lp-cards"><i></i><i></i><i></i></div></div><div class="starter-info"><div><span class="tag">HTML + CSS</span><h3>Landing Page</h3><p>Hero, navigation and responsive feature cards.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: hierarchy + spacing</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="landing"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="landing"><i class="bx bx-play"></i> Run</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-form" data-template="form"><div class="form-line wide"></div><div class="form-line"></div><div class="form-line"></div><div class="form-button"></div></div><div class="starter-info"><div><span class="tag">HTML + CSS</span><h3>Form Page</h3><p>Clean fields and validation-ready actions.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: inputs + labels</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="form"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="form"><i class="bx bx-play"></i> Run</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-table" data-template="table"><div class="table-row head"></div><div class="table-row"></div><div class="table-row"></div><div class="table-row"></div></div><div class="starter-info"><div><span class="tag">HTML + CSS</span><h3>Data Table</h3><p>Responsive data with status and actions.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: structured data</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="table"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="table"><i class="bx bx-play"></i> Run</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-modal" data-template="modal"><div class="modal-mini"><b></b><i></i><i></i><span></span></div></div><div class="starter-info"><div><span class="tag">HTML + JS</span><h3>Interactive Modal</h3><p>A real working dialog with open and close actions.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: JavaScript events</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="modal"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="modal"><i class="bx bx-play"></i> Run</button></div></div></article>
                    <article class="starter-card"><div class="starter-preview preview-navbar" data-template="navbar"><div class="nav-mini"><b></b><i></i><i></i><i></i></div><div class="nav-body"><b></b><b></b></div></div><div class="starter-info"><div><span class="tag">HTML + CSS + JS</span><h3>Responsive Navigation</h3><p>Mobile navigation with a working menu toggle.</p><div class="teaches"><i class="bx bx-book-open"></i> Teaches: responsive JS</div></div><div class="starter-actions"><button class="small-btn preview-template" data-template="navbar"><i class="bx bx-show"></i> Preview</button><button class="small-btn run-template" data-template="navbar"><i class="bx bx-play"></i> Run</button></div></div></article>
                </div>
            </section>
            <section class="saved-section snippet-section">
                <div class="section-title-row"><div><span class="section-kicker">YOUR LIBRARY</span><h2>Saved snippets <span class="count-pill" id="savedSnippetCount">0</span></h2><p>Copy, preview, edit, or run your saved code in a clean sandbox.</p></div></div>
                <div id="snippetGrid" class="snippet-grid"></div>
            </section>
        <?php elseif ($page === 'projects'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="projects.eyebrow">WORKSPACE</div><h1 data-i18n="projects.title">Projects</h1><p data-i18n="projects.subtitle">Track your personal development projects and ideas.</p></div><button class="primary-btn" id="newProjectPage"><i class="bx bx-plus"></i> <span data-i18n="common.newProject">New Project</span></button></section><div id="projectGrid" class="project-grid"></div>
        <?php elseif ($page === 'notes'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="notes.eyebrow">KNOWLEDGE</div><h1 data-i18n="notes.title">Development Notes</h1><p data-i18n="notes.subtitle">Keep technical notes without leaving your workspace.</p></div><button class="primary-btn" id="addNote"><i class="bx bx-plus"></i> <span data-i18n="common.addNote">Add Note</span></button></section><div id="noteGrid" class="note-grid"></div>
        <?php elseif ($page === 'ui-guide'): ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="uiGuide.eyebrow">REFERENCE</div><h1 data-i18n="uiGuide.title">UI/UX Guide</h1><p data-i18n="uiGuide.subtitle">Use these patterns as a practical guide while building Native PHP interfaces.</p></div></section>
            <div class="guide-layout"><nav class="guide-nav panel"><strong>Guide sections</strong><a href="#shell">Application shell</a><a href="#layout">Layout</a><a href="#forms">Forms</a><a href="#tables">Tables</a><a href="#responsive">Responsive</a></nav><div class="guide-content">
                <section class="guide-section panel" id="shell"><span class="section-kicker">01 · SHELL</span><h2>Keep navigation predictable</h2><p class="muted">Use a stable topbar, one primary sidebar and a focused content area. Hide secondary navigation on small screens rather than squeezing everything into one row.</p><div class="wireframe"><div class="wf-top">TOP NAVIGATION</div><div class="wf-body"><div class="wf-side">Dashboard<br>Projects<br>Snippets<br>Notes<br>Settings</div><div class="wf-main">Page heading<br><br>Primary content</div></div></div></section>
                <section class="guide-section panel" id="layout"><span class="section-kicker">02 · LAYOUT</span><h2>Build with reusable regions</h2><div class="guide-cards"><div class="guide-demo-card"><b>Cards</b><span>Use consistent padding, borders and spacing for independent content.</span></div><div class="guide-demo-card"><b>Toolbar</b><span>Keep search, filters and actions together above dense content.</span></div><div class="guide-demo-card"><b>Hierarchy</b><span>Use eyebrow → heading → supporting text before the main action.</span></div></div></section>
                <section class="guide-section panel" id="forms"><span class="section-kicker">03 · FORMS</span><h2>Make input intent obvious</h2><form class="form-demo" onsubmit="return false"><label for="guideName">Project name</label><input class="input" id="guideName" placeholder="My project"><label for="guideType">Project type</label><select class="input" id="guideType"><option>Website</option><option>Web application</option></select><button class="primary-btn">Save example</button></form></section>
                <section class="guide-section panel" id="tables"><span class="section-kicker">04 · TABLES</span><h2>Protect dense data with overflow</h2><div class="table-scroll"><table class="guide-table"><thead><tr><th>ID</th><th>Name</th><th>Status</th><th>Action</th></tr></thead><tbody><tr><td>001</td><td>Project A</td><td><span class="badge">Active</span></td><td><button class="small-btn">View</button></td></tr><tr><td>002</td><td>Project B</td><td><span class="badge">Draft</span></td><td><button class="small-btn">Edit</button></td></tr></tbody></table></div></section>
                <section class="guide-section panel" id="responsive"><span class="section-kicker">05 · RESPONSIVE</span><h2>Design for the narrow screen first</h2><ul class="guide-list"><li>Use CSS Grid with <code>minmax()</code> or <code>auto-fit</code> for cards.</li><li>Allow tables to scroll horizontally instead of breaking the page.</li><li>Collapse or slide the sidebar below the desktop breakpoint.</li><li>Keep touch targets comfortable and avoid tiny controls.</li></ul></section>
            </div></div>
        <?php else: ?>
            <section class="page-head"><div><div class="eyebrow" data-i18n="settings.eyebrow">CONFIGURATION</div><h1 data-i18n="settings.title">Settings</h1><p data-i18n="settings.subtitle">Configure the local development workspace.</p></div></section>
            <div class="settings-grid"><section class="panel"><h2 data-i18n="settings.appearance">Appearance</h2><label class="switch-row"><span data-i18n="settings.darkMode">Dark mode</span> <input type="checkbox" id="darkSetting"><span class="switch"></span></label><p class="muted" data-i18n="settings.themeNote">Theme is stored locally in your browser.</p><label class="switch-row"><span data-i18n="settings.resetTextSize">Reset text size</span> <button class="small-btn" id="resetTextSize" data-i18n="settings.resetToDefault">Reset to default</button></label><p class="muted" data-i18n="settings.textSizeNote">Use the A− / A+ buttons in the top bar any time to make text easier to read.</p></section><section class="panel"><h2 data-i18n="settings.experienceLevel">Experience level</h2><p class="muted"><span data-i18n="settings.currentLevel">Current level:</span> <span class="experience-badge" id="experienceBadge">Not set</span></p><p class="muted" data-i18n="settings.experienceNote">This decides how much guidance is shown across the workspace.</p><button class="ghost-btn" id="changeExperienceBtn"><i class="bx bx-user-check"></i> <span data-i18n="settings.changeExperience">Change experience level</span></button><button class="ghost-btn" id="replayTour"><i class="bx bx-play"></i> <span data-i18n="settings.replayTour">Replay guided tour</span></button></section><section class="panel" id="localDiskBackup"><h2 data-i18n="settings.localBackup">Local disk backup</h2><p class="muted">Every project, snippet and note is mirrored to a dedicated folder on this computer — a Desktop folder by default — so your work lives on disk, not only inside the browser.</p><div class="disk-status" id="diskStatusBody"><p class="muted">Checking local save status…</p></div><div class="disk-actions"><button class="ghost-btn" id="saveBackupBtn"><i class="bx bx-save"></i> <span data-i18n="settings.saveBackupNow">Save backup to disk now</span></button><button class="ghost-btn" id="downloadBackupBtn"><i class="bx bx-download"></i> <span data-i18n="settings.downloadBackupFile">Download backup file</span></button></div><div class="form-grid" style="margin-top:14px"><label class="full">Save location<input id="dataLocationInput" class="input" placeholder="Loading default location…"></label></div><p class="muted">Leave blank to use the automatic default (a dedicated <code>A-DevTools-Data</code> folder on your Desktop, created for you the first time this runs), or enter a relative folder name (e.g. <code>my-backups</code>) or a full path (e.g. <code>D:/A-DevTools-Data</code>) to save somewhere else instead. Existing files are not moved automatically.</p><div class="disk-actions"><button class="ghost-btn" id="saveLocationBtn"><i class="bx bx-folder"></i> <span data-i18n="settings.saveLocation">Save location</span></button><button class="ghost-btn" id="resetLocationBtn"><i class="bx bx-reset"></i> <span data-i18n="settings.resetLocation">Reset to default</span></button></div><hr style="border:0;border-top:1px solid var(--border,#e5e7eb);margin:16px 0"><p class="muted"><b>Export / Import</b> — move your workspace to another computer, or restore an older copy.</p><div class="disk-actions"><button class="ghost-btn" id="importBackupBtn"><i class="bx bx-upload"></i> <span data-i18n="settings.importBackup">Import backup file</span></button><input type="file" id="importBackupInput" accept="application/json,.json" hidden></div></section><section class="panel"><h2 data-i18n="settings.workspaceData">Workspace data</h2><p class="muted">Projects, snippets and notes are stored in localStorage and mirrored to disk automatically. No external service is required.</p><button class="danger-btn" id="clearData" data-i18n="settings.clearData">Clear local data</button></section></div>
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
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/matchbrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/edit/closebrackets.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/codemirror/5.65.16/addon/selection/active-line.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/2.0.3/beautify.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/2.0.3/beautify-css.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/js-beautify/2.0.3/beautify-html.min.js"></script>
<script>window.CSRF_TOKEN = <?php echo json_encode(csrf_token()); ?>;</script>
<script src="assets/js/app.js?v=<?php echo $jsVersion; ?>"></script>
<script src="assets/js/i18n.js?v=<?php echo $i18nVersion; ?>"></script>
<script src="assets/js/pwa.js?v=<?php echo $pwaVersion; ?>"></script>
</body>
</html>
