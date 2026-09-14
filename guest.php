<?php
/**
 * Rendered by index.php for anyone who isn't logged in yet (or who visits
 * ?page=landing/login/signup on purpose). Deliberately a separate, lighter
 * template — no sidebar/topbar app shell — since these pages exist to get
 * a visitor into an account, not to be the workspace itself.
 *
 * Expects $page ('landing' | 'login' | 'signup') and $cssVersion, $i18nVersion,
 * $pwaVersion to already
 * be set by index.php.
 */
if (!defined('ADEVTOOLS_SECURITY_LOADED')) { require_once __DIR__ . '/security.php'; }
if (!defined('ADEVTOOLS_USERS_FILE')) { require_once __DIR__ . '/auth-helpers.php'; }
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111214">
<title><?php echo $page === 'login' ? 'Log in' : ($page === 'signup' ? 'Join the Community' : 'A-DevTools — Build. Test. Learn. Ship.'); ?></title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="assets/icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="A-DevTools">
<link rel="preconnect" href="https://cdnjs.cloudflare.com">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/boxicons/2.1.4/css/boxicons.min.css">
<link rel="stylesheet" href="assets/css/app.css?v=<?php echo (int)$cssVersion; ?>">
</head>
<body class="guest-body">
<a href="#guestMain" class="skip-link">Skip to main content</a>

<header class="guest-topbar" id="guestTopbar">
    <div class="guest-topbar-inner">
    <a class="brand" href="?page=landing" aria-label="A-DevTools home"><span class="brand-mark"><i class="bx bx-code-alt"></i></span><span>A-DevTools</span></a>

    <?php if ($page === 'landing'): ?>
    <nav class="guest-nav-links" id="guestNavLinks" aria-label="Section navigation">
        <span class="guest-nav-indicator" id="guestNavIndicator" aria-hidden="true"></span>
        <a href="#guestTop" class="guest-nav-link active" data-section="home"><i class="bx bx-home-alt"></i><span data-i18n="landing.navHome">Home</span></a>
        <a href="#features" class="guest-nav-link" data-section="features"><i class="bx bx-star"></i><span data-i18n="landing.navFeatures">Features</span></a>
        <a href="?page=guide" class="guest-nav-link"><i class="bx bx-book-open"></i><span data-i18n="nav.ui-guide">UI/UX Guide</span></a>
        <a href="?page=components" class="guest-nav-link"><i class="bx bx-shapes"></i><span data-i18n="nav.components">UI Components</span></a>
    </nav>
    <?php endif; ?>
    </div>

    <nav class="guest-topnav">
        <button type="button" class="icon-btn theme-toggle-btn" id="themeToggleBtn" title="Toggle dark mode" aria-label="Toggle dark mode" data-i18n-title="topbar.theme">
            <i class="bx bx-moon"></i>
        </button>
        <div class="lang-picker" id="langPicker">
            <button type="button" class="pill-btn lang-btn" id="langBtn" title="Change language" aria-label="Change language" aria-haspopup="true" aria-expanded="false" data-i18n-title="lang.picker">
                <span class="lang-icon">A</span><span id="langCode">EN</span><i class="bx bx-chevron-down"></i>
            </button>
            <div class="lang-dropdown" id="langDropdown" role="menu" hidden>
                <button type="button" class="lang-option active" data-lang="en" role="menuitemradio" aria-checked="true" tabindex="0"><span class="lang-flag">🇬🇧</span> English<i class="bx bx-check lang-check"></i></button>
                <button type="button" class="lang-option" data-lang="es" role="menuitemradio" aria-checked="false" tabindex="-1"><span class="lang-flag">🇪🇸</span> Español<i class="bx bx-check lang-check"></i></button>
                <button type="button" class="lang-option" data-lang="fr" role="menuitemradio" aria-checked="false" tabindex="-1"><span class="lang-flag">🇫🇷</span> Français<i class="bx bx-check lang-check"></i></button>
                <button type="button" class="lang-option" data-lang="de" role="menuitemradio" aria-checked="false" tabindex="-1"><span class="lang-flag">🇩🇪</span> Deutsch<i class="bx bx-check lang-check"></i></button>
                <button type="button" class="lang-option" data-lang="tl" role="menuitemradio" aria-checked="false" tabindex="-1"><span class="lang-flag">🇵🇭</span> Filipino<i class="bx bx-check lang-check"></i></button>
            </div>
        </div>
        <button type="button" class="pill-btn install-btn" id="pwaInstallBtn" title="Install A-DevTools as an app" aria-label="Install A-DevTools as an app" data-i18n-title="pwa.installTitle">
            <i class="bx bx-download"></i><span class="pwa-install-label" data-i18n="pwa.install">Install App</span>
        </button>
        <button type="button" class="icon-btn apk-btn" id="apkDownloadBtn" title="Download Android APK" aria-label="Download Android APK" data-i18n-title="pwa.apkTitle"><i class="bx bx-cloud-download"></i></button>
        <?php if ($page === 'landing'): ?>
        <button type="button" class="icon-btn nav-toggle-btn" id="guestNavToggle" title="Menu" aria-label="Open menu" aria-haspopup="true" aria-expanded="false" aria-controls="guestMobilePanel">
            <span class="hamburger-adv"><i></i><i></i><i></i></span>
        </button>
        <?php endif; ?>
    </nav>
