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
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.hidden = false;
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    setInstalledState();
    toast('A-DevTools installed');
  });

  var ua = navigator.userAgent || '';
  var isIOS = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  var isSafari = isIOS && /safari/i.test(ua) && !/crios|fxios/i.test(ua);

  installBtn && installBtn.addEventListener('click', function () {
    if (isStandalone()) { toast('A-DevTools is already installed'); return; }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (choice) {
        if (choice.outcome === 'accepted') toast('Installing A-DevTools…');
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
        '<li>Tap <b>Add</b> — A-DevTools will open full-screen from your Home Screen from then on.</li>' +
        '</ol>' +
        '<div class="modal-footer"><button class="primary-btn" data-close-modal>Got it</button></div>'
      );
      return;
    }

    openModal(
      '<h2>Install A-DevTools</h2>' +
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

  function closeLangDropdown() {
    if (!langDropdown) return;
    langDropdown.hidden = true;
    langBtn && langBtn.setAttribute('aria-expanded', 'false');
  }

  langBtn && langBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = langDropdown.hidden;
    langDropdown.hidden = !open;
    langBtn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', function (e) {
    if (langPicker && !langPicker.contains(e.target)) closeLangDropdown();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeLangDropdown();
  });

  langDropdown && langDropdown.addEventListener('click', function (e) {
    var opt = e.target.closest('[data-lang]');
    if (!opt) return;
    window.ADevToolsI18n && window.ADevToolsI18n.setLanguage(opt.dataset.lang);
    closeLangDropdown();
  });
})();
