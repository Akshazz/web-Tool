<?php
/**
 * Admin Dashboard — the full-page backend for A-Code Playground.
 *
 * Replaces the old "Admin Control" modal that lived in the guest footer.
 * Open it at  /admin-dashboard.php  (the shield icon in the landing-page
 * footer now links here).
 *
 *   - Locked  -> a full-page sign-in screen (not a modal). It posts to
 *                admin.php (action=unlock), which checks an admin-role
 *                account's password, throttles attempts and audits them.
 *   - Unlocked -> the dashboard shell below. The pages themselves
 *                (Overview, Users, Projects, Notes, Snippets, Security,
 *                Integrations, System) are rendered client-side by
 *                assets/js/admin-dashboard.js from admin.php's JSON API.
 *
 * The role check happens on the server BEFORE any dashboard markup is sent,
 * so a signed-out visitor never receives the admin interface at all.
 */
require_once __DIR__ . '/core/security.php';
acodeplayground_start_session();
acodeplayground_security_headers();
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store, max-age=0');
require_once __DIR__ . '/core/auth-helpers.php';

$dbError = false;
$admin = null;
try {
    $admin = adminSessionUser(true);
} catch (Throwable $e) {
    // PDOException (DB down / schema missing) or any runtime Error: show the
    // sign-in page with a notice instead of a blank HTTP 500. Details go to the server log.
    error_log('admin-dashboard.php: ' . get_class($e) . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    $dbError = true;
}

$cssVer = @filemtime(__DIR__ . '/assets/css/admin-dashboard.css') ?: 1;
$jsVer = @filemtime(__DIR__ . '/assets/js/admin-dashboard.js') ?: 1;
$csrf = csrf_token();

function ad_initials($name) {
    $name = trim((string)$name);
    if ($name === '') { return '?'; }
    $parts = preg_split('/\s+/', $name);
    $out = strtoupper(substr($parts[0], 0, 1));
    if (count($parts) > 1) { $out .= strtoupper(substr($parts[count($parts) - 1], 0, 1)); }
    return $out;
}
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#111214">
<title><?php echo $admin ? 'Dashboard' : 'Admin sign in'; ?> · A-Code Playground Admin</title>
<link rel="icon" href="assets/icons/favicon-32.png" sizes="32x32">
<script>
/* Apply the saved theme before first paint (same localStorage key as the main app). */
(function(){try{var t=localStorage.getItem('theme');if(!t&&window.matchMedia&&matchMedia('(prefers-color-scheme:dark)').matches){t='dark';}document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');if(localStorage.getItem('adminSidebar')==='collapsed'){document.documentElement.setAttribute('data-sidebar','collapsed');}}catch(e){document.documentElement.setAttribute('data-theme','light');}})();
</script>
<link rel="preconnect" href="https://cdnjs.cloudflare.com">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/boxicons/2.1.4/css/boxicons.min.css">
<link rel="stylesheet" href="assets/css/admin-dashboard.css?v=<?php echo (int)$cssVer; ?>">
</head>
<?php if (!$admin): ?>
<body class="ad-login-body">
<main class="ad-login">
    <aside class="ad-login-brand" aria-hidden="true">
        <a class="ad-brand" href="index.php?page=landing"><span class="ad-brand-mark"><i class="bx bx-code-alt"></i></span><span>A-Code Playground</span></a>
        <div class="ad-login-hero">
            <span class="ad-kicker">ADMIN CONTROL</span>
            <h1>Run your Playground from one place.</h1>
            <p>Accounts, projects, notes, snippets, security and system health — all managed from a single dashboard.</p>
            <ul class="ad-login-points">
                <li><i class="bx bx-line-chart"></i><span>Live growth and activity analytics</span></li>
                <li><i class="bx bx-group"></i><span>Bulk user &amp; content management</span></li>
                <li><i class="bx bx-shield-quarter"></i><span>Lockout controls and a full audit trail</span></li>
            </ul>
        </div>
        <small>&copy; <?php echo date('Y'); ?> A-Code Playground</small>
    </aside>

    <section class="ad-login-panel">
        <form class="ad-login-card" id="adLoginForm" novalidate>
            <a class="ad-login-mobile-brand ad-brand" href="index.php?page=landing"><span class="ad-brand-mark"><i class="bx bx-code-alt"></i></span><span>A-Code Playground</span></a>
            <span class="ad-kicker">ADMIN CONTROL</span>
            <h2>Sign in to the dashboard</h2>
            <p class="ad-muted">Use an account that has the <b>admin</b> role. This is separate from the regular Community login.</p>

            <?php if ($dbError): ?>
            <div class="ad-alert ad-alert-bad" role="alert"><i class="bx bx-error-circle"></i><span>Can't reach the database. Check <code>core/config.php</code> and that the schema has been imported.</span></div>
            <?php endif; ?>
            <div class="ad-alert ad-alert-bad" id="adLoginError" role="alert" hidden><i class="bx bx-error-circle"></i><span></span></div>

            <label class="ad-field">
                <span>Email</span>
                <div class="ad-input-wrap"><i class="bx bx-envelope"></i><input type="email" id="adLoginEmail" autocomplete="username" placeholder="admin@example.com" required autofocus></div>
            </label>
            <label class="ad-field">
                <span>Password</span>
                <div class="ad-input-wrap"><i class="bx bx-lock-alt"></i><input type="password" id="adLoginPassword" autocomplete="current-password" placeholder="••••••••" required>
                    <button type="button" class="ad-eye" id="adLoginEye" aria-label="Show password" title="Show password"><i class="bx bx-show"></i></button></div>
                <small class="ad-caps" id="adCaps" hidden><i class="bx bx-up-arrow-circle"></i> Caps Lock is on</small>
            </label>

            <button type="submit" class="ad-btn ad-btn-primary ad-btn-lg" id="adLoginSubmit"><i class="bx bx-log-in-circle"></i><span>Sign in</span></button>
            <div class="ad-login-foot">
                <a href="index.php?page=landing"><i class="bx bx-left-arrow-alt"></i> Back to site</a>
                <button type="button" class="ad-link" id="adLoginTheme"><i class="bx bx-moon"></i> Theme</button>
            </div>
            <p class="ad-login-note"><i class="bx bx-info-circle"></i> Too many failed attempts will temporarily lock the account. Every sign-in is recorded in the audit log.</p>
        </form>
    </section>
</main>
<script>
(function(){
    var csrf = <?php echo json_encode($csrf); ?>;
    var form = document.getElementById('adLoginForm');
    var email = document.getElementById('adLoginEmail');
    var pass = document.getElementById('adLoginPassword');
    var btn = document.getElementById('adLoginSubmit');
    var err = document.getElementById('adLoginError');
    var caps = document.getElementById('adCaps');

    function showError(msg) {
        err.hidden = false;
        err.querySelector('span').textContent = msg;
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
    }
    document.getElementById('adLoginEye').addEventListener('click', function(){
        var show = pass.type === 'password';
        pass.type = show ? 'text' : 'password';
        this.querySelector('i').className = 'bx ' + (show ? 'bx-hide' : 'bx-show');
        this.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
    });
    pass.addEventListener('keyup', function(e){ if (e.getModifierState) { caps.hidden = !e.getModifierState('CapsLock'); } });
    document.getElementById('adLoginTheme').addEventListener('click', function(){
        var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
        document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
        try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (e) {}
    });
    form.addEventListener('submit', function(e){
        e.preventDefault();
        err.hidden = true;
        if (!email.value.trim() || !pass.value) { showError('Enter your email and password.'); return; }
        btn.disabled = true; btn.classList.add('is-loading');
        fetch('admin.php', {
            method: 'POST', credentials: 'same-origin',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({action: 'unlock', csrf: csrf, email: email.value.trim(), password: pass.value})
        }).then(function(r){
            // Read as text first so a non-JSON reply (host error page, PHP fatal) gives a useful message.
            return r.text().then(function(t){
                try { return JSON.parse(t); }
                catch (e) { var er = new Error('bad-response'); er.status = r.status; throw er; }
            });
        }).then(function(res){
            if (res.ok) { location.replace('admin-dashboard.php'); return; }
            btn.disabled = false; btn.classList.remove('is-loading');
            pass.value = ''; pass.focus();
            showError(res.error || 'Could not sign in.');
        }).catch(function(e){
            btn.disabled = false; btn.classList.remove('is-loading');
            showError(e && e.message === 'bad-response'
                ? 'The server sent an unexpected reply (HTTP ' + e.status + '). Check the server error log or PHP version.'
                : 'Network error — is the server running?');
        });
    });
})();
</script>
</body>
</html>
<?php
    exit;
endif;

$bootData = array(
    'csrf' => $csrf,
    'endpoint' => 'admin.php',
    'siteUrl' => 'index.php?page=landing',
    'admin' => array('id' => $admin['id'], 'name' => $admin['name'], 'email' => $admin['email']),
    'timeout' => ADMIN_IDLE_TIMEOUT,
    'secondsLeft' => adminSessionSecondsLeft(),
);
?>
<body class="ad-body">
<a href="#adView" class="ad-skip">Skip to content</a>
<div class="ad-shell" id="adShell">

    <aside class="ad-sidebar" id="adSidebar" aria-label="Admin navigation">
        <div class="ad-side-head">
            <a class="ad-brand" href="admin-dashboard.php" aria-label="Admin dashboard home"><span class="ad-brand-mark"><i class="bx bx-code-alt"></i></span><span class="ad-brand-text">A-Code <em>Admin</em></span></a>
        </div>

        <nav class="ad-nav" id="adNav">
            <span class="ad-nav-label">WORKSPACE</span>
            <a href="#/overview" class="ad-nav-item" data-view="overview"><i class="bx bx-grid-alt"></i><span>Overview</span><kbd>G O</kbd></a>
            <a href="#/users" class="ad-nav-item" data-view="users"><i class="bx bx-group"></i><span>Users</span><b class="ad-count" data-count="users">–</b></a>
            <a href="#/projects" class="ad-nav-item" data-view="projects"><i class="bx bx-folder"></i><span>Projects</span><b class="ad-count" data-count="projects">–</b></a>
            <a href="#/notes" class="ad-nav-item" data-view="notes"><i class="bx bx-note"></i><span>Notes</span><b class="ad-count" data-count="notes">–</b></a>
            <a href="#/snippets" class="ad-nav-item" data-view="snippets"><i class="bx bx-code-block"></i><span>Snippets</span><b class="ad-count" data-count="snippets">–</b></a>

            <span class="ad-nav-label">INTEGRATIONS</span>
            <a href="#/integrations" class="ad-nav-item" data-view="integrations"><i class="bx bxl-google"></i><span>Google</span><b class="ad-count" data-count="integrations" hidden>0</b></a>
            <a href="#/github" class="ad-nav-item" data-view="github"><i class="bx bxl-github"></i><span>GitHub</span></a>
            <a href="#/facebook" class="ad-nav-item" data-view="facebook"><i class="bx bxl-facebook-circle"></i><span>Facebook</span></a>

            <span class="ad-nav-label">SYSTEM</span>
            <a href="#/security" class="ad-nav-item" data-view="security"><i class="bx bx-shield-quarter"></i><span>Security</span><b class="ad-count ad-count-warn" data-count="security" hidden>0</b></a>
            <a href="#/system" class="ad-nav-item" data-view="system"><i class="bx bx-server"></i><span>System &amp; data</span></a>
        </nav>

        <div class="ad-side-foot">
            <a class="ad-side-link" href="<?php echo h($bootData['siteUrl']); ?>" target="_blank" rel="noopener"><i class="bx bx-link-external"></i><span>View site</span></a>
            <div class="ad-me">
                <span class="ad-avatar"><?php echo h(ad_initials($admin['name'])); ?></span>
                <div class="ad-me-text"><b><?php echo h($admin['name']); ?></b><small><?php echo h($admin['email']); ?></small></div>
                <button type="button" class="ad-icon-btn" data-act="lock" title="Lock dashboard" aria-label="Lock dashboard"><i class="bx bx-log-out"></i></button>
            </div>
        </div>
    </aside>
    <div class="ad-scrim" id="adScrim" hidden></div>

    <div class="ad-main">
        <header class="ad-topbar">
            <button type="button" class="ad-icon-btn ad-menu-btn" id="adMenuBtn" aria-label="Toggle navigation" aria-controls="adSidebar"><i class="bx bx-menu"></i></button>
            <div class="ad-crumb"><span class="ad-crumb-root">Admin</span><i class="bx bx-chevron-right"></i><h1 id="adTitle">Overview</h1></div>

            <button type="button" class="ad-search-btn" id="adSearchBtn" aria-label="Search and jump to">
                <i class="bx bx-search"></i><span>Search or jump to…</span><kbd>Ctrl K</kbd>
            </button>

            <div class="ad-top-actions">
                <span class="ad-session-chip" id="adSession" title="Time until the dashboard locks from inactivity"><i class="bx bx-timer"></i><span id="adSessionText">--:--</span></span>
                <button type="button" class="ad-icon-btn" id="adRefresh" title="Refresh data (R)" aria-label="Refresh data"><i class="bx bx-refresh"></i></button>
                <button type="button" class="ad-icon-btn" id="adLive" title="Auto-refresh every 30 seconds" aria-label="Toggle auto-refresh" aria-pressed="false"><i class="bx bx-pulse"></i></button>
                <button type="button" class="ad-icon-btn" id="adTheme" title="Toggle theme" aria-label="Toggle theme"><i class="bx bx-moon"></i></button>
            </div>
        </header>

        <main class="ad-content" id="adView" tabindex="-1" aria-live="polite">
            <div class="ad-loading"><div class="ad-spinner"></div><p>Loading dashboard…</p></div>
        </main>
    </div>
</div>

<div class="ad-drawer-wrap" id="adDrawerWrap" hidden>
    <div class="ad-drawer-scrim" data-act="close-drawer"></div>
    <aside class="ad-drawer" id="adDrawer" role="dialog" aria-modal="true" aria-labelledby="adDrawerTitle"></aside>
</div>
<div class="ad-modal-wrap" id="adModalWrap" hidden></div>
<div class="ad-palette-wrap" id="adPaletteWrap" hidden></div>
<div class="ad-toasts" id="adToasts" aria-live="polite"></div>
<div class="ad-tooltip" id="adTip" hidden></div>

<script type="application/json" id="adBoot"><?php echo json_encode($bootData, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT); ?></script>
<script src="assets/js/admin-dashboard.js?v=<?php echo (int)$jsVer; ?>"></script>
</body>
</html>