</header>
<?php if ($page === 'landing'): ?>
<div class="guest-mobile-panel" id="guestMobilePanel" aria-hidden="true">
    <a href="#guestTop" class="guest-nav-link" data-section="home"><i class="bx bx-home-alt"></i><span data-i18n="landing.navHome">Home</span></a>
    <a href="#features" class="guest-nav-link" data-section="features"><i class="bx bx-star"></i><span data-i18n="landing.navFeatures">Features</span></a>
    <a href="?page=guide" class="guest-nav-link"><i class="bx bx-book-open"></i><span data-i18n="nav.ui-guide">UI/UX Guide</span></a>
    <a href="?page=components" class="guest-nav-link"><i class="bx bx-shapes"></i><span data-i18n="nav.components">UI Components</span></a>
    <div class="guest-mobile-panel-actions">
        <a class="ghost-btn" href="?page=login" data-i18n="auth.login">Log in</a>
        <a class="primary-btn" href="?page=signup" data-i18n="auth.joinCommunityLower">Join the community</a>
    </div>
</div>
<?php endif; ?>
<div class="modal-backdrop" id="modal" aria-hidden="true"><div class="modal" role="dialog" aria-modal="true"><button class="modal-close" id="modalClose" aria-label="Close"><i class="bx bx-x"></i></button><div id="modalBody"></div></div></div>
<div id="toast" class="toast" role="status" aria-live="polite"></div>

