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
if (!defined('ACODEPLAYGROUND_SECURITY_LOADED')) { require_once __DIR__ . '/core/security.php'; }
if (!defined('ACODEPLAYGROUND_USERS_FILE')) { require_once __DIR__ . '/core/auth-helpers.php'; }
require_once __DIR__ . '/core/access-settings.php';
require_once __DIR__ . '/core/google.php';
require_once __DIR__ . '/core/oauth-providers.php';
require_once __DIR__ . '/core/legal-content.php';
$acpAccess = access_settings();
/** Echoes an "under review" notice in place of a sign-in/sign-up form when that flow is switched off. */
function acp_auth_notice($flow) {
    $title = $flow === 'signup' ? 'Sign-ups are paused' : 'Sign-in is paused';
    echo '<div class="auth-unavailable" role="status">' .
        '<i class="bx bx-time-five"></i>' .
        '<p><b>' . htmlspecialchars($title, ENT_QUOTES, 'UTF-8') . '</b></p>' .
        '<p class="muted">' . htmlspecialchars(access_unavailable_message($flow), ENT_QUOTES, 'UTF-8') . '</p>' .
        '</div>';
}

/**
 * Whether each "Sign in / Sign up with …" button can actually start an OAuth
 * flow right now, worked out the same way oauth.php itself resolves
 * credentials — so a button that's known to fail (provider switched off, or
 * never configured) can say so instantly client-side instead of sending the
 * browser to oauth.php only to be bounced straight back with an error (a
 * visible page reload). Buttons that ARE available still go through the
 * real redirect as before; only the already-known failures are short-circuited.
 */
function acp_oauth_button_states() {
    $config = require __DIR__ . '/core/config.php';
    $oauthConfig = isset($config['oauth']) && is_array($config['oauth']) ? $config['oauth'] : array();
    $baseUrl = isset($oauthConfig['base_url']) ? rtrim((string)$oauthConfig['base_url'], '/') : '';
    $gsAll = google_settings();
    if ($gsAll['source'] === 'dashboard' && $gsAll['base_url'] !== '') { $baseUrl = $gsAll['base_url']; }

    $out = array();
    foreach (array('google', 'github', 'facebook') as $provider) {
        $creds = isset($oauthConfig[$provider]) && is_array($oauthConfig[$provider]) ? $oauthConfig[$provider] : array();
        $clientId = isset($creds['client_id']) ? trim((string)$creds['client_id']) : '';
        $clientSecret = isset($creds['client_secret']) ? trim((string)$creds['client_secret']) : '';
        $offMessage = null;

        if ($provider === 'google') {
            if ($gsAll['source'] === 'dashboard' && $gsAll['use_for_signin'] && $gsAll['client_id'] !== '' && $gsAll['client_secret'] !== '') {
                $clientId = $gsAll['client_id'];
                $clientSecret = $gsAll['client_secret'];
            }
        } else {
            $ps = oauth_provider_settings($provider);
            if ($ps['source'] === 'dashboard' && !$ps['enabled']) {
                $offMessage = oauth_provider_label($provider) . ' sign-in is currently unavailable — this feature is under review. Please check back soon.';
            } elseif ($ps['client_id'] !== '' && $ps['client_secret'] !== '') {
                $clientId = $ps['client_id'];
                $clientSecret = $ps['client_secret'];
            }
        }

        if ($offMessage === null && ($clientId === '' || $clientSecret === '' || $baseUrl === '')) {
            $offMessage = ucfirst($provider) . ' sign-in isn\'t set up yet. Please check back soon.';
        }

        $out[$provider] = array('available' => $offMessage === null, 'message' => $offMessage);
    }
    return $out;
}
$acpOauthButtons = acp_oauth_button_states();

