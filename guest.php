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
if (!defined('ADEVTOOLS_SECURITY_LOADED')) { require_once __DIR__ . '/core/security.php'; }
if (!defined('ADEVTOOLS_USERS_FILE')) { require_once __DIR__ . '/core/auth-helpers.php'; }
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111214">
<title><?php echo $page === 'login' ? 'Log in' : ($page === 'signup' ? 'Join the Community' : ($page === 'terms' ? 'Terms of Service' : ($page === 'privacy' ? 'Privacy Policy' : 'A-DevTools — Build. Test. Learn. Ship.'))); ?></title>
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
        <a href="?page=components" class="guest-nav-link"><i class="bx bxs-shapes"></i><span data-i18n="nav.components">UI Components</span></a>
    </nav>
    <?php endif; ?>
    </div>

    <nav class="guest-topnav">
        <button type="button" class="icon-btn theme-toggle-btn" id="themeToggleBtn" title="Toggle dark mode" aria-label="Toggle dark mode" data-i18n-title="topbar.theme">
            <i class="bx bx-moon"></i>
        </button>
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
    <a href="?page=components" class="guest-nav-link"><i class="bx bxs-shapes"></i><span data-i18n="nav.components">UI Components</span></a>
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
                    <div class="field-group">
                        <i class="bx bx-user field-icon"></i>
                        <input class="input has-icon" id="suName" name="name" placeholder="Ada Lovelace" autocomplete="name" required>
                    </div>
                    <label for="suEmail" data-i18n="auth.email">Email</label>
                    <div class="field-group">
                        <i class="bx bx-envelope field-icon"></i>
                        <input class="input has-icon" id="suEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <span class="field-hint" id="suEmailHint" aria-live="polite"><i class="bx bx-x-circle"></i><i class="bx bx-check-circle"></i><span class="field-hint-text"></span></span>
                    <label for="suPassword" data-i18n="auth.password">Password</label>
                    <div class="field-group">
                        <i class="bx bx-lock-alt field-icon"></i>
                        <input class="input has-icon has-toggle" id="suPassword" name="password" type="password" placeholder="At least 6 characters" autocomplete="new-password" minlength="6" required data-i18n-placeholder="auth.passwordPlaceholder">
                        <button type="button" class="field-toggle" data-toggle-password aria-label="Show password" title="Show password" data-i18n-title="auth.showPassword" aria-controls="suPassword"><i class="bx bx-hide"></i></button>
                    </div>
                    <div class="password-strength" id="suPasswordStrength" hidden>
                        <div class="password-strength-bar"><span></span></div>
                        <small class="password-strength-label"></small>
                    </div>
                    <label for="suPassword2" data-i18n="auth.confirmPassword">Confirm password</label>
                    <div class="field-group">
                        <i class="bx bx-lock-alt field-icon"></i>
                        <input class="input has-icon has-toggle" id="suPassword2" name="password2" type="password" placeholder="Re-enter your password" autocomplete="new-password" minlength="6" required data-i18n-placeholder="auth.confirmPasswordPlaceholder">
                        <button type="button" class="field-toggle" data-toggle-password aria-label="Show password" title="Show password" data-i18n-title="auth.showPassword" aria-controls="suPassword2"><i class="bx bx-hide"></i></button>
                    </div>
                    <span class="field-hint" id="suPassword2Hint" aria-live="polite"><i class="bx bx-x-circle"></i><i class="bx bx-check-circle"></i><span class="field-hint-text"></span></span>
                    <div class="auth-consent-wrap">
                    <label class="auth-consent" id="suConsentRow" for="suConsent">
                        <input type="checkbox" id="suConsent" name="consent" required disabled aria-describedby="suConsentHint">
                        <span data-i18n="auth.consentText">I agree to the <a href="?page=terms" data-legal-link="terms" data-i18n="auth.termsLink">Terms of Service</a> and <a href="?page=privacy" data-legal-link="privacy" data-i18n="auth.privacyLink">Privacy Policy</a>.</span>
                    </label>
                    <small class="auth-consent-hint" id="suConsentHint"><i class="bx bx-info-circle"></i> <span data-i18n="auth.consentReadRequired">Open and read both documents to the end to unlock this checkbox.</span></small>
                    </div>
                    <div class="auth-error" id="signupError" hidden></div>
                    <button class="primary-btn auth-submit" type="submit"><i class="bx bx-user-plus"></i> <span data-i18n="auth.createAccount">Create account</span></button>
                </form>
                <div class="oauth-divider" data-i18n="auth.orContinueWith">or continue with</div>
                <div class="oauth-buttons">
                    <a class="oauth-btn oauth-google" href="oauth.php?provider=google&intent=signup" aria-label="Sign up with Google"><i class="bx bxl-google"></i> Google</a>
                    <a class="oauth-btn oauth-github" href="oauth.php?provider=github&intent=signup" aria-label="Sign up with GitHub"><i class="bx bxl-github"></i> GitHub</a>
                    <a class="oauth-btn oauth-facebook" href="oauth.php?provider=facebook&intent=signup" aria-label="Sign up with Facebook"><i class="bx bxl-facebook-circle"></i> Facebook</a>
                </div>
                <p class="muted auth-switch"><span data-i18n="auth.alreadyMember">Already a member?</span> <a class="text-link" href="?page=login" data-i18n="auth.login">Log in</a></p>
            <?php else: ?>
                <h1 data-i18n="auth.welcomeBack">Welcome back</h1>
                <p class="muted" data-i18n="auth.loginSubtitle">Log in to get back to your projects, snippets and notes.</p>
                <form id="loginForm" class="auth-form" novalidate>
                    <label for="liEmail" data-i18n="auth.email">Email</label>
                    <div class="field-group">
                        <i class="bx bx-envelope field-icon"></i>
                        <input class="input has-icon" id="liEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <label for="liPassword" data-i18n="auth.password">Password</label>
                    <div class="field-group">
                        <i class="bx bx-lock-alt field-icon"></i>
                        <input class="input has-icon has-toggle" id="liPassword" name="password" type="password" placeholder="Your password" autocomplete="current-password" required data-i18n-placeholder="auth.yourPassword">
                        <button type="button" class="field-toggle" data-toggle-password aria-label="Show password" title="Show password" data-i18n-title="auth.showPassword" aria-controls="liPassword"><i class="bx bx-hide"></i></button>
                    </div>
                    <div class="auth-error" id="loginError" hidden></div>
                    <button class="primary-btn auth-submit" type="submit"><i class="bx bx-log-in"></i> <span data-i18n="auth.login">Log in</span></button>
                </form>
                <div class="oauth-divider" data-i18n="auth.orContinueWith">or continue with</div>
                <div class="oauth-buttons">
                    <a class="oauth-btn oauth-google" href="oauth.php?provider=google&intent=login" aria-label="Sign in with Google"><i class="bx bxl-google"></i> Google</a>
                    <a class="oauth-btn oauth-github" href="oauth.php?provider=github&intent=login" aria-label="Sign in with GitHub"><i class="bx bxl-github"></i> GitHub</a>
                    <a class="oauth-btn oauth-facebook" href="oauth.php?provider=facebook&intent=login" aria-label="Sign in with Facebook"><i class="bx bxl-facebook-circle"></i> Facebook</a>
                </div>
                <p class="muted auth-switch"><span data-i18n="auth.newHere">New here?</span> <a class="text-link" href="?page=signup" data-i18n="auth.joinCommunityLower">Join the community</a></p>
            <?php endif; ?>
        </div>
    </section>