<main id="guestMain" class="guest-main">
<?php if ($page === 'login' || $page === 'signup'): ?>

    <section class="auth-shell">
        <div class="auth-card panel">
            <div class="auth-tabs" role="tablist" aria-label="Account access">
                <a href="?page=login" role="tab" aria-selected="<?php echo $page === 'login' ? 'true' : 'false'; ?>" class="auth-tab <?php echo $page === 'login' ? 'active' : ''; ?>" data-i18n="auth.login">Log in</a>
                <a href="?page=signup" role="tab" aria-selected="<?php echo $page === 'signup' ? 'true' : 'false'; ?>" class="auth-tab <?php echo $page === 'signup' ? 'active' : ''; ?>" data-i18n="auth.joinCommunity">Join Community</a>
            </div>

            <?php if ($page === 'signup'): ?>
                <h1 data-i18n="auth.joinTitle">Join the A-DevTools Community</h1>
                <p class="muted" data-i18n="auth.joinSubtitle">Create a free account to sync your workspace to this computer and pick up where you left off.</p>
                <form id="signupForm" class="auth-form" novalidate>
                    <label for="suName" data-i18n="auth.name">Name</label>
                    <input class="input" id="suName" name="name" placeholder="Ada Lovelace" autocomplete="name" required>
                    <label for="suEmail" data-i18n="auth.email">Email</label>
                    <input class="input" id="suEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    <label for="suPassword" data-i18n="auth.password">Password</label>
                    <input class="input" id="suPassword" name="password" type="password" placeholder="At least 6 characters" autocomplete="new-password" minlength="6" required data-i18n-placeholder="auth.passwordPlaceholder">
                    <label for="suPassword2" data-i18n="auth.confirmPassword">Confirm password</label>
                    <input class="input" id="suPassword2" name="password2" type="password" placeholder="Re-enter your password" autocomplete="new-password" minlength="6" required data-i18n-placeholder="auth.confirmPasswordPlaceholder">
                    <div class="auth-error" id="signupError" hidden></div>
                    <button class="primary-btn auth-submit" type="submit"><i class="bx bx-user-plus"></i> <span data-i18n="auth.createAccount">Create account</span></button>
                </form>
                <p class="muted auth-switch"><span data-i18n="auth.alreadyMember">Already a member?</span> <a class="text-link" href="?page=login" data-i18n="auth.login">Log in</a></p>
            <?php else: ?>
                <h1 data-i18n="auth.welcomeBack">Welcome back</h1>
                <p class="muted" data-i18n="auth.loginSubtitle">Log in to get back to your projects, snippets and notes.</p>
                <form id="loginForm" class="auth-form" novalidate>
                    <label for="liEmail" data-i18n="auth.email">Email</label>
                    <input class="input" id="liEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    <label for="liPassword" data-i18n="auth.password">Password</label>
                    <input class="input" id="liPassword" name="password" type="password" placeholder="Your password" autocomplete="current-password" required data-i18n-placeholder="auth.yourPassword">
                    <div class="auth-error" id="loginError" hidden></div>
                    <button class="primary-btn auth-submit" type="submit"><i class="bx bx-log-in"></i> <span data-i18n="auth.login">Log in</span></button>
                </form>
                <p class="muted auth-switch"><span data-i18n="auth.newHere">New here?</span> <a class="text-link" href="?page=signup" data-i18n="auth.joinCommunityLower">Join the community</a></p>
            <?php endif; ?>
        </div>
    </section>