/** Renders the "or continue with" Google/GitHub/Facebook row for one intent (login|signup). */
function acp_oauth_buttons($intent) {
    global $acpOauthButtons;
    $meta = array(
        'google' => array('class' => 'oauth-google', 'icon' => 'bxl-google', 'label' => 'Google'),
        'github' => array('class' => 'oauth-github', 'icon' => 'bxl-github', 'label' => 'GitHub'),
        'facebook' => array('class' => 'oauth-facebook', 'icon' => 'bxl-facebook-circle', 'label' => 'Facebook'),
    );
    echo '<div class="oauth-buttons">';
    foreach ($meta as $provider => $m) {
        $st = $acpOauthButtons[$provider];
        $verb = $intent === 'login' ? 'Sign in' : 'Sign up';
        $attrs = 'class="oauth-btn ' . $m['class'] . '" aria-label="' . $verb . ' with ' . $m['label'] . '"';
        if ($st['available']) {
            echo '<a ' . $attrs . ' href="oauth.php?provider=' . $provider . '&intent=' . $intent . '">' .
                '<i class="bx ' . $m['icon'] . '"></i> ' . $m['label'] . '</a>';
        } else {
            echo '<a ' . $attrs . ' href="oauth.php?provider=' . $provider . '&intent=' . $intent . '" ' .
                'data-oauth-unavailable="1" data-oauth-message="' . htmlspecialchars($st['message'], ENT_QUOTES, 'UTF-8') . '">' .
                '<i class="bx ' . $m['icon'] . '"></i> ' . $m['label'] . ' <span class="oauth-soon-badge" data-i18n="landing.comingSoon">Soon</span></a>';
        }
    }
    echo '</div>';
}
?>
<!doctype html>

<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111214">
<title><?php echo $page === 'login' ? 'Log in' : ($page === 'signup' ? 'Join the Community' : ($page === 'terms' ? 'Terms of Service' : ($page === 'privacy' ? 'Privacy Policy' : 'A-Code Playground — Build. Test. Learn. Ship.'))); ?></title>
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="assets/icons/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="assets/icons/apple-touch-icon.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="A-Code Playground">
<link rel="preconnect" href="https://cdnjs.cloudflare.com">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/boxicons/2.1.4/css/boxicons.min.css">
<link rel="stylesheet" href="assets/css/app.css?v=<?php echo (int)$cssVersion; ?>">
</head>
<body class="guest-body">
<a href="#guestMain" class="skip-link">Skip to main content</a>

<header class="guest-topbar" id="guestTopbar">
    <div class="guest-topbar-inner">
    <a class="brand" href="?page=landing" aria-label="A-Code Playground home"><span class="brand-mark"><i class="bx bx-code-alt"></i></span><span>A-Code Playground</span></a>

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
        <button type="button" class="pill-btn install-btn" id="pwaInstallBtn" title="Install A-Code Playground as an app" aria-label="Install A-Code Playground as an app" data-i18n-title="pwa.installTitle">
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
                <h1 data-i18n="auth.joinTitle">Join the A-Code Playground Community</h1>
                <p class="muted" data-i18n="auth.joinSubtitle">Create a free account to sync your workspace to this computer and pick up where you left off.</p>
                <?php if (!$acpAccess['signupEnabled']): acp_auth_notice('signup'); ?>
                <p class="muted auth-switch"><span data-i18n="auth.alreadyMember">Already a member?</span> <a class="text-link" href="?page=login" data-i18n="auth.login">Log in</a></p>
                <?php else: ?>
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
                <?php acp_oauth_buttons('signup'); ?>
                <p class="muted auth-switch"><span data-i18n="auth.alreadyMember">Already a member?</span> <a class="text-link" href="?page=login" data-i18n="auth.login">Log in</a></p>
                <?php endif; ?>
            <?php else: ?>
                <h1 data-i18n="auth.welcomeBack">Welcome back</h1>
                <p class="muted" data-i18n="auth.loginSubtitle">Log in to get back to your projects, snippets and notes.</p>
                <?php if (!$acpAccess['signinEnabled']): acp_auth_notice('signin'); ?>
                <p class="muted auth-switch"><span data-i18n="auth.newHere">New here?</span> <a class="text-link" href="?page=signup" data-i18n="auth.joinCommunityLower">Join the community</a></p>
                <?php else: ?>
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
                <?php acp_oauth_buttons('login'); ?>
                <p class="muted auth-switch"><span data-i18n="auth.newHere">New here?</span> <a class="text-link" href="?page=signup" data-i18n="auth.joinCommunityLower">Join the community</a></p>
                <?php endif; ?>
            <?php endif; ?>
        </div>
    </section>

