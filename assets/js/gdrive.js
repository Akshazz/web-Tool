/* Google Drive backup — browser side (talks only to this site's gdrive.php).
   - Settings page: renders the "Google Drive backup" card (connect, back up
     now, restore, auto-backup switch, disconnect).
   - Every page: if the account has auto-backup on, changes are batched and
     uploaded quietly (the server skips it if nothing changed, or if a backup
     just happened). Tokens never reach the browser; all Google calls are made
     by the server. */
(function () {
  'use strict';

  var EP = 'gdrive.php';
  var AUTO_DELAY_MS = 45000;
  var state = window.GDRIVE || { configured: false, connected: false, auto: false };
  var autoTimer = null;

  function $(s) { return document.querySelector(s); }
  function toast(m) { if (window.toast) window.toast(m); }
  function csrf() { return window.CSRF_TOKEN; }

  function call(action, payload) {
    var body = { csrf: csrf() };
    for (var k in (payload || {})) { if (Object.prototype.hasOwnProperty.call(payload, k)) { body[k] = payload[k]; } }
    return fetch(EP + '?action=' + encodeURIComponent(action), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }

  function fmtTime(ms) { return ms ? new Date(ms).toLocaleString() : 'never'; }
  function fmtSize(b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB'; }

  /* ---------- automatic backups (any page) ---------- */
  window.gdriveNotifyChange = function () {
    if (!(state.connected && state.auto)) { return; }
    clearTimeout(autoTimer);
    autoTimer = setTimeout(runAuto, AUTO_DELAY_MS);
  };
  function runAuto() {
    if (!window.collectSnapshot) { return; }
    call('backup', { auto: true, snapshot: window.collectSnapshot() }).then(function (res) {
      if (res && res.ok && res.skipped === false) {
        var last = $('#gdriveLast'); if (last) { last.textContent = fmtTime(res.savedAt); }
      }
    }).catch(function () { /* quiet: the next change will try again */ });
  }

  /* ---------- Settings card ---------- */
  var body = $('#gdriveBody');
  if (!body) { return; }

  function el(tag, attrs, text) {
    var n = document.createElement(tag);
    if (attrs) { for (var k in attrs) { if (Object.prototype.hasOwnProperty.call(attrs, k)) { n.setAttribute(k, attrs[k]); } } }
    if (text != null) { n.textContent = text; }
    return n;
  }
  function button(icon, label, cls) {
    var b = el('button', { type: 'button', 'class': cls || 'ghost-btn' });
    var i = el('i', { 'class': 'bx ' + icon });
    b.appendChild(i); b.appendChild(document.createTextNode(' ' + label));
    return b;
  }
  function busy(btn, on, label) {
    if (on) { btn.dataset.orig = btn.innerHTML; btn.disabled = true; btn.textContent = label; }
    else { btn.disabled = false; if (btn.dataset.orig) { btn.innerHTML = btn.dataset.orig; } }
  }

  /* Messages stay on screen (a toast alone disappears before long errors can be read). */
  var msgEl = el('p', { 'class': 'muted', id: 'gdriveMsg', role: 'status' });
  body.parentNode.insertBefore(msgEl, body.nextSibling);
  function say(text) { toast(text); msgEl.textContent = text; }

  function renderMessage(text) {
    body.textContent = '';
    body.appendChild(el('p', { 'class': 'muted' }, text));
  }

  function renderDisconnected(s) {
    body.textContent = '';
    if (!s.configured) {
      body.appendChild(el('p', { 'class': 'muted' }, s.disabled
        ? 'Google Drive backup is currently turned off by the site administrator.'
        : 'Google Drive backup isn\u2019t available yet. The site administrator needs to add the Google connection in the Admin dashboard (Integrations \u2192 Google Drive).'));
      return;
    }
    if (!s.runtimeOk) {
      body.appendChild(el('p', { 'class': 'muted' }, 'This server\u2019s PHP is missing the cURL or OpenSSL extension, which Google Drive backup needs.'));
      return;
    }
    body.appendChild(el('p', { 'class': 'muted' }, 'Not connected. You\u2019ll be sent to Google to choose your account and approve access to a private backup folder.'));
    var actions = el('div', { 'class': 'disk-actions' });
    var link = el('a', { 'class': 'ghost-btn', href: EP + '?action=connect&csrf=' + encodeURIComponent(csrf()) });
    link.appendChild(el('i', { 'class': 'bx bxl-google' }));
    link.appendChild(document.createTextNode(' Connect Google Drive'));
    actions.appendChild(link);
    body.appendChild(actions);
  }

  function renderConnected(s) {
    body.textContent = '';
    var who = el('p', { 'class': 'muted' });
    who.appendChild(document.createTextNode('Connected' + (s.email ? ' as ' : '')));
    if (s.email) { who.appendChild(el('b', null, s.email)); }
    who.appendChild(document.createTextNode('. Last backup: '));
    who.appendChild(el('span', { id: 'gdriveLast' }, fmtTime(s.lastSyncAt)));
    who.appendChild(document.createTextNode('. The newest ' + s.keep + ' backups are kept in a folder named \u201cA-Code Playground Backups\u201d.'));
    body.appendChild(who);

    var actions = el('div', { 'class': 'disk-actions' });
    var backupBtn = button('bx-cloud-upload', 'Back up to Drive now');
    var restoreBtn = button('bx-cloud-download', 'Restore from Drive');
    var discBtn = button('bx-unlink', 'Disconnect');
    actions.appendChild(backupBtn); actions.appendChild(restoreBtn); actions.appendChild(discBtn);
    body.appendChild(actions);

    var row = el('label', { 'class': 'switch-row', style: 'margin-top:12px' });
    row.appendChild(el('span', null, 'Back up automatically after changes'));
    var box = el('input', { type: 'checkbox' });
    box.checked = !!s.auto;
    row.appendChild(document.createTextNode(' ')); row.appendChild(box);
    body.appendChild(row);
    body.appendChild(el('p', { 'class': 'muted', style: 'margin-top:6px' }, 'Automatic backups run quietly at most every 10 minutes, and only when something actually changed.'));

    var list = el('div', { 'class': 'gdrive-list', id: 'gdriveList', hidden: 'hidden' });
    body.appendChild(list);

    backupBtn.addEventListener('click', function () {
      if (!window.collectSnapshot) { return; }
      busy(backupBtn, true, 'Backing up\u2026');
      call('backup', { snapshot: window.collectSnapshot() }).then(function (res) {
        if (res && res.ok) {
          say('Backup saved to Google Drive');
          var last = $('#gdriveLast'); if (last) { last.textContent = fmtTime(res.savedAt); }
          if (!list.hidden) { loadList(list); }
        } else { say((res && res.error) || 'Could not back up to Google Drive'); if (res && /connect google drive again/i.test(res.error || '')) { refresh(); } }
      }).catch(function () { say('Could not reach the server'); })
        .then(function () { busy(backupBtn, false); });
    });

    restoreBtn.addEventListener('click', function () {
      if (!list.hidden) { list.hidden = true; return; }
      list.hidden = false; loadList(list);
    });

    box.addEventListener('change', function () {
      var want = box.checked;
      call('set-auto', { on: want }).then(function (res) {
        if (res && res.ok) { state.auto = !!res.auto; say(res.auto ? 'Automatic Drive backup on' : 'Automatic Drive backup off'); }
        else { box.checked = !want; say((res && res.error) || 'Could not change that setting'); }
      }).catch(function () { box.checked = !want; say('Could not reach the server'); });
    });

    discBtn.addEventListener('click', function () {
      if (!confirm('Disconnect Google Drive?\n\nBackups already in your Drive stay there; the app just stops using your account.')) { return; }
      busy(discBtn, true, 'Disconnecting\u2026');
      call('disconnect').then(function (res) {
        if (res && res.ok) { state.connected = false; state.auto = false; clearTimeout(autoTimer); say('Google Drive disconnected'); refresh(); }
        else { say((res && res.error) || 'Could not disconnect'); busy(discBtn, false); }
      }).catch(function () { say('Could not reach the server'); busy(discBtn, false); });
    });
  }

  function loadList(list) {
    list.textContent = '';
    list.appendChild(el('p', { 'class': 'muted' }, 'Loading backups from Google Drive\u2026'));
    call('list').then(function (res) {
      list.textContent = '';
      if (!res || !res.ok) { list.appendChild(el('p', { 'class': 'muted' }, (res && res.error) || 'Could not load your backups.')); return; }
      if (!res.files.length) { list.appendChild(el('p', { 'class': 'muted' }, 'No backups in Google Drive yet \u2014 use \u201cBack up to Drive now\u201d.')); return; }
      res.files.forEach(function (f) {
        var item = el('div', { 'class': 'gdrive-item' });
        var info = el('div', { 'class': 'gdrive-item-info' });
        info.appendChild(el('b', null, fmtTime(f.createdAt)));
        info.appendChild(el('small', { 'class': 'muted' }, f.name + ' \u00b7 ' + fmtSize(f.size)));
        var mergeBtn = button('bx-git-merge', 'Merge', 'small-btn');
        var replaceBtn = button('bx-revision', 'Replace', 'small-btn ghost-btn');
        item.appendChild(info); item.appendChild(mergeBtn); item.appendChild(replaceBtn);
        list.appendChild(item);

        function restore(mode, btn) {
          if (mode === 'replace' && !confirm('Replace ALL your current projects, snippets and notes with this backup?\n\nThis can\u2019t be undone (your XP and rank are not affected).')) { return; }
          busy(btn, true, 'Restoring\u2026');
          call('restore-file', { id: f.id }).then(function (res) {
            if (res && res.ok && res.snapshot && window.applyImportedSnapshot) {
              window.applyImportedSnapshot(res.snapshot, mode);
            } else { say((res && res.error) || 'Could not restore that backup'); }
          }).catch(function () { say('Could not reach the server'); })
            .then(function () { busy(btn, false); });
        }
        mergeBtn.addEventListener('click', function () { restore('merge', mergeBtn); });
        replaceBtn.addEventListener('click', function () { restore('replace', replaceBtn); });
      });
    }).catch(function () { list.textContent = ''; list.appendChild(el('p', { 'class': 'muted' }, 'Could not reach the server.')); });
  }

  function refresh() {
    call('status').then(function (s) {
      if (!s || !s.ok) { renderMessage((s && s.error) || 'Could not check Google Drive.'); return; }
      state.configured = s.configured; state.connected = s.connected; state.auto = s.auto;
      if (s.connected) { renderConnected(s); } else { renderDisconnected(s); }
    }).catch(function () { renderMessage('Could not reach the server.'); });
  }

  /* Result of the Google sign-in round trip (?gdrive=connected|error&gdrive_msg=...). */
  (function showReturnResult() {
    var q = new URLSearchParams(window.location.search);
    var r = q.get('gdrive');
    if (!r) { return; }
    say(r === 'connected' ? 'Google Drive connected' : (q.get('gdrive_msg') || 'Google Drive was not connected'));
    q.delete('gdrive'); q.delete('gdrive_msg');
    var qs = q.toString();
    try { history.replaceState(null, '', window.location.pathname + (qs ? '?' + qs : '') + window.location.hash); } catch (e) { /* ignore */ }
  })();

  refresh();
})();
