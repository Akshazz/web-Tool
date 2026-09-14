<?php
/**
 * Rendered by index.php for anyone who isn't logged in yet (or who visits
 * ?page=landing/login/signup on purpose). Deliberately a separate, lighter
 * template — no sidebar/topbar app shell — since these pages exist to get
 * a visitor into an account, not to be the workspace itself.
 *
 * Expects $page ('landing' | 'login' | 'signup') and $cssVersion to already
 * be set by index.php.
 */
if (!defined('ADEVTOOLS_USERS_FILE')) { require_once __DIR__ . '/auth-helpers.php'; }
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#111214">
<title><?php echo $page === 'login' ? 'Log in' : ($page === 'signup' ? 'Join the Community' : 'A-DevTools — Build. Test. Learn. Ship.'); ?></title>
<link rel="preconnect" href="https://cdnjs.cloudflare.com">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/boxicons/2.1.4/css/boxicons.min.css">
<link rel="stylesheet" href="assets/css/app.css?v=<?php echo (int)$cssVersion; ?>">
</head>
<body class="guest-body">
<a href="#guestMain" class="skip-link">Skip to main content</a>

<header class="guest-topbar">
    <a class="brand" href="?page=landing" aria-label="A-DevTools home"><span class="brand-mark"><i class="bx bx-code-alt"></i></span><span>A-DevTools</span></a>
    <nav class="guest-topnav">
        <button type="button" class="guest-lang-btn" aria-label="Language"><span class="guest-lang-mark">A</span> EN</button>
        <button type="button" class="ghost-btn guest-install-btn"><i class="bx bx-import"></i> Install App</button>
        <button type="button" class="guest-download-btn" aria-label="Download"><i class="bx bx-down-arrow-alt"></i></button>
    </nav>
</header>

<main id="guestMain" class="guest-main">
<?php if ($page === 'login' || $page === 'signup'): ?>

    <section class="auth-shell">
        <div class="auth-card panel">
            <div class="auth-tabs" role="tablist" aria-label="Account access">
                <a href="?page=login" role="tab" aria-selected="<?php echo $page === 'login' ? 'true' : 'false'; ?>" class="auth-tab <?php echo $page === 'login' ? 'active' : ''; ?>">Log in</a>
                <a href="?page=signup" role="tab" aria-selected="<?php echo $page === 'signup' ? 'true' : 'false'; ?>" class="auth-tab <?php echo $page === 'signup' ? 'active' : ''; ?>">Join Community</a>
            </div>

            <?php if ($page === 'signup'): ?>
                <h1>Join the A-DevTools Community</h1>
                <p class="muted">Create a free account to sync your workspace to this computer and pick up where you left off.</p>
                <form id="signupForm" class="auth-form" novalidate>
                    <label for="suName">Name</label>
                    <input class="input" id="suName" name="name" placeholder="Ada Lovelace" autocomplete="name" required>
                    <label for="suEmail">Email</label>
                    <input class="input" id="suEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    <label for="suPassword">Password</label>
                    <input class="input" id="suPassword" name="password" type="password" placeholder="At least 6 characters" autocomplete="new-password" minlength="6" required>
                    <label for="suPassword2">Confirm password</label>
                    <input class="input" id="suPassword2" name="password2" type="password" placeholder="Re-enter your password" autocomplete="new-password" minlength="6" required>
                    <div class="auth-error" id="signupError" hidden></div>
                    <button class="primary-btn auth-submit" type="submit"><i class="bx bx-user-plus"></i> Create account</button>
                </form>
                <p class="muted auth-switch">Already a member? <a class="text-link" href="?page=login">Log in</a></p>
            <?php else: ?>
                <h1>Welcome back</h1>
                <p class="muted">Log in to get back to your projects, snippets and notes.</p>
                <form id="loginForm" class="auth-form" novalidate>
                    <label for="liEmail">Email</label>
                    <input class="input" id="liEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    <label for="liPassword">Password</label>
                    <input class="input" id="liPassword" name="password" type="password" placeholder="Your password" autocomplete="current-password" required>
                    <div class="auth-error" id="loginError" hidden></div>
                    <button class="primary-btn auth-submit" type="submit"><i class="bx bx-log-in"></i> Log in</button>
                </form>
                <p class="muted auth-switch">New here? <a class="text-link" href="?page=signup">Join the community</a></p>
            <?php endif; ?>
        </div>
    </section>

