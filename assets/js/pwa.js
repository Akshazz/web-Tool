/**
 * PWA install handling + Android APK download button.
 * Intentionally separate from app.js (which is a closed IIFE) — this only
 * touches shared, already-public DOM: #toast, #modal/#modalBody, and the
 * three new topbar controls (#langPicker, #pwaInstallBtn, #apkDownloadBtn).
 */
(function () {
  'use strict';

  var toastEl = document.getElementById('toast');
  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastEl.__t);
    toastEl.__t = setTimeout(function () { toastEl.classList.remove('show'); }, 2600);
  }

  var modalBackdrop = document.getElementById('modal');
  var modalBody = document.getElementById('modalBody');
  function openModal(html) {
    if (!modalBackdrop || !modalBody) return;
    modalBody.innerHTML = html;
    modalBackdrop.classList.add('show');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }
  modalBackdrop && modalBackdrop.addEventListener('click', function (e) {
    if (e.target === modalBackdrop || e.target.closest('[data-close-modal]') || e.target.closest('#modalClose')) {
      modalBackdrop.classList.remove('show');
      modalBackdrop.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
  });

  /* ---------------- Service worker registration ---------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function () {
        // Fails silently on plain http:// hosts other than localhost — PWA
        // features require a secure context, which is out of this script's
        // control.
      });
    });
  }

  /* ---------------- Install App button ---------------- */
  var installBtn = document.getElementById('pwaInstallBtn');
  var deferredPrompt = null;

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
  }

  function setInstalledState() {
    if (!installBtn) return;
    installBtn.classList.add('is-installed');
    installBtn.querySelector('.pwa-install-label').textContent = 'Installed';
    installBtn.querySelector('i').className = 'bx bx-check';
  }

  if (isStandalone()) setInstalledState();

  window.addEventListener('beforeinstallprompt', function (e) {
    // Only take over the browser's install prompt on pages that actually have an
    // Install button to fire it from later (guest.php). Elsewhere (the logged-in
    // app) there's no button, so calling preventDefault() would just suppress
    // Chrome's own install UI and log "Banner not shown: beforeinstallpromptevent
    // .preventDefault() called..." to the console — with nothing ever using the event.
    if (!installBtn) return;
    e.preventDefault();
    deferredPrompt = e;
    installBtn.hidden = false;
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    setInstalledState();
    toast('A-Code Playground installed');
  });

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  var isSafari = isIOS && /safari/i.test(ua) && !/crios|fxios/i.test(ua);

  installBtn && installBtn.addEventListener('click', function () {
    if (isStandalone()) { toast('A-Code Playground is already installed'); return; }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') toast('Installing A-Code Playground…');
        deferredPrompt = null;
      });
      return;
    }

    if (isSafari) {
      openModal(
        '<h2>Install on iPhone / iPad</h2>' +
        '<p class="modal-subtitle">iOS installs web apps through Safari\'s share sheet rather than a popup.</p>' +
        '<ol style="line-height:1.9;padding-left:18px">' +
        '<li>Tap the <b>Share</b> icon in Safari\'s toolbar <i class="bx bx-export"></i></li>' +
        '<li>Scroll down and tap <b>Add to Home Screen</b></li>' +
        '<li>Tap <b>Add</b> — A-Code Playground will open full-screen from your Home Screen from then on.</li>' +
        '</ol>' +
        '<div class="modal-footer"><button class="primary-btn" data-close-modal>Got it</button></div>'
      );
      return;
    }

    openModal(
      '<h2>Install A-Code Playground</h2>' +
      '<p class="modal-subtitle">Your browser has not offered an install prompt yet.</p>' +
      '<p class="muted">Look for an install icon in the address bar, or open your browser menu and choose <b>Install app…</b> / <b>Add to Home screen</b>. If you are running this over plain <code>http://</code> on a non-localhost address, installing requires HTTPS first.</p>' +
      '<div class="modal-footer"><button class="primary-btn" data-close-modal>Got it</button></div>'
    );
  });

  /* ---------------- Android APK download button ---------------- */
  var apkBtn = document.getElementById('apkDownloadBtn');
  var APK_PATH = 'downloads/app-release.apk';

  apkBtn && apkBtn.addEventListener('click', function (e) {
    e.preventDefault();
    fetch(APK_PATH, { method: 'HEAD' }).then(function (res) {
      if (res.ok) {
        var a = document.createElement('a');
        a.href = APK_PATH;
        a.download = '';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        showApkHelp();
      }
    }).catch(showApkHelp);
  });

  function showApkHelp() {
    openModal(
      '<h2>Android APK not added yet</h2>' +
      '<p class="modal-subtitle">This button is wired up — it just needs a real APK file to serve.</p>' +
      '<p class="muted">Drop your signed <code>app-release.apk</code> into the <code>/downloads</code> folder of this project and the button will start downloading it immediately, no code changes needed.</p>' +
      '<p class="muted">Don\'t have an APK yet? Since this site is now an installable PWA, you can generate a real, signed Android APK/AAB for free at <a class="text-link" href="https://www.pwabuilder.com" target="_blank" rel="noopener">pwabuilder.com</a> — point it at this site\'s URL and it packages the manifest + service worker into a native Android app in a few minutes.</p>' +
      '<div class="modal-footer"><a class="ghost-btn" href="https://www.pwabuilder.com" target="_blank" rel="noopener"><i class="bx bx-link-external"></i> Open PWABuilder</a><button class="primary-btn" data-close-modal>Got it</button></div>'
    );
  }

  /* ---------------- Language picker ---------------- */
  var langPicker = document.getElementById('langPicker');
  var langBtn = document.getElementById('langBtn');
  var langDropdown = document.getElementById('langDropdown');
  var langBackdrop = document.getElementById('langBackdrop');

  // The topbar uses backdrop-filter for its glass effect, and backdrop-filter
  // (like transform/filter) creates a containing block for position:fixed
  // descendants. That silently re-anchors the dropdown/backdrop to the
  // ~64px-tall topbar box instead of the real viewport, which is why the
  // mobile sheet used to render squashed near the very top of the page
  // instead of docked to the bottom of the screen. Moving both nodes to be
  // direct children of <body> escapes that containing block entirely, so
  // position:fixed means the actual viewport again, on every screen size.
  if (langDropdown && langDropdown.parentNode !== document.body) document.body.appendChild(langDropdown);
  if (langBackdrop && langBackdrop.parentNode !== document.body) document.body.appendChild(langBackdrop);

  function isLangOpen() {
    return !!(langDropdown && !langDropdown.hidden);
  }

  // On wider screens the dropdown still has to appear right under the
  // button — since it now lives in <body> instead of inside #langPicker, CSS
  // alone can no longer anchor it there, so it's positioned here from the
  // button's real on-screen position. Below the mobile breakpoint the CSS
  // bottom-sheet rules take over instead (cleared inline styles let them).
  function positionLangDropdown() {
    if (!langDropdown || !langBtn) return;
    if (window.innerWidth <= 560) {
      langDropdown.style.top = '';
      langDropdown.style.right = '';
      langDropdown.style.left = '';
      return;
    }
    var rect = langBtn.getBoundingClientRect();
    langDropdown.style.top = Math.round(rect.bottom + 10) + 'px';
    langDropdown.style.left = '';
    var right = window.innerWidth - rect.right;
    // Keep it on-screen if the button ever sits close to the left edge.
    langDropdown.style.right = Math.max(12, Math.round(right)) + 'px';
  }

  function openLangDropdown() {
    if (!langDropdown) return;
    positionLangDropdown();
    langDropdown.hidden = false;
    if (langBackdrop) langBackdrop.hidden = false;
    langBtn && langBtn.setAttribute('aria-expanded', 'true');
    var list = langOptionEls();
    var activeIdx = list.findIndex(function (o) { return o.classList.contains('active'); });
    focusLangOption(activeIdx > -1 ? activeIdx : 0);
  }

  function closeLangDropdown() {
    if (!langDropdown) return;
    langDropdown.hidden = true;
    if (langBackdrop) langBackdrop.hidden = true;
    langBtn && langBtn.setAttribute('aria-expanded', 'false');
  }

  function toggleLangDropdown() {
    if (isLangOpen()) closeLangDropdown();
    else openLangDropdown();
  }

  langBtn && langBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    toggleLangDropdown();
  });

  document.addEventListener('click', function (e) {
    // #langDropdown now lives in <body> (see reparenting above), so a click
    // inside it is no longer a click inside #langPicker — check both.
    if (!isLangOpen()) return;
    var inPicker = langPicker && langPicker.contains(e.target);
    var inDropdown = langDropdown && langDropdown.contains(e.target);
    if (!inPicker && !inDropdown) closeLangDropdown();
  });

  /* ---------------- Responsive quick-controls relocation ---------------- */
  // On mobile the topbar was crowded with seven separate controls (search,
  // theme, experience level, language, help, notifications, avatar). Theme,
  // level and language are grouped in #quickControlsGroup and, below the
  // same 560px breakpoint the rest of the topbar already uses, get moved
  // — as the actual live elements, not copies, so every listener and id
  // keeps working untouched — into the account menu under "Quick settings".
  // #quickControlsAnchor marks exactly where the group came from, so going
  // back to a wider screen puts it right back in the topbar.
  var quickGroup = document.getElementById('quickControlsGroup');
  var quickAnchor = document.getElementById('quickControlsAnchor');
  var quickMobileSlot = document.getElementById('quickControlsMobileSlot');

  function placeQuickControls() {
    if (!quickGroup || !quickAnchor || !quickMobileSlot) return;
    var mobile = window.innerWidth <= 560;
    if (mobile) {
      if (quickGroup.parentNode !== quickMobileSlot) quickMobileSlot.appendChild(quickGroup);
    } else if (quickGroup.parentNode !== quickAnchor.parentNode || quickGroup.nextSibling !== quickAnchor) {
      quickAnchor.parentNode.insertBefore(quickGroup, quickAnchor);
    }
  }
  placeQuickControls();
  window.addEventListener('resize', placeQuickControls);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isLangOpen()) {
      closeLangDropdown();
      langBtn && langBtn.focus();
    }
  });
  // Belt-and-suspenders: never leave the panel stranded open if the layout
  // changes underneath it (rotation, resize, losing focus to another tab).
  window.addEventListener('resize', function () { if (isLangOpen()) closeLangDropdown(); });
  window.addEventListener('blur', function () { if (isLangOpen()) closeLangDropdown(); });
  langBackdrop && langBackdrop.addEventListener('click', closeLangDropdown);

  langDropdown && langDropdown.addEventListener('click', function (e) {
    var opt = e.target.closest('[data-lang]');
    if (!opt) return;
    window.ACodePlaygroundI18n && window.ACodePlaygroundI18n.setLanguage(opt.dataset.lang);
    closeLangDropdown();
    langBtn && langBtn.focus();
  });

  /* Full keyboard navigation within the open dropdown: Up/Down cycles
     options, Home/End jump to the ends, Enter/Space picks (native button
     behaviour already covers that once focused). */
  function langOptionEls() {
    return langDropdown ? Array.prototype.slice.call(langDropdown.querySelectorAll('.lang-option')) : [];
  }
  function focusLangOption(idx) {
    var list = langOptionEls();
    if (!list.length) return;
    idx = ((idx % list.length) + list.length) % list.length;
    list.forEach(function (o, i) { o.classList.toggle('kbd-focus', i === idx); });
    list[idx].focus();
  }
  langDropdown && langDropdown.addEventListener('keydown', function (e) {
    var list = langOptionEls();
    var current = list.findIndex(function (o) { return o === document.activeElement; });
    if (e.key === 'ArrowDown') { e.preventDefault(); focusLangOption(current + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); focusLangOption(current - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusLangOption(0); }
    else if (e.key === 'End') { e.preventDefault(); focusLangOption(list.length - 1); }
  });
})();