<?php elseif ($page === 'terms' || $page === 'privacy'): ?>

    <section class="auth-shell">
        <div class="auth-card panel legal-page">
            <?php if ($page === 'terms'): ?>
                <h1>Terms of Service</h1>
                <p class="muted">Placeholder terms — replace this page with your own before going live. By creating an account you agree to use A-Code Playground responsibly, keep your login credentials secure, and accept that this is a self-hosted, free, no-warranty tool.</p>
            <?php else: ?>
                <h1>Privacy Policy</h1>
                <?php render_privacy_policy_intro(); ?>
                <?php render_privacy_policy_sections(); ?>
            <?php endif; ?>
            <p class="muted auth-switch"><a class="text-link" href="?page=landing">&larr; Back to A-Code Playground</a></p>
        </div>
    </section>

<?php else: ?>

    <section class="guest-hero split" id="guestTop">
        <div class="guest-hero-content">
            <div class="eyebrow" data-i18n="landing.heroEyebrow">YOUR CODING PLAYGROUND</div>
            <h1 data-i18n="landing.heroTitle">Let's Start Your Playground Journey</h1>
            <p data-i18n="landing.heroSubtitle">A beginner-friendly workspace to build, test, and learn at your own pace — organize your code, experiment with UI, save reusable snippets, and grow every project, all yours with a free community account.</p>
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
                <a class="primary-btn guest-cta hero-highlight-cta ripple-btn" href="#joinPanel" data-open-auth="signup"><i class="bx bx-user-plus"></i> <span data-i18n="landing.enroll">Enroll Now!</span></a>
            </div>

            <div class="guest-hero-form-wrap" id="joinPanel" inert>
            <div class="guest-hero-form panel is-active" id="signupCard">
                <button type="button" class="auth-card-close" data-close-auth aria-label="Close"><i class="bx bx-x"></i></button>
                <span class="pill-tag"><i class="bx bx-rocket"></i> <span data-i18n="landing.getStartedTag">GET STARTED</span></span>
                <h2 data-i18n="landing.signupTitle">Sign up and join now!</h2>
                <p class="muted" data-i18n="landing.signupSubtitle">Create a free account and your workspace syncs to this computer automatically.</p>
                <?php if (!$acpAccess['signupEnabled']): acp_auth_notice('signup'); ?>
                <p class="muted auth-switch"><span data-i18n="landing.alreadyHaveAccount">Already have an account?</span> <a class="text-link" href="#joinPanel" data-open-auth="login" data-i18n="landing.signInNow">sign in now!</a></p>
                <?php else: ?>
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
                <?php acp_oauth_buttons('signup'); ?>
                <p class="muted auth-switch"><span data-i18n="landing.alreadyHaveAccount">Already have an account?</span> <a class="text-link" href="#joinPanel" data-open-auth="login" data-i18n="landing.signInNow">sign in now!</a></p>
                <?php endif; ?>
            </div>

            <div class="guest-hero-form panel" id="loginCard" inert>
                <button type="button" class="auth-card-close" data-close-auth aria-label="Close"><i class="bx bx-x"></i></button>
                <span class="pill-tag"><i class="bx bx-log-in"></i> <span data-i18n="landing.welcomeBackTag">WELCOME BACK</span></span>
                <h2 data-i18n="landing.signInTitle">Sign In</h2>
                <p class="muted" data-i18n="landing.signInSubtitle">Log in to A-Code Playground to keep working on your projects.</p>
                <?php if (!$acpAccess['signinEnabled']): acp_auth_notice('signin'); ?>
                <p class="muted auth-switch"><span data-i18n="landing.noAccount">Don't have an account?</span> <a class="text-link" href="#joinPanel" data-open-auth="signup" data-i18n="landing.signUpNow">sign up now!</a></p>
                <?php else: ?>
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
                <?php acp_oauth_buttons('login'); ?>
                <p class="muted auth-switch"><span data-i18n="landing.noAccount">Don't have an account?</span> <a class="text-link" href="#joinPanel" data-open-auth="signup" data-i18n="landing.signUpNow">sign up now!</a></p>
                <?php endif; ?>
            </div>
            </div>
        </div>
    </section>

    <section class="guest-journey" id="features">
        <div class="guest-section-head reveal">
            <span class="section-kicker" data-i18n="landing.journeyKicker">STEP BY STEP</span>
            <h2 data-i18n="landing.journeyTitle">Your beginner's journey</h2>
            <p data-i18n="landing.journeySubtitle">Everything you need to go from your first line of code to a portfolio you can point to — all in one guided path.</p>
        </div>
        <div class="guest-features">
            <div class="guest-feature panel reveal"><span class="guest-feature-step">STEP 1</span><b><i class="bx bx-compass"></i></b><h3 data-i18n="landing.step1Title">Pick your pace</h3><p class="muted" data-i18n="landing.step1Desc">Choose Beginner, Intermediate or Professional and take the guided tour — the workspace adjusts how much guidance it shows.</p></div>
            <div class="guest-feature panel reveal"><span class="guest-feature-step">STEP 2</span><b><i class="bx bx-code-alt"></i></b><h3 data-i18n="quick.code">Code Playground</h3><p class="muted" data-i18n="landing.step2Desc">Write HTML, CSS and JavaScript in a live sandbox and watch the result update as you type.</p></div>
            <div class="guest-feature panel reveal"><span class="guest-feature-step">STEP 3</span><b><i class="bx bxl-php"></i></b><h3 data-i18n="quick.php">PHP Playground</h3><p class="muted" data-i18n="landing.step3Desc">Write real PHP and run it instantly — a full PHP engine runs locally in your browser, no server needed.</p></div>
            <div class="guest-feature panel reveal"><span class="guest-feature-step">STEP 4</span><b><i class="bx bx-data"></i></b><h3 data-i18n="nav.sql">SQL Playground</h3><p class="muted" data-i18n="landing.step4Desc">Practice real SQL queries against sample data and see the results immediately.</p></div>
            <div class="guest-feature panel reveal"><span class="guest-feature-step">STEP 5</span><b><i class="bx bx-terminal"></i></b><h3 data-i18n="playground.title">Combined Playground</h3><p class="muted" data-i18n="landing.step5Desc">Bring HTML, CSS, JavaScript, PHP and SQL together in one editor once you're ready to go full-stack.</p></div>
            <div class="guest-feature panel reveal"><span class="guest-feature-step">STEP 6</span><b><i class="bx bx-table"></i></b><h3 data-i18n="nav.php-sample">PHP Examples</h3><p class="muted" data-i18n="landing.step6Desc">Browse a library of PHP basics and CRUD samples — read the code, see the output, or open it in the Playground.</p></div>
            <div class="guest-feature panel reveal"><span class="guest-feature-step">STEP 7</span><b><i class="bx bx-layer"></i></b><h3 data-i18n="quick.components">UI Components</h3><p class="muted" data-i18n="landing.step7Desc">Grab ready-made HTML/CSS interface patterns you can drop straight into your own projects.</p></div>
            <div class="guest-feature panel reveal"><span class="guest-feature-step">STEP 8</span><b><i class="bx bx-code-curly"></i></b><h3 data-i18n="landing.step8Title">Snippets, Projects &amp; Notes</h3><p class="muted" data-i18n="landing.step8Desc">Save reusable code, track real projects, and keep development notes — the start of a portfolio you can show off.</p></div>
        </div>

        <div class="guest-section-head reveal" style="margin-top:56px">
            <span class="section-kicker" data-i18n="landing.alsoIncludedKicker">ALSO INCLUDED</span>
            <h2 data-i18n="landing.alsoIncludedTitle">Everything else that comes with it</h2>
        </div>
        <div class="guest-features">
            <div class="guest-feature panel reveal"><b><i class="bx bx-medal"></i></b><h3 data-i18n="landing.extraProgressTitle">Progress &amp; XP</h3><p class="muted" data-i18n="landing.extraProgressDesc">Earn points, ranks and streaks as you complete lessons and keep coming back.</p></div>
            <div class="guest-feature panel reveal"><b><i class="bx bx-cloud-upload"></i></b><h3 data-i18n="landing.extraPrivateTitle">Yours, locally</h3><p class="muted" data-i18n="landing.extraPrivateDesc">Your work is saved to your own browser first, with an optional Google Drive backup.</p></div>
            <div class="guest-feature panel reveal"><b><i class="bx bx-mobile-alt"></i></b><h3 data-i18n="landing.extraInstallTitle">Install as an app</h3><p class="muted" data-i18n="landing.extraInstallDesc">Add A-Code Playground to your home screen and keep working, even offline.</p></div>
            <div class="guest-feature panel reveal"><b><i class="bx bx-world"></i></b><h3 data-i18n="landing.extraLangTitle">5 languages, light &amp; dark</h3><p class="muted" data-i18n="landing.extraLangDesc">Switch between English, Spanish, French, German and Filipino, and pick the theme that's easiest on your eyes.</p></div>
        </div>
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
            <a class="brand" href="?page=landing" aria-label="A-Code Playground home"><span class="brand-mark"><i class="bx bx-code-alt"></i></span><span>A-Code Playground</span></a>
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
        <span><i class="bx bx-copyright"></i> <?php echo date('Y'); ?> A-Code Playground. <span data-i18n="landing.allRightsReserved">All rights reserved.</span></span>
        <span class="guest-footer-tag" data-i18n="landing.heroTitle">Let's Start Your Playground Journey</span>
        <a class="icon-btn guest-footer-admin-btn" id="adminControlBtn" href="admin-dashboard.php" title="Admin dashboard" aria-label="Open admin dashboard"><i class="bx bxs-shield-alt-2"></i></a>
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

  window.acpOpenAuth = openAuth;

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

  /* Short alias for the shared i18n lookup — falls back to the given
     English string if i18n.js hasn't loaded yet for some reason. */
  function t(key, fallback) {
    return window.ACodePlaygroundI18n ? window.ACodePlaygroundI18n.t(key) : fallback;
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
  document.querySelectorAll('.oauth-btn:not([data-oauth-unavailable])').forEach(function(btn){
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
    return window.ACodePlaygroundI18n ? window.ACodePlaygroundI18n.t(key) : fallback;
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
    return window.ACodePlaygroundI18n ? window.ACodePlaygroundI18n.t(key) : fallback;
  }

  /* ---------- Generic modal open/close (the #modal markup is shared with
     the logged-in app shell, but guest.php never wired it up until now). ---------- */
  var modal = document.getElementById('modal');
  var modalBody = document.getElementById('modalBody');
  var modalBox = modal ? modal.querySelector('.modal') : null;
  var modalCloseBtn = document.getElementById('modalClose');

  function openModal(html, extraClass) {
    if (!modal || !modalBody) return;
    modalBody.innerHTML = html;
    if (modalBox) {
      modalBox.className = 'modal' + (extraClass ? ' ' + extraClass : '');
    }
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

  /* ---------- A small "can't do that right now" modal, shared by:
     1. Buttons we already know are unavailable (data-oauth-unavailable) —
        shown instantly, no navigation at all.
     2. A genuine oauth.php redirect failure (e.g. the callback itself
        failed) — the one case that still needs the real round trip. ---------- */
  function showOauthUnavailableModal(intent, message) {
    var title = intent === 'login'
      ? t('auth.oauthErrorTitleLogin', "Couldn't sign you in")
      : t('auth.oauthErrorTitleSignup', "Couldn't create your account");
    var retryLabel = t('auth.tryAnotherWay', 'Use email instead');
    openModal(
      '<div class="oauth-error-modal">' +
        '<div class="oauth-error-icon"><i class="bx bx-time-five"></i></div>' +
        '<h2>' + title + '</h2>' +
        '<p class="muted">' + message + '</p>' +
        '<button type="button" class="primary-btn ripple-btn" id="oauthErrorDismiss">' + retryLabel + '</button>' +
      '</div>',
      'modal-narrow'
    );
    var dismissBtn = document.getElementById('oauthErrorDismiss');
    if (dismissBtn) {
      dismissBtn.addEventListener('click', function(){
        closeModal();
        var field = document.querySelector((intent === 'login' ? '#loginCard' : '#signupCard') + ' input');
        if (field) { field.focus(); }
      });
    }
  }

  /* ---------- Buttons already known to be unavailable (provider switched
     off, or never configured) — caught before any navigation happens, so
     clicking one never reloads the page. ---------- */
  document.querySelectorAll('.oauth-btn[data-oauth-unavailable]').forEach(function(btn){
    btn.addEventListener('click', function(e){
      e.preventDefault();
      var url = new URL(btn.href);
      var intent = url.searchParams.get('intent') === 'login' ? 'login' : 'signup';
      showOauthUnavailableModal(intent, btn.getAttribute('data-oauth-message'));
    });
  });

  /* ---------- Surface oauth.php errors (e.g. "?oauth_error=..." after a failed
     social sign-in redirect) as an interactive modal, with the matching
     Sign In / Join Community card open underneath it. This only fires for
     failures that could only be known after the real redirect (an unknown
     provider response, a callback error) — everything predictable is now
     caught above without ever leaving the page. ---------- */
  var oauthError = new URLSearchParams(window.location.search).get('oauth_error');
  if (oauthError) {
    var oaWhich = new URLSearchParams(window.location.search).get('oauth_intent') === 'login' ? 'login' : 'signup';
    if (window.acpOpenAuth) { window.acpOpenAuth(oaWhich); }
    showOauthUnavailableModal(oaWhich, oauthError);
    // Drop the query params so a refresh doesn't reopen the modal.
    if (window.history && window.history.replaceState) {
      var url = new URL(window.location.href);
      url.searchParams.delete('oauth_error');
      url.searchParams.delete('oauth_intent');
      window.history.replaceState({}, '', url);
    }
  }

  /* ---------- Terms of Service / Privacy Policy read-gate ----------
     The sign-up "I agree" checkbox stays disabled until the person has
     opened *and scrolled to the end* of this modal — so agreement can't
     be given to text that was never read. Terms and Privacy used to be
     two separate documents/modals that each needed their own scroll-to-
     the-end pass; they're combined into one scrollable modal now, so
     reading either link reads both at once. ---------- */
  var legalContent = {
    title: 'Terms of Service &amp; Privacy Policy',
    html:
      '<h3 class="legal-modal-heading"><i class="bx bx-file"></i> Terms of Service</h3>' +
      '<p class="legal-intro">The short version: use the workspace responsibly, keep your own content, and remember this is a free, self-hosted tool provided as-is.</p>' +
      '<ol class="legal-list">' +
      '<li><b>Use it responsibly.</b> By creating an account you agree to use A-Code Playground responsibly and not to abuse, disrupt or attempt unauthorized access to the service.</li>' +
      '<li><b>Keep your credentials secure.</b> You are responsible for keeping your login — password or connected OAuth account — secure.</li>' +
      '<li><b>Your content stays yours.</b> Projects, snippets and notes you create remain yours; you are responsible for what you store here.</li>' +
      '<li><b>Provided &ldquo;as is&rdquo;.</b> This is a self-hosted, free, no-warranty tool, without guarantees of uptime, backups or fitness for a particular purpose.</li>' +
      '<li><b>Abuse gets suspended.</b> Accounts found spamming, attempting exploits or running automated scraping may be suspended.</li>' +
      '<li><b>Terms can change.</b> These terms may change as the project evolves; continued use after a change means you accept the update.</li>' +
      '<li><b>Not for sensitive data.</b> The service is not intended for storing sensitive personal, financial or health data.</li>' +
      '<li><b>Questions?</b> Direct them to the workspace administrator.</li>' +
      '</ol>' +
      '<h3 class="legal-modal-heading"><i class="bx bx-lock-alt"></i> Privacy Policy</h3>' +
      '<p class="legal-intro">A-Code Playground is a self-hosted, single-admin workspace — no ad network, analytics tracker or data broker is involved.</p>' +
      '<ol class="legal-list">' +
      '<li><b>Account data.</b> Password accounts: name, email and a bcrypt <i>hash</i> of your password — never the plain password. OAuth accounts (Google/GitHub/Facebook): only the name, email and ID that provider shares with us.</li>' +
      '<li><b>Your workspace content.</b> Projects, Notes, Snippets and saved Components live in a database table scoped to your account — never scanned for advertising.</li>' +
      '<li><b>Local-first storage.</b> Every change saves to your browser first, then mirrors to the database as backup; deleting something moves it to your local Recycle Bin first.</li>' +
      '<li><b>Gamification data.</b> A points/streak ledger tracks which actions earned XP, used only to power the leaderboard.</li>' +
      '<li><b>Cookies.</b> One HttpOnly, SameSite=Lax session cookie keeps you signed in — Secure over HTTPS, no tracking or ad cookies, ever.</li>' +
      '<li><b>Optional Drive backup.</b> If you connect Google Drive, we store your Drive email, an encrypted refresh token and your last sync time — nothing else from your Drive.</li>' +
      '<li><b>Security logs.</b> Admin actions are written to a technical audit log (timestamp, IP, actor email), capped at ~1,000 entries — passwords are never logged.</li>' +
      '<li><b>Never sold.</b> This data is never sold, rented or shared with third parties.</li>' +
      '<li><b>Your controls.</b> Export a full JSON snapshot of your workspace, or request account deletion, at any time from Settings.</li>' +
      '</ol>',
  };
  var legalRead = false;
  var consent = document.getElementById('suConsent');
  var consentRow = document.getElementById('suConsentRow');
  var consentHint = document.getElementById('suConsentHint');

  function updateConsentAvailability() {
    if (!consent) return;
    var allRead = legalRead;
    consent.disabled = !allRead;
    if (!allRead && consent.checked) { consent.checked = false; }
    if (consentRow) { consentRow.classList.toggle('is-locked', !allRead); }
    if (consentHint) { consentHint.classList.toggle('is-unlocked', allRead); }
  }

  function openLegalModal() {
    var doc = legalContent;
    if (!doc || !modal) { window.location.href = '?page=terms'; return; }
    var scrollNote = t('auth.legalScrollNote', 'Scroll down to finish reading.');
    openModal(
      '<h2>' + doc.title + '</h2>' +
      '<div id="legalModalBody">' + doc.html + '</div>' +
      '<p class="legal-modal-note" id="legalModalNote"><i class="bx bx-down-arrow-circle"></i><span>' + scrollNote + '</span></p>',
      'modal-legal'
    );
    var note = document.getElementById('legalModalNote');
    function markRead() {
      if (legalRead) return;
      legalRead = true;
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

  // Terms and Privacy are now one combined, scrollable document, so both
  // links open the same modal at the top - reading either one reads both.
  document.querySelectorAll('[data-legal-link]').forEach(function(a){
    a.addEventListener('click', function(e){
      e.preventDefault();
      openLegalModal();
    });
  });

  updateConsentAvailability();

  /* Admin Control is now a full-page dashboard (admin-dashboard.php); the
     footer shield is a plain link, so no modal code is needed here. */
})();
</script>
<script src="assets/js/i18n.js?v=<?php echo (int)$i18nVersion; ?>"></script>
<script src="assets/js/pwa.js?v=<?php echo (int)$pwaVersion; ?>"></script>
</body>
</html>