<?php else: ?>

    <section class="guest-hero split">
        <div class="guest-hero-content">
            <div class="eyebrow">PERSONAL DEVELOPMENT WORKSPACE</div>
            <h1>Build. Test. Learn. Ship.</h1>
            <p>A self-hosted workspace for organizing code, UI experiments, reusable snippets, projects and development notes — with a free community account to keep it all yours.</p>
            <div class="guest-hero-actions">
                <a class="primary-btn guest-cta ripple-btn" href="#joinPanel" data-open-auth="login"><i class="bx bx-rocket"></i> Get Started</a>
                <a class="ghost-btn ripple-btn" href="#joinPanel" data-open-auth="signup"><i class="bx bx-group"></i> Join community now</a>
            </div>
        </div>

        <div class="guest-hero-right">
            <div class="guest-hero-highlight panel" id="heroHighlight">
                <span class="pill-tag"><i class="bx bx-badge-check"></i> CAREER GROWTH</span>
                <div class="hero-highlight-icon"><i class="bx bx-trending-up"></i></div>
                <h2>Let's Start Your Career</h2>
                <p class="muted">Every project, snippet and note you save here becomes part of a portfolio you can point to — the proof of work that gets you hired.</p>
                <ul class="hero-highlight-list">
                    <li><i class="bx bx-check"></i> Build real, working projects</li>
                    <li><i class="bx bx-check"></i> Practice with reusable snippets</li>
                    <li><i class="bx bx-check"></i> Track your progress over time</li>
                </ul>
                <a class="primary-btn guest-cta hero-highlight-cta ripple-btn" href="#joinPanel" data-open-auth="signup"><i class="bx bx-rocket"></i> Get Started</a>
            </div>

            <div class="guest-hero-form-wrap" id="joinPanel">
            <div class="guest-hero-form panel is-active" id="signupCard">
                <button type="button" class="auth-card-close" data-close-auth aria-label="Close"><i class="bx bx-x"></i></button>
                <span class="pill-tag"><i class="bx bx-rocket"></i> GET STARTED</span>
                <h2>Sign up and join now!</h2>
                <p class="muted">Create a free account and your workspace syncs to this computer automatically.</p>
                <form id="signupForm" class="auth-form" novalidate>
                    <label for="suName">Name</label>
                    <input class="input" id="suName" name="name" placeholder="Ada Lovelace" autocomplete="name" required>
                    <label for="suEmail">Email</label>
                    <input class="input" id="suEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    <label for="suPassword">Password</label>
                    <input class="input" id="suPassword" name="password" type="password" placeholder="At least 6 characters" autocomplete="new-password" minlength="6" required>
                    <label for="suPassword2">Confirm password</label>
                    <input class="input" id="suPassword2" name="password2" type="password" placeholder="Re-enter your password" autocomplete="new-password" minlength="6" required>
                    <div class="auth-error" id="signupError" hidden></div>
                    <button class="primary-btn auth-submit ripple-btn" type="submit"><i class="bx bx-user-plus"></i> Sign Up</button>
                </form>
                <p class="muted auth-switch">Already have an account? <a class="text-link" href="#joinPanel" data-open-auth="login">sign in now!</a></p>
            </div>

            <div class="guest-hero-form panel" id="loginCard">
                <button type="button" class="auth-card-close" data-close-auth aria-label="Close"><i class="bx bx-x"></i></button>
                <span class="pill-tag"><i class="bx bx-log-in"></i> WELCOME BACK</span>
                <h2>Sign In</h2>
                <p class="muted">Log in to A-DevTools to keep working on your projects.</p>
                <form id="loginForm" class="auth-form" novalidate>
                    <label for="liEmail">Email</label>
                    <input class="input" id="liEmail" name="email" type="email" placeholder="you@example.com" autocomplete="email" required>
                    <label for="liPassword">Password</label>
                    <input class="input" id="liPassword" name="password" type="password" placeholder="Your password" autocomplete="current-password" required>
                    <div class="auth-error" id="loginError" hidden></div>
                    <button class="primary-btn auth-submit ripple-btn" type="submit"><i class="bx bx-log-in"></i> Sign In</button>
                </form>
                <p class="muted auth-switch">Don't have an account? <a class="text-link" href="#joinPanel" data-open-auth="signup">sign up now!</a></p>
            </div>
            </div>
        </div>
    </section>

    <section class="guest-features">
        <div class="guest-feature panel reveal"><b><i class="bx bx-code-alt"></i></b><h3>Code Playground</h3><p class="muted">Write and preview HTML, CSS and JavaScript in a live sandbox.</p></div>
        <div class="guest-feature panel reveal"><b><i class="bx bx-file-code"></i></b><h3>Snippets</h3><p class="muted">Save, search and reuse the components you build most often.</p></div>
        <div class="guest-feature panel reveal"><b><i class="bx bx-folder-open"></i></b><h3>Projects</h3><p class="muted">Track personal development projects and ideas in one place.</p></div>
        <div class="guest-feature panel reveal"><b><i class="bx bx-note"></i></b><h3>Notes</h3><p class="muted">Keep technical notes without leaving your workspace.</p></div>
    </section>

    <section class="guest-cta-band panel reveal">
        <div class="guest-cta-band-copy"><div class="cta-band-icon"><i class="bx bx-rocket"></i></div><div><h2>Ready to join the community?</h2><p class="muted">It's free — create an account and your workspace is saved to this computer automatically.</p></div></div>
        <a class="primary-btn guest-cta ripple-btn" href="#joinPanel" data-open-auth="signup"><i class="bx bx-rocket"></i> Get Started</a>
    </section>