<?php elseif ($page === 'terms' || $page === 'privacy'): ?>

    <section class="auth-shell">
        <div class="auth-card panel legal-page">
            <?php if ($page === 'terms'): ?>
                <h1>Terms of Service</h1>
                <p class="muted">Placeholder terms — replace this page with your own before going live. By creating an account you agree to use A-DevTools responsibly, keep your login credentials secure, and accept that this is a self-hosted, free, no-warranty tool.</p>
            <?php else: ?>
                <h1>Privacy Policy</h1>
                <p class="muted">Placeholder privacy policy — replace this page with your own before going live. A-DevTools stores the account info you provide (name, email, and — for password accounts — a hashed password) and, if you sign in with Google, GitHub or Facebook, the name/email/ID that provider shares with us. This data is used only to run your account and is not sold or shared with third parties.</p>
            <?php endif; ?>
            <p class="muted auth-switch"><a class="text-link" href="?page=landing">&larr; Back to A-DevTools</a></p>
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
                    <div class="field-group">
                        <i class="bx bx-user field-icon"></i>
                        <input class="input has-icon" id="suName" name="name" placeholder="Ada Lovelace" autocomplete="name" required>
                    </div>
                    <label for="suEmail" data-i18n="auth.email">Email</label>
                    <div class="field-group">
                        <i class="bx bx-envelope field-icon"></i>
                        <input class="input has-icon" id="suEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <span class="field-hint" id="suEmailHint" aria-live="polite"><i class="bx bx-x-circle"></i><i class="bx bx-check-circle"></i><span class="field-hint-text"></span></span>
                    <label for="suPassword" data-i18n="auth.password">Password</label>
                    <div class="field-group">
                        <i class="bx bx-lock-alt field-icon"></i>
                        <input class="input has-icon has-toggle" id="suPassword" name="password" type="password" placeholder="At least 6 characters" autocomplete="new-password" minlength="6" required data-i18n-placeholder="auth.passwordPlaceholder">
                        <button type="button" class="field-toggle" data-toggle-password aria-label="Show password" title="Show password" data-i18n-title="auth.showPassword" aria-controls="suPassword"><i class="bx bx-hide"></i></button>
                    </div>
                    <div class="password-strength" id="suPasswordStrength" hidden>
                        <div class="password-strength-bar"><span></span></div>
                        <small class="password-strength-label"></small>
                    </div>
                    <label for="suPassword2" data-i18n="auth.confirmPassword">Confirm password</label>
                    <div class="field-group">
                        <i class="bx bx-lock-alt field-icon"></i>
                        <input class="input has-icon has-toggle" id="suPassword2" name="password2" type="password" placeholder="Re-enter your password" autocomplete="new-password" minlength="6" required data-i18n-placeholder="auth.confirmPasswordPlaceholder">
                        <button type="button" class="field-toggle" data-toggle-password aria-label="Show password" title="Show password" data-i18n-title="auth.showPassword" aria-controls="suPassword2"><i class="bx bx-hide"></i></button>
                    </div>
                    <span class="field-hint" id="suPassword2Hint" aria-live="polite"><i class="bx bx-x-circle"></i><i class="bx bx-check-circle"></i><span class="field-hint-text"></span></span>
                    <div class="auth-consent-wrap">
                    <label class="auth-consent" id="suConsentRow" for="suConsent">
                        <input type="checkbox" id="suConsent" name="consent" required disabled aria-describedby="suConsentHint">
                        <span data-i18n="auth.consentText">I agree to the <a href="?page=terms" data-legal-link="terms" data-i18n="auth.termsLink">Terms of Service</a> and <a href="?page=privacy" data-legal-link="privacy" data-i18n="auth.privacyLink">Privacy Policy</a>.</span>
                    </label>
                    <small class="auth-consent-hint" id="suConsentHint"><i class="bx bx-info-circle"></i> <span data-i18n="auth.consentReadRequired">Open and read both documents to the end to unlock this checkbox.</span></small>
                    </div>
                    <div class="auth-error" id="signupError" hidden></div>
                    <button class="primary-btn auth-submit ripple-btn" type="submit"><i class="bx bx-user-plus"></i> <span data-i18n="landing.signUp">Sign Up</span></button>
                </form>
                <div class="oauth-divider" data-i18n="auth.orContinueWith">or continue with</div>
                <div class="oauth-buttons">
                    <a class="oauth-btn oauth-google" href="oauth.php?provider=google&intent=signup" aria-label="Sign up with Google"><i class="bx bxl-google"></i> Google</a>
                    <a class="oauth-btn oauth-github" href="oauth.php?provider=github&intent=signup" aria-label="Sign up with GitHub"><i class="bx bxl-github"></i> GitHub</a>
                    <a class="oauth-btn oauth-facebook" href="oauth.php?provider=facebook&intent=signup" aria-label="Sign up with Facebook"><i class="bx bxl-facebook-circle"></i> Facebook</a>
                </div>
                <p class="muted auth-switch"><span data-i18n="landing.alreadyHaveAccount">Already have an account?</span> <a class="text-link" href="#joinPanel" data-open-auth="login" data-i18n="landing.signInNow">sign in now!</a></p>
            </div>

            <div class="guest-hero-form panel" id="loginCard" inert>
                <button type="button" class="auth-card-close" data-close-auth aria-label="Close"><i class="bx bx-x"></i></button>
                <span class="pill-tag"><i class="bx bx-log-in"></i> <span data-i18n="landing.welcomeBackTag">WELCOME BACK</span></span>
                <h2 data-i18n="landing.signInTitle">Sign In</h2>
                <p class="muted" data-i18n="landing.signInSubtitle">Log in to A-DevTools to keep working on your projects.</p>
                <form id="loginForm" class="auth-form" novalidate>
                    <label for="liEmail" data-i18n="auth.email">Email</label>
                    <div class="field-group">
                        <i class="bx bx-envelope field-icon"></i>
                        <input class="input has-icon" id="liEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    </div>
                    <label for="liPassword" data-i18n="auth.password">Password</label>
                    <div class="field-group">
                        <i class="bx bx-lock-alt field-icon"></i>
                        <input class="input has-icon has-toggle" id="liPassword" name="password" type="password" placeholder="Your password" autocomplete="current-password" required data-i18n-placeholder="auth.yourPassword">
                        <button type="button" class="field-toggle" data-toggle-password aria-label="Show password" title="Show password" data-i18n-title="auth.showPassword" aria-controls="liPassword"><i class="bx bx-hide"></i></button>
                    </div>
                    <div class="auth-error" id="loginError" hidden></div>
                    <button class="primary-btn auth-submit ripple-btn" type="submit"><i class="bx bx-log-in"></i> <span data-i18n="landing.signIn">Sign In</span></button>
                </form>
                <div class="oauth-divider" data-i18n="auth.orContinueWith">or continue with</div>
                <div class="oauth-buttons">
                    <a class="oauth-btn oauth-google" href="oauth.php?provider=google&intent=login" aria-label="Sign in with Google"><i class="bx bxl-google"></i> Google</a>
                    <a class="oauth-btn oauth-github" href="oauth.php?provider=github&intent=login" aria-label="Sign in with GitHub"><i class="bx bxl-github"></i> GitHub</a>
                    <a class="oauth-btn oauth-facebook" href="oauth.php?provider=facebook&intent=login" aria-label="Sign in with Facebook"><i class="bx bxl-facebook-circle"></i> Facebook</a>
                </div>
                <p class="muted auth-switch"><span data-i18n="landing.noAccount">Don't have an account?</span> <a class="text-link" href="#joinPanel" data-open-auth="signup" data-i18n="landing.signUpNow">sign up now!</a></p>
            </div>
            </div>
        </div>
    </section>

    <section class="guest-features" id="features">
        <div class="guest-feature panel reveal"><b><i class="bx bx-code-alt"></i></b><h3 data-i18n="quick.code">Code Playground</h3><p class="muted" data-i18n="landing.featCodeDesc">Write and preview HTML, CSS and JavaScript in a live sandbox.</p></div>
        <div class="guest-feature panel reveal"><b><i class="bx bx-code-curly"></i></b><h3 data-i18n="quick.snippets">Snippets</h3><p class="muted" data-i18n="landing.featSnippetsDesc">Save, search and reuse the components you build most often.</p></div>
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
            <a href="?page=snippets"><i class="bx bx-code-curly"></i> <span data-i18n="quick.snippets">Snippets</span></a>
            <a href="?page=projects"><i class="bx bx-folder-open"></i> <span data-i18n="nav.projects">Projects</span></a>
            <a href="?page=notes"><i class="bx bx-note"></i> <span data-i18n="nav.notes">Notes</span></a>
        </div>
        <div class="guest-footer-col reveal">
            <span class="guest-footer-heading"><i class="bx bx-book-open"></i> <span data-i18n="landing.resources">Resources</span></span>
            <a href="?page=guide"><i class="bx bx-book-open"></i> <span data-i18n="nav.ui-guide">UI/UX Guide</span></a>
            <a href="?page=components"><i class="bx bxs-shapes"></i> <span data-i18n="nav.components">UI Components</span></a>
        </div>
    </div>
    <div class="guest-footer-bottom">
        <span><i class="bx bx-copyright"></i> <?php echo date('Y'); ?> A-DevTools. <span data-i18n="landing.allRightsReserved">All rights reserved.</span></span>
        <span class="guest-footer-tag" data-i18n="dash.hero.title">Build. Test. Learn. Ship.</span>
        <button type="button" class="icon-btn guest-footer-admin-btn" id="adminControlBtn" title="Admin Control" aria-label="Open Admin Control" aria-haspopup="dialog"><i class="bx bxs-shield-alt-2"></i></button>
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

  /* ---------- Surface oauth.php errors (e.g. "?oauth_error=..." after a failed
     social sign-in redirect) in the matching panel's error box. ---------- */
  var oauthError = new URLSearchParams(window.location.search).get('oauth_error');
  if (oauthError) {
    var which = new URLSearchParams(window.location.search).get('oauth_intent') === 'login' ? 'login' : 'signup';
    openAuth(which);
    var box = document.getElementById(which === 'login' ? 'loginError' : 'signupError');
    if (box) { box.hidden = false; box.textContent = oauthError; }
  }
})();
</script>