<?php else: ?>

    <section class="guest-hero split" id="guestTop">
        <div class="guest-hero-content">
            <div class="eyebrow" data-i18n="dash.hero.eyebrow">PERSONAL DEVELOPMENT WORKSPACE</div>
            <h1 data-i18n="dash.hero.title">Build. Test. Learn. Ship.</h1>
            <p data-i18n="landing.heroSubtitle">A self-hosted workspace for organizing code, UI experiments, reusable snippets, projects and development notes — with a free community account to keep it all yours.</p>
            <div class="guest-hero-actions">
                <a class="primary-btn guest-cta ripple-btn" href="#joinPanel" data-open-auth="login"><i class="bx bx-rocket"></i> <span data-i18n="landing.getStarted">Get Started</span></a>
                <a class="ghost-btn ripple-btn" href="#joinPanel" data-open-auth="signup"><i class="bx bx-group"></i> <span data-i18n="landing.joinNow">Join community now</span></a>
            </div>
        </div>

        <div class="guest-hero-right">
            <div class="guest-hero-highlight panel" id="heroHighlight">
                <span class="pill-tag"><i class="bx bx-badge-check"></i> <span data-i18n="landing.careerGrowth">CAREER GROWTH</span></span>
                <div class="hero-highlight-icon"><i class="bx bx-trending-up"></i></div>
                <h2 data-i18n="landing.startCareer">Let's Start Your Career</h2>
                <p class="muted" data-i18n="landing.careerCopy">Every project, snippet and note you save here becomes part of a portfolio you can point to — the proof of work that gets you hired.</p>
                <div class="hero-highlight-price"><span class="hero-highlight-price-amount">$0</span><span class="muted" data-i18n="landing.free">No payment needed — 100% free, always</span></div>
                <ul class="hero-highlight-list">
                    <li><i class="bx bx-check"></i> <span data-i18n="landing.buildProjects">Build real, working projects</span></li>
                    <li><i class="bx bx-check"></i> <span data-i18n="landing.practiceSnippets">Practice with reusable snippets</span></li>
                    <li><i class="bx bx-check"></i> <span data-i18n="landing.trackProgress">Track your progress over time</span></li>
                </ul>
                <a class="primary-btn guest-cta hero-highlight-cta ripple-btn" href="#joinPanel" data-open-auth="signup"><i class="bx bx-user-plus"></i> <span data-i18n="landing.enroll">Enroll Myself</span></a>
            </div>

            <div class="guest-hero-form-wrap" id="joinPanel" inert>
            <div class="guest-hero-form panel is-active" id="signupCard">
                <button type="button" class="auth-card-close" data-close-auth aria-label="Close"><i class="bx bx-x"></i></button>
                <span class="pill-tag"><i class="bx bx-rocket"></i> <span data-i18n="landing.getStartedTag">GET STARTED</span></span>
                <h2 data-i18n="landing.signupTitle">Sign up and join now!</h2>
                <p class="muted" data-i18n="landing.signupSubtitle">Create a free account and your workspace syncs to this computer automatically.</p>
                <form id="signupForm" class="auth-form" novalidate>
                    <label for="suName" data-i18n="auth.name">Name</label>
                    <input class="input" id="suName" name="name" placeholder="Ada Lovelace" autocomplete="name" required>
                    <label for="suEmail" data-i18n="auth.email">Email</label>
                    <input class="input" id="suEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    <label for="suPassword" data-i18n="auth.password">Password</label>
                    <input class="input" id="suPassword" name="password" type="password" placeholder="At least 6 characters" autocomplete="new-password" minlength="6" required data-i18n-placeholder="auth.passwordPlaceholder">
                    <label for="suPassword2" data-i18n="auth.confirmPassword">Confirm password</label>
                    <input class="input" id="suPassword2" name="password2" type="password" placeholder="Re-enter your password" autocomplete="new-password" minlength="6" required data-i18n-placeholder="auth.confirmPasswordPlaceholder">
                    <div class="auth-error" id="signupError" hidden></div>
                    <button class="primary-btn auth-submit ripple-btn" type="submit"><i class="bx bx-user-plus"></i> <span data-i18n="landing.signUp">Sign Up</span></button>
                </form>
                <p class="muted auth-switch"><span data-i18n="landing.alreadyHaveAccount">Already have an account?</span> <a class="text-link" href="#joinPanel" data-open-auth="login" data-i18n="landing.signInNow">sign in now!</a></p>
            </div>

            <div class="guest-hero-form panel" id="loginCard" inert>
                <button type="button" class="auth-card-close" data-close-auth aria-label="Close"><i class="bx bx-x"></i></button>
                <span class="pill-tag"><i class="bx bx-log-in"></i> <span data-i18n="landing.welcomeBackTag">WELCOME BACK</span></span>
                <h2 data-i18n="landing.signInTitle">Sign In</h2>
                <p class="muted" data-i18n="landing.signInSubtitle">Log in to A-DevTools to keep working on your projects.</p>
                <form id="loginForm" class="auth-form" novalidate>
                    <label for="liEmail" data-i18n="auth.email">Email</label>
                    <input class="input" id="liEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    <label for="liPassword" data-i18n="auth.password">Password</label>
                    <input class="input" id="liPassword" name="password" type="password" placeholder="Your password" autocomplete="current-password" required data-i18n-placeholder="auth.yourPassword">
                    <div class="auth-error" id="loginError" hidden></div>
                    <button class="primary-btn auth-submit ripple-btn" type="submit"><i class="bx bx-log-in"></i> <span data-i18n="landing.signIn">Sign In</span></button>
                </form>
                <p class="muted auth-switch"><span data-i18n="landing.noAccount">Don't have an account?</span> <a class="text-link" href="#joinPanel" data-open-auth="signup" data-i18n="landing.signUpNow">sign up now!</a></p>
            </div>
            </div>
        </div>
    </section>

    <section class="guest-features" id="features">
        <div class="guest-feature panel reveal"><b><i class="bx bx-code-alt"></i></b><h3 data-i18n="quick.code">Code Playground</h3><p class="muted" data-i18n="landing.featCodeDesc">Write and preview HTML, CSS and JavaScript in a live sandbox.</p></div>
        <div class="guest-feature panel reveal"><b><i class="bx bx-file-code"></i></b><h3 data-i18n="quick.snippets">Snippets</h3><p class="muted" data-i18n="landing.featSnippetsDesc">Save, search and reuse the components you build most often.</p></div>
        <div class="guest-feature panel reveal"><b><i class="bx bx-folder-open"></i></b><h3 data-i18n="nav.projects">Projects</h3><p class="muted" data-i18n="landing.featProjectsDesc">Track personal development projects and ideas in one place.</p></div>
        <div class="guest-feature panel reveal"><b><i class="bx bx-note"></i></b><h3 data-i18n="nav.notes">Notes</h3><p class="muted" data-i18n="landing.featNotesDesc">Keep technical notes without leaving your workspace.</p></div>
    </section>

    <section class="guest-cta-band panel reveal">
        <div class="guest-cta-band-copy"><div class="cta-band-icon"><i class="bx bx-rocket"></i></div><div><h2 data-i18n="landing.ctaTitle">Ready to join the community?</h2><p class="muted" data-i18n="landing.ctaSubtitle">It's free — create an account and your workspace is saved to this computer automatically.</p></div></div>
        <a class="primary-btn guest-cta ripple-btn" href="#joinPanel" data-open-auth="signup"><i class="bx bx-rocket"></i> <span data-i18n="landing.getStarted">Get Started</span></a>
    </section>