<?php endif; ?>
</main>

<footer class="guest-footer">
    <div class="guest-footer-inner">
        <div class="guest-footer-brand reveal">
            <a class="brand" href="?page=landing" aria-label="A-DevTools home"><span class="brand-mark"><i class="bx bx-code-alt"></i></span><span>A-DevTools</span></a>
            <p class="muted">A self-hosted workspace for organizing code, UI experiments, snippets, projects and development notes.</p>
        </div>
        <div class="guest-footer-col reveal">
            <span class="guest-footer-heading"><i class="bx bx-grid-alt"></i> Workspace</span>
            <a href="?page=code"><i class="bx bx-code-alt"></i> Code Playground</a>
            <a href="?page=snippets"><i class="bx bx-file-code"></i> Snippets</a>
            <a href="?page=projects"><i class="bx bx-folder-open"></i> Projects</a>
            <a href="?page=notes"><i class="bx bx-note"></i> Notes</a>
        </div>
        <div class="guest-footer-col reveal">
            <span class="guest-footer-heading"><i class="bx bx-user-circle"></i> Account</span>
            <a href="?page=login"><i class="bx bx-log-in"></i> Log in</a>
            <a href="?page=signup"><i class="bx bx-user-plus"></i> Join the community</a>
        </div>
        <div class="guest-footer-col reveal">
            <span class="guest-footer-heading"><i class="bx bx-book-open"></i> Resources</span>
            <a href="?page=guide"><i class="bx bx-book-open"></i> UI/UX Guide</a>
            <a href="?page=components"><i class="bx bx-shapes"></i> UI Components</a>
        </div>
    </div>
    <div class="guest-footer-bottom">
        <span><i class="bx bx-copyright"></i> <?php echo date('Y'); ?> A-DevTools. All rights reserved.</span>
        <span class="guest-footer-tag"><i class="bx bx-rocket"></i> Build. Test. Learn. Ship.</span>
    </div>
</footer>

<script>
(function(){
  var wrap = document.getElementById('joinPanel');
  var signupCard = document.getElementById('signupCard');
  var loginCard = document.getElementById('loginCard');
  var heroHighlight = document.getElementById('heroHighlight');

  function openAuth(which){
    if (!wrap) { return; }
    var wasOpen = wrap.classList.contains('open');
    wrap.classList.add('open');
    if (heroHighlight) { heroHighlight.classList.add('is-hidden'); }
    if (which === 'login') {
      if (loginCard) { loginCard.classList.add('is-active'); }
      if (signupCard) { signupCard.classList.remove('is-active'); }
    } else {
      if (signupCard) { signupCard.classList.add('is-active'); }
      if (loginCard) { loginCard.classList.remove('is-active'); }
    }
    /* Only scroll on the first open. Re-scrolling every time someone flips
       between Sign In / Sign Up (while already open) was cutting the
       crossfade transition short and made repeated toggling feel jumpy. */
    if (!wasOpen) { wrap.scrollIntoView({behavior:'smooth', block:'center'}); }
  }

  function closeAuth(){
    if (wrap) { wrap.classList.remove('open'); }
    if (heroHighlight) { heroHighlight.classList.remove('is-hidden'); }
  }

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
  function submitAuth(action, payload, form, errorBox, submitBtn) {
    errorBox.hidden = true;
    var originalHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Please wait...';
    fetch('auth.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(Object.assign({action:action}, payload))
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
</body>
</html>