<script>
(function(){
  window.CSRF_TOKEN = <?php echo json_encode(csrf_token()); ?>;

  /* Short alias for the shared i18n lookup — falls back to the given
     English string if i18n.js hasn't loaded yet for some reason. */
  function t(key, fallback) {
    return window.ADevToolsI18n ? window.ADevToolsI18n.t(key) : fallback;
  }

  function showAuthError(form, errorBox, message) {
    errorBox.innerHTML = '<i class="bx bx-error-circle"></i><span>' + message + '</span>';
    errorBox.hidden = false;
  }

  function submitAuth(action, payload, form, errorBox, submitBtn) {
    errorBox.hidden = true;
    var originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> ' + t('auth.pleaseWait', 'Please wait...');
    fetch('auth.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({action:action, csrf: window.CSRF_TOKEN}, payload))
    }).then(function(r){ return r.json(); }).then(function(data){
      if (data && data.ok) {
        submitBtn.classList.add('is-success');
        submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> ' + t('auth.successRedirecting', 'Success! Redirecting...');
        window.location.href = '?page=dashboard';
        return;
      }
      showAuthError(form, errorBox, (data && data.error) ? data.error : t('auth.genericError', 'Something went wrong. Please try again.'));
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    }).catch(function(){
      showAuthError(form, errorBox, t('auth.networkError', 'Could not reach the server. Please try again.'));
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalHtml;
    });
  }

  /* ---------- OAuth buttons navigate straight to oauth.php, so give them
     the same loading-circle feedback as the email/password submit button
     instead of leaving the click feeling unresponsive while the browser
     loads the next page. ---------- */
  document.querySelectorAll('.oauth-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      if (btn.classList.contains('is-loading')) { return; }
      btn.classList.add('is-loading');
      var icon = btn.querySelector('.bx');
      if (icon) { icon.className = 'bx bx-loader-alt bx-spin'; }
    });
  });

  var signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', function(e){
      e.preventDefault();
      var errorBox = document.getElementById('signupError');
      var name = document.getElementById('suName').value.trim();
      var email = document.getElementById('suEmail').value.trim();
      var password = document.getElementById('suPassword').value;
      var password2 = document.getElementById('suPassword2').value;
      var consent = document.getElementById('suConsent');
      var consentRow = document.getElementById('suConsentRow');
      if (consent && !consent.checked) {
        if (consentRow) { consentRow.classList.add('is-error'); }
        showAuthError(signupForm, errorBox, t('auth.consentRequired', 'Please agree to the Terms of Service and Privacy Policy to continue.'));
        return;
      }
      if (consentRow) { consentRow.classList.remove('is-error'); }
      if (password !== password2) {
        showAuthError(signupForm, errorBox, t('auth.passwordsNoMatch', 'Passwords do not match.'));
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
  function t(key, fallback) {
    return window.ADevToolsI18n ? window.ADevToolsI18n.t(key) : fallback;
  }

  /* ---------- Password show/hide toggles (any field with a data-toggle-password button) ---------- */
  document.querySelectorAll('[data-toggle-password]').forEach(function(btn){
    btn.addEventListener('click', function(){
      var input = document.getElementById(btn.getAttribute('aria-controls'));
      if (!input) return;
      var revealing = input.type === 'password';
      input.type = revealing ? 'text' : 'password';
      btn.innerHTML = revealing ? '<i class="bx bx-show"></i>' : '<i class="bx bx-hide"></i>';
      var label = revealing ? t('auth.hidePassword', 'Hide password') : t('auth.showPassword', 'Show password');
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  });

  /* ---------- Live email format check ---------- */
  function wireEmailField(inputId, hintId) {
    var input = document.getElementById(inputId);
    var hint = document.getElementById(hintId);
    if (!input || !hint) return;
    var textEl = hint.querySelector('.field-hint-text');
    function check() {
      var group = input.closest('.field-group');
      var val = input.value.trim();
      if (!val) {
        group.classList.remove('is-valid', 'is-invalid');
        hint.classList.remove('is-error', 'is-success');
        textEl.textContent = '';
        return;
      }
      var ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
      group.classList.toggle('is-valid', ok);
      group.classList.toggle('is-invalid', !ok);
      hint.classList.toggle('is-success', ok);
      hint.classList.toggle('is-error', !ok);
      textEl.textContent = ok ? t('auth.emailLooksGood', 'Looks good') : t('auth.emailInvalid', 'Enter a valid email address');
    }
    input.addEventListener('input', check);
    input.addEventListener('blur', check);
  }
  wireEmailField('suEmail', 'suEmailHint');

  /* ---------- Password strength meter ---------- */
  function scorePassword(pw) {
    var score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  }
  function wireStrengthMeter(passwordId, meterId) {
    var input = document.getElementById(passwordId);
    var meter = document.getElementById(meterId);
    if (!input || !meter) return;
    var label = meter.querySelector('.password-strength-label');
    var bar = meter.querySelector('.password-strength-bar span');
    input.addEventListener('input', function(){
      var val = input.value;
      if (!val) { meter.hidden = true; return; }
      meter.hidden = false;
      var score = scorePassword(val);
      var level = 'weak', text = t('auth.strengthWeak', 'Weak password');
      if (score >= 5) { level = 'strong'; text = t('auth.strengthStrong', 'Strong password'); }
      else if (score >= 3) { level = 'good'; text = t('auth.strengthGood', 'Good password'); }
      else if (score >= 2) { level = 'fair'; text = t('auth.strengthFair', 'Fair password'); }
      meter.setAttribute('data-level', level);
      label.textContent = text;
      if (bar) { bar.style.width = Math.max(12, (score / 5) * 100) + '%'; }
    });
  }
  wireStrengthMeter('suPassword', 'suPasswordStrength');

  /* ---------- Confirm-password live match indicator ---------- */
  function wireMatchField(passwordId, confirmId, hintId) {
    var pass = document.getElementById(passwordId);
    var confirm = document.getElementById(confirmId);
    var hint = document.getElementById(hintId);
    if (!pass || !confirm || !hint) return;
    var textEl = hint.querySelector('.field-hint-text');
    function check() {
      var group = confirm.closest('.field-group');
      if (!confirm.value) {
        group.classList.remove('is-valid', 'is-invalid');
        hint.classList.remove('is-error', 'is-success');
        textEl.textContent = '';
        return;
      }
      var match = confirm.value === pass.value;
      group.classList.toggle('is-valid', match);
      group.classList.toggle('is-invalid', !match);
      hint.classList.toggle('is-success', match);
      hint.classList.toggle('is-error', !match);
      textEl.textContent = match ? t('auth.passwordsMatch', 'Passwords match') : t('auth.passwordsNoMatch', 'Passwords do not match.');
    }
    confirm.addEventListener('input', check);
    pass.addEventListener('input', function(){ if (confirm.value) check(); });
  }
  wireMatchField('suPassword', 'suPassword2', 'suPassword2Hint');
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

  /* ---------- Sticky navbar shrink-on-scroll ----------
     Fixed: shrinking the topbar's own padding shifts page layout by ~14px
     right at the same scrollY=8 threshold that toggles it, which could
     flip the class back and forth in a feedback loop (visible as the
     navbar jittering/"shaking" near the top of the page). A wider gap
     between the on/off thresholds (hysteresis) stops that oscillation,
     and the rAF throttle avoids piling up redundant toggles per scroll. */
  var topbar = document.getElementById('guestTopbar');
  if (topbar) {
    var topbarTicking = false;
    var onScroll = function(){
      topbarTicking = false;
      if (window.scrollY > 32) {
        topbar.classList.add('is-scrolled');
      } else if (window.scrollY < 8) {
        topbar.classList.remove('is-scrolled');
      }
    };
    onScroll();
    window.addEventListener('scroll', function(){
      if (topbarTicking) { return; }
      topbarTicking = true;
      requestAnimationFrame(onScroll);
    }, {passive:true});
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

  /* Language dropdown open/close, keyboard navigation and selection are
     handled centrally in assets/js/pwa.js (shared with the logged-in app
     shell), and active/aria-checked state syncing lives in assets/js/i18n.js
     so both templates stay in lock-step automatically. */
})();
</script>
<script>
(function(){
  function t(key, fallback) {
    return window.ADevToolsI18n ? window.ADevToolsI18n.t(key) : fallback;
  }

  /* ---------- Generic modal open/close (the #modal markup is shared with
     the logged-in app shell, but guest.php never wired it up until now). ---------- */
  var modal = document.getElementById('modal');
  var modalBody = document.getElementById('modalBody');
  var modalBox = modal ? modal.querySelector('.modal') : null;
  var modalCloseBtn = document.getElementById('modalClose');

  function openModal(html) {
    if (!modal || !modalBody) return;
    modalBody.innerHTML = html;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    if (modalBox) { modalBox.scrollTop = 0; }
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove('show');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
  }
  if (modalCloseBtn) { modalCloseBtn.addEventListener('click', closeModal); }
  if (modal) {
    modal.addEventListener('click', function(e){ if (e.target === modal) { closeModal(); } });
  }
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && modal && modal.classList.contains('show')) { closeModal(); }
  });

  /* ---------- Terms of Service / Privacy Policy read-gate ----------
     The sign-up "I agree" checkbox stays disabled until the person has
     opened *and scrolled to the end of* both documents in the modal
     below — so agreement can't be given to text that was never read. ---------- */
  var legalContent = {
    terms: {
      title: 'Terms of Service',
      html:
        '<p class="muted">Placeholder terms — replace this page with your own before going live.</p>' +
        '<ol style="margin:0;padding-left:20px;line-height:1.7;color:var(--text)">' +
        '<li>By creating an account you agree to use A-DevTools responsibly and not to abuse, disrupt or attempt unauthorized access to the service.</li>' +
        '<li>You are responsible for keeping your login credentials — password or connected OAuth account — secure.</li>' +
        '<li>Projects, snippets and notes you create remain yours; you are responsible for the content you store here.</li>' +
        '<li>This is a self-hosted, free, no-warranty tool provided "as is", without guarantees of uptime, backups or fitness for a particular purpose.</li>' +
        '<li>Accounts found to be abusing the service (spam, attempted exploits, automated scraping) may be suspended.</li>' +
        '<li>These terms may change as the project evolves; continued use after a change means you accept the updated terms.</li>' +
        '<li>The service is not intended for storing sensitive personal, financial or health data.</li>' +
        '<li>Questions about these terms can be directed to the workspace administrator.</li>' +
        '</ol>',
    },
    privacy: {
      title: 'Privacy Policy',
      html:
        '<p class="muted">Placeholder privacy policy — replace this page with your own before going live.</p>' +
        '<ol style="margin:0;padding-left:20px;line-height:1.7;color:var(--text)">' +
        '<li>A-DevTools stores the account info you provide: name, email, and — for password accounts — a hashed password (never the plain password).</li>' +
        '<li>If you sign in with Google, GitHub or Facebook, we store the name, email and account ID that provider shares with us.</li>' +
        '<li>Projects, snippets and notes are stored to run your workspace and are not scanned for advertising purposes.</li>' +
        '<li>This data is used only to operate your account and is not sold or shared with third parties.</li>' +
        '<li>Standard technical logs (e.g. sign-in timestamps) may be kept briefly for security and troubleshooting.</li>' +
        '<li>You can request export or deletion of your account data at any time from Settings.</li>' +
        '</ol>',
    }
  };
  var legalRead = { terms: false, privacy: false };
  var consent = document.getElementById('suConsent');
  var consentRow = document.getElementById('suConsentRow');
  var consentHint = document.getElementById('suConsentHint');

  function updateConsentAvailability() {
    if (!consent) return;
    var allRead = legalRead.terms && legalRead.privacy;
    consent.disabled = !allRead;
    if (!allRead && consent.checked) { consent.checked = false; }
    if (consentRow) { consentRow.classList.toggle('is-locked', !allRead); }
    if (consentHint) { consentHint.classList.toggle('is-unlocked', allRead); }
  }

  function openLegalModal(which) {
    var doc = legalContent[which];
    if (!doc || !modal) { window.location.href = '?page=' + which; return; }
    var scrollNote = t('auth.legalScrollNote', 'Scroll down to finish reading.');
    openModal(
      '<h2>' + doc.title + '</h2>' +
      '<div id="legalModalBody">' + doc.html + '</div>' +
      '<p class="legal-modal-note" id="legalModalNote"><i class="bx bx-down-arrow-circle"></i><span>' + scrollNote + '</span></p>'
    );
    var note = document.getElementById('legalModalNote');
    var markedRead = false;
    function markRead() {
      if (markedRead) return;
      markedRead = true;
      legalRead[which] = true;
      if (note) {
        note.classList.add('is-done');
        note.innerHTML = '<i class="bx bx-check-circle"></i><span>' + t('auth.legalReadDone', "You've reached the end — thanks for reading.") + '</span>';
      }
      updateConsentAvailability();
    }
    function checkScroll() {
      if (!modalBox) return;
      if (modalBox.scrollTop + modalBox.clientHeight >= modalBox.scrollHeight - 4) { markRead(); }
    }
    if (modalBox) {
      modalBox.addEventListener('scroll', checkScroll);
      // If the content is short enough to fit without scrolling, don't hold
      // reading hostage to a scrollbar that will never appear.
      requestAnimationFrame(checkScroll);
    }
  }

  document.querySelectorAll('[data-legal-link]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      openLegalModal(a.getAttribute('data-legal-link'));
    });
  });

  updateConsentAvailability();

  /* ---------- Admin Control (shield icon in the footer) ----------
     Independent of the regular Community login: this asks for an
     admin-role account's own email + password directly (throttled the
     same way the login form is), then unlocks a full dashboard for
     managing every account AND every piece of content (projects,
     notes, snippets) stored in this install. Only reachable from
     here, while logged out — a logged-in visitor is redirected away
     from this landing page.

     The whole dashboard is fetched once per open (action=stats) and
     then browsed/searched/edited entirely client-side; every mutating
     click (role change, edit, delete, points adjustment) re-fetches
     stats afterwards so the tables never go stale. ---------- */
  var adminBtn = document.getElementById('adminControlBtn');
  if (adminBtn) {
    function escapeHtml(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){
        return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
      });
    }
    var escapeAttr = escapeHtml;
    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    function adminPost(action, extra) {
      return fetch('admin.php', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(Object.assign({action: action, csrf: window.CSRF_TOKEN}, extra || {}))
      }).then(function(r){ return r.json(); });
    }

    function fmtDate(s) {
      if (!s) return '—';
      var d = new Date(String(s).replace(' ', 'T'));
      return isNaN(d) ? s : d.toLocaleDateString();
    }
    function fmtSeconds(s) {
      return s < 60 ? (s + 's') : (Math.ceil(s / 60) + 'm');
    }
    function setModalWide(on) {
      if (modalBox) modalBox.classList.toggle('modal-admin', on);
    }
    function filterRows(list, query, fields) {
      if (!query) return list;
      var q = query.toLowerCase();
      return list.filter(function(item){
        return fields.some(function(f){
          var v = item[f];
          return v != null && String(v).toLowerCase().indexOf(q) !== -1;
        });
      });
    }
    function findUser(id) {
      return (adminState.data.users || []).filter(function(u){ return String(u.id) === String(id); })[0];
    }
    function findContentItem(listKey, id, userId) {
      var list = (adminState.data.content && adminState.data.content[listKey]) || [];
      return list.filter(function(it){ return String(it.id) === String(id) && String(it.user_id) === String(userId); })[0];
    }

    var adminState = {
      data: null,
      tab: 'overview',
      queries: { users: '', projects: '', notes: '', snippets: '' }
    };

    var contentMeta = {
      projects: { label: 'Projects', singular: 'project', fields: ['name', 'owner_name', 'owner_email', 'tech'], cols: ['Name', 'Owner', 'Tech', 'Updated', 'Actions'] },
      notes: { label: 'Notes', singular: 'note', fields: ['title', 'owner_name', 'owner_email'], cols: ['Title', 'Owner', 'Updated', 'Actions'] },
      snippets: { label: 'Snippets', singular: 'snippet', fields: ['title', 'owner_name', 'owner_email', 'lang'], cols: ['Title', 'Owner', 'Language', 'Updated', 'Actions'] }
    };

    /* ---------- Tab renderers ---------- */

    function renderOverviewTab(data) {
      var c = data.counts || {};
      var recentRows = (data.users || []).slice(0, 5).map(function(u){
        return '<div class="admin-recent-row">' +
          '<div><strong>' + escapeHtml(u.name) + '</strong> <span class="muted">' + escapeHtml(u.email) + '</span></div>' +
          '<span class="role-badge role-' + escapeAttr(u.role) + '">' + escapeHtml(u.role) + '</span>' +
          '<span class="muted">' + escapeHtml(fmtDate(u.joined_at)) + '</span>' +
        '</div>';
      }).join('');

      return (
        '<div class="admin-stats-grid">' +
          '<div class="stat-card"><span>Users</span><strong>' + (c.users || 0) + '</strong></div>' +
          '<div class="stat-card"><span>Projects</span><strong>' + (c.projects || 0) + '</strong></div>' +
          '<div class="stat-card"><span>Snippets</span><strong>' + (c.snippets || 0) + '</strong></div>' +
          '<div class="stat-card"><span>Notes</span><strong>' + (c.notes || 0) + '</strong></div>' +
        '</div>' +
        '<div class="admin-section"><h3>Newest accounts</h3><div class="admin-recent-list">' +
        (recentRows || '<div class="admin-empty">No accounts yet.</div>') + '</div></div>'
      );
    }

    function renderUsersTable(users, query) {
      var filtered = filterRows(users, query, ['name', 'email']);
      var rows = filtered.map(function(u){
        var isAdminRole = u.role === 'admin';
        var points = u.points_total != null ? u.points_total : 0;
        var streak = u.points_streak != null ? u.points_streak : 0;
        return '<tr>' +
          '<td>' + escapeHtml(u.name) + '</td>' +
          '<td>' + escapeHtml(u.email) + '</td>' +
          '<td><span class="role-badge role-' + escapeAttr(u.role) + '">' + escapeHtml(u.role) + '</span></td>' +
          '<td>' + escapeHtml(u.expertise_level || '—') + '</td>' +
          '<td>' + points + ' XP · ' + streak + ' streak</td>' +
          '<td>' + escapeHtml(fmtDate(u.joined_at)) + '</td>' +
          '<td><div class="admin-row-actions">' +
            '<button type="button" class="small-btn" data-admin-action="edit-user" data-user-id="' + escapeAttr(u.id) + '">Edit</button>' +
            '<button type="button" class="small-btn" data-admin-action="edit-points" data-user-id="' + escapeAttr(u.id) + '">Points</button>' +
            '<button type="button" class="small-btn" data-admin-action="set-role" data-user-id="' + escapeAttr(u.id) + '" data-role="' + (isAdminRole ? 'user' : 'admin') + '">' + (isAdminRole ? 'Remove admin' : 'Make admin') + '</button>' +
            '<button type="button" class="small-btn danger-btn" data-admin-action="delete-user" data-user-id="' + escapeAttr(u.id) + '" data-user-name="' + escapeAttr(u.name) + '">Delete</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
      return '<table class="admin-table"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Level</th><th>Points</th><th>Joined</th><th>Actions</th></tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="7" class="admin-empty">No matching accounts.</td></tr>') + '</tbody></table>';
    }

    function renderUsersTab(data) {
      return (
        '<div class="admin-toolbar"><input type="search" class="input admin-search" placeholder="Search name or email…" data-admin-search="users" value="' + escapeAttr(adminState.queries.users) + '"></div>' +
        '<div class="admin-table-wrap" id="adminUsersWrap">' + renderUsersTable(data.users || [], adminState.queries.users) + '</div>'
      );
    }

    function renderContentTable(list, query, type) {
      var meta = contentMeta[type];
      var filtered = filterRows(list, query, meta.fields);
      var rows = filtered.map(function(item){
        var titleField = type === 'projects' ? item.name : item.title;
        var extraCol = '';
        if (type === 'projects') { extraCol = '<td>' + escapeHtml(item.tech || '—') + '</td>'; }
        else if (type === 'snippets') { extraCol = '<td>' + escapeHtml(item.lang || '—') + '</td>'; }
        return '<tr>' +
          '<td>' + escapeHtml(titleField) + '</td>' +
          '<td>' + escapeHtml(item.owner_name) + '<br><span class="muted">' + escapeHtml(item.owner_email) + '</span></td>' +
          extraCol +
          '<td>' + escapeHtml(fmtDate(item.updated_at)) + '</td>' +
          '<td><div class="admin-row-actions">' +
            '<button type="button" class="small-btn" data-admin-action="edit-content" data-content-type="' + meta.singular + '" data-content-id="' + escapeAttr(item.id) + '" data-user-id="' + escapeAttr(item.user_id) + '">Edit</button>' +
            '<button type="button" class="small-btn danger-btn" data-admin-action="delete-content" data-content-type="' + meta.singular + '" data-content-id="' + escapeAttr(item.id) + '" data-user-id="' + escapeAttr(item.user_id) + '" data-content-title="' + escapeAttr(titleField) + '">Delete</button>' +
          '</div></td>' +
        '</tr>';
      }).join('');
      var headCols = meta.cols.map(function(c){ return '<th>' + c + '</th>'; }).join('');
      return '<table class="admin-table"><thead><tr>' + headCols + '</tr></thead>' +
        '<tbody>' + (rows || '<tr><td colspan="' + meta.cols.length + '" class="admin-empty">No matching ' + meta.label.toLowerCase() + '.</td></tr>') + '</tbody></table>';
    }

    function renderContentTab(data, type) {
      var meta = contentMeta[type];
      var list = (data.content && data.content[type]) || [];
      return (
        '<div class="admin-toolbar"><input type="search" class="input admin-search" placeholder="Search ' + meta.label.toLowerCase() + ' or owner…" data-admin-search="' + type + '" value="' + escapeAttr(adminState.queries[type]) + '"></div>' +
        '<div class="admin-table-wrap" id="admin' + capitalize(type) + 'Wrap">' + renderContentTable(list, adminState.queries[type], type) + '</div>'
      );
    }

    function renderSecurityTab(data) {
      var lockoutRows = (data.lockouts || []).map(function(l){
        return '<tr>' +
          '<td>' + escapeHtml(l.key) + '</td>' +
          '<td>' + (l.count == null ? '—' : escapeHtml(String(l.count))) + '</td>' +
          '<td>' + escapeHtml(fmtSeconds(l.secondsLeft)) + '</td>' +
          '<td><button type="button" class="small-btn" data-admin-action="clear-lockout" data-key="' + escapeAttr(l.key) + '">Clear</button></td>' +
        '</tr>';
      }).join('');
      return '<div class="admin-section"><h3>Locked-out logins</h3><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Account</th><th>Failed attempts</th><th>Unlocks in</th><th></th></tr></thead>' +
        '<tbody>' + (lockoutRows || '<tr><td colspan="4" class="admin-empty">No active lockouts.</td></tr>') + '</tbody></table></div></div>';
    }

    /* ---------- Edit forms (replace the modal body; "Cancel"/"Back"
       returns to the dashboard without re-fetching) ---------- */

    function renderUserEditForm(user) {
      setModalWide(false);
      openModal(
        '<h2>Edit account</h2><p class="modal-subtitle">' + escapeHtml(user.email) + '</p>' +
        '<form id="adminUserEditForm" class="admin-edit-form">' +
          '<label class="full">Name<input type="text" class="input" id="aueName" value="' + escapeAttr(user.name) + '" required></label>' +
          '<label class="full">Email<input type="email" class="input" id="aueEmail" value="' + escapeAttr(user.email) + '" required></label>' +
          '<label class="full">Expertise level<select class="input" id="aueLevel">' +
            ['beginner', 'intermediate', 'professional'].map(function(lv){
              return '<option value="' + lv + '"' + (user.expertise_level === lv ? ' selected' : '') + '>' + capitalize(lv) + '</option>';
            }).join('') +
          '</select></label>' +
          '<div class="modal-footer"><button type="button" class="ghost-btn" data-admin-action="back-to-users">Cancel</button><button type="submit" class="primary-btn" id="aueSubmit">Save changes</button></div>' +
        '</form>'
      );
      document.getElementById('adminUserEditForm').addEventListener('submit', function(e){
        e.preventDefault();
        var btn = document.getElementById('aueSubmit');
        btn.disabled = true;
        adminPost('update-user', {
          userId: user.id,
          name: document.getElementById('aueName').value,
          email: document.getElementById('aueEmail').value,
          expertiseLevel: document.getElementById('aueLevel').value
        }).then(function(res){
          if (!res.ok) { btn.disabled = false; alert(res.error || 'Could not save changes.'); return; }
          adminState.tab = 'users';
          refreshAdminData();
        });
      });
    }

    function renderPointsEditForm(user) {
      setModalWide(false);
      openModal(
        '<h2>Adjust points</h2><p class="modal-subtitle">' + escapeHtml(user.name) + ' — ' + escapeHtml(user.email) + '</p>' +
        '<form id="adminPointsForm" class="admin-edit-form">' +
          '<label class="full">Total XP<input type="number" min="0" class="input" id="apTotal" value="' + (user.points_total || 0) + '"></label>' +
          '<label class="full">Streak (days)<input type="number" min="0" class="input" id="apStreak" value="' + (user.points_streak || 0) + '"></label>' +
          '<p class="admin-unlock-hint">This directly overrides the account\'s XP and streak — it doesn\'t count as today\'s daily claim.</p>' +
          '<div class="modal-footer"><button type="button" class="ghost-btn" data-admin-action="back-to-users">Cancel</button><button type="submit" class="primary-btn" id="apSubmit">Save</button></div>' +
        '</form>'
      );
      document.getElementById('adminPointsForm').addEventListener('submit', function(e){
        e.preventDefault();
        var btn = document.getElementById('apSubmit');
        btn.disabled = true;
        adminPost('set-points', {
          userId: user.id,
          total: parseInt(document.getElementById('apTotal').value, 10) || 0,
          streak: parseInt(document.getElementById('apStreak').value, 10) || 0
        }).then(function(res){
          if (!res.ok) { btn.disabled = false; alert(res.error || 'Could not save points.'); return; }
          adminState.tab = 'users';
          refreshAdminData();
        });
      });
    }

    function renderContentEditForm(item, type) {
      setModalWide(false);
      var fieldsHtml;
      if (type === 'project') {
        fieldsHtml =
          '<label class="full">Name<input type="text" class="input" id="aceName" value="' + escapeAttr(item.name) + '" required></label>' +
          '<label class="full">Tech<input type="text" class="input" id="aceTech" value="' + escapeAttr(item.tech || '') + '"></label>' +
          '<label class="full">Description<textarea class="input" id="aceBody">' + escapeHtml(item.description || '') + '</textarea></label>';
      } else if (type === 'note') {
        fieldsHtml =
          '<label class="full">Title<input type="text" class="input" id="aceName" value="' + escapeAttr(item.title) + '" required></label>' +
          '<label class="full">Body<textarea class="input" id="aceBody">' + escapeHtml(item.body || '') + '</textarea></label>';
      } else {
        fieldsHtml =
          '<label class="full">Title<input type="text" class="input" id="aceName" value="' + escapeAttr(item.title) + '" required></label>' +
          '<label class="full">Language<input type="text" class="input" id="aceLang" value="' + escapeAttr(item.lang || '') + '"></label>' +
          '<label class="full">Code<textarea class="input" id="aceBody">' + escapeHtml(item.code || '') + '</textarea></label>';
      }
      var backTab = type + 's';
      openModal(
        '<h2>Edit ' + type + '</h2><p class="modal-subtitle">Owned by ' + escapeHtml(item.owner_name) + ' (' + escapeHtml(item.owner_email) + ')</p>' +
        '<form id="adminContentEditForm" class="admin-edit-form">' + fieldsHtml +
          '<div class="modal-footer"><button type="button" class="ghost-btn" data-admin-action="back-to-content" data-content-type="' + type + '">Cancel</button><button type="submit" class="primary-btn" id="aceSubmit">Save changes</button></div>' +
        '</form>'
      );
      document.getElementById('adminContentEditForm').addEventListener('submit', function(e){
        e.preventDefault();
        var btn = document.getElementById('aceSubmit');
        btn.disabled = true;
        var payload = { type: type, id: item.id, userId: item.user_id };
        if (type === 'project') {
          payload.name = document.getElementById('aceName').value;
          payload.tech = document.getElementById('aceTech').value;
          payload.description = document.getElementById('aceBody').value;
        } else if (type === 'note') {
          payload.title = document.getElementById('aceName').value;
          payload.body = document.getElementById('aceBody').value;
        } else {
          payload.title = document.getElementById('aceName').value;
          payload.lang = document.getElementById('aceLang').value;
          payload.code = document.getElementById('aceBody').value;
        }
        adminPost('update-content', payload).then(function(res){
          if (!res.ok) { btn.disabled = false; alert(res.error || 'Could not save changes.'); return; }
          adminState.tab = backTab;
          refreshAdminData();
        });
      });
    }

    /* ---------- Dashboard shell ---------- */

    function renderAdminPanel() {
      setModalWide(true);
      var data = adminState.data;
      var c = data.counts || {};
      var tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'users', label: 'Users (' + (c.users || 0) + ')' },
        { id: 'projects', label: 'Projects (' + (c.projects || 0) + ')' },
        { id: 'notes', label: 'Notes (' + (c.notes || 0) + ')' },
        { id: 'snippets', label: 'Snippets (' + (c.snippets || 0) + ')' },
        { id: 'security', label: 'Security' }
      ];
      var tabsHtml = tabs.map(function(tb){
        return '<button type="button" class="admin-tab' + (adminState.tab === tb.id ? ' active' : '') + '" data-admin-tab="' + tb.id + '">' + tb.label + '</button>';
      }).join('');

      var body;
      if (adminState.tab === 'overview') { body = renderOverviewTab(data); }
      else if (adminState.tab === 'users') { body = renderUsersTab(data); }
      else if (adminState.tab === 'security') { body = renderSecurityTab(data); }
      else { body = renderContentTab(data, adminState.tab); }

      openModal(
        '<div class="admin-panel-head">' +
          '<div><span class="section-kicker">ADMIN CONTROL</span><h2>Project administration</h2><p class="modal-subtitle">Manage every account and every piece of content stored in this A-DevTools install.</p></div>' +
          '<button type="button" class="ghost-btn" data-admin-action="lock"><i class="bx bx-lock-alt"></i> Lock</button>' +
        '</div>' +
        '<div class="admin-tabs" role="tablist">' + tabsHtml + '</div>' +
        '<div class="admin-tab-body">' + body + '</div>' +
        '<div class="modal-footer"><button class="ghost-btn" data-close-modal>Close</button></div>'
      );
      adminBtn.classList.add('is-unlocked');
    }

    function refreshAdminData() {
      adminPost('stats').then(function(res){
        if (!res.ok) { alert(res.error || 'Could not refresh Admin Control.'); return; }
        adminState.data = res;
        renderAdminPanel();
      });
    }

    function openAdminPanel() {
      adminPost('stats').then(function(res){
        if (!res.ok) { renderAdminUnlockForm(res.error || 'Admin Control is locked.'); return; }
        adminState.data = res;
        adminState.tab = 'overview';
        adminState.queries = { users: '', projects: '', notes: '', snippets: '' };
        renderAdminPanel();
      });
    }

    function renderAdminUnlockForm(errorMsg) {
      setModalWide(false);
      openModal(
        '<h2><i class="bx bxs-shield-alt-2"></i> Admin Control</h2>' +
        '<p class="modal-subtitle">Sign in with an admin-role account to manage this A-DevTools install.</p>' +
        (errorMsg ? '<div class="auth-error">' + escapeHtml(errorMsg) + '</div>' : '') +
        '<form class="admin-unlock-form" id="adminUnlockForm">' +
          '<label class="full">Email<input type="email" id="adminUnlockEmail" class="input" autocomplete="username" required></label>' +
          '<label class="full">Password<input type="password" id="adminUnlockPassword" class="input" autocomplete="current-password" required></label>' +
          '<p class="admin-unlock-hint">This is separate from the regular Community login above.</p>' +
          '<div class="modal-footer"><button type="button" class="ghost-btn" data-close-modal>Cancel</button><button type="submit" class="primary-btn" id="adminUnlockSubmit"><i class="bx bx-lock-open-alt"></i> Unlock</button></div>' +
        '</form>'
      );
      var form = document.getElementById('adminUnlockForm');
      if (form) {
        form.addEventListener('submit', function(e){
          e.preventDefault();
          var email = document.getElementById('adminUnlockEmail').value || '';
          var password = document.getElementById('adminUnlockPassword').value || '';
          var submitBtn = document.getElementById('adminUnlockSubmit');
          if (submitBtn) submitBtn.disabled = true;
          adminPost('unlock', {email: email, password: password}).then(function(res){
            if (!res.ok) {
              if (submitBtn) submitBtn.disabled = false;
              renderAdminUnlockForm(res.error || 'Could not unlock Admin Control.');
              return;
            }
            openAdminPanel();
          });
        });
      }
    }

    adminBtn.addEventListener('click', function(){
      adminPost('status').then(function(res){
        if (res.ok && res.unlocked) { openAdminPanel(); }
        else { renderAdminUnlockForm(); }
      });
    });

    if (modalBody) {
      // Live client-side search: filters the already-fetched arrays and
      // patches just the table wrapper, so the input never loses focus.
      modalBody.addEventListener('input', function(e){
        var el = e.target;
        if (!el || !el.matches || !el.matches('[data-admin-search]')) return;
        var type = el.dataset.adminSearch;
        adminState.queries[type] = el.value;
        var wrap;
        if (type === 'users') {
          wrap = document.getElementById('adminUsersWrap');
          if (wrap) wrap.innerHTML = renderUsersTable(adminState.data.users || [], el.value);
        } else {
          wrap = document.getElementById('admin' + capitalize(type) + 'Wrap');
          if (wrap) wrap.innerHTML = renderContentTable((adminState.data.content && adminState.data.content[type]) || [], el.value, type);
        }
      });

      modalBody.addEventListener('click', function(e){
        var tabBtn = e.target.closest('[data-admin-tab]');
        if (tabBtn) {
          adminState.tab = tabBtn.dataset.adminTab;
          renderAdminPanel();
          return;
        }

        var el = e.target.closest('[data-admin-action]');
        if (!el) return;
        var action = el.dataset.adminAction;

        if (action === 'lock') {
          adminPost('lock').then(function(){ adminBtn.classList.remove('is-unlocked'); closeModal(); });
          return;
        }
        if (action === 'set-role') {
          adminPost('set-role', {userId: el.dataset.userId, role: el.dataset.role}).then(function(res){
            if (!res.ok) { alert(res.error || 'Could not update role.'); return; }
            refreshAdminData();
          });
          return;
        }
        if (action === 'delete-user') {
          if (!confirm('Delete the account "' + el.dataset.userName + '" and all of its projects, snippets and notes? This can\'t be undone.')) return;
          adminPost('delete-user', {userId: el.dataset.userId}).then(function(res){
            if (!res.ok) { alert(res.error || 'Could not delete account.'); return; }
            refreshAdminData();
          });
          return;
        }
        if (action === 'clear-lockout') {
          adminPost('clear-lockout', {key: el.dataset.key}).then(function(res){
            if (!res.ok) { alert(res.error || 'Could not clear lockout.'); return; }
            refreshAdminData();
          });
          return;
        }
        if (action === 'edit-user') {
          var u = findUser(el.dataset.userId);
          if (u) renderUserEditForm(u);
          return;
        }
        if (action === 'edit-points') {
          var u2 = findUser(el.dataset.userId);
          if (u2) renderPointsEditForm(u2);
          return;
        }
        if (action === 'back-to-users') {
          adminState.tab = 'users';
          renderAdminPanel();
          return;
        }
        if (action === 'back-to-content') {
          adminState.tab = el.dataset.contentType + 's';
          renderAdminPanel();
          return;
        }
        if (action === 'edit-content') {
          var listKey = el.dataset.contentType + 's';
          var item = findContentItem(listKey, el.dataset.contentId, el.dataset.userId);
          if (item) renderContentEditForm(item, el.dataset.contentType);
          return;
        }
        if (action === 'delete-content') {
          if (!confirm('Delete "' + el.dataset.contentTitle + '"? This can\'t be undone.')) return;
          adminPost('delete-content', {type: el.dataset.contentType, id: el.dataset.contentId, userId: el.dataset.userId}).then(function(res){
            if (!res.ok) { alert(res.error || 'Could not delete.'); return; }
            refreshAdminData();
          });
          return;
        }
      });
    }
  }
})();
</script>
<script src="assets/js/i18n.js?v=<?php echo (int)$i18nVersion; ?>"></script>
<script src="assets/js/pwa.js?v=<?php echo (int)$pwaVersion; ?>"></script>
</body>
</html>