<?php endif; ?>
</main>

<footer class="guest-footer">
    <div class="guest-footer-inner">
        <div class="guest-footer-brand reveal">
            <a class="brand" href="?page=landing" aria-label="A-DevTools home"><span class="brand-mark"><i class="bx bx-code-alt"></i></span><span>A-DevTools</span></a>
            <p class="muted" data-i18n="landing.footerTag">A self-hosted workspace for organizing code, UI experiments, snippets, projects and development notes.</p>
        </div>
        <div class="guest-footer-col reveal">
            <span class="guest-footer-heading"><i class="bx bx-grid-alt"></i> <span data-i18n="side.workspace2">Workspace</span></span>
            <a href="?page=code"><i class="bx bx-code-alt"></i> <span data-i18n="quick.code">Code Playground</span></a>
            <a href="?page=snippets"><i class="bx bx-file-code"></i> <span data-i18n="quick.snippets">Snippets</span></a>
            <a href="?page=projects"><i class="bx bx-folder-open"></i> <span data-i18n="nav.projects">Projects</span></a>
            <a href="?page=notes"><i class="bx bx-note"></i> <span data-i18n="nav.notes">Notes</span></a>
        </div>
        <div class="guest-footer-col reveal">
            <span class="guest-footer-heading"><i class="bx bx-user-circle"></i> <span data-i18n="landing.account">Account</span></span>
            <a href="?page=login"><i class="bx bx-log-in"></i> <span data-i18n="auth.login">Log in</span></a>
            <a href="?page=signup"><i class="bx bx-user-plus"></i> <span data-i18n="auth.joinCommunityLower">Join the community</span></a>
        </div>
        <div class="guest-footer-col reveal">
            <span class="guest-footer-heading"><i class="bx bx-book-open"></i> <span data-i18n="landing.resources">Resources</span></span>
            <a href="?page=guide"><i class="bx bx-book-open"></i> <span data-i18n="nav.ui-guide">UI/UX Guide</span></a>
            <a href="?page=components"><i class="bx bx-shapes"></i> <span data-i18n="nav.components">UI Components</span></a>
        </div>
    </div>
    <div class="guest-footer-bottom">
        <span><i class="bx bx-copyright"></i> <?php echo date('Y'); ?> A-DevTools. <span data-i18n="landing.allRightsReserved">All rights reserved.</span></span>
        <span class="guest-footer-tag" data-i18n="dash.hero.title">Build. Test. Learn. Ship.</span>
    </div>
</footer>

<script>
(function(){
  var wrap = document.getElementById('joinPanel');
  var signupCard = document.getElementById('signupCard');
  var loginCard = document.getElementById('loginCard');
  var heroHighlight = document.getElementById('heroHighlight');

  function blurIfInside(container){
    if (container && document.activeElement && container.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  }

  function focusFirstField(card){
    if (!card) { return; }
    var field = card.querySelector('input, textarea, select');
    if (field) { field.focus(); }
  }

  function activateCard(card, other){
    if (card) { card.classList.add('is-active'); card.removeAttribute('inert'); }
    if (other) { other.classList.remove('is-active'); other.setAttribute('inert', ''); blurIfInside(other); }
  }

  function openAuth(which){
    if (!wrap) { return; }
    var wasOpen = wrap.classList.contains('open');
    wrap.classList.add('open');
    wrap.removeAttribute('inert');
    if (heroHighlight) { heroHighlight.classList.add('is-hidden'); heroHighlight.setAttribute('inert', ''); }
    if (which === 'login') {
      activateCard(loginCard, signupCard);
    } else {
      activateCard(signupCard, loginCard);
    }
    /* Only scroll on the first open. Re-scrolling every time someone flips
       between Sign In / Sign Up (while already open) was cutting the
       crossfade transition short and made repeated toggling feel jumpy. */
    if (!wasOpen) { wrap.scrollIntoView({behavior:'smooth', block:'center'}); }
    setTimeout(function(){ focusFirstField(which === 'login' ? loginCard : signupCard); }, wasOpen ? 0 : 260);
  }

  function closeAuth(){
    if (wrap) { wrap.classList.remove('open'); wrap.setAttribute('inert', ''); blurIfInside(wrap); }
    if (heroHighlight) { heroHighlight.classList.remove('is-hidden'); heroHighlight.removeAttribute('inert'); }
  }

  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && wrap && wrap.classList.contains('open')) {
      closeAuth();
    }
  });

  document.querySelectorAll('[data-open-auth]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.preventDefault();
      openAuth(el.getAttribute('data-open-auth'));
    });
  });
  document.querySelectorAll('[data-close-auth]').forEach(function(el){
    el.addEventListener('click', function(e){
      e.preventDefault();
      closeAuth();
    });
  });
})();
</script>

<script>
(function(){
  window.CSRF_TOKEN = <?php echo json_encode(csrf_token()); ?>;
  function submitAuth(action, payload, form, errorBox, submitBtn) {
    errorBox.hidden = true;
    var originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Please wait...';
    fetch('auth.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({action:action, csrf: window.CSRF_TOKEN}, payload))
    }).then(function(r){ return r.json(); }).then(function(data){
      if (data && data.ok) {
        window.location.href = '?page=dashboard';
        return;
      }
      errorBox.textContent = (data && data.error) ? data.error : 'Something went wrong. Please try again.';
      errorBox.hidden = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }).catch(function(){
      errorBox.textContent = 'Could not reach the server. Please try again.';
      errorBox.hidden = false;
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    });
  }

  var signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e){
      e.preventDefault();
      var errorBox = document.getElementById('signupError');
      var name = document.getElementById('suName').value.trim();
      var email = document.getElementById('suEmail').value.trim();
      var password = document.getElementById('suPassword').value;
      var password2 = document.getElementById('suPassword2').value;
      if (password !== password2) {
        errorBox.textContent = 'Passwords do not match.';
        errorBox.hidden = false;
        return;
      }
      submitAuth('register', {name:name, email:email, password:password}, signupForm, errorBox, signupForm.querySelector('.auth-submit'));
    });
  }

  var loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function(e){
      e.preventDefault();
      var errorBox = document.getElementById('loginError');
      var email = document.getElementById('liEmail').value.trim();
      var password = document.getElementById('liPassword').value;
      submitAuth('login', {email:email, password:password}, loginForm, errorBox, loginForm.querySelector('.auth-submit'));
    });
  }
})();
</script>

<script>
(function(){
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Scroll-triggered reveal for below-the-fold sections
  var revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length) {
    if (reduceMotion) {
      revealEls.forEach(function(el){ el.classList.add('is-visible'); });
    } else if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, {threshold: 0.15, rootMargin: '0px 0px -40px 0px'});
      revealEls.forEach(function(el){ observer.observe(el); });
    } else {
      revealEls.forEach(function(el){ el.classList.add('is-visible'); });
    }
  }

  // Subtle 3D tilt on feature cards
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    document.querySelectorAll('.guest-feature').forEach(function(card){
      card.addEventListener('mousemove', function(e){
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transition = 'transform .06s linear';
        card.style.transform = 'perspective(700px) rotateX(' + (-py * 7) + 'deg) rotateY(' + (px * 7) + 'deg) translateY(-5px)';
      });
      card.addEventListener('mouseleave', function(){
        card.style.transition = 'transform .35s cubic-bezier(.4,0,.2,1)';
        card.style.transform = '';
      });
    });
  }

  // Ripple feedback on key call-to-action buttons
  if (!reduceMotion) {
    document.querySelectorAll('.ripple-btn').forEach(function(btn){
      btn.addEventListener('click', function(e){
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', function(){ ripple.remove(); });
      });
    });
  }
})();
</script>

<script>
(function(){
  /* ---------- Theme toggle (dark/light) — shared 'theme' key + body.dark class,
     kept in sync with the logged-in app shell (assets/js/app.js) ---------- */
  var themeBtn = document.getElementById('themeToggleBtn');
  function applyTheme(dark, opts){
    document.body.classList.toggle('dark', !!dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    if (themeBtn) {
      var icon = themeBtn.querySelector('.bx');
      if (icon) { icon.className = 'bx ' + (dark ? 'bx-sun' : 'bx-moon'); }
      if (opts && opts.animate) {
        themeBtn.classList.add('is-spinning');
        setTimeout(function(){ themeBtn.classList.remove('is-spinning'); }, 260);
      }
    }
  }
  applyTheme(localStorage.getItem('theme') === 'dark');
  if (themeBtn) {
    themeBtn.addEventListener('click', function(){
      applyTheme(!document.body.classList.contains('dark'), {animate:true});
    });
  }

  /* ---------- Sticky navbar shrink-on-scroll ---------- */
  var topbar = document.getElementById('guestTopbar');
  if (topbar) {
    var onScroll = function(){
      topbar.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive:true});
  }

  /* ---------- Desktop nav: scrollspy + sliding indicator ---------- */
  var navLinks = document.getElementById('guestNavLinks');
  var indicator = document.getElementById('guestNavIndicator');
  if (navLinks && indicator) {
    var linkEls = Array.prototype.slice.call(navLinks.querySelectorAll('.guest-nav-link'));
    function moveIndicatorTo(link){
      if (!link) { indicator.classList.remove('is-visible'); return; }
      indicator.style.width = link.offsetWidth + 'px';
      indicator.style.transform = 'translateX(' + link.offsetLeft + 'px)';
      indicator.classList.add('is-visible');
    }
    function setActive(section){
      linkEls.forEach(function(l){ l.classList.toggle('active', l.dataset.section === section); });
      moveIndicatorTo(navLinks.querySelector('.guest-nav-link[data-section="' + section + '"]'));
    }
    setTimeout(function(){ setActive('home'); }, 50);
    window.addEventListener('resize', function(){
      var current = navLinks.querySelector('.guest-nav-link.active');
      if (current) { moveIndicatorTo(current); }
    });
    var featuresSection = document.getElementById('features');
    if (featuresSection && 'IntersectionObserver' in window) {
      var spy = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          setActive(entry.isIntersecting ? 'features' : 'home');
        });
      }, {rootMargin: '-45% 0px -45% 0px'});
      spy.observe(featuresSection);
    }
    linkEls.forEach(function(link){
      if (link.dataset.section) {
        link.addEventListener('click', function(){ setActive(link.dataset.section); });
      }
    });
  }

  /* ---------- Mobile off-canvas menu ---------- */
  var navToggle = document.getElementById('guestNavToggle');
  var mobilePanel = document.getElementById('guestMobilePanel');
  if (navToggle && mobilePanel) {
    function closeMobilePanel(){
      mobilePanel.classList.remove('open');
      mobilePanel.setAttribute('aria-hidden', 'true');
      navToggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('nav-open');
    }
    function openMobilePanel(){
      mobilePanel.classList.add('open');
      mobilePanel.setAttribute('aria-hidden', 'false');
      navToggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('nav-open');
    }
    navToggle.addEventListener('click', function(){
      if (mobilePanel.classList.contains('open')) { closeMobilePanel(); } else { openMobilePanel(); }
    });
    mobilePanel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', closeMobilePanel);
    });
    document.addEventListener('keydown', function(e){
      if (e.key === 'Escape' && mobilePanel.classList.contains('open')) { closeMobilePanel(); }
    });
    document.addEventListener('click', function(e){
      if (mobilePanel.classList.contains('open') && !mobilePanel.contains(e.target) && e.target !== navToggle && !navToggle.contains(e.target)) {
        closeMobilePanel();
      }
    });
    window.addEventListener('resize', function(){
      if (window.innerWidth > 1050 && mobilePanel.classList.contains('open')) { closeMobilePanel(); }
    });
  }

  /* ---------- Language dropdown: full keyboard navigation ---------- */
  var langDropdown = document.getElementById('langDropdown');
  var langBtn = document.getElementById('langBtn');
  if (langDropdown && langBtn) {
    function langOptions(){ return Array.prototype.slice.call(langDropdown.querySelectorAll('.lang-option')); }
    function focusOption(idx, opts){
      var list = langOptions();
      if (!list.length) { return; }
      idx = ((idx % list.length) + list.length) % list.length;
      list.forEach(function(o, i){
        o.setAttribute('tabindex', i === idx ? '0' : '-1');
        o.classList.toggle('kbd-focus', i === idx);
      });
      if (!opts || opts.focus !== false) { list[idx].focus(); }
    }
    langDropdown.addEventListener('keydown', function(e){
      var list = langOptions();
      var current = list.findIndex(function(o){ return o === document.activeElement; });
      if (e.key === 'ArrowDown') { e.preventDefault(); focusOption(current + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusOption(current - 1); }
      else if (e.key === 'Home') { e.preventDefault(); focusOption(0); }
      else if (e.key === 'End') { e.preventDefault(); focusOption(list.length - 1); }
      else if (e.key === 'Escape') { langBtn.click(); langBtn.focus(); }
    });
    langBtn.addEventListener('click', function(){
      setTimeout(function(){
        if (!langDropdown.hidden) {
          var activeIdx = langOptions().findIndex(function(o){ return o.classList.contains('active'); });
          focusOption(activeIdx > -1 ? activeIdx : 0);
        }
      }, 0);
    });
    langDropdown.querySelectorAll('.lang-option').forEach(function(opt){
      opt.addEventListener('click', function(){
        langOptions().forEach(function(o){ o.setAttribute('aria-checked', String(o === opt)); });
      });
    });
  }
})();
</script>
<script src="assets/js/i18n.js?v=<?php echo (int)$i18nVersion; ?>"></script>
<script src="assets/js/pwa.js?v=<?php echo (int)$pwaVersion; ?>"></script>
</body>
</html>
