/* =====================================================================
   A-Code Playground — Admin Dashboard (client)
   Renders every page of admin-dashboard.php from admin.php's JSON API.
   No dependencies: vanilla JS + inline SVG charts.
   ===================================================================== */
(function () {
'use strict';

/* ---------------------------------------------------------------------
   Helpers
--------------------------------------------------------------------- */
var BOOT = JSON.parse(document.getElementById('adBoot').textContent);
var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function $(sel, root) { return (root || document).querySelector(sel); }
function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
function num(n) { return Number(n || 0); }
function fmt(n) { return num(n).toLocaleString('en-US'); }
function plural(n, one, many) { return fmt(n) + ' ' + (n === 1 ? one : (many || one + 's')); }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function debounce(fn, ms) { var t; return function () { var a = arguments, c = this; clearTimeout(t); t = setTimeout(function () { fn.apply(c, a); }, ms); }; }
function lower(s) { return String(s == null ? '' : s).toLowerCase(); }
function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
function trunc(s, n) { s = String(s == null ? '' : s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
function bytes(n) {
  if (n == null) return '—';
  var u = ['B', 'KB', 'MB', 'GB', 'TB'], i = 0; n = Number(n);
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return (i === 0 ? n : n.toFixed(n >= 100 ? 0 : 1)) + ' ' + u[i];
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
function mmss(sec) { sec = Math.max(0, Math.floor(sec)); return pad2(Math.floor(sec / 60)) + ':' + pad2(sec % 60); }

/* Server timestamps are "YYYY-MM-DD HH:MM:SS" in the SERVER's timezone.
   Dates are displayed exactly as stored; relative times ("5 min ago") are
   corrected for the difference between the server's clock and this browser. */
var serverOffset = 0;
function parseDT(s) {
  if (!s) return null;
  var m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0));
}
function trueDate(s) { var d = parseDT(s); return d ? new Date(d.getTime() - serverOffset) : null; }
function fmtDate(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] : '—';
}
function fmtDateTime(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? m[3] + '/' + m[2] + '/' + m[1] + ' ' + m[4] + ':' + m[5] : fmtDate(s);
}
function agoMs(ms) {
  var s = Math.round((Date.now() - ms) / 1000);
  if (s < 45) return 'just now';
  if (s < 3600) return Math.round(s / 60) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  if (s < 86400 * 30) return Math.round(s / 86400) + ' d ago';
  if (s < 86400 * 365) return Math.round(s / (86400 * 30)) + ' mo ago';
  return Math.round(s / (86400 * 365)) + ' y ago';
}
function ago(s) { var d = trueDate(s); return d ? agoMs(d.getTime()) : '—'; }
function dayLabel(iso) { var p = iso.split('-'); return +p[2] + ' ' + MONTHS[+p[1] - 1]; }
function hash(str) { var h = 0; str = String(str || ''); for (var i = 0; i < str.length; i++) { h = (h * 31 + str.charCodeAt(i)) | 0; } return Math.abs(h); }
function initials(name) {
  var p = String(name || '?').trim().split(/\s+/);
  return ((p[0] || '?').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toUpperCase();
}
function avatar(name, cls) { return '<span class="ad-avatar' + (cls ? ' ' + cls : '') + '" data-c="' + (hash(name) % 5) + '">' + esc(initials(name)) + '</span>'; }
function ico(name) { return '<i class="bx ' + name + '"></i>'; }
function download(filename, mime, text) {
  var blob = new Blob([text], { type: mime + ';charset=utf-8' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
function csvCell(v) { v = v == null ? '' : String(v); return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
function toCSV(rows, cols) {
  var out = [cols.map(function (c) { return csvCell(c.label); }).join(',')];
  rows.forEach(function (r) { out.push(cols.map(function (c) { return csvCell(typeof c.get === 'function' ? c.get(r) : r[c.key]); }).join(',')); });
  return '\ufeff' + out.join('\r\n');
}
function stamp() { var d = new Date(); return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes()); }
function genPassword() {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789', out = '', arr = new Uint32Array(14);
  (window.crypto || window.msCrypto).getRandomValues(arr);
  for (var i = 0; i < arr.length; i++) out += chars.charAt(arr[i] % chars.length);
  return out;
}

/* ---------------------------------------------------------------------
   State
--------------------------------------------------------------------- */
var LS = {
  get: function (k, d) { try { var v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } },
  set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};
var PAGE_SIZE = clamp(parseInt(LS.get('adminPageSize', '10'), 10) || 10, 5, 100);

var VIEWS = {
  overview: { title: 'Overview', icon: 'bx-grid-alt' },
  users: { title: 'Users', icon: 'bx-group' },
  projects: { title: 'Projects', icon: 'bx-folder' },
  notes: { title: 'Notes', icon: 'bx-note' },
  snippets: { title: 'Snippets', icon: 'bx-code-block' },
  components: { title: 'Components', icon: 'bx-layer' },
  security: { title: 'Security', icon: 'bx-shield-quarter' },
  integrations: { title: 'Google', icon: 'bxl-google' },
  github: { title: 'GitHub', icon: 'bxl-github' },
  facebook: { title: 'Facebook', icon: 'bxl-facebook-circle' },
  system: { title: 'System & data', icon: 'bx-server' }
};

function tableState(sort, dir) { return { q: '', owner: 'all', filter: 'all', role: 'all', level: 'all', sort: sort, dir: dir, page: 1, size: PAGE_SIZE }; }

var S = {
  data: null, loading: false, locked: false, lastLoaded: 0,
  view: 'overview', range: 30,
  t: {
    users: tableState('joined', 'desc'),
    projects: tableState('updated', 'desc'),
    notes: tableState('updated', 'desc'),
    snippets: tableState('updated', 'desc'),
    components: tableState('updated', 'desc')
  },
  sel: { users: {}, projects: {}, notes: {}, snippets: {}, components: {} },
  audit: { kind: 'all', q: '', page: 1, size: 10 },
  googleTest: null,
  oauthTest: {},
  drawer: null,
  live: LS.get('adminLive', '0') === '1', liveTimer: null,
  secondsLeft: BOOT.secondsLeft, lastPing: Date.now(), warned: false,
  usersById: {}, userCounts: {}
};

/* The `snippets` table holds two different things people save from the
   app's own sidebar: plain code Snippets and Saved Components (from the UI
   Components library). There has never been a database column recording
   which is which — the app itself only tells them apart by the same
   'component-' id prefix every component save has always used (see
   snippetSource() in assets/js/app.js) — so the admin dashboard uses that
   same id prefix to split one server list into two pages below. Editing,
   deleting and CSV export still talk to the `snippets` table server-side
   (serverType), since that's the only table there is. */
function isComponentRow(r) { return String(r.id).indexOf('component-') === 0; }

var CONTENT = {
  projects: {
    singular: 'project', label: 'Projects', icon: 'bx-folder', tc: 't-project', titleKey: 'name',
    filterKey: 'tech', filterLabel: 'All technologies',
    search: ['name', 'tech', 'description', 'owner_name', 'owner_email'],
    excerpt: function (r) { return trunc(r.description, 70) || 'No description'; },
    size: function (r) { return (r.description || '').length; }
  },
  notes: {
    singular: 'note', label: 'Notes', icon: 'bx-note', tc: 't-note', titleKey: 'title',
    filterKey: null, filterLabel: '',
    search: ['title', 'body', 'owner_name', 'owner_email'],
    excerpt: function (r) { return trunc(r.body, 70) || 'Empty note'; },
    size: function (r) { return (r.body || '').length; }
  },
  snippets: {
    singular: 'snippet', serverType: 'snippet', label: 'Snippets', icon: 'bx-code-block', tc: 't-snippet', titleKey: 'title',
    filterKey: 'lang', filterLabel: 'All languages',
    search: ['title', 'lang', 'code', 'owner_name', 'owner_email'],
    excerpt: function (r) { return trunc(r.code, 70) || 'Empty snippet'; },
    size: function (r) { return (r.code || '').length; }
  },
  components: {
    singular: 'component', serverType: 'snippet', label: 'Components', icon: 'bx-layer', tc: 't-component', titleKey: 'title',
    filterKey: 'lang', filterLabel: 'All languages',
    search: ['title', 'lang', 'code', 'owner_name', 'owner_email'],
    excerpt: function (r) { return trunc(r.code, 70) || 'Empty component'; },
    size: function (r) { return (r.code || '').length; }
  }
};
var SINGULAR = { projects: 'project', notes: 'note', snippets: 'snippet', components: 'component' };
var PLURAL = { project: 'projects', note: 'notes', snippet: 'snippets', component: 'components' };

function ckey(item) { return item.user_id + '|' + item.id; }
function listOf(kind) {
  if (kind === 'users') return S.data ? S.data.users : [];
  if (!S.data) return [];
  if (kind === 'snippets') return S.data.content.snippets.filter(function (r) { return !isComponentRow(r); });
  if (kind === 'components') return S.data.content.snippets.filter(isComponentRow);
  return S.data.content[kind];
}
function itemKey(kind, item) { return kind === 'users' ? item.id : ckey(item); }

function indexData(d) {
  S.usersById = {}; S.userCounts = {};
  d.users.forEach(function (u) {
    u.points_total = num(u.points_total); u.points_streak = num(u.points_streak);
    S.usersById[u.id] = u; S.userCounts[u.id] = { projects: 0, notes: 0, snippets: 0, components: 0 };
  });
  ['projects', 'notes'].forEach(function (k) {
    d.content[k].forEach(function (r) { if (S.userCounts[r.user_id]) S.userCounts[r.user_id][k]++; });
  });
  d.content.snippets.forEach(function (r) {
    if (S.userCounts[r.user_id]) S.userCounts[r.user_id][isComponentRow(r) ? 'components' : 'snippets']++;
  });
  var sv = parseDT(d.system && d.system.serverTime);
  if (sv && d.generatedAt) serverOffset = sv.getTime() - d.generatedAt * 1000;
  // Drop selections that no longer exist.
  ['users', 'projects', 'notes', 'snippets', 'components'].forEach(function (k) {
    var alive = {}; listOf(k).forEach(function (r) { alive[itemKey(k, r)] = 1; });
    Object.keys(S.sel[k]).forEach(function (key) { if (!alive[key]) delete S.sel[k][key]; });
  });
}
function findUser(id) { return S.usersById[id] || null; }
function findContent(kind, id, userId) {
  var list = listOf(kind);
  for (var i = 0; i < list.length; i++) { if (String(list[i].id) === String(id) && String(list[i].user_id) === String(userId)) return list[i]; }
  return null;
}
function isMe(id) { return String(id) === String(BOOT.admin.id); }

/* ---------------------------------------------------------------------
   API
--------------------------------------------------------------------- */
function api(action, payload, opts) {
  opts = opts || {};
  var body = { action: action, csrf: BOOT.csrf };
  if (payload) for (var k in payload) if (Object.prototype.hasOwnProperty.call(payload, k)) body[k] = payload[k];
  if (opts.passive) body.passive = true;
  return fetch(BOOT.endpoint, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  }).then(function (r) { return r.json(); }).then(function (res) {
    if (res && (res.locked || res.csrf)) { showLocked(res.csrf ? 'Your session expired. Please sign in again.' : ''); }
    else if (res && res.ok && !opts.passive) { S.secondsLeft = BOOT.timeout; S.warned = false; S.lastPing = Date.now(); }
    return res;
  }).catch(function () { return { ok: false, error: 'Network error — could not reach the server.' }; });
}

function load(silent) {
  if (S.loading || S.locked) return Promise.resolve(false);
  S.loading = true; spinRefresh(true);
  return api('stats', {}, { passive: !!silent }).then(function (res) {
    S.loading = false; spinRefresh(false);
    if (!res.ok) { if (!res.locked && !silent) toast(res.error || 'Could not load data.', 'bad'); return false; }
    S.data = res; S.lastLoaded = Date.now();
    if (res.session) S.secondsLeft = res.session.secondsLeft;
    indexData(res); updateNavCounts();
    return true;
  });
}

/* Run a mutating call, toast the result, refresh, re-render. */
function mutate(action, payload, okMsg, btn) {
  if (btn) btn.classList.add('is-loading');
  return api(action, payload).then(function (res) {
    if (btn) btn.classList.remove('is-loading');
    if (!res.ok) { if (!res.locked && !res.csrf) toast(res.error || 'Something went wrong.', 'bad'); return res; }
    if (okMsg) toast(typeof okMsg === 'function' ? okMsg(res) : okMsg, 'ok');
    return load(true).then(function () { render(); refreshDrawer(); return res; });
  });
}

/* ---------------------------------------------------------------------
   Toasts, tooltip, confirm / modal
--------------------------------------------------------------------- */
function toast(msg, kind) {
  var box = $('#adToasts'), el = document.createElement('div');
  el.className = 'ad-toast ' + (kind || 'info');
  el.innerHTML = ico(kind === 'ok' ? 'bx-check-circle' : kind === 'bad' ? 'bx-error-circle' : 'bx-info-circle') + '<span>' + esc(msg) + '</span>';
  box.appendChild(el);
  setTimeout(function () { el.classList.add('out'); setTimeout(function () { el.remove(); }, 280); }, kind === 'bad' ? 5200 : 3200);
}

var tipEl = null;
function tipShow(el, e) {
  if (!tipEl) tipEl = $('#adTip');
  tipEl.innerHTML = el.getAttribute('data-tip'); tipEl.hidden = false;
  tipMove(e);
}
function tipMove(e) {
  if (!tipEl || tipEl.hidden) return;
  var w = tipEl.offsetWidth, h = tipEl.offsetHeight;
  var x = e.clientX + 14, y = e.clientY - h - 12;
  if (x + w > window.innerWidth - 8) x = e.clientX - w - 14;
  if (y < 8) y = e.clientY + 18;
  tipEl.style.left = Math.max(8, x) + 'px'; tipEl.style.top = y + 'px';
}
function tipHide() { if (tipEl) tipEl.hidden = true; }

/* Generic modal. opts: {title, message, icon, iconClass, body(html), confirmText, danger, cancelText, hideCancel,
   persistent, onOpen(root)} — resolves with the modal root on confirm (so callers can read fields), or null. */
var modalResolve = null;
function openModal(opts) {
  return new Promise(function (resolve) {
    var wrap = $('#adModalWrap');
    modalResolve = resolve;
    wrap.innerHTML =
      '<div class="ad-modal" role="dialog" aria-modal="true" aria-labelledby="adModalTitle">' +
        '<form id="adModalForm" novalidate>' +
        '<div class="ad-modal-head">' +
          (opts.icon ? '<div class="ad-modal-ico ' + (opts.iconClass || '') + '">' + ico(opts.icon) + '</div>' : '') +
          '<h3 id="adModalTitle">' + esc(opts.title) + '</h3>' +
          (opts.message ? '<p>' + opts.message + '</p>' : '') +
        '</div>' +
        (opts.body ? '<div class="ad-modal-body">' + opts.body + '</div>' : '') +
        '<div class="ad-modal-foot">' +
          (opts.hideCancel ? '' : '<button type="button" class="ad-btn" data-act="modal-cancel">' + esc(opts.cancelText || 'Cancel') + '</button>') +
          '<button type="submit" class="ad-btn ' + (opts.danger ? 'ad-btn-danger-solid' : 'ad-btn-primary') + '" id="adModalOk">' + esc(opts.confirmText || 'Confirm') + '</button>' +
        '</div></form></div>';
    wrap.hidden = false; wrap.dataset.persistent = opts.persistent ? '1' : '';
    var form = $('#adModalForm', wrap);
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (opts.validate) { var msg = opts.validate(form); if (msg) { toast(msg, 'bad'); return; } }
      closeModal(form);
    });
    if (opts.onOpen) opts.onOpen(form);
    var first = $('input:not([type=hidden]),select,textarea', form);
    setTimeout(function () { (first || $('#adModalOk', wrap)).focus(); }, 30);
  });
}
function closeModal(result) {
  var wrap = $('#adModalWrap');
  wrap.hidden = true; wrap.innerHTML = '';
  var r = modalResolve; modalResolve = null;
  if (r) r(result || null);
}
function confirmBox(opts) {
  var need = opts.type ? String(opts.type) : '';
  return openModal({
    title: opts.title, message: opts.message, icon: opts.icon || (opts.danger ? 'bx-trash' : 'bx-help-circle'),
    iconClass: opts.danger ? '' : 'info', confirmText: opts.confirmText || 'Confirm', danger: opts.danger,
    body: need ? '<label class="ad-field"><span>Type <b>' + esc(need) + '</b> to confirm</span><input class="ad-input" id="adTypeConfirm" autocomplete="off" spellcheck="false"></label>' : '',
    validate: need ? function (f) { return $('#adTypeConfirm', f).value.trim() === need ? '' : 'Type ' + need + ' to confirm.'; } : null
  }).then(function (r) { return !!r; });
}

/* When the server says the session is gone: block the UI and send them to the sign-in page. */
function showLocked(msg) {
  if (S.locked) return;
  S.locked = true; stopLive();
  var wrap = $('#adModalWrap');
  wrap.hidden = false; wrap.dataset.persistent = '1';
  wrap.innerHTML =
    '<div class="ad-modal"><div class="ad-modal-head"><div class="ad-modal-ico info">' + ico('bx-lock-alt') + '</div>' +
    '<h3>Dashboard locked</h3><p>' + esc(msg || 'You were signed out after a period of inactivity. Sign in again to continue.') + '</p></div>' +
    '<div class="ad-modal-foot"><button type="button" class="ad-btn ad-btn-primary" data-act="reload">Sign in again</button></div></div>';
  $('.ad-btn', wrap).focus();
}

/* ---------------------------------------------------------------------
   Charts (inline SVG — no libraries)
--------------------------------------------------------------------- */
var PALETTE = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--faint)'];

function niceStep(v) {
  if (!(v > 0)) return 1;
  var e = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), f = v / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
}
function sum(a) { var s = 0; for (var i = 0; i < a.length; i++) s += num(a[i]); return s; }
function sumLast(a, n) { return sum(a.slice(Math.max(0, a.length - n))); }
function sumPrev(a, n) { return sum(a.slice(Math.max(0, a.length - 2 * n), Math.max(0, a.length - n))); }

function axis(W, H, L, R, T, B, step) {
  var ph = H - T - B, out = '';
  for (var t = 0; t <= 4; t++) {
    var y = T + ph - ph * t / 4;
    out += '<line class="grid" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/>' +
           '<text x="' + (L - 8) + '" y="' + (y + 3.5) + '" text-anchor="end">' + fmt(step * t) + '</text>';
  }
  return out;
}

function chartBars(days, series, H) {
  var W = 720; H = H || 230;
  var L = 32, R = 4, T = 10, B = 26, pw = W - L - R, ph = H - T - B, n = days.length, slot = pw / n;
  var totals = days.map(function (_, i) { return series.reduce(function (s, x) { return s + num(x.data[i]); }, 0); });
  var step = Math.max(1, niceStep(Math.max.apply(null, totals.concat([0])) / 4)), max = step * 4;
  var bw = Math.max(2, Math.min(26, slot * 0.66)), every = Math.ceil(n / 7), bars = '', hits = '', labels = '';
  days.forEach(function (d, i) {
    var x = L + slot * i + (slot - bw) / 2, base = T + ph, tip = '<b>' + dayLabel(d) + '</b>';
    series.forEach(function (s) {
      var v = num(s.data[i]);
      tip += '<div><i style="background:' + s.color + '"></i>' + esc(s.name) + ': ' + v + '</div>';
      if (v > 0) { var h = ph * v / max; base -= h; bars += '<rect x="' + x.toFixed(2) + '" y="' + base.toFixed(2) + '" width="' + bw.toFixed(2) + '" height="' + h.toFixed(2) + '" rx="2" style="fill:' + s.color + '"/>'; }
    });
    hits += '<rect class="hit" x="' + (L + slot * i).toFixed(2) + '" y="' + T + '" width="' + slot.toFixed(2) + '" height="' + ph + '" data-tip="' + esc(tip) + '"/>';
    if ((n - 1 - i) % every === 0) labels += '<text x="' + (x + bw / 2).toFixed(2) + '" y="' + (H - 7) + '" text-anchor="middle">' + dayLabel(d) + '</text>';
  });
  return '<div class="ad-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Daily content created">' + axis(W, H, L, R, T, B, step) + bars + hits + labels + '</svg></div>';
}

function chartArea(days, data, color, name, H) {
  var W = 720; H = H || 200;
  var L = 32, R = 10, T = 10, B = 26, pw = W - L - R, ph = H - T - B, n = days.length, slot = pw / n;
  var step = Math.max(1, niceStep(Math.max.apply(null, data.concat([0])) / 4)), max = step * 4;
  var pts = data.map(function (v, i) { return [L + slot * (i + 0.5), T + ph - ph * num(v) / max]; });
  var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
  var area = line + ' L' + pts[pts.length - 1][0].toFixed(1) + ' ' + (T + ph) + ' L' + pts[0][0].toFixed(1) + ' ' + (T + ph) + ' Z';
  var gid = 'ag' + hash(name), every = Math.ceil(n / 7), hits = '', labels = '', dots = '';
  days.forEach(function (d, i) {
    var tip = '<b>' + dayLabel(d) + '</b><div><i style="background:' + color + '"></i>' + esc(name) + ': ' + num(data[i]) + '</div>';
    hits += '<rect class="hit" x="' + (L + slot * i).toFixed(2) + '" y="' + T + '" width="' + slot.toFixed(2) + '" height="' + ph + '" data-tip="' + esc(tip) + '"/>';
    if (num(data[i]) > 0) dots += '<circle cx="' + pts[i][0].toFixed(1) + '" cy="' + pts[i][1].toFixed(1) + '" r="3" style="fill:var(--surface);stroke:' + color + '" stroke-width="2"/>';
    if ((n - 1 - i) % every === 0) labels += '<text x="' + pts[i][0].toFixed(1) + '" y="' + (H - 7) + '" text-anchor="middle">' + dayLabel(d) + '</text>';
  });
  return '<div class="ad-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(name) + ' per day">' +
    '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + color + ';stop-opacity:.28"/><stop offset="1" style="stop-color:' + color + ';stop-opacity:0"/></linearGradient></defs>' +
    axis(W, H, L, R, T, B, step) + '<path d="' + area + '" fill="url(#' + gid + ')"/>' +
    '<path d="' + line + '" fill="none" style="stroke:' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' + dots + hits + labels + '</svg></div>';
}

function spark(data, color) {
  var n = data.length, max = Math.max.apply(null, data.concat([1]));
  var pts = data.map(function (v, i) { return (i * 100 / (n - 1 || 1)).toFixed(2) + ',' + (36 - 30 * num(v) / max).toFixed(2); }).join(' ');
  return '<svg class="ad-spark" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,40 ' + pts + ' 100,40" style="fill:' + color + ';opacity:.13"/>' +
    '<polyline points="' + pts + '" fill="none" style="stroke:' + color + '" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/></svg>';
}

function donut(items, centerLabel) {
  var total = sum(items.map(function (i) { return i.count; })), r = 52, C = 2 * Math.PI * r, off = 0, segs = '';
  items.forEach(function (it, i) {
    var len = total ? C * it.count / total : 0, gap = items.length > 1 && len > 4 ? 2 : 0, dash = Math.max(0, len - gap);
    if (len > 0) segs += '<circle cx="66" cy="66" r="' + r + '" fill="none" stroke-width="16" style="stroke:' + PALETTE[i % PALETTE.length] + '" stroke-dasharray="' + dash.toFixed(2) + ' ' + (C - dash).toFixed(2) + '" stroke-dashoffset="' + (-off).toFixed(2) + '" data-tip="' + esc('<b>' + cap(it.label) + '</b>' + it.count + ' (' + Math.round(100 * it.count / total) + '%)') + '"/>';
    off += len;
  });
  var list = items.map(function (it, i) { return '<div><i style="background:' + PALETTE[i % PALETTE.length] + '"></i><span>' + esc(it.label) + '</span><b>' + fmt(it.count) + '</b></div>'; }).join('');
  return '<div class="ad-donut-row"><div class="ad-donut"><svg viewBox="0 0 132 132" aria-hidden="true"><circle cx="66" cy="66" r="' + r + '" fill="none" stroke-width="16" style="stroke:var(--surface3)"/>' + segs + '</svg>' +
    '<div class="ad-donut-c"><div><b>' + fmt(total) + '</b><br><small>' + esc(centerLabel) + '</small></div></div></div>' +
    '<div class="ad-donut-list">' + (list || '<span class="ad-muted">No data yet</span>') + '</div></div>';
}

function hbars(items, colorVar, fmtVal) {
  if (!items.length) return '<div class="ad-empty" style="padding:26px 0"><span>No data yet</span></div>';
  var max = Math.max.apply(null, items.map(function (i) { return i.count; }).concat([1]));
  return '<div class="ad-hbars">' + items.map(function (it) {
    return '<div><div class="ad-hbar-top"><span>' + esc(it.label) + '</span><b>' + (fmtVal ? fmtVal(it) : fmt(it.count)) + '</b></div>' +
      '<div class="ad-hbar-track"><div class="ad-hbar-fill" style="width:' + Math.max(3, Math.round(100 * it.count / max)) + '%;background:' + colorVar + '"></div></div></div>';
  }).join('') + '</div>';
}

/* ---------------------------------------------------------------------
   Shared view pieces
--------------------------------------------------------------------- */
function pageHead(title, sub, actions) {
  return '<div class="ad-page-head"><div><h2>' + title + '</h2>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (actions ? '<div class="ad-actions">' + actions + '</div>' : '') + '</div>';
}
function roleBadge(role) { return '<span class="ad-badge ' + (role === 'admin' ? 'admin' : '') + '">' + (role === 'admin' ? ico('bx-shield-alt-2') : '') + esc(role || 'user') + '</span>'; }
function levelBadge(l) { return l ? '<span class="ad-badge ' + esc(l) + '">' + esc(l) + '</span>' : '<span class="ad-muted">—</span>'; }
function emptyState(icon, title, sub, btn) {
  return '<div class="ad-empty">' + ico(icon) + '<b>' + esc(title) + '</b><span>' + esc(sub || '') + '</span>' + (btn || '') + '</div>';
}
function cardHead(title, sub, right) {
  return '<div class="ad-card-head"><div><div class="ad-card-title">' + title + '</div>' + (sub ? '<div class="ad-card-sub">' + sub + '</div>' : '') + '</div>' + (right || '') + '</div>';
}
function userLine(u) { return '<div class="ad-cell-user">' + avatar(u.name) + '<div><b>' + esc(u.name) + '</b><small>' + esc(u.email) + '</small></div></div>'; }
function ownerCell(r) { return '<div class="ad-cell-user">' + avatar(r.owner_name, 'sm') + '<div><b style="max-width:180px">' + esc(r.owner_name) + '</b></div></div>'; }
function greeting() { var h = new Date().getHours(); return h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

function kpi(o) {
  return '<div class="ad-card ad-kpi' + (o.link ? ' link' : '') + '"' + (o.link ? ' data-act="goto" data-view="' + o.link + '" tabindex="0" role="link"' : '') + '>' +
    '<div class="ad-kpi-top"><span class="ad-kpi-ico ' + o.cls + '">' + ico(o.icon) + '</span>' + esc(o.label) + '</div>' +
    '<div class="ad-kpi-val">' + o.value + '</div>' +
    '<div class="ad-kpi-sub">' + (o.delta || '') + '<span>' + o.sub + '</span></div>' +
    (o.data ? spark(o.data.slice(-30), o.color) : '') + '</div>';
}
function deltaChip(cur, prev) {
  var d = cur - prev;
  if (cur === 0 && prev === 0) return '<span class="ad-delta">0</span>';
  return '<span class="ad-delta ' + (d > 0 ? 'up' : d < 0 ? 'down' : '') + '">' + (d > 0 ? '▲' : d < 0 ? '▼' : '•') + ' ' + cur + '</span>';
}

/* ---------------------------------------------------------------------
   Overview
--------------------------------------------------------------------- */
function activityFeed(limit) {
  var ev = [];
  S.data.users.forEach(function (u) { ev.push({ t: u.joined_at, type: 'user', icon: 'bx-user-plus', head: '<b>' + esc(u.name) + '</b> joined', sub: u.email, act: 'data-act="open-user" data-id="' + esc(u.id) + '"' }); });
  ['projects', 'notes', 'snippets', 'components'].forEach(function (k) {
    var c = CONTENT[k];
    listOf(k).forEach(function (r) {
      ev.push({ t: r.created_at, type: c.singular, icon: c.icon, head: '<b>' + esc(r.owner_name) + '</b> created a ' + c.singular, sub: r[c.titleKey],
        act: 'data-act="open-content" data-kind="' + k + '" data-id="' + esc(r.id) + '" data-uid="' + esc(r.user_id) + '"' });
    });
  });
  ev.sort(function (a, b) { return a.t < b.t ? 1 : a.t > b.t ? -1 : 0; });
  return ev.slice(0, limit);
}

function renderOverview() {
  var d = S.data, s = d.series, c = d.counts, first = String(BOOT.admin.name || 'there').split(/\s+/)[0];
  var cutoff = Math.max(0, s.days.length - S.range);
  var days = s.days.slice(cutoff);
  var failed24 = (d.audit || []).filter(function (e) { return e.event === 'sign-in failed' && (Date.now() / 1000 - e.t) < 86400; }).length;
  var newUsers7 = sumLast(s.users, 7);

  var kpis =
    kpi({ label: 'Users', value: fmt(c.users), icon: 'bx-group', cls: 't-user', color: 'var(--c1)', data: s.users, delta: deltaChip(newUsers7, sumPrev(s.users, 7)), sub: 'new this week', link: 'users' }) +
    kpi({ label: 'Projects', value: fmt(c.projects), icon: 'bx-folder', cls: 't-project', color: 'var(--c2)', data: s.projects, delta: deltaChip(sumLast(s.projects, 7), sumPrev(s.projects, 7)), sub: 'new this week', link: 'projects' }) +
    kpi({ label: 'Snippets', value: fmt(listOf('snippets').length), icon: 'bx-code-block', cls: 't-snippet', color: 'var(--c4)', data: s.snippets, delta: deltaChip(sumLast(s.snippets, 7), sumPrev(s.snippets, 7)), sub: 'new this week', link: 'snippets' }) +
    kpi({ label: 'Components', value: fmt(listOf('components').length), icon: 'bx-layer', cls: 't-component', color: 'var(--c6, #9b59b6)', sub: 'saved from UI Components', link: 'components' }) +
    kpi({ label: 'Notes', value: fmt(c.notes), icon: 'bx-note', cls: 't-note', color: 'var(--c3)', data: s.notes, delta: deltaChip(sumLast(s.notes, 7), sumPrev(s.notes, 7)), sub: 'new this week', link: 'notes' }) +
    kpi({ label: 'Total XP earned', value: fmt(d.xp.total), icon: 'bxs-flame', cls: 't-note', color: 'var(--c5)', sub: 'longest streak ' + fmt(d.xp.maxStreak) + ' day' + (d.xp.maxStreak === 1 ? '' : 's') });

  var rangeSeg = '<div class="ad-seg" role="group" aria-label="Chart range">' + [7, 30, 90].map(function (n) {
    return '<button type="button" data-act="range" data-n="' + n + '" class="' + (S.range === n ? 'active' : '') + '">' + n + 'd</button>';
  }).join('') + '</div>';

  var contentSeries = [
    { name: 'Projects', color: 'var(--c2)', data: s.projects.slice(cutoff) },
    { name: 'Snippets', color: 'var(--c4)', data: s.snippets.slice(cutoff) },
    { name: 'Notes', color: 'var(--c3)', data: s.notes.slice(cutoff) }
  ];
  var totalNew = sum(contentSeries[0].data) + sum(contentSeries[1].data) + sum(contentSeries[2].data);

  var board = d.users.slice().sort(function (a, b) { return b.points_total - a.points_total || b.points_streak - a.points_streak; }).filter(function (u) { return u.points_total > 0; }).slice(0, 5);
  var boardHtml = board.length ? board.map(function (u, i) {
    return '<div class="ad-row clickable" data-act="open-user" data-id="' + esc(u.id) + '"><span class="ad-rank r' + (i + 1) + '">' + (i + 1) + '</span>' + avatar(u.name, 'sm') +
      '<div class="ad-row-main"><b>' + esc(u.name) + '</b><small>' + fmt(u.points_streak) + '-day streak</small></div><div class="ad-row-end"><b style="color:var(--text)">' + fmt(u.points_total) + '</b> XP</div></div>';
  }).join('') : emptyState('bx-trophy', 'No XP yet', 'Learners appear here once they earn XP.');

  var feed = activityFeed(7).map(function (e) {
    return '<div class="ad-row clickable" ' + e.act + '><span class="ad-type-ico t-' + e.type + '">' + ico(e.icon) + '</span><div class="ad-row-main"><b>' + e.head + '</b><small>' + esc(trunc(e.sub, 60)) + '</small></div><div class="ad-row-end">' + esc(ago(e.t)) + '</div></div>';
  }).join('') || emptyState('bx-time-five', 'Nothing yet', 'Activity will show up here.');

  var checks = (d.system.checks || []), problems = checks.filter(function (x) { return x.status === 'bad' || x.status === 'warn'; });
  var secCard =
    '<div class="ad-card">' + cardHead('Security snapshot', 'Live from this install', '<a class="ad-link" href="#/security">Open ' + ico('bx-right-arrow-alt') + '</a>') +
    '<div class="ad-card-body" style="padding-top:12px"><dl class="ad-kv">' +
    '<dt>Active lockouts</dt><dd>' + (d.lockouts.length ? '<span class="ad-badge warn">' + d.lockouts.length + '</span>' : '<span class="ad-badge ok">None</span>') + '</dd>' +
    '<dt>Failed sign-ins (24h)</dt><dd>' + (failed24 ? '<span class="ad-badge bad">' + failed24 + '</span>' : '<span class="ad-badge ok">0</span>') + '</dd>' +
    '<dt>Health checks</dt><dd>' + (problems.length ? '<span class="ad-badge warn plain">' + problems.length + ' need attention</span>' : '<span class="ad-badge ok plain">All passing</span>') + '</dd>' +
    '<dt>Google Drive</dt><dd><span class="ad-badge ' + googleStatus(d.google).cls + ' plain">' + googleStatus(d.google).label + '</span></dd>' +
    ['github', 'facebook'].map(function (k) { var o = oauthOf(k); return '<dt>' + esc(o.label) + ' sign-in</dt><dd><span class="ad-badge ' + oauthStatus(o).cls + ' plain">' + oauthStatus(o).label + '</span></dd>'; }).join('') +
    '<dt>Admin accounts</dt><dd>' + fmt((d.distributions.roles.filter(function (r) { return r.label === 'admin'; })[0] || { count: 0 }).count) + '</dd>' +
    '</dl></div></div>';

  var quick = '<div class="ad-card">' + cardHead('Quick actions') + '<div class="ad-card-body"><div class="ad-quick">' +
    '<button type="button" data-act="new-user">' + ico('bx-user-plus') + '<span>Add user<small>Create an account</small></span></button>' +
    '<button type="button" data-act="export-backup">' + ico('bx-cloud-download') + '<span>Backup<small>Download JSON</small></span></button>' +
    '<button type="button" data-act="palette">' + ico('bx-search-alt') + '<span>Search<small>Ctrl + K</small></span></button>' +
    '<button type="button" data-act="goto" data-view="security">' + ico('bx-shield-quarter') + '<span>Security<small>Audit &amp; lockouts</small></span></button>' +
    '</div></div></div>';

  return pageHead(esc(greeting()) + ', ' + esc(first), 'A live overview of accounts, content and activity across this A-Code Playground install.',
      '<button type="button" class="ad-btn" data-act="export-backup">' + ico('bx-cloud-download') + 'Backup</button><button type="button" class="ad-btn ad-btn-primary" data-act="new-user">' + ico('bx-user-plus') + 'Add user</button>') +
    '<div class="ad-kpis">' + kpis + '</div>' +

    '<div class="ad-grid g-main">' +
      '<div class="ad-card">' + cardHead('Content created', fmt(totalNew) + ' new item' + (totalNew === 1 ? '' : 's') + ' in the last ' + S.range + ' days', rangeSeg) +
        '<div class="ad-card-body">' + chartBars(days, contentSeries) + '<div class="ad-legend" style="margin-top:8px">' + contentSeries.map(function (x) { return '<span><i style="background:' + x.color + '"></i>' + x.name + '</span>'; }).join('') + '</div></div></div>' +
      '<div class="ad-card">' + cardHead('Learners by level', 'Self-reported experience level') + '<div class="ad-card-body">' + donut(d.distributions.levels, 'accounts') + '</div></div>' +
    '</div>' +

    '<div class="ad-grid g-even">' +
      '<div class="ad-card">' + cardHead('New accounts', fmt(sum(s.users.slice(cutoff))) + ' sign-up' + (sum(s.users.slice(cutoff)) === 1 ? '' : 's') + ' in the last ' + S.range + ' days') +
        '<div class="ad-card-body">' + chartArea(days, s.users.slice(cutoff), 'var(--c1)', 'Sign-ups', 200) + '</div></div>' +
      '<div class="ad-grid g2" style="margin:0"><div class="ad-card">' + cardHead('Top snippet languages') + '<div class="ad-card-body">' + hbars(d.distributions.languages.slice(0, 5), 'var(--c4)') + '</div></div>' +
        '<div class="ad-card">' + cardHead('Project technologies') + '<div class="ad-card-body">' + hbars(d.distributions.techs.slice(0, 5), 'var(--c2)') + '</div></div></div>' +
    '</div>' +

    '<div class="ad-grid g3">' +
      '<div class="ad-card">' + cardHead('Recent activity', 'Newest accounts and content') + '<div class="ad-list" style="margin-top:8px">' + feed + '</div></div>' +
      '<div class="ad-card">' + cardHead('XP leaderboard', 'Top learners by total XP') + '<div class="ad-list" style="margin-top:8px">' + boardHtml + '</div></div>' +
      '<div style="display:grid;gap:16px;align-content:start">' + quick + secCard + '</div>' +
    '</div>';
}

/* ---------------------------------------------------------------------
   Users
--------------------------------------------------------------------- */
var LEVEL_ORDER = { beginner: 1, intermediate: 2, professional: 3 };

function sortRows(rows, st, getters) {
  var g = getters[st.sort] || getters[Object.keys(getters)[0]], dir = st.dir === 'asc' ? 1 : -1;
  return rows.slice().sort(function (a, b) {
    var x = g(a), y = g(b);
    if (x < y) return -1 * dir; if (x > y) return 1 * dir; return 0;
  });
}
function th(kind, key, label, cls) {
  var st = S.t[kind], active = st.sort === key;
  return '<th class="sortable ' + (cls || '') + '" data-act="sort" data-kind="' + kind + '" data-key="' + key + '" aria-sort="' + (active ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '">' + label +
    (active ? ' ' + ico(st.dir === 'asc' ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt') : '') + '</th>';
}
function pager(kind, total) {
  var st = S.t[kind], pages = Math.max(1, Math.ceil(total / st.size));
  st.page = clamp(st.page, 1, pages);
  var a = total ? (st.page - 1) * st.size + 1 : 0, b = Math.min(total, st.page * st.size);
  var sizes = [10, 25, 50, 100].map(function (n) { return '<option value="' + n + '"' + (n === st.size ? ' selected' : '') + '>' + n + ' / page</option>'; }).join('');
  return '<div class="ad-pager"><span>Showing <b>' + a + '–' + b + '</b> of <b>' + fmt(total) + '</b></span><div class="pg">' +
    '<select class="ad-select" data-change="size" data-kind="' + kind + '" aria-label="Rows per page">' + sizes + '</select>' +
    '<button type="button" class="ad-icon-btn sm" data-act="page" data-kind="' + kind + '" data-d="-1" ' + (st.page <= 1 ? 'disabled' : '') + ' aria-label="Previous page">' + ico('bx-chevron-left') + '</button>' +
    '<span>Page ' + st.page + ' / ' + pages + '</span>' +
    '<button type="button" class="ad-icon-btn sm" data-act="page" data-kind="' + kind + '" data-d="1" ' + (st.page >= pages ? 'disabled' : '') + ' aria-label="Next page">' + ico('bx-chevron-right') + '</button></div></div>';
}
function selHeader(kind, pageRows) {
  var keys = pageRows.map(function (r) { return itemKey(kind, r); }), n = keys.filter(function (k) { return S.sel[kind][k]; }).length;
  return '<th class="col-check"><input type="checkbox" class="ad-chk" data-act="sel-all" data-kind="' + kind + '" aria-label="Select all on this page"' + (keys.length && n === keys.length ? ' checked' : '') + (n > 0 && n < keys.length ? ' data-indet="1"' : '') + '></th>';
}

function filteredUsers() {
  var st = S.t.users, q = lower(st.q.trim());
  var rows = S.data.users.filter(function (u) {
    if (st.role !== 'all' && u.role !== st.role) return false;
    if (st.level === 'none' ? !!u.expertise_level : (st.level !== 'all' && u.expertise_level !== st.level)) return false;
    return !q || lower(u.name + ' ' + u.email + ' ' + u.id).indexOf(q) > -1;
  });
  return sortRows(rows, st, {
    name: function (u) { return lower(u.name); }, role: function (u) { return u.role; },
    level: function (u) { return LEVEL_ORDER[u.expertise_level] || 0; }, xp: function (u) { return u.points_total; },
    content: function (u) { var c = S.userCounts[u.id]; return c.projects + c.notes + c.snippets + c.components; }, joined: function (u) { return u.joined_at || ''; }
  });
}

function usersTable() {
  var st = S.t.users, rows = filteredUsers(), total = rows.length;
  if (!total) return emptyState('bx-user-x', 'No matching users', 'Try a different search or clear the filters.', '<button type="button" class="ad-btn ad-btn-sm" data-act="clear-filters" data-kind="users">Clear filters</button>');
  var page = rows.slice((clamp(st.page, 1, Math.ceil(total / st.size)) - 1) * st.size, clamp(st.page, 1, Math.ceil(total / st.size)) * st.size);
  var body = page.map(function (u) {
    var k = u.id, cnt = S.userCounts[u.id];
    return '<tr class="row-link' + (S.sel.users[k] ? ' selected' : '') + '" data-act="open-user" data-id="' + esc(u.id) + '">' +
      '<td class="col-check" data-act="noop"><input type="checkbox" class="ad-chk" data-act="sel" data-kind="users" data-key="' + esc(k) + '" aria-label="Select ' + esc(u.name) + '"' + (S.sel.users[k] ? ' checked' : '') + '></td>' +
      '<td>' + userLine(u) + '</td><td>' + roleBadge(u.role) + '</td><td>' + levelBadge(u.expertise_level) + '</td>' +
      '<td><div class="ad-xp"><b>' + fmt(u.points_total) + '</b><small>' + (u.points_streak ? ico('bxs-flame') + ' ' + u.points_streak : '') + '</small></div></td>' +
      '<td><div class="ad-mini-counts"><span title="Projects">' + ico('bx-folder') + cnt.projects + '</span><span title="Notes">' + ico('bx-note') + cnt.notes + '</span><span title="Snippets">' + ico('bx-code-block') + cnt.snippets + '</span><span title="Components">' + ico('bx-layer') + cnt.components + '</span></div></td>' +
      '<td class="ad-nowrap" title="' + esc(fmtDateTime(u.joined_at)) + '">' + fmtDate(u.joined_at) + '<br><small class="ad-muted">' + esc(ago(u.joined_at)) + '</small></td>' +
      '<td class="col-act" data-act="noop"><button type="button" class="ad-icon-btn sm" data-act="open-user" data-id="' + esc(u.id) + '" title="Manage" aria-label="Manage ' + esc(u.name) + '">' + ico('bx-edit-alt') + '</button>' +
      '<button type="button" class="ad-icon-btn sm danger" data-act="delete-user" data-id="' + esc(u.id) + '" title="Delete account" aria-label="Delete ' + esc(u.name) + '"' + (isMe(u.id) ? ' disabled' : '') + '>' + ico('bx-trash') + '</button></td></tr>';
  }).join('');
  return '<div class="ad-table-wrap"><table class="ad-table"><thead><tr>' + selHeader('users', page) + th('users', 'name', 'User') + th('users', 'role', 'Role') + th('users', 'level', 'Level') + th('users', 'xp', 'XP') + th('users', 'content', 'Content') + th('users', 'joined', 'Joined') + '<th class="col-act"></th></tr></thead><tbody>' + body + '</tbody></table></div>' + pager('users', total);
}

function toolbarSearch(kind, placeholder) {
  var st = S.t[kind];
  return '<label class="ad-search">' + ico('bx-search') + '<input type="search" id="adSearchInput" placeholder="' + esc(placeholder) + '" value="' + esc(st.q) + '" data-input="search" data-kind="' + kind + '" autocomplete="off"></label>';
}
function selectHtml(kind, key, options, current, label) {
  return '<select class="ad-select" data-change="filter" data-kind="' + kind + '" data-key="' + key + '" aria-label="' + esc(label) + '">' +
    options.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(current) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
}

function renderUsers() {
  var st = S.t.users, admins = S.data.users.filter(function (u) { return u.role === 'admin'; }).length;
  return pageHead('Users', fmt(S.data.users.length) + ' account' + (S.data.users.length === 1 ? '' : 's') + ' · ' + fmt(admins) + ' admin' + (admins === 1 ? '' : 's') + '. Click a row to manage an account.',
      '<button type="button" class="ad-btn" data-act="export-csv" data-kind="users">' + ico('bx-export') + 'Export CSV</button><button type="button" class="ad-btn ad-btn-primary" data-act="new-user">' + ico('bx-user-plus') + 'Add user</button>') +
    '<div class="ad-card"><div class="ad-toolbar">' + toolbarSearch('users', 'Search name, email or ID…  ( / )') +
      selectHtml('users', 'role', [['all', 'All roles'], ['admin', 'Admins'], ['user', 'Users']], st.role, 'Filter by role') +
      selectHtml('users', 'level', [['all', 'All levels'], ['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['professional', 'Professional'], ['none', 'Not set']], st.level, 'Filter by level') +
    '</div><div id="adTable">' + usersTable() + '</div></div>';
}

/* ---------------------------------------------------------------------
   Projects / Notes / Snippets
--------------------------------------------------------------------- */
function filteredContent(kind) {
  var st = S.t[kind], c = CONTENT[kind], q = lower(st.q.trim());
  var rows = listOf(kind).filter(function (r) {
    if (st.owner !== 'all' && String(r.user_id) !== st.owner) return false;
    if (c.filterKey && st.filter !== 'all' && (r[c.filterKey] || 'Unspecified') !== st.filter) return false;
    if (!q) return true;
    return c.search.some(function (f) { return lower(r[f]).indexOf(q) > -1; });
  });
  var g = {
    title: function (r) { return lower(r[c.titleKey]); }, owner: function (r) { return lower(r.owner_name); },
    updated: function (r) { return r.updated_at || ''; }, created: function (r) { return r.created_at || ''; },
    filter: function (r) { return lower(r[c.filterKey]); }, size: function (r) { return c.size(r); }
  };
  return sortRows(rows, st, g);
}

function contentTable(kind) {
  var st = S.t[kind], c = CONTENT[kind], rows = filteredContent(kind), total = rows.length;
  if (!total) return emptyState(c.icon, 'No matching ' + c.label.toLowerCase(), listOf(kind).length ? 'Try a different search or clear the filters.' : 'Nothing has been saved yet.', listOf(kind).length ? '<button type="button" class="ad-btn ad-btn-sm" data-act="clear-filters" data-kind="' + kind + '">Clear filters</button>' : '');
  var pg = clamp(st.page, 1, Math.ceil(total / st.size)), page = rows.slice((pg - 1) * st.size, pg * st.size);
  var body = page.map(function (r) {
    var k = ckey(r), open = 'data-act="open-content" data-kind="' + kind + '" data-id="' + esc(r.id) + '" data-uid="' + esc(r.user_id) + '"';
    var mid = c.filterKey ? '<td><span class="ad-badge">' + esc(r[c.filterKey] || 'Unspecified') + '</span></td>' : '';
    return '<tr class="row-link' + (S.sel[kind][k] ? ' selected' : '') + '" ' + open + '>' +
      '<td class="col-check" data-act="noop"><input type="checkbox" class="ad-chk" data-act="sel" data-kind="' + kind + '" data-key="' + esc(k) + '" aria-label="Select ' + esc(r[c.titleKey]) + '"' + (S.sel[kind][k] ? ' checked' : '') + '></td>' +
      '<td><div class="ad-cell-title"><b>' + esc(r[c.titleKey]) + '</b><small>' + esc(c.excerpt(r)) + '</small></div></td>' + mid +
      '<td>' + ownerCell(r) + '</td><td class="ad-muted ad-nowrap">' + fmt(c.size(r)) + ' chars</td>' +
      '<td class="ad-nowrap" title="' + esc(fmtDateTime(r.updated_at)) + '">' + fmtDate(r.updated_at) + '<br><small class="ad-muted">' + esc(ago(r.updated_at)) + '</small></td>' +
      '<td class="col-act" data-act="noop"><button type="button" class="ad-icon-btn sm" ' + open + ' title="View / edit" aria-label="View or edit">' + ico('bx-show') + '</button>' +
      '<button type="button" class="ad-icon-btn sm danger" data-act="delete-content" data-kind="' + kind + '" data-id="' + esc(r.id) + '" data-uid="' + esc(r.user_id) + '" title="Delete" aria-label="Delete">' + ico('bx-trash') + '</button></td></tr>';
  }).join('');
  var head = selHeader(kind, page) + th(kind, 'title', c.singular === 'project' ? 'Project' : c.singular === 'note' ? 'Note' : c.singular === 'component' ? 'Component' : 'Snippet') +
    (c.filterKey ? th(kind, 'filter', c.filterKey === 'lang' ? 'Language' : 'Technology') : '') + th(kind, 'owner', 'Owner') + th(kind, 'size', 'Size') + th(kind, 'updated', 'Updated') + '<th class="col-act"></th>';
  return '<div class="ad-table-wrap"><table class="ad-table"><thead><tr>' + head + '</tr></thead><tbody>' + body + '</tbody></table></div>' + pager(kind, total);
}

function renderContent(kind) {
  var st = S.t[kind], c = CONTENT[kind], list = listOf(kind);
  var owners = {}; list.forEach(function (r) { owners[r.user_id] = r.owner_name; });
  var ownerOpts = [['all', 'All owners']].concat(Object.keys(owners).sort(function (a, b) { return lower(owners[a]) < lower(owners[b]) ? -1 : 1; }).map(function (id) { return [id, owners[id]]; }));
  var filterSel = '';
  if (c.filterKey) {
    var vals = {}; list.forEach(function (r) { vals[r[c.filterKey] || 'Unspecified'] = 1; });
    filterSel = selectHtml(kind, 'filter', [['all', c.filterLabel]].concat(Object.keys(vals).sort().map(function (v) { return [v, v]; })), st.filter, c.filterLabel);
  }
  return pageHead(c.label, fmt(list.length) + ' ' + (list.length === 1 ? c.singular : c.label.toLowerCase()) + ' saved by ' + fmt(Object.keys(owners).length) + ' user' + (Object.keys(owners).length === 1 ? '' : 's') + '. Open one to read, edit or remove it.',
      '<button type="button" class="ad-btn" data-act="export-csv" data-kind="' + kind + '">' + ico('bx-export') + 'Export CSV</button>') +
    '<div class="ad-card"><div class="ad-toolbar">' + toolbarSearch(kind, 'Search ' + c.label.toLowerCase() + ' or owner…  ( / )') +
      selectHtml(kind, 'owner', ownerOpts, st.owner, 'Filter by owner') + filterSel +
    '</div><div id="adTable">' + contentTable(kind) + '</div></div>';
}

/* ---------------------------------------------------------------------
   Security
--------------------------------------------------------------------- */
var AUDIT_ICON = { fail: ['bx-error-circle', 't-shield'], auth: ['bx-log-in-circle', 't-user'], 'delete': ['bx-trash', 't-shield'], change: ['bx-edit', 't-note'] };
function auditKind(e) {
  if (!e.ok) return 'fail';
  if (/^sign-/.test(e.event)) return 'auth';
  if (/delet/.test(e.event)) return 'delete';
  return 'change';
}
function filteredAudit() {
  var q = lower(S.audit.q.trim());
  return (S.data.audit || []).filter(function (e) {
    if (S.audit.kind !== 'all' && auditKind(e) !== S.audit.kind) return false;
    return !q || lower(e.event + ' ' + e.detail + ' ' + e.actor + ' ' + e.ip).indexOf(q) > -1;
  });
}
function auditPager(total) {
  var pages = Math.max(1, Math.ceil(total / S.audit.size));
  S.audit.page = clamp(S.audit.page, 1, pages);
  var a = total ? (S.audit.page - 1) * S.audit.size + 1 : 0, b = Math.min(total, S.audit.page * S.audit.size);
  return '<div class="ad-pager"><span>Showing <b>' + a + '–' + b + '</b> of <b>' + fmt(total) + '</b></span><div class="pg">' +
    '<button type="button" class="ad-icon-btn sm" data-act="audit-page" data-d="-1" ' + (S.audit.page <= 1 ? 'disabled' : '') + ' aria-label="Previous page">' + ico('bx-chevron-left') + '</button>' +
    '<span>Page ' + S.audit.page + ' / ' + pages + '</span>' +
    '<button type="button" class="ad-icon-btn sm" data-act="audit-page" data-d="1" ' + (S.audit.page >= pages ? 'disabled' : '') + ' aria-label="Next page">' + ico('bx-chevron-right') + '</button></div></div>';
}
function auditList() {
  var rows = filteredAudit(), total = rows.length;
  if (!total) return emptyState('bx-history', 'No matching events', (S.data.audit || []).length ? 'Try another filter.' : 'Admin activity will be recorded here.');
  var pages = Math.max(1, Math.ceil(total / S.audit.size));
  S.audit.page = clamp(S.audit.page, 1, pages);
  var page = rows.slice((S.audit.page - 1) * S.audit.size, S.audit.page * S.audit.size);
  return page.map(function (e) {
    var k = auditKind(e), ic = AUDIT_ICON[k], when = new Date(e.t * 1000);
    var icon = e.event === 'sign-out' ? 'bx-log-out' : ic[0];
    return '<div class="ad-log"><span class="ad-type-ico ' + ic[1] + '">' + ico(icon) + '</span><div class="ad-log-main"><b>' + esc(cap(e.event)) + '</b>' + (e.ok ? '' : ' <span class="ad-badge bad">failed</span>') +
      '<small>' + esc(e.detail) + '</small><small>' + esc(e.actor || 'unknown') + (e.ip ? ' · ' + esc(e.ip) : '') + '</small></div>' +
      '<div class="ad-log-time" title="' + esc(when.toLocaleString()) + '">' + esc(agoMs(when.getTime())) + '</div></div>';
  }).join('') + auditPager(total);
}

function renderSecurity() {
  var d = S.data, checks = d.system.checks || [];
  var pts = checks.reduce(function (s, c) { return s + (c.status === 'bad' ? 0 : c.status === 'warn' ? 0.5 : 1); }, 0);
  var score = checks.length ? Math.round(100 * pts / checks.length) : 100, C = 2 * Math.PI * 30;
  var ringColor = score >= 85 ? 'var(--success)' : score >= 60 ? 'var(--warn)' : 'var(--danger)';
  var failed24 = (d.audit || []).filter(function (e) { return e.event === 'sign-in failed' && (Date.now() / 1000 - e.t) < 86400; }).length;
  var admins = d.users.filter(function (u) { return u.role === 'admin'; });
  var acc = d.access || { signinEnabled: true, signupEnabled: true };

  var accessForm =
    '<form data-form="access-settings" autocomplete="off">' +
      '<label class="ad-switch-row"><div><b>Allow signing in</b><small>When off, the Log in form and every “Sign in with…” button show a “currently under review” notice instead. Existing sessions are not affected.</small></div>' +
        '<span class="ad-switch"><input type="checkbox" name="signinEnabled"' + (acc.signinEnabled ? ' checked' : '') + '><i></i></span></label>' +
      '<label class="ad-switch-row"><div><b>Allow signing up</b><small>When off, the Join Community form and every “Sign up with…” button show a “currently under review” notice instead. Existing accounts can still be created by an admin.</small></div>' +
        '<span class="ad-switch"><input type="checkbox" name="signupEnabled"' + (acc.signupEnabled ? ' checked' : '') + '><i></i></span></label>' +
      '<div class="ad-actions" style="margin-top:4px"><button type="submit" class="ad-btn ad-btn-primary">Save</button></div>' +
      (acc.updatedAt ? '<p class="ad-muted" style="font-size:12px;margin-top:12px">Last saved ' + esc(fmtDateTime(acc.updatedAt)) + (acc.updatedBy ? ' by ' + esc(acc.updatedBy) : '') + '</p>' : '') +
    '</form>';

  var lock = d.lockouts.length ? d.lockouts.map(function (l) {
    var until = Date.now() + l.secondsLeft * 1000, isAdmin = /^admin:/.test(l.key);
    return '<div class="ad-lockrow"><span class="ad-type-ico t-shield">' + ico(isAdmin ? 'bx-shield-alt-2' : 'bx-lock-alt') + '</span>' +
      '<div class="ad-row-main"><b>' + esc(l.key.replace(/^admin:/, '')) + '</b><small>' + (isAdmin ? 'Admin sign-in' : 'Community login') + ' · ' + (l.count != null ? l.count + ' failed attempts' : 'locked') + '</small></div>' +
      '<div class="ad-row-end">unlocks in <b class="ad-mono" data-until="' + until + '">' + mmss(l.secondsLeft) + '</b></div>' +
      '<button type="button" class="ad-btn ad-btn-sm" data-act="clear-lockout" data-key="' + esc(l.key) + '">Unlock</button></div>';
  }).join('') : emptyState('bx-lock-open-alt', 'No active lockouts', 'Accounts are locked for a while after 5 failed sign-ins.');

  var healthRows = checks.map(function (c) {
    return '<div class="ad-check-row"><span class="ad-dot ' + esc(c.status) + '"></span><div><b>' + esc(c.label) + '</b><small>' + esc(c.detail) + '</small></div></div>';
  }).join('');

  var kinds = [['all', 'All'], ['auth', 'Sign-ins'], ['change', 'Changes'], ['delete', 'Deletions'], ['fail', 'Failures']];
  return pageHead('Security', 'Sign-in protection, health checks and a full audit trail of everything done in this dashboard.',
      '<button type="button" class="ad-btn" data-act="export-audit">' + ico('bx-export') + 'Export audit CSV</button>') +
    '<div class="ad-kpis">' +
      kpi({ label: 'Active lockouts', value: fmt(d.lockouts.length), icon: 'bx-lock-alt', cls: 't-shield', sub: d.lockouts.length ? 'currently blocked' : 'all clear' }) +
      kpi({ label: 'Failed sign-ins · 24h', value: fmt(failed24), icon: 'bx-error-circle', cls: 't-note', sub: 'admin + throttled attempts' }) +
      kpi({ label: 'Admin accounts', value: fmt(admins.length), icon: 'bx-shield-alt-2', cls: 't-user', sub: admins.slice(0, 2).map(function (a) { return esc(a.name); }).join(', ') || '—' }) +
      kpi({ label: 'Idle timeout', value: Math.round(d.session.timeout / 60) + ' min', icon: 'bx-timer', cls: 't-project', sub: 'auto-lock when inactive' }) +
    '</div>' +
    '<div class="ad-card" style="margin-bottom:16px">' + cardHead('Sign in / Sign up availability', 'Switch either flow off sitewide — for example while it\'s under review') + '<div class="ad-card-body">' + accessForm + '</div></div>' +
    '<div class="ad-grid g-even">' +
      '<div class="ad-card">' + cardHead('Health checks', 'Configuration of this install') +
        '<div class="ad-score"><div class="ad-score-ring"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke-width="8" style="stroke:var(--surface3)"/><circle cx="36" cy="36" r="30" fill="none" stroke-width="8" stroke-linecap="round" style="stroke:' + ringColor + '" stroke-dasharray="' + (C * score / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><b>' + score + '</b></div>' +
        '<div><b style="font-size:15px">' + (score >= 85 ? 'Looking good' : score >= 60 ? 'Needs some attention' : 'Action required') + '</b><div class="ad-muted" style="font-size:12.5px;margin-top:2px">' + checks.filter(function (c) { return c.status === 'ok' || c.status === 'info'; }).length + ' of ' + checks.length + ' checks passing</div></div></div>' +
        '<div style="border-top:1px solid var(--border)">' + healthRows + '</div></div>' +
      '<div class="ad-card">' + cardHead('Login lockouts', 'Shared by the Community login and admin sign-in',
          d.lockouts.length > 1 ? '<button type="button" class="ad-btn ad-btn-sm" data-act="clear-all-lockouts">Unlock all</button>' : '') +
        '<div style="margin-top:10px;border-top:1px solid var(--border)">' + lock + '</div></div>' +
    '</div>' +
    '<div class="ad-card">' + cardHead('Audit log', 'Newest first · kept in data/.security/admin-audit.log') +
      '<div class="ad-toolbar" style="border-bottom:1px solid var(--border);margin-top:12px;border-top:1px solid var(--border)"><label class="ad-search">' + ico('bx-search') + '<input type="search" id="adSearchInput" placeholder="Filter events, emails, IPs…" value="' + esc(S.audit.q) + '" data-input="audit-search" autocomplete="off"></label>' +
      '<div class="ad-seg" role="group" aria-label="Event type">' + kinds.map(function (k) { return '<button type="button" data-act="audit-kind" data-k="' + k[0] + '" class="' + (S.audit.kind === k[0] ? 'active' : '') + '">' + k[1] + '</button>'; }).join('') + '</div></div>' +
      '<div id="adAudit">' + auditList() + '</div></div>';
}

/* ---------------------------------------------------------------------
   Integrations → Google Drive
--------------------------------------------------------------------- */
function googleStatus(g) {
  if (g.configured) return { label: 'Active', cls: 'ok' };
  if (g.clientId && g.secretSet && !g.enabled) return { label: 'Turned off', cls: 'warn' };
  if (g.source === 'none') return { label: 'Not set up', cls: 'info' };
  return { label: 'Incomplete', cls: 'warn' };
}
function copyBtn(text) {
  return '<button type="button" class="ad-icon-btn sm" data-act="copy-text" data-text="' + esc(text) + '" title="Copy" aria-label="Copy">' + ico('bx-copy') + '</button>';
}
function uriRow(label, uri) {
  return '<div class="ad-uri"><small>' + label + '</small><div><code>' + esc(uri) + '</code>' + copyBtn(uri) + '</div></div>';
}

function renderIntegrations() {
  var g = S.data.google, st = googleStatus(g), links = g.links || [];
  var autoOn = links.filter(function (l) { return l.auto; }).length;
  var last = links.map(function (l) { return l.lastSyncAt; }).filter(Boolean).sort().pop();
  var srcLabel = g.source === 'dashboard' ? 'Admin dashboard' : g.source === 'config' ? 'core/config.php' : 'Not configured';
  var rt = g.runtime || {};

  var alerts = '';
  if (!rt.curl || !rt.openssl) alerts += '<div class="ad-alert ad-alert-bad"><i class="bx bx-error-circle"></i><span><b>' + (!rt.curl ? 'PHP cURL' : 'PHP OpenSSL') + ' is not enabled.</b> Google Drive backup needs both extensions — enable them in php.ini and restart Apache.</span></div>';
  if (g.secretError) alerts += '<div class="ad-alert ad-alert-warn"><i class="bx bx-error"></i><span>The saved client secret can\'t be decrypted (the encryption key changed). Enter the secret again and save.</span></div>';
  var here = location.origin + location.pathname.replace(/\/[^\/]*$/, '');
  if (g.baseUrl && g.baseUrl.replace(/\/+$/, '') !== here) alerts += '<div class="ad-alert ad-alert-warn"><i class="bx bx-error"></i><span><b>Site address doesn\'t match this page.</b> You are browsing <code>' + esc(here) + '</code> but the saved address is <code>' + esc(g.baseUrl) + '</code>. Google sends users back to the saved address, so a wrong one causes <i>redirect_uri_mismatch</i>. Click <b>Use this site</b> below and save.</span></div>';
  if (g.source === 'config') alerts += '<div class="ad-alert ad-alert-info"><i class="bx bx-info-circle"></i><span>These values are currently read from <code>core/config.php</code>. Saving here stores them in the dashboard instead (the secret is encrypted) and takes priority over the file.</span></div>';

  var form =
    '<form data-form="google-settings" autocomplete="off">' + alerts +
      '<label class="ad-switch-row"><div><b>Allow users to back up to Google Drive</b><small>When off, users see “turned off by the administrator” under Settings → Google Drive backup. Existing links are kept.</small></div>' +
        '<span class="ad-switch"><input type="checkbox" name="enabled"' + (g.enabled ? ' checked' : '') + '><i></i></span></label>' +
      '<label class="ad-field"><span>Client ID</span><input class="ad-input ad-mono" name="clientId" value="' + esc(g.clientId) + '" placeholder="1234567890-abc123.apps.googleusercontent.com" spellcheck="false" autocomplete="off"></label>' +
      '<label class="ad-field"><span>Client secret</span><div class="ad-input-row"><input class="ad-input ad-mono" type="password" name="clientSecret" id="adGSecret" placeholder="' + (g.secretSet && !g.secretError ? '•••••••••••• saved — leave blank to keep' : 'GOCSPX-…') + '" spellcheck="false" autocomplete="new-password">' +
        '<button type="button" class="ad-icon-btn" data-act="toggle-vis" data-target="adGSecret" title="Show / hide" aria-label="Show or hide secret">' + ico('bx-show') + '</button></div>' +
        '<small>Stored encrypted (AES-256) in <code>data/.security</code>. It is never sent back to the browser.</small></label>' +
      '<label class="ad-field"><span>Site address</span><div class="ad-input-row"><input class="ad-input" name="baseUrl" id="adGBase" value="' + esc(g.baseUrl) + '" placeholder="https://your-domain.com/A-CodePlayground" spellcheck="false">' +
        '<button type="button" class="ad-btn ad-btn-sm" style="height:36px" data-act="use-site-url">Use this site</button></div>' +
        '<small>The address of the folder that contains <code>index.php</code>, without a trailing slash. Google sends users back here.</small></label>' +
      '<div class="ad-form-grid"><label class="ad-field"><span>Backups kept per user</span><input class="ad-input" type="number" min="1" max="50" name="keep" value="' + g.keepBackups + '"><small>Older files are removed from their Drive folder.</small></label>' +
        '<label class="ad-field"><span>Minutes between auto-backups</span><input class="ad-input" type="number" min="1" max="1440" name="mins" value="' + g.autoMinMinutes + '"><small>Automatic backups also skip when nothing changed.</small></label></div>' +
      '<label class="ad-check-line"><input type="checkbox" class="ad-chk" name="signin"' + (g.useForSignin ? ' checked' : '') + '><span>Also use this Google client for “Sign in with Google”<small>Needs the second redirect URI from the guide to be registered.</small></span></label>' +
      '<div class="ad-actions" style="margin-top:18px"><button type="submit" class="ad-btn ad-btn-primary">Save settings</button><button type="submit" class="ad-btn" data-test="1">' + ico('bx-plug') + 'Save &amp; test</button>' +
        (g.source === 'dashboard' ? '<button type="button" class="ad-btn ad-btn-danger" data-act="google-clear" style="margin-left:auto">Remove dashboard settings</button>' : '') + '</div>' +
      (g.updatedAt ? '<p class="ad-muted" style="font-size:12px;margin-top:12px">Last saved ' + esc(fmtDateTime(g.updatedAt)) + (g.updatedBy ? ' by ' + esc(g.updatedBy) : '') + '</p>' : '') +
    '</form>';

  var steps =
    '<ol class="ad-steps">' +
      '<li>Open <a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener">Google Cloud Console</a> and create (or pick) a project.</li>' +
      '<li>Enable the <a href="https://console.cloud.google.com/apis/library/drive.googleapis.com" target="_blank" rel="noopener">Google Drive API</a> for that project.</li>' +
      '<li>Configure the <a href="https://console.cloud.google.com/apis/credentials/consent" target="_blank" rel="noopener">OAuth consent screen</a>: choose <b>External</b>, add the scope <code>drive.file</code>, and while the app is in <i>Testing</i> add each user\'s Google email under <b>Test users</b>.</li>' +
      '<li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener">Credentials</a> → <b>Create credentials → OAuth client ID → Web application</b>.</li>' +
      '<li>Under <b>Authorised redirect URIs</b> add:' + uriRow('Google Drive backup', g.redirectUris.drive) + uriRow('Sign in with Google (optional)', g.redirectUris.signin) + '</li>' +
      '<li>Paste the <b>Client ID</b> and <b>Client secret</b> here, then press <b>Save &amp; test</b>.</li>' +
    '</ol>' +
    '<div class="ad-alert ad-alert-info" style="margin:14px 0 0"><i class="bx bx-lock-alt"></i><span>The app only asks for <b>drive.file</b> access: it can see just the backup files it creates, never the rest of a user\'s Drive.</span></div>';

  var testCard = '';
  if (S.googleTest) {
    var t = S.googleTest;
    testCard = '<div class="ad-card" style="margin-bottom:16px">' + cardHead('Connection test', (t.passed ? 'All required checks passed' : 'Some checks need attention') + ' · ' + esc(agoMs(t.at)),
        '<span class="ad-badge ' + (t.passed ? 'ok' : 'bad') + ' plain">' + (t.passed ? 'Passed' : 'Failed') + '</span>') +
      '<div style="margin-top:10px;border-top:1px solid var(--border)">' + t.checks.map(function (c) {
        return '<div class="ad-check-row"><span class="ad-dot ' + esc(c.status) + '"></span><div><b>' + esc(c.label) + '</b><small>' + esc(c.detail) + '</small></div></div>';
      }).join('') + '</div></div>';
  }

  var rows = links.map(function (l) {
    return '<tr class="row-link" data-act="open-user" data-id="' + esc(l.userId) + '"><td><div class="ad-cell-user">' + avatar(l.userName) + '<div><b>' + esc(l.userName) + '</b><small>' + esc(l.userEmail) + '</small></div></div></td>' +
      '<td>' + (l.googleEmail ? '<span class="ad-mono">' + esc(l.googleEmail) + '</span>' : '<span class="ad-muted">—</span>') + '</td>' +
      '<td>' + (l.auto ? '<span class="ad-badge ok plain">Auto-backup on</span>' : '<span class="ad-badge plain">Manual</span>') + '</td>' +
      '<td class="ad-nowrap">' + (l.lastSyncAt ? esc(ago(l.lastSyncAt)) + '<br><small class="ad-muted" title="' + esc(l.lastFile || '') + '">' + esc(fmtDateTime(l.lastSyncAt)) + '</small>' : '<span class="ad-muted">No backup yet</span>') + '</td>' +
      '<td class="ad-nowrap">' + fmtDate(l.connectedAt) + '</td>' +
      '<td class="col-act" data-act="noop"><button type="button" class="ad-btn ad-btn-sm ad-btn-danger" data-act="google-disconnect" data-id="' + esc(l.userId) + '">Disconnect</button></td></tr>';
  }).join('');
  var accounts = '<div class="ad-card">' + cardHead('Linked Google accounts', links.length ? fmt(links.length) + ' user' + (links.length === 1 ? ' has' : 's have') + ' linked their own Drive' : 'Users link their own Drive from Settings → Google Drive backup',
      links.length > 1 ? '<button type="button" class="ad-btn ad-btn-sm ad-btn-danger" data-act="google-disconnect-all">Disconnect all</button>' : '') +
    '<div style="margin-top:12px">' + (links.length
      ? '<div class="ad-table-wrap"><table class="ad-table" style="min-width:760px"><thead><tr><th>User</th><th>Google account</th><th>Backup mode</th><th>Last backup</th><th>Linked</th><th class="col-act"></th></tr></thead><tbody>' + rows + '</tbody></table></div>'
      : emptyState('bxl-google', 'No linked accounts yet', g.configured ? 'Everything is ready — users can connect from their Settings page.' : 'Finish the connection settings above, then users can connect.')) + '</div></div>';

  return pageHead('Google', 'Google Drive backup and “Sign in with Google”. Each user links their <b>own</b> account — nobody\'s files are shared with anyone else.') +
    '<div class="ad-card" style="margin-bottom:16px"><div class="ad-int-head"><span class="ad-int-logo">' + ico('bxl-google') + '</span><div style="flex:1;min-width:200px"><div class="ad-card-title" style="font-size:16px">Google Drive backup <span class="ad-badge ' + st.cls + ' plain" style="margin-left:6px;vertical-align:2px">' + st.label + '</span></div>' +
      '<div class="ad-card-sub">Lets users save backups of their projects, snippets and notes to their own Google Drive, and restore them later.</div></div></div></div>' +
    '<div class="ad-kpis">' +
      kpi({ label: 'Linked accounts', value: fmt(links.length), icon: 'bx-link', cls: 't-user', sub: 'users with Drive connected' }) +
      kpi({ label: 'Auto-backup on', value: fmt(autoOn), icon: 'bx-refresh', cls: 't-project', sub: 'of ' + fmt(links.length) + ' linked' }) +
      kpi({ label: 'Latest backup', value: last ? esc(ago(last)) : '—', icon: 'bx-cloud-upload', cls: 't-snippet', sub: last ? esc(fmtDateTime(last)) : 'none yet' }) +
      kpi({ label: 'Credentials from', value: '<span style="font-size:18px">' + esc(srcLabel) + '</span>', icon: 'bx-key', cls: 't-note', sub: g.secretSet ? 'secret saved' : 'no secret saved' }) +
    '</div>' +
    '<div class="ad-grid g-even" style="align-items:start"><div><div class="ad-card">' + cardHead('Connection settings', 'Google OAuth client used for Drive backup') + '<div class="ad-card-body">' + form + '</div></div></div>' +
      '<div>' + testCard + '<div class="ad-card">' + cardHead('Setup guide', 'One-time, about five minutes', '<button type="button" class="ad-btn ad-btn-sm" data-act="google-test">' + ico('bx-plug') + 'Test saved settings</button>') + '<div class="ad-card-body">' + steps + '</div></div></div></div>' +
    accounts;
}

/* ---------------------------------------------------------------------
   Integrations → Sign in with GitHub / Facebook
   (settings live in data/.security/oauth-settings.json; see core/oauth-providers.php)
--------------------------------------------------------------------- */
var OAUTH_META = {
  github: {
    name: 'GitHub', icon: 'bxl-github', idLabel: 'Client ID', secretLabel: 'Client secret',
    idHint: 'Ov23li… (20 characters)', secretHint: '40-character secret',
    blurb: 'Adds a working “GitHub” button to the sign-in and sign-up pages. The app only asks GitHub for your name and verified email (scopes read:user and user:email).'
  },
  facebook: {
    name: 'Facebook', icon: 'bxl-facebook-circle', idLabel: 'App ID', secretLabel: 'App secret',
    idHint: '1234567890123456', secretHint: '32-character secret',
    blurb: 'Adds a working “Facebook” button to the sign-in and sign-up pages. The app only asks Facebook for the name and email (permissions public_profile and email).'
  }
};

function oauthOf(key) {
  var all = (S.data && S.data.oauth && !Array.isArray(S.data.oauth)) ? S.data.oauth : {};
  return all[key] || { label: OAUTH_META[key].name, source: 'none', enabled: true, configured: false, clientId: '', secretSet: false,
    secretError: false, baseUrl: '', updatedAt: null, updatedBy: null, redirectUri: '' };
}
function oauthStatus(o) {
  if (o.configured) return { label: 'Active', cls: 'ok' };
  if (o.clientId && o.secretSet && !o.enabled) return { label: 'Turned off', cls: 'warn' };
  if (o.source === 'none') return { label: 'Not set up', cls: 'info' };
  return { label: 'Incomplete', cls: 'warn' };
}

function oauthSteps(key, o) {
  if (key === 'github') {
    return '<ol class="ad-steps">' +
      '<li>Open <a href="https://github.com/settings/developers" target="_blank" rel="noopener">GitHub → Settings → Developer settings → OAuth Apps</a> and press <b>New OAuth App</b>.</li>' +
      '<li>Give it any <b>Application name</b>, set <b>Homepage URL</b> to your site address' + (o.baseUrl ? ' (<code>' + esc(o.baseUrl) + '</code>)' : '') + ', and set <b>Authorization callback URL</b> to:' + uriRow('GitHub callback URL', o.redirectUri) + '</li>' +
      '<li>Press <b>Register application</b>, then <b>Generate a new client secret</b>. Copy it right away — GitHub only shows it once.</li>' +
      '<li>Paste the <b>Client ID</b> and <b>Client secret</b> here, then press <b>Save &amp; test</b>.</li>' +
    '</ol>' +
    '<div class="ad-alert ad-alert-info" style="margin:14px 0 0"><i class="bx bx-info-circle"></i><span>A GitHub OAuth App accepts <b>one</b> callback URL. Use one app for <code>localhost</code> and create a second one for your real domain.</span></div>';
  }
  return '<ol class="ad-steps">' +
    '<li>Open <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener">Meta for Developers → My Apps</a>, press <b>Create app</b> and choose the <b>Facebook Login</b> use case (or add the <b>Facebook Login</b> product to an existing app).</li>' +
    '<li>Open <b>Facebook Login → Settings</b> and add this to <b>Valid OAuth Redirect URIs</b>:' + uriRow('Facebook redirect URI', o.redirectUri) + 'Keep <b>Client OAuth login</b> and <b>Web OAuth login</b> switched on, then save.</li>' +
    '<li>Open <b>App settings → Basic</b>, copy the <b>App ID</b>, and press <b>Show</b> next to <b>App secret</b> to copy it.</li>' +
    '<li>Paste both here, then press <b>Save &amp; test</b>.</li>' +
  '</ol>' +
  '<div class="ad-alert ad-alert-info" style="margin:14px 0 0"><i class="bx bx-info-circle"></i><span>While the Facebook app is in <b>Development</b> mode only people added to its Roles (admins, developers, testers) can sign in. Switch the app to <b>Live</b> to open it to everyone — Meta then requires a privacy-policy URL and an <code>https://</code> redirect URI (plain <code>http://localhost</code> only works in development).</span></div>';
}

function renderOAuthProvider(key) {
  var m = OAUTH_META[key], o = oauthOf(key), st = oauthStatus(o), t = S.oauthTest[key];
  var sid = 'adOSecret_' + key;
  var alerts = '';
  if (!o.baseUrl) alerts += '<div class="ad-alert ad-alert-warn"><i class="bx bx-error"></i><span><b>No site address saved yet.</b> Save one on the <a href="#/integrations">Google page</a> (Connection settings → Site address) — every sign-in provider uses it to build its callback URL.</span></div>';
  else {
    var here = location.origin + location.pathname.replace(/\/[^\/]*$/, '');
    if (o.baseUrl.replace(/\/+$/, '') !== here) alerts += '<div class="ad-alert ad-alert-warn"><i class="bx bx-error"></i><span><b>Site address doesn\'t match this page.</b> You are browsing <code>' + esc(here) + '</code> but the saved address is <code>' + esc(o.baseUrl) + '</code>. ' + esc(m.name) + ' sends people back to the saved address. Fix it on the <a href="#/integrations">Google page</a> (Site address).</span></div>';
  }
  if (o.secretError) alerts += '<div class="ad-alert ad-alert-warn"><i class="bx bx-error"></i><span>The saved secret can\'t be decrypted (the encryption key changed). Enter the secret again and save.</span></div>';
  if (o.source === 'config') alerts += '<div class="ad-alert ad-alert-info"><i class="bx bx-info-circle"></i><span>These values are currently read from <code>core/config.php</code>. Saving here stores them in the dashboard instead (the secret is encrypted) and takes priority over the file.</span></div>';

  var form =
    '<form data-form="oauth-settings" autocomplete="off"><input type="hidden" name="provider" value="' + key + '">' + alerts +
      '<label class="ad-switch-row"><div><b>Allow “Sign in with ' + esc(m.name) + '”</b><small>When off, the ' + esc(m.name) + ' button shows a “currently unavailable — under review” notice. Accounts that already signed in with it are kept.</small></div>' +
        '<span class="ad-switch"><input type="checkbox" name="enabled"' + (o.enabled ? ' checked' : '') + '><i></i></span></label>' +
      '<label class="ad-field"><span>' + m.idLabel + '</span><input class="ad-input ad-mono" name="clientId" value="' + esc(o.clientId) + '" placeholder="' + esc(m.idHint) + '" spellcheck="false" autocomplete="off"></label>' +
      '<label class="ad-field"><span>' + m.secretLabel + '</span><div class="ad-input-row"><input class="ad-input ad-mono" type="password" name="clientSecret" id="' + sid + '" placeholder="' + (o.secretSet && !o.secretError ? '•••••••••••• saved — leave blank to keep' : esc(m.secretHint)) + '" spellcheck="false" autocomplete="new-password">' +
        '<button type="button" class="ad-icon-btn" data-act="toggle-vis" data-target="' + sid + '" title="Show / hide" aria-label="Show or hide secret">' + ico('bx-show') + '</button></div>' +
        '<small>Stored encrypted (AES-256) in <code>data/.security</code>. It is never sent back to the browser.</small></label>' +
      '<div class="ad-field"><span>Callback URL</span>' + uriRow(m.name + ' redirect / callback URL', o.redirectUri) + '<small>Register exactly this address on ' + esc(m.name) + '. It is built from the site address saved on the Google page.</small></div>' +
      '<div class="ad-actions" style="margin-top:18px"><button type="submit" class="ad-btn ad-btn-primary">Save settings</button><button type="submit" class="ad-btn" data-test="1">' + ico('bx-plug') + 'Save &amp; test</button>' +
        (o.source === 'dashboard' ? '<button type="button" class="ad-btn ad-btn-danger" data-act="oauth-clear" data-provider="' + key + '" style="margin-left:auto">Remove dashboard settings</button>' : '') + '</div>' +
      (o.updatedAt ? '<p class="ad-muted" style="font-size:12px;margin-top:12px">Last saved ' + esc(fmtDateTime(o.updatedAt)) + (o.updatedBy ? ' by ' + esc(o.updatedBy) : '') + '</p>' : '') +
    '</form>';

  var testCard = '';
  if (t) {
    testCard = '<div class="ad-card" style="margin-bottom:16px">' + cardHead('Connection test', (t.passed ? 'All required checks passed' : 'Some checks need attention') + ' · ' + esc(agoMs(t.at)),
        '<span class="ad-badge ' + (t.passed ? 'ok' : 'bad') + ' plain">' + (t.passed ? 'Passed' : 'Failed') + '</span>') +
      '<div style="margin-top:10px;border-top:1px solid var(--border)">' + t.checks.map(function (c) {
        return '<div class="ad-check-row"><span class="ad-dot ' + esc(c.status) + '"></span><div><b>' + esc(c.label) + '</b><small>' + esc(c.detail) + '</small></div></div>';
      }).join('') + '</div></div>';
  }

  return '<div class="ad-card" style="margin-bottom:16px"><div class="ad-int-head"><span class="ad-int-logo is-' + key + '">' + ico(m.icon) + '</span><div style="flex:1;min-width:200px"><div class="ad-card-title" style="font-size:16px">Sign in with ' + esc(m.name) + ' <span class="ad-badge ' + st.cls + ' plain" style="margin-left:6px;vertical-align:2px">' + st.label + '</span></div>' +
      '<div class="ad-card-sub">' + m.blurb + '</div></div></div></div>' +
    '<div class="ad-grid g-even" style="align-items:start;margin-bottom:8px"><div><div class="ad-card">' + cardHead('Connection settings', esc(m.name) + ' OAuth app used for sign-in') + '<div class="ad-card-body">' + form + '</div></div></div>' +
      '<div>' + testCard + '<div class="ad-card">' + cardHead('Setup guide', 'One-time, about five minutes', '<button type="button" class="ad-btn ad-btn-sm" data-act="oauth-test" data-provider="' + key + '">' + ico('bx-plug') + 'Test saved settings</button>') + '<div class="ad-card-body">' + oauthSteps(key, o) + '</div></div></div></div>';
}

function renderOAuthPage(key) {
  return pageHead(OAUTH_META[key].name, 'Let people create an account or log in with ' + OAUTH_META[key].name + '. Each provider has its own page in the sidebar.') + renderOAuthProvider(key);
}

function runOAuthTest(key, btn) {
  if (btn) btn.classList.add('is-loading');
  return api('oauth-test', { provider: key }).then(function (res) {
    if (btn) btn.classList.remove('is-loading');
    if (!res.ok) { if (!res.locked && !res.csrf) toast(res.error || 'Test failed.', 'bad'); return; }
    S.oauthTest[key] = { checks: res.checks, passed: res.passed, at: Date.now() };
    if (S.view === key) render();
    toast(res.passed ? OAUTH_META[key].name + ' connection looks good.' : 'The test found problems — see the results.', res.passed ? 'ok' : 'bad');
    load(true);
  });
}

function runGoogleTest(btn) {
  if (btn) btn.classList.add('is-loading');
  return api('google-test').then(function (res) {
    if (btn) btn.classList.remove('is-loading');
    if (!res.ok) { if (!res.locked && !res.csrf) toast(res.error || 'Test failed.', 'bad'); return; }
    S.googleTest = { checks: res.checks, passed: res.passed, at: Date.now() };
    if (S.view === 'integrations') render();
    toast(res.passed ? 'Google connection looks good.' : 'The test found problems — see the results.', res.passed ? 'ok' : 'bad');
    load(true);
  });
}

/* ---------------------------------------------------------------------
   System & data
--------------------------------------------------------------------- */
function renderSystem() {
  var d = S.data, sys = d.system, db = sys.db || {}, disk = sys.disk || {};
  var used = disk.total != null && disk.free != null ? disk.total - disk.free : null, pct = used != null && disk.total ? Math.round(100 * used / disk.total) : null;
  var tables = (db.tables || []).map(function (t) { return { label: t.name + ' · ' + fmt(t.rows) + ' rows', count: t.bytes, raw: t.bytes }; });
  var kv = function (rows) { return '<dl class="ad-kv">' + rows.map(function (r) { return '<dt>' + r[0] + '</dt><dd>' + (r[1] == null || r[1] === '' ? '—' : esc(r[1])) + '</dd>'; }).join('') + '</dl>'; };
  var shortcuts = [['Ctrl K', 'Search &amp; command palette'], ['/', 'Focus the search box'], ['R', 'Refresh data'], ['G then O/U/P/N/S/M/X/I/H/F/Y', 'Go to Overview / Users / Projects / Notes / Snippets / Components / Security / Google / GitHub / Facebook / System'], ['Esc', 'Close drawer, dialog or palette']];
  return pageHead('System &amp; data', 'Server details, database size and downloadable backups.',
      '<button type="button" class="ad-btn ad-btn-primary" data-act="export-backup">' + ico('bx-cloud-download') + 'Download full backup</button>') +
    '<div class="ad-grid g2">' +
      '<div class="ad-card">' + cardHead('Server') + '<div class="ad-card-body">' + kv([
        ['PHP', sys.php], ['Web server', sys.server], ['Operating system', sys.os], ['Timezone', sys.timezone], ['Server time', sys.serverTime],
        ['Memory limit', sys.memoryLimit], ['Upload limit', sys.uploadMax], ['Max execution', sys.maxExecution ? sys.maxExecution + ' s' : '']]) + '</div></div>' +
      '<div class="ad-card">' + cardHead('Database') + '<div class="ad-card-body">' + kv([['Engine version', db.version], ['Schema', db.name], ['Users', fmt(d.counts.users)], ['Projects', fmt(d.counts.projects)], ['Snippets', fmt(d.counts.snippets)], ['Notes', fmt(d.counts.notes)]]) + '</div></div>' +
    '</div>' +
    '<div class="ad-grid g2">' +
      '<div class="ad-card">' + cardHead('Storage', 'Disk holding this install') + '<div class="ad-card-body">' +
        (pct != null ? '<div class="ad-hbar-top"><span>' + bytes(used) + ' used of ' + bytes(disk.total) + '</span><b>' + pct + '%</b></div><div class="ad-hbar-track" style="height:9px"><div class="ad-hbar-fill" style="width:' + pct + '%;background:' + (pct > 90 ? 'var(--danger)' : pct > 75 ? 'var(--warn)' : 'var(--c2)') + '"></div></div><div class="ad-muted" style="font-size:12px;margin:8px 0 18px">' + bytes(disk.free) + ' free</div>' : '<p class="ad-muted">Disk information isn\'t available on this server.</p>') +
        '<div class="ad-section-head"><h4>Table sizes</h4></div>' + hbars(tables, 'var(--c1)', function (it) { return bytes(it.raw); }) + '</div></div>' +
      '<div style="display:grid;gap:16px;align-content:start">' +
        '<div class="ad-card">' + cardHead('Export data', 'Downloads are generated in your browser. Password hashes are never included.') + '<div class="ad-card-body"><div class="ad-quick">' +
          '<button type="button" data-act="export-backup">' + ico('bx-data') + '<span>Full backup<small>Everything as JSON</small></span></button>' +
          '<button type="button" data-act="export-csv" data-kind="users">' + ico('bx-group') + '<span>Users<small>CSV</small></span></button>' +
          '<button type="button" data-act="export-csv" data-kind="projects">' + ico('bx-folder') + '<span>Projects<small>CSV</small></span></button>' +
          '<button type="button" data-act="export-csv" data-kind="notes">' + ico('bx-note') + '<span>Notes<small>CSV</small></span></button>' +
          '<button type="button" data-act="export-csv" data-kind="snippets">' + ico('bx-code-block') + '<span>Snippets<small>CSV</small></span></button>' +
          '<button type="button" data-act="export-audit">' + ico('bx-history') + '<span>Audit log<small>CSV</small></span></button>' +
        '</div></div></div>' +
        '<div class="ad-card">' + cardHead('Keyboard shortcuts') + '<div class="ad-card-body"><dl class="ad-kv">' + shortcuts.map(function (s) { return '<dt><kbd>' + s[0] + '</kbd></dt><dd style="font-weight:500;text-align:right">' + s[1] + '</dd>'; }).join('') + '</dl></div></div>' +
      '</div>' +
    '</div>';
}

/* ---------------------------------------------------------------------
   Drawer (user + content detail)
--------------------------------------------------------------------- */
function isHtmlSnippet(r) { return /html/i.test(r.lang || '') || /^\s*</.test(r.code || ''); }

function userDrawer(u) {
  var cnt = S.userCounts[u.id], total = cnt.projects + cnt.notes + cnt.snippets + cnt.components, me = isMe(u.id);
  var tab = S.drawer.tab || 'projects';
  var levelOpts = [['', 'Not set'], ['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['professional', 'Professional']].map(function (o) {
    return '<option value="' + o[0] + '"' + ((u.expertise_level || '') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
  }).join('');
  var provider = u.oauth_provider ? cap(u.oauth_provider) : 'Email + password';

  var tabs = ['projects', 'notes', 'snippets', 'components'].map(function (k) {
    return '<button type="button" data-act="user-tab" data-k="' + k + '" class="' + (tab === k ? 'active' : '') + '">' + CONTENT[k].label + ' (' + cnt[k] + ')</button>';
  }).join('');
  var items = listOf(tab).filter(function (r) { return r.user_id === u.id; });
  var list = items.length ? items.slice(0, 8).map(function (r) {
    return '<div class="ad-row clickable" style="padding-left:0;padding-right:0" data-act="open-content" data-kind="' + tab + '" data-id="' + esc(r.id) + '" data-uid="' + esc(r.user_id) + '" data-from="' + esc(u.id) + '">' +
      '<span class="ad-type-ico ' + CONTENT[tab].tc + '">' + ico(CONTENT[tab].icon) + '</span><div class="ad-row-main"><b>' + esc(r[CONTENT[tab].titleKey]) + '</b><small>' + esc(CONTENT[tab].excerpt(r)) + '</small></div><div class="ad-row-end">' + esc(ago(r.updated_at)) + '</div></div>';
  }).join('') + (items.length > 8 ? '<div class="ad-muted" style="font-size:12px;padding-top:8px">+ ' + (items.length - 8) + ' more — search by owner in ' + CONTENT[tab].label + '.</div>' : '')
    : '<div class="ad-muted" style="padding:14px 0;font-size:13px">No ' + tab + ' yet.</div>';

  return '<div class="ad-drawer-head">' + avatar(u.name, 'lg') + '<div style="min-width:0"><h3 id="adDrawerTitle">' + esc(u.name) + '</h3><p>' + esc(u.email) + '</p>' +
      '<div class="badges">' + roleBadge(u.role) + levelBadge(u.expertise_level) + '<span class="ad-badge">' + esc(provider) + '</span>' + (me ? '<span class="ad-badge info">You</span>' : '') + '</div></div>' +
      '<button type="button" class="ad-icon-btn" data-act="close-drawer" aria-label="Close">' + ico('bx-x') + '</button></div>' +
    '<div class="ad-drawer-body">' +
      '<div class="ad-section"><div class="ad-stat-row">' +
        '<div class="ad-stat"><b>' + fmt(u.points_total) + '</b><small>XP</small></div><div class="ad-stat"><b>' + fmt(u.points_streak) + '</b><small>Day streak</small></div>' +
        '<div class="ad-stat"><b>' + fmt(total) + '</b><small>Items saved</small></div><div class="ad-stat"><b>' + fmtDate(u.joined_at) + '</b><small>Joined</small></div></div>' +
        '<div class="ad-meta"><span>' + ico('bx-fingerprint') + '<span class="ad-mono">' + esc(u.id) + '</span></span><span>' + ico('bx-time') + 'Joined ' + esc(ago(u.joined_at)) + '</span></div></div>' +

      '<div class="ad-section"><div class="ad-section-head"><h4>Profile</h4></div><form data-form="user-profile"><div class="ad-form-grid">' +
        '<label class="ad-field full"><span>Display name</span><input class="ad-input" name="name" value="' + esc(u.name) + '" required></label>' +
        '<label class="ad-field"><span>Email</span><input class="ad-input" type="email" name="email" value="' + esc(u.email) + '" required></label>' +
        '<label class="ad-field"><span>Experience level</span><select class="ad-select" style="width:100%" name="level">' + levelOpts + '</select></label></div>' +
        '<button type="submit" class="ad-btn ad-btn-primary ad-btn-sm">Save profile</button></form></div>' +

      '<div class="ad-section"><div class="ad-section-head"><h4>Access</h4></div><div class="ad-row" style="padding:0;border:0">' +
        '<div class="ad-row-main"><b>' + (u.role === 'admin' ? 'Administrator' : 'Regular user') + '</b><small>' + (me ? "You can't remove your own admin access." : u.role === 'admin' ? 'Can sign in to this dashboard and manage everything.' : 'Has no access to this dashboard.') + '</small></div>' +
        '<button type="button" class="ad-btn ad-btn-sm" data-act="toggle-role" data-id="' + esc(u.id) + '" data-role="' + (u.role === 'admin' ? 'user' : 'admin') + '"' + (me ? ' disabled' : '') + '>' + (u.role === 'admin' ? 'Remove admin' : 'Make admin') + '</button></div></div>' +

      '<div class="ad-section"><div class="ad-section-head"><h4>XP &amp; streak</h4></div><form data-form="user-points"><div class="ad-form-grid">' +
        '<label class="ad-field"><span>Total XP</span><input class="ad-input" type="number" min="0" name="total" value="' + u.points_total + '"></label>' +
        '<label class="ad-field"><span>Streak (days)</span><input class="ad-input" type="number" min="0" name="streak" value="' + u.points_streak + '"></label>' +
        '<label class="ad-field full"><span>Last daily claim</span><input class="ad-input" type="date" name="last" value="' + esc(u.last_claim_date || '') + '"><small>Overrides the account\'s XP directly — it does not count as today\'s daily claim.</small></label></div>' +
        '<button type="submit" class="ad-btn ad-btn-sm">Save XP</button></form></div>' +

      '<div class="ad-section"><div class="ad-section-head"><h4>Password</h4></div><form data-form="user-password">' +
        '<label class="ad-field"><span>New password</span><div class="ad-input-row"><input class="ad-input" type="text" name="password" id="adNewPass" minlength="8" placeholder="At least 8 characters" autocomplete="new-password">' +
        '<button type="button" class="ad-btn" data-act="gen-pass" data-target="adNewPass">' + ico('bx-dice-5') + 'Generate</button><button type="button" class="ad-icon-btn" data-act="copy-field" data-target="adNewPass" title="Copy" aria-label="Copy password">' + ico('bx-copy') + '</button></div>' +
        '<small>' + (u.has_password === 0 || u.has_password === '0' ? 'This account signs in with ' + esc(provider) + '. Setting a password also lets them use email login.' : 'The user will need this new password next time they sign in. Share it securely.') + '</small></label>' +
        '<button type="submit" class="ad-btn ad-btn-sm">Reset password</button></form></div>' +

      '<div class="ad-section"><div class="ad-section-head"><h4>Content</h4></div><div class="ad-tabs">' + tabs + '</div>' + list + '</div>' +

      '<div class="ad-section"><div class="ad-danger-zone"><b style="font-size:13px">Delete account</b><p>Permanently removes this account and all ' + fmt(total) + ' item' + (total === 1 ? '' : 's') + ' it owns. This can\'t be undone.</p>' +
        '<button type="button" class="ad-btn ad-btn-danger" data-act="delete-user" data-id="' + esc(u.id) + '"' + (me ? ' disabled' : '') + '>' + ico('bx-trash') + 'Delete account</button></div></div>' +
    '</div>';
}

function contentDrawer(r) {
  var kind = S.drawer.kind, c = CONTENT[kind], tab = S.drawer.tab || 'view', title = r[c.titleKey];
  var isCode = kind === 'snippets' || kind === 'components';
  var html = isCode && isHtmlSnippet(r);
  var back = S.drawer.from && findUser(S.drawer.from);

  var tabs = '<div class="ad-tabs"><button type="button" data-act="content-tab" data-k="view" class="' + (tab === 'view' ? 'active' : '') + '">' + (isCode ? 'Code' : kind === 'projects' ? 'Details' : 'Note') + '</button>' +
    (isCode && html ? '<button type="button" data-act="content-tab" data-k="preview" class="' + (tab === 'preview' ? 'active' : '') + '">Live preview</button>' : '') +
    '<button type="button" data-act="content-tab" data-k="edit" class="' + (tab === 'edit' ? 'active' : '') + '">Edit</button></div>';

  var body = '';
  if (tab === 'edit') {
    var fields = kind === 'projects'
      ? '<label class="ad-field"><span>Name</span><input class="ad-input" name="name" value="' + esc(r.name) + '" required></label>' +
        '<label class="ad-field"><span>Technology</span><input class="ad-input" name="tech" value="' + esc(r.tech || '') + '"></label>' +
        '<label class="ad-field"><span>Description</span><textarea class="ad-textarea" name="description" rows="5">' + esc(r.description || '') + '</textarea></label>'
      : kind === 'notes'
      ? '<label class="ad-field"><span>Title</span><input class="ad-input" name="title" value="' + esc(r.title) + '" required></label>' +
        '<label class="ad-field"><span>Body</span><textarea class="ad-textarea" name="body" rows="10">' + esc(r.body || '') + '</textarea></label>'
      : '<label class="ad-field"><span>Title</span><input class="ad-input" name="title" value="' + esc(r.title) + '" required></label>' +
        '<label class="ad-field"><span>Language</span><input class="ad-input" name="lang" value="' + esc(r.lang || '') + '"></label>' +
        '<label class="ad-field"><span>Code</span><textarea class="ad-textarea code" name="code" spellcheck="false" wrap="off">' + esc(r.code || '') + '</textarea></label>';
    body = '<form data-form="content-edit">' + fields + '<div class="ad-actions"><button type="submit" class="ad-btn ad-btn-primary">Save changes</button><button type="button" class="ad-btn" data-act="content-tab" data-k="view">Cancel</button></div></form>';
  } else if (tab === 'preview') {
    body = '<div class="ad-alert ad-alert-info"><i class="bx bx-info-circle"></i><span>Runs in a sandboxed frame with no access to this dashboard.</span></div><iframe class="ad-preview" sandbox="allow-scripts" title="Snippet preview" srcdoc="' + esc(r.code || '') + '"></iframe>';
  } else if (isCode) {
    body = '<div class="ad-section-head"><h4>' + fmt((r.code || '').split('\n').length) + ' lines · ' + fmt((r.code || '').length) + ' chars</h4><button type="button" class="ad-btn ad-btn-sm" data-act="copy-code">' + ico('bx-copy') + 'Copy</button></div><pre class="ad-code">' + esc(r.code || '(empty)') + '</pre>';
  } else if (kind === 'notes') {
    body = '<div class="ad-note-body">' + (r.body ? esc(r.body) : '<span class="ad-muted">This note is empty.</span>') + '</div>';
  } else {
    body = '<div class="ad-section-head"><h4>Description</h4></div><div class="ad-note-body">' + (r.description ? esc(r.description) : '<span class="ad-muted">No description.</span>') + '</div>';
  }

  return '<div class="ad-drawer-head"><span class="ad-type-ico ' + c.tc + '" style="width:44px;height:44px;font-size:22px">' + ico(c.icon) + '</span><div style="min-width:0"><h3 id="adDrawerTitle">' + esc(title) + '</h3>' +
      '<p>' + cap(c.singular) + ' by <a href="#" data-act="open-user" data-id="' + esc(r.user_id) + '" style="font-weight:700">' + esc(r.owner_name) + '</a></p>' +
      '<div class="badges">' + (c.filterKey && r[c.filterKey] ? '<span class="ad-badge">' + esc(r[c.filterKey]) + '</span>' : '') + '</div></div>' +
      '<button type="button" class="ad-icon-btn" data-act="close-drawer" aria-label="Close">' + ico('bx-x') + '</button></div>' +
    '<div class="ad-drawer-body"><div class="ad-meta" style="margin:14px 0 4px"><span>' + ico('bx-calendar-plus') + 'Created ' + esc(fmtDateTime(r.created_at)) + '</span><span>' + ico('bx-refresh') + 'Updated ' + esc(ago(r.updated_at)) + '</span><span>' + ico('bx-hash') + '<span class="ad-mono">' + esc(trunc(r.id, 28)) + '</span></span></div>' +
      '<div style="margin-top:8px">' + tabs + body + '</div></div>' +
    '<div class="ad-drawer-foot"><button type="button" class="ad-btn ad-btn-danger" data-act="delete-content" data-kind="' + kind + '" data-id="' + esc(r.id) + '" data-uid="' + esc(r.user_id) + '">' + ico('bx-trash') + 'Delete</button>' +
      (back ? '<button type="button" class="ad-btn" data-act="open-user" data-id="' + esc(back.id) + '">' + ico('bx-left-arrow-alt') + 'Back to ' + esc(back.name) + '</button>' : '<button type="button" class="ad-btn" data-act="open-user" data-id="' + esc(r.user_id) + '">Owner profile</button>') + '</div>';
}

function refreshDrawer() {
  var wrap = $('#adDrawerWrap'), dr = $('#adDrawer'), d = S.drawer;
  if (!d) { wrap.hidden = true; return; }
  var html;
  if (d.type === 'user') {
    var u = findUser(d.id); if (!u) { closeDrawer(); return; }
    html = userDrawer(u); dr.classList.remove('wide');
  } else {
    var r = findContent(d.kind, d.id, d.uid); if (!r) { closeDrawer(); return; }
    html = contentDrawer(r); dr.classList.toggle('wide', d.kind === 'snippets');
  }
  var body = $('.ad-drawer-body', dr), top = body && d.sig === d.type + d.id + (d.tab || '') ? body.scrollTop : 0;
  dr.innerHTML = html; d.sig = d.type + d.id + (d.tab || '');
  wrap.hidden = false;
  var nb = $('.ad-drawer-body', dr); if (nb) nb.scrollTop = top;
}
function openDrawer(d) {
  var same = S.drawer && S.drawer.type === d.type && String(S.drawer.id) === String(d.id);
  if (!same) d.sig = null;
  S.drawer = d; refreshDrawer();
  if (!same) { var cb = $('#adDrawer [data-act="close-drawer"]'); if (cb) cb.focus({ preventScroll: true }); }
}
function closeDrawer() { S.drawer = null; $('#adDrawerWrap').hidden = true; $('#adDrawer').innerHTML = ''; }

/* ---------------------------------------------------------------------
   Exports
--------------------------------------------------------------------- */
var CSV_COLS = {
  users: [
    { label: 'ID', key: 'id' }, { label: 'Name', key: 'name' }, { label: 'Email', key: 'email' }, { label: 'Role', key: 'role' },
    { label: 'Level', get: function (r) { return r.expertise_level || ''; } }, { label: 'Sign-in method', get: function (r) { return r.oauth_provider || 'email + password'; } },
    { label: 'XP', key: 'points_total' }, { label: 'Streak', key: 'points_streak' }, { label: 'Last claim', get: function (r) { return r.last_claim_date || ''; } },
    { label: 'Projects', get: function (r) { return S.userCounts[r.id].projects; } }, { label: 'Notes', get: function (r) { return S.userCounts[r.id].notes; } },
    { label: 'Snippets', get: function (r) { return S.userCounts[r.id].snippets; } }, { label: 'Components', get: function (r) { return S.userCounts[r.id].components; } },
    { label: 'Joined', key: 'joined_at' }
  ],
  projects: [{ label: 'ID', key: 'id' }, { label: 'Owner ID', key: 'user_id' }, { label: 'Owner', key: 'owner_name' }, { label: 'Owner email', key: 'owner_email' }, { label: 'Name', key: 'name' }, { label: 'Technology', key: 'tech' }, { label: 'Description', key: 'description' }, { label: 'Created', key: 'created_at' }, { label: 'Updated', key: 'updated_at' }],
  notes: [{ label: 'ID', key: 'id' }, { label: 'Owner ID', key: 'user_id' }, { label: 'Owner', key: 'owner_name' }, { label: 'Owner email', key: 'owner_email' }, { label: 'Title', key: 'title' }, { label: 'Body', key: 'body' }, { label: 'Created', key: 'created_at' }, { label: 'Updated', key: 'updated_at' }],
  snippets: [{ label: 'ID', key: 'id' }, { label: 'Owner ID', key: 'user_id' }, { label: 'Owner', key: 'owner_name' }, { label: 'Owner email', key: 'owner_email' }, { label: 'Title', key: 'title' }, { label: 'Language', key: 'lang' }, { label: 'Code', key: 'code' }, { label: 'Created', key: 'created_at' }, { label: 'Updated', key: 'updated_at' }],
  components: [{ label: 'ID', key: 'id' }, { label: 'Owner ID', key: 'user_id' }, { label: 'Owner', key: 'owner_name' }, { label: 'Owner email', key: 'owner_email' }, { label: 'Title', key: 'title' }, { label: 'Code', key: 'code' }, { label: 'Created', key: 'created_at' }, { label: 'Updated', key: 'updated_at' }]
};
function selectedRows(kind) {
  var keys = Object.keys(S.sel[kind]);
  return keys.length ? listOf(kind).filter(function (r) { return S.sel[kind][itemKey(kind, r)]; }) : null;
}
function exportCSV(kind) {
  var rows = selectedRows(kind);
  if (!rows) rows = S.view === kind ? (kind === 'users' ? filteredUsers() : filteredContent(kind)) : listOf(kind);
  download('acode-' + kind + '-' + stamp() + '.csv', 'text/csv', toCSV(rows, CSV_COLS[kind]));
  toast('Exported ' + plural(rows.length, kind.replace(/s$/, '')) + ' to CSV.', 'ok');
}
function exportAudit() {
  var rows = filteredAudit();
  download('acode-audit-' + stamp() + '.csv', 'text/csv', toCSV(rows, [
    { label: 'Time', get: function (e) { return new Date(e.t * 1000).toISOString(); } }, { label: 'Event', key: 'event' },
    { label: 'Succeeded', get: function (e) { return e.ok ? 'yes' : 'no'; } }, { label: 'Actor', key: 'actor' }, { label: 'IP', key: 'ip' }, { label: 'Detail', key: 'detail' }]));
  toast('Exported ' + plural(rows.length, 'audit event') + '.', 'ok');
}
function exportBackup() {
  var d = S.data, out = {
    app: 'A-Code Playground', exportedAt: new Date().toISOString(), exportedBy: BOOT.admin.email, counts: d.counts,
    users: d.users.map(function (u) { var c = {}; for (var k in u) if (k !== 'has_password') c[k] = u[k]; return c; }),
    projects: d.content.projects, notes: d.content.notes, snippets: listOf('snippets'), components: listOf('components')
  };
  download('acode-backup-' + stamp() + '.json', 'application/json', JSON.stringify(out, null, 2));
  toast('Backup downloaded (password hashes are never included).', 'ok');
}
function copyText(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
  return new Promise(function (res, rej) {
    var t = document.createElement('textarea'); t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
    document.body.appendChild(t); t.select();
    try { document.execCommand('copy') ? res() : rej(); } catch (e) { rej(e); } t.remove();
  });
}

/* ---------------------------------------------------------------------
   Bulk actions bar
--------------------------------------------------------------------- */
function updateBulk() {
  var el = $('#adBulk');
  if (!el) { el = document.createElement('div'); el.id = 'adBulk'; el.className = 'ad-bulk'; document.body.appendChild(el); }
  var kind = S.view, sel = S.sel[kind], n = sel ? Object.keys(sel).length : 0;
  if (!n) { el.classList.remove('show'); return; }
  var admin = kind === 'users'
    ? '<button type="button" class="ad-btn" data-act="bulk-role" data-role="admin">Make admin</button><button type="button" class="ad-btn" data-act="bulk-role" data-role="user">Remove admin</button>' : '';
  el.innerHTML = '<b>' + fmt(n) + ' selected</b>' + admin +
    '<button type="button" class="ad-btn" data-act="export-csv" data-kind="' + kind + '">' + ico('bx-export') + 'Export</button>' +
    '<button type="button" class="ad-btn danger" data-act="bulk-delete">' + ico('bx-trash') + 'Delete</button>' +
    '<button type="button" class="ad-icon-btn sm" data-act="bulk-clear" style="color:inherit" aria-label="Clear selection">' + ico('bx-x') + '</button>';
  el.classList.add('show');
}
function splitKey(key) { var i = key.indexOf('|'); return { uid: key.slice(0, i), id: key.slice(i + 1) }; }

/* ---------------------------------------------------------------------
   Command palette
--------------------------------------------------------------------- */
var pal = { items: [], idx: 0 };
function palItems(q) {
  q = lower(q.trim());
  var out = [], match = function (s) { return !q || lower(s).indexOf(q) > -1; };
  Object.keys(VIEWS).forEach(function (k) {
    if (match(VIEWS[k].title + ' go to page')) out.push({ group: 'Pages', icon: VIEWS[k].icon, cls: '', title: VIEWS[k].title, sub: 'Go to page', run: function () { location.hash = '#/' + k; } });
  });
  [
    { t: 'Add user', s: 'Create a new account', i: 'bx-user-plus', run: function () { newUserModal(); } },
    { t: 'Refresh data', s: 'Reload everything from the server', i: 'bx-refresh', run: function () { refresh(); } },
    { t: 'Toggle dark mode', s: 'Switch theme', i: 'bx-moon', run: toggleTheme },
    { t: 'Download full backup', s: 'JSON export', i: 'bx-cloud-download', run: exportBackup },
    { t: 'Lock dashboard', s: 'Sign out of Admin Control', i: 'bx-lock-alt', run: lockNow }
  ].forEach(function (a) { if (match(a.t + ' ' + a.s)) out.push({ group: 'Actions', icon: a.i, cls: '', title: a.t, sub: a.s, run: a.run }); });
  if (q && S.data) {
    S.data.users.filter(function (u) { return match(u.name + ' ' + u.email); }).slice(0, 5).forEach(function (u) {
      out.push({ group: 'Users', icon: 'bx-user', cls: 't-user', title: u.name, sub: u.email + ' · ' + u.role, run: function () { openDrawer({ type: 'user', id: u.id }); } });
    });
    ['projects', 'notes', 'snippets', 'components'].forEach(function (k) {
      var c = CONTENT[k];
      listOf(k).filter(function (r) { return c.search.some(function (f) { return lower(r[f]).indexOf(q) > -1; }); }).slice(0, 4).forEach(function (r) {
        out.push({ group: c.label, icon: c.icon, cls: c.tc, title: r[c.titleKey], sub: 'by ' + r.owner_name, run: function () { openDrawer({ type: 'content', kind: k, id: r.id, uid: r.user_id }); } });
      });
    });
  }
  return out;
}
function palRender() {
  var q = $('#adPalInput').value; pal.items = palItems(q); pal.idx = clamp(pal.idx, 0, Math.max(0, pal.items.length - 1));
  var html = '', last = '';
  pal.items.forEach(function (it, i) {
    if (it.group !== last) { html += '<div class="ad-pal-group">' + esc(it.group.toUpperCase()) + '</div>'; last = it.group; }
    html += '<button type="button" class="ad-pal-item' + (i === pal.idx ? ' active' : '') + '" data-pal="' + i + '"><span class="ad-type-ico ' + it.cls + '">' + ico(it.icon) + '</span><span><b>' + esc(it.title) + '</b><small>' + esc(it.sub) + '</small></span></button>';
  });
  $('#adPalList').innerHTML = html || '<div class="ad-empty"><b>No results</b><span>Try a name, email, project title or snippet.</span></div>';
  var a = $('.ad-pal-item.active'); if (a) a.scrollIntoView({ block: 'nearest' });
}
function openPalette() {
  if (S.locked) return;
  var w = $('#adPaletteWrap'); pal.idx = 0;
  w.innerHTML = '<div class="ad-palette" role="dialog" aria-modal="true" aria-label="Command palette"><div class="ad-pal-input">' + ico('bx-search') + '<input id="adPalInput" placeholder="Search users, projects, notes, snippets — or jump to a page…" autocomplete="off" spellcheck="false"><kbd>Esc</kbd></div>' +
    '<div class="ad-pal-list" id="adPalList"></div><div class="ad-pal-foot"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>Enter</kbd> open</span></div></div>';
  w.hidden = false; palRender(); $('#adPalInput').focus();
}
function closePalette() { var w = $('#adPaletteWrap'); w.hidden = true; w.innerHTML = ''; }
function palRun(i) { var it = pal.items[i]; if (!it) return; closePalette(); it.run(); }

/* ---------------------------------------------------------------------
   Actions
--------------------------------------------------------------------- */
function newUserModal() {
  openModal({
    title: 'Add a user', message: 'Creates an account they can sign in to right away.', icon: 'bx-user-plus', iconClass: 'info', confirmText: 'Create account',
    body: '<div class="ad-form-grid"><label class="ad-field full"><span>Display name</span><input class="ad-input" name="name" required></label>' +
      '<label class="ad-field full"><span>Email</span><input class="ad-input" type="email" name="email" required></label>' +
      '<label class="ad-field full"><span>Password</span><div class="ad-input-row"><input class="ad-input" name="password" id="adNuPass" placeholder="At least 8 characters" autocomplete="new-password" required><button type="button" class="ad-btn" data-act="gen-pass" data-target="adNuPass">' + ico('bx-dice-5') + 'Generate</button></div></label>' +
      '<label class="ad-field"><span>Role</span><select class="ad-select" style="width:100%" name="role"><option value="user">User</option><option value="admin">Admin</option></select></label>' +
      '<label class="ad-field"><span>Level</span><select class="ad-select" style="width:100%" name="level"><option value="">Not set</option><option value="beginner">Beginner</option><option value="intermediate">Intermediate</option><option value="professional">Professional</option></select></label></div>',
    validate: function (f) {
      if (!f.name.value.trim()) return 'Enter a name.';
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.value.trim())) return 'Enter a valid email address.';
      if (f.password.value.length < 8) return 'Password must be at least 8 characters.';
      return '';
    }
  }).then(function (f) {
    if (!f) return;
    var pass = f.password.value;
    return mutate('create-user', { name: f.name.value.trim(), email: f.email.value.trim(), password: pass, role: f.role.value, expertiseLevel: f.level.value }, function (r) { return 'Account created.'; }).then(function (res) {
      if (res && res.ok) { location.hash = '#/users'; openDrawer({ type: 'user', id: res.id }); }
    });
  });
}

function deleteUsers(ids) {
  var users = ids.map(findUser).filter(Boolean), items = 0;
  users.forEach(function (u) { var c = S.userCounts[u.id]; items += c.projects + c.notes + c.snippets; });
  var one = users.length === 1;
  return confirmBox({
    title: one ? 'Delete ' + users[0].name + '?' : 'Delete ' + users.length + ' accounts?', danger: true, confirmText: 'Delete permanently', type: 'DELETE',
    message: (one ? 'This permanently removes <b>' + esc(users[0].email) + '</b>' : 'This permanently removes these accounts') + ' along with <b>' + fmt(items) + '</b> project, note and snippet' + (items === 1 ? '' : 's') + ' they own. This can\'t be undone.'
  }).then(function (ok) {
    if (!ok) return;
    return mutate(ids.length === 1 ? 'delete-user' : 'bulk-delete', ids.length === 1 ? { userId: ids[0] } : { type: 'user', items: ids }, function (r) { return one ? 'Account deleted.' : plural(r.deleted || 0, 'account') + ' deleted.'; }).then(function (res) {
      if (res && res.ok) { ids.forEach(function (id) { delete S.sel.users[id]; }); if (S.drawer && S.drawer.type === 'user' && ids.indexOf(S.drawer.id) > -1) closeDrawer(); updateBulk(); }
    });
  });
}
function deleteContent(kind, pairs) {
  var c = CONTENT[kind], srvType = c.serverType || c.singular, one = pairs.length === 1, r = one ? findContent(kind, pairs[0].id, pairs[0].uid) : null;
  return confirmBox({
    title: one ? 'Delete this ' + c.singular + '?' : 'Delete ' + pairs.length + ' ' + c.label.toLowerCase() + '?', danger: true, confirmText: 'Delete',
    message: one && r ? '“' + esc(trunc(r[c.titleKey], 60)) + '” by ' + esc(r.owner_name) + ' will be permanently removed.' : 'They will be permanently removed from their owners\' workspaces.', type: pairs.length > 5 ? 'DELETE' : ''
  }).then(function (ok) {
    if (!ok) return;
    var call = one ? mutate('delete-content', { type: srvType, id: pairs[0].id, userId: pairs[0].uid, title: r ? r[c.titleKey] : '' }, c.singular === 'note' ? 'Note deleted.' : cap(c.singular) + ' deleted.')
      : mutate('bulk-delete', { type: srvType, items: pairs.map(function (p) { return { id: p.id, userId: p.uid }; }) }, function (res) { return plural(res.deleted || 0, c.singular) + ' deleted.'; });
    return call.then(function (res) {
      if (res && res.ok) {
        pairs.forEach(function (p) { delete S.sel[kind][p.uid + '|' + p.id]; });
        if (S.drawer && S.drawer.type === 'content' && S.drawer.kind === kind && pairs.some(function (p) { return String(p.id) === String(S.drawer.id) && p.uid === S.drawer.uid; })) closeDrawer();
        updateBulk();
      }
    });
  });
}

function refresh() {
  return load(false).then(function (ok) { if (ok) { render(); refreshDrawer(); toast('Data refreshed.', 'ok'); } });
}
function lockNow() { S.locked = true; api('lock').then(function () { location.replace('admin-dashboard.php'); }); }
function toggleTheme() {
  var dark = document.documentElement.getAttribute('data-theme') !== 'dark';
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light'); LS.set('theme', dark ? 'dark' : 'light'); themeIcon();
}
function themeIcon() { var d = document.documentElement.getAttribute('data-theme') === 'dark'; $('#adTheme').innerHTML = ico(d ? 'bx-sun' : 'bx-moon'); }
function spinRefresh(on) { var b = $('#adRefresh'); if (b) b.classList.toggle('spin', !!on); }
function setLive(on) {
  S.live = on; LS.set('adminLive', on ? '1' : '0');
  var b = $('#adLive'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = on ? 'Auto-refresh is ON (every 30s) — click to stop' : 'Auto-refresh every 30 seconds';
  stopLive();
  if (on) S.liveTimer = setInterval(function () {
    if (document.hidden || S.locked || S.drawer || !$('#adModalWrap').hidden || !$('#adPaletteWrap').hidden) return;
    load(true).then(function (ok) { if (ok) softRender(); });
  }, 30000);
}
function stopLive() { if (S.liveTimer) { clearInterval(S.liveTimer); S.liveTimer = null; } }
function softRender() {
  var a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && $('#adView').contains(a)) { updateNavCounts(); return; }
  render();
}
function updateNavCounts() {
  if (!S.data) return;
  var c = S.data.counts;
  $$('[data-count]').forEach(function (el) {
    var k = el.getAttribute('data-count');
    if (k === 'security') { var n = S.data.lockouts.length; el.hidden = !n; el.textContent = n; }
    else if (k === 'integrations') { var gl = (S.data.google && S.data.google.links || []).length; el.hidden = !gl; el.textContent = gl; }
    // The `snippets` table holds both plain snippets and saved components
    // (see the CONTENT comment above listOf()) — split the one server
    // count between the two sidebar badges instead of double-counting.
    else if (k === 'snippets') el.textContent = fmt(listOf('snippets').length);
    else if (k === 'components') el.textContent = fmt(listOf('components').length);
    else el.textContent = fmt(c[k]);
  });
}
function afterTable() {
  $$('[data-indet]').forEach(function (el) { el.indeterminate = true; });
  updateBulk();
}
function updateTable() {
  var box = $('#adTable'); if (!box) return;
  box.innerHTML = S.view === 'users' ? usersTable() : contentTable(S.view); afterTable();
}

var ACT = {
  noop: function () {},
  reload: function () { location.reload(); },
  lock: function () { lockNow(); },
  refresh: function () { refresh(); },
  palette: function () { openPalette(); },
  'new-user': function () { newUserModal(); },
  'modal-cancel': function () { closeModal(null); },
  'close-drawer': function () { closeDrawer(); },
  goto: function (el) { location.hash = '#/' + el.dataset.view; },
  range: function (el) { S.range = +el.dataset.n; render(); },
  'open-user': function (el, e) { if (e) e.preventDefault(); openDrawer({ type: 'user', id: el.dataset.id, tab: S.drawer && S.drawer.type === 'user' && S.drawer.id === el.dataset.id ? S.drawer.tab : 'projects' }); },
  'open-content': function (el) { openDrawer({ type: 'content', kind: el.dataset.kind, id: el.dataset.id, uid: el.dataset.uid, tab: 'view', from: el.dataset.from || null }); },
  'user-tab': function (el) { S.drawer.tab = el.dataset.k; refreshDrawer(); },
  'content-tab': function (el) { S.drawer.tab = el.dataset.k; refreshDrawer(); },
  sort: function (el) {
    var st = S.t[el.dataset.kind], k = el.dataset.key;
    if (st.sort === k) st.dir = st.dir === 'asc' ? 'desc' : 'asc'; else { st.sort = k; st.dir = /^(updated|created|joined|xp|size|content)$/.test(k) ? 'desc' : 'asc'; }
    st.page = 1; updateTable();
  },
  page: function (el) { S.t[el.dataset.kind].page += +el.dataset.d; updateTable(); },
  sel: function (el) {
    var kind = el.dataset.kind, key = el.dataset.key;
    if (el.checked) S.sel[kind][key] = 1; else delete S.sel[kind][key];
    var tr = el.closest('tr'); if (tr) tr.classList.toggle('selected', el.checked);
    var boxes = $$('#adTable input[data-act="sel"]'), n = boxes.filter(function (b) { return b.checked; }).length, all = $('#adTable input[data-act="sel-all"]');
    if (all) { all.checked = n === boxes.length; all.indeterminate = n > 0 && n < boxes.length; }
    updateBulk();
  },
  'sel-all': function (el) {
    $$('#adTable input[data-act="sel"]').forEach(function (b) { if (el.checked) S.sel[el.dataset.kind][b.dataset.key] = 1; else delete S.sel[el.dataset.kind][b.dataset.key]; });
    updateTable();
  },
  'bulk-clear': function () { S.sel[S.view] = {}; updateTable(); },
  'bulk-delete': function () {
    var kind = S.view, keys = Object.keys(S.sel[kind]);
    if (kind === 'users') { var mine = keys.filter(function (k) { return !isMe(k); }); if (mine.length !== keys.length) toast("Your own account was skipped — you can't delete yourself.", 'info'); if (mine.length) deleteUsers(mine); }
    else deleteContent(kind, keys.map(splitKey));
  },
  'bulk-role': function (el) {
    var ids = Object.keys(S.sel.users), role = el.dataset.role;
    confirmBox({ title: (role === 'admin' ? 'Grant admin access to ' : 'Remove admin access from ') + plural(ids.length, 'account') + '?', icon: 'bx-shield-alt-2', confirmText: 'Apply', message: role === 'admin' ? 'These accounts will be able to sign in to this dashboard and manage everything.' : 'These accounts will lose access to this dashboard. Your own account is never changed.' })
      .then(function (ok) { if (ok) mutate('bulk-set-role', { userIds: ids, role: role }, function (r) { return plural(r.changed || 0, 'account') + ' updated.'; }); });
  },
  'toggle-role': function (el) {
    var u = findUser(el.dataset.id), role = el.dataset.role;
    confirmBox({ title: (role === 'admin' ? 'Make ' + u.name + ' an admin?' : 'Remove admin access from ' + u.name + '?'), icon: 'bx-shield-alt-2', confirmText: role === 'admin' ? 'Make admin' : 'Remove admin',
      message: role === 'admin' ? 'They will be able to sign in here and manage all accounts and content.' : 'They will no longer be able to sign in to this dashboard.' })
      .then(function (ok) { if (ok) mutate('set-role', { userId: u.id, role: role }, 'Role updated.'); });
  },
  'delete-user': function (el) { deleteUsers([el.dataset.id]); },
  'delete-content': function (el) { deleteContent(el.dataset.kind, [{ id: el.dataset.id, uid: el.dataset.uid }]); },
  'clear-filters': function (el) { var st = S.t[el.dataset.kind]; st.q = ''; st.owner = 'all'; st.filter = 'all'; st.role = 'all'; st.level = 'all'; st.page = 1; render(); },
  'export-csv': function (el) { exportCSV(el.dataset.kind); },
  'export-audit': exportAudit,
  'export-backup': exportBackup,
  'audit-kind': function (el) { S.audit.kind = el.dataset.k; S.audit.page = 1; render(); },
  'audit-page': function (el) { S.audit.page += (+el.dataset.d || 0); $('#adAudit').innerHTML = auditList(); },
  'clear-lockout': function (el) { mutate('clear-lockout', { key: el.dataset.key }, 'Lockout cleared.'); },
  'clear-all-lockouts': function () {
    confirmBox({ title: 'Unlock all accounts?', icon: 'bx-lock-open-alt', iconClass: 'info', confirmText: 'Unlock all', message: 'Every currently locked-out login will be able to try again immediately.' })
      .then(function (ok) { if (ok) mutate('clear-all-lockouts', {}, function (r) { return plural(r.cleared || 0, 'lockout') + ' cleared.'; }); });
  },
  'gen-pass': function (el) { var t = document.getElementById(el.dataset.target); if (t) { t.value = genPassword(); t.type = 'text'; t.focus(); t.select(); } },
  'copy-field': function (el) { var t = document.getElementById(el.dataset.target); if (t && t.value) copyText(t.value).then(function () { toast('Copied to clipboard.', 'ok'); }, function () { toast('Copy failed — select the text and copy manually.', 'bad'); }); },
  'copy-code': function () { var r = S.drawer && findContent(S.drawer.kind, S.drawer.id, S.drawer.uid); if (r) copyText(r.code || '').then(function () { toast('Code copied.', 'ok'); }, function () { toast('Copy failed.', 'bad'); }); },
  'google-test': function (el) { runGoogleTest(el); },
  'oauth-test': function (el) { runOAuthTest(el.dataset.provider, el); },
  'oauth-clear': function (el) {
    var key = el.dataset.provider, nm = OAUTH_META[key].name;
    confirmBox({ title: 'Remove ' + nm + ' dashboard settings?', icon: OAUTH_META[key].icon, iconClass: 'info', confirmText: 'Remove', danger: true,
      message: 'The saved ' + OAUTH_META[key].idLabel + ' and secret are deleted from the dashboard. The app falls back to <code>core/config.php</code> (or to “not set up” if that is empty). People who already signed in with ' + nm + ' keep their accounts.' })
      .then(function (ok) { if (ok) { delete S.oauthTest[key]; mutate('oauth-clear', { provider: key }, nm + ' dashboard settings removed.'); } });
  },
  'toggle-vis': function (el) { var t = document.getElementById(el.dataset.target); if (!t) return; var show = t.type === 'password'; t.type = show ? 'text' : 'password'; el.innerHTML = ico(show ? 'bx-hide' : 'bx-show'); },
  'copy-text': function (el) { copyText(el.dataset.text).then(function () { toast('Copied to clipboard.', 'ok'); }, function () { toast('Copy failed — select the text and copy manually.', 'bad'); }); },
  'use-site-url': function () { var t = document.getElementById('adGBase'); if (t) { t.value = location.origin + location.pathname.replace(/\/[^\/]*$/, ''); t.focus(); } },
  'google-clear': function () {
    confirmBox({ title: 'Remove dashboard settings?', icon: 'bxl-google', iconClass: 'info', confirmText: 'Remove', danger: true,
      message: 'The saved client ID and secret are deleted from the dashboard. The app falls back to <code>core/config.php</code> (or to “not set up” if that is empty). Users\' linked accounts stay.' })
      .then(function (ok) { if (ok) { S.googleTest = null; mutate('google-clear', {}, 'Dashboard Google settings removed.'); } });
  },
  'google-disconnect': function (el) {
    var l = (S.data.google.links || []).filter(function (x) { return x.userId === el.dataset.id; })[0]; if (!l) return;
    confirmBox({ title: 'Disconnect ' + l.userName + '\'s Google Drive?', icon: 'bxl-google', danger: true, confirmText: 'Disconnect',
      message: 'Their access token is deleted and revoked with Google. Backups already in their Drive are left alone, and they can reconnect any time.' })
      .then(function (ok) { if (ok) mutate('google-disconnect-user', { userId: l.userId }, 'Drive disconnected.'); });
  },
  'google-disconnect-all': function () {
    var n = (S.data.google.links || []).length;
    confirmBox({ title: 'Disconnect all ' + n + ' linked accounts?', icon: 'bxl-google', danger: true, confirmText: 'Disconnect all', type: 'DISCONNECT',
      message: 'Every user\'s Drive token is deleted and revoked. Files already in their Drive stay; they can reconnect from Settings.' })
      .then(function (ok) { if (ok) mutate('google-disconnect-all', {}, function (r) { return plural(r.disconnected || 0, 'account') + ' disconnected.'; }); });
  },
  'stay-signed-in': function () { closeModal(null); api('ping').then(function (r) { if (r.ok) toast('Session extended.', 'ok'); }); }
};

var FORMS = {
  'user-profile': function (f, btn) {
    return mutate('update-user', { userId: S.drawer.id, name: f.name.value.trim(), email: f.email.value.trim(), expertiseLevel: f.level.value }, 'Profile saved.', btn);
  },
  'user-points': function (f, btn) {
    return mutate('set-points', { userId: S.drawer.id, total: parseInt(f.total.value, 10) || 0, streak: parseInt(f.streak.value, 10) || 0, lastClaimDate: f.last.value || null }, 'XP updated.', btn);
  },
  'user-password': function (f, btn) {
    if (f.password.value.length < 8) { toast('Password must be at least 8 characters.', 'bad'); return; }
    var pw = f.password.value;
    return mutate('reset-password', { userId: S.drawer.id, password: pw }, 'Password reset.', btn);
  },
  'google-settings': function (f, btn) {
    var g = S.data.google, test = !!(btn && btn.getAttribute('data-test') === '1');
    var payload = {
      enabled: f.enabled.checked, clientId: f.clientId.value.trim(), clientSecret: f.clientSecret.value.trim(), baseUrl: f.baseUrl.value.trim().replace(/\/(gdrive|oauth|index|admin-dashboard)\.php.*$/i, '').replace(/\/+$/, ''),
      keepBackups: parseInt(f.keep.value, 10) || 10, autoMinMinutes: parseInt(f.mins.value, 10) || 10, useForSignin: f.signin.checked
    };
    if (payload.enabled && (!payload.clientId || !(payload.clientSecret || g.secretSet) || !payload.baseUrl)) { toast('Fill in the client ID, secret and site address before switching it on.', 'bad'); return; }
    return mutate('google-save', payload, 'Google settings saved.', btn).then(function (res) { if (res && res.ok && test) return runGoogleTest(); });
  },
  'oauth-settings': function (f, btn) {
    var key = f.provider.value, m = OAUTH_META[key], o = oauthOf(key), test = !!(btn && btn.getAttribute('data-test') === '1');
    var payload = { provider: key, enabled: f.enabled.checked, clientId: f.clientId.value.trim(), clientSecret: f.clientSecret.value.trim() };
    if (payload.enabled && (!payload.clientId || !(payload.clientSecret || o.secretSet))) { toast('Fill in the ' + m.idLabel + ' and ' + m.secretLabel.toLowerCase() + ' before switching it on.', 'bad'); return; }
    return mutate('oauth-save', payload, m.name + ' settings saved.', btn).then(function (res) { if (res && res.ok && test) return runOAuthTest(key); });
  },
  'access-settings': function (f, btn) {
    return mutate('access-save', { signinEnabled: f.signinEnabled.checked, signupEnabled: f.signupEnabled.checked }, 'Sign in / Sign up availability saved.', btn);
  },
  'content-edit': function (f, btn) {
    var d = S.drawer, c = CONTENT[d.kind], p = { type: c.serverType || c.singular, id: d.id, userId: d.uid };
    if (d.kind === 'projects') { p.name = f.name.value.trim(); p.tech = f.tech.value.trim(); p.description = f.description.value; }
    else if (d.kind === 'notes') { p.title = f.title.value.trim(); p.body = f.body.value; }
    else { p.title = f.title.value.trim(); p.lang = f.lang.value.trim(); p.code = f.code.value; }
    return mutate('update-content', p, 'Changes saved.', btn).then(function (res) { if (res && res.ok) { S.drawer.tab = 'view'; refreshDrawer(); } });
  }
};

/* ---------------------------------------------------------------------
   Render / routing
--------------------------------------------------------------------- */
function render(viewChanged) {
  if (!S.data) return;
  var v = S.view, html;
  $('#adTitle').textContent = VIEWS[v].title; document.title = VIEWS[v].title + ' · A-Code Playground Admin';
  $$('.ad-nav-item').forEach(function (a) { a.classList.toggle('active', a.dataset.view === v); if (a.dataset.view === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
  if (v === 'overview') html = renderOverview(); else if (v === 'users') html = renderUsers(); else if (v === 'security') html = renderSecurity();
  else if (v === 'system') html = renderSystem(); else if (v === 'integrations') html = renderIntegrations();
  else if (v === 'github' || v === 'facebook') html = renderOAuthPage(v); else html = renderContent(v);
  var y = window.scrollY, el = $('#adView');
  el.innerHTML = html;
  if (viewChanged) { el.classList.remove('ad-fade-in'); void el.offsetWidth; el.classList.add('ad-fade-in'); window.scrollTo(0, 0); } else window.scrollTo(0, y);
  afterTable();
}
function route() {
  var h = location.hash.replace(/^#\/?/, '').split('?')[0];
  S.view = VIEWS[h] ? h : 'overview';
  $('.ad-shell').classList.remove('nav-open'); $('#adScrim').hidden = true;
  tipHide(); render(true);
}

/* ---------------------------------------------------------------------
   Session timer & activity
--------------------------------------------------------------------- */
function sessionTick() {
  if (S.locked) return;
  S.secondsLeft -= 1;
  var chip = $('#adSession'), txt = $('#adSessionText');
  txt.textContent = mmss(S.secondsLeft); chip.classList.toggle('warn', S.secondsLeft <= 120);
  $$('[data-until]').forEach(function (el) {
    var left = Math.round((+el.getAttribute('data-until') - Date.now()) / 1000);
    el.textContent = left > 0 ? mmss(left) : 'expired';
  });
  if (S.secondsLeft <= 120 && S.secondsLeft > 0 && !S.warned) {
    S.warned = true;
    openModal({ title: 'Still there?', icon: 'bx-timer', iconClass: 'info', message: 'For your security this dashboard locks after a period of inactivity. It will lock in about two minutes.', confirmText: 'Stay signed in', cancelText: 'Lock now' })
      .then(function (ok) { if (ok) { api('ping').then(function (r) { if (r.ok) toast('Session extended.', 'ok'); }); } else if (!S.locked) lockNow(); });
  }
  if (S.secondsLeft <= 0) {
    S.secondsLeft = 5; // re-check with the server (passive polling never extends the session)
    api('status').then(function (r) { if (!r.unlocked) showLocked(); else S.secondsLeft = r.secondsLeft; });
  }
}
function noteActivity() {
  if (S.locked || Date.now() - S.lastPing < 90000) return;
  S.lastPing = Date.now(); api('ping');
}

/* ---------------------------------------------------------------------
   Event wiring
--------------------------------------------------------------------- */
document.addEventListener('click', function (e) {
  noteActivity();
  var wrap = e.target;
  if (wrap.id === 'adModalWrap' && !wrap.dataset.persistent) { closeModal(null); return; }
  if (wrap.id === 'adPaletteWrap') { closePalette(); return; }
  var pi = e.target.closest('[data-pal]'); if (pi) { palRun(+pi.getAttribute('data-pal')); return; }
  var el = e.target.closest('[data-act]');
  if (!el) return;
  var fn = ACT[el.getAttribute('data-act')];
  if (fn) fn(el, e);
});
document.addEventListener('keydown', function (e) {
  noteActivity();
  var t = e.target, typing = t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
  if ((e.ctrlKey || e.metaKey) && lower(e.key) === 'k') { e.preventDefault(); if ($('#adPaletteWrap').hidden) openPalette(); else closePalette(); return; }
  if (!$('#adPaletteWrap').hidden) {
    if (e.key === 'Escape') { closePalette(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); pal.idx = Math.min(pal.items.length - 1, pal.idx + 1); palRender(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); pal.idx = Math.max(0, pal.idx - 1); palRender(); }
    else if (e.key === 'Enter') { e.preventDefault(); palRun(pal.idx); }
    return;
  }
  if (e.key === 'Escape') {
    if (!$('#adModalWrap').hidden) { if (!$('#adModalWrap').dataset.persistent) closeModal(null); }
    else if (S.drawer) closeDrawer();
    else if ($('.ad-shell').classList.contains('nav-open')) { $('.ad-shell').classList.remove('nav-open'); $('#adScrim').hidden = true; }
    return;
  }
  if ((e.key === 'Enter' || e.key === ' ') && t && t.matches && t.matches('.ad-kpi[data-act]')) { e.preventDefault(); t.click(); return; }
  if (typing || e.ctrlKey || e.metaKey || e.altKey || S.locked || !$('#adModalWrap').hidden) return;
  if (S.gPending) {
    S.gPending = false; clearTimeout(S.gTimer);
    var map = { o: 'overview', u: 'users', p: 'projects', n: 'notes', s: 'snippets', m: 'components', x: 'security', i: 'integrations', h: 'github', f: 'facebook', y: 'system' };
    if (map[lower(e.key)]) { e.preventDefault(); location.hash = '#/' + map[lower(e.key)]; }
    return;
  }
  if (e.key === '/') { var si = $('#adSearchInput'); if (si) { e.preventDefault(); si.focus(); si.select(); } }
  else if (lower(e.key) === 'r') { refresh(); }
  else if (lower(e.key) === 'g') { S.gPending = true; S.gTimer = setTimeout(function () { S.gPending = false; }, 1200); }
});
document.addEventListener('input', function (e) {
  var el = e.target;
  if (el.id === 'adPalInput') { pal.idx = 0; palRender(); return; }
  var kind = el.getAttribute && el.getAttribute('data-input');
  if (kind === 'search') { debounceSearch(el); }
  else if (kind === 'audit-search') { S.audit.q = el.value; S.audit.page = 1; $('#adAudit').innerHTML = auditList(); }
});
var debounceSearch = debounce(function (el) { var st = S.t[el.dataset.kind]; st.q = el.value; st.page = 1; updateTable(); }, 140);
document.addEventListener('change', function (e) {
  var el = e.target, c = el.getAttribute && el.getAttribute('data-change');
  if (!c) return;
  if (c === 'filter') { var st = S.t[el.dataset.kind]; st[el.dataset.key] = el.value; st.page = 1; updateTable(); }
  else if (c === 'size') { PAGE_SIZE = +el.value; LS.set('adminPageSize', String(PAGE_SIZE)); Object.keys(S.t).forEach(function (k) { S.t[k].size = PAGE_SIZE; S.t[k].page = 1; }); updateTable(); }
});
document.addEventListener('submit', function (e) {
  var f = e.target, name = f.getAttribute && f.getAttribute('data-form');
  if (!name || !FORMS[name]) return;
  e.preventDefault();
  var btn = e.submitter || $('button[type="submit"]', f); FORMS[name](f, btn, e);
});
document.addEventListener('input', function (e) { if (e.target.id === 'adPalInput') return; });
document.addEventListener('mouseover', function (e) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) tipShow(t, e); });
document.addEventListener('mousemove', function (e) { if (tipEl && !tipEl.hidden) { var t = e.target.closest && e.target.closest('[data-tip]'); if (t) { if (tipEl.innerHTML !== t.getAttribute('data-tip')) tipEl.innerHTML = t.getAttribute('data-tip'); tipMove(e); } else tipHide(); } });
document.addEventListener('scroll', tipHide, true);
window.addEventListener('hashchange', route);

/* ---------------------------------------------------------------------
   Init
--------------------------------------------------------------------- */
function init() {
  themeIcon(); setLive(S.live);
  $('#adTheme').addEventListener('click', toggleTheme);
  $('#adRefresh').addEventListener('click', refresh);
  $('#adLive').addEventListener('click', function () { setLive(!S.live); toast(S.live ? 'Auto-refresh on — updating every 30 seconds.' : 'Auto-refresh off.', 'info'); });
  $('#adSearchBtn').addEventListener('click', openPalette);
  $('#adScrim').addEventListener('click', function () { $('.ad-shell').classList.remove('nav-open'); $('#adScrim').hidden = true; });
  $('#adMenuBtn').addEventListener('click', function () {
    var shell = $('.ad-shell');
    if (window.matchMedia('(max-width:1000px)').matches) { var open = shell.classList.toggle('nav-open'); $('#adScrim').hidden = !open; }
    else { var c = document.documentElement.getAttribute('data-sidebar') === 'collapsed'; if (c) document.documentElement.removeAttribute('data-sidebar'); else document.documentElement.setAttribute('data-sidebar', 'collapsed'); LS.set('adminSidebar', c ? 'open' : 'collapsed'); }
  });
  setInterval(sessionTick, 1000);
  $('#adSessionText').textContent = mmss(S.secondsLeft);

  load(false).then(function (ok) {
    if (ok) { route(); }
    else if (!S.locked) $('#adView').innerHTML = '<div class="ad-card">' + emptyState('bx-error-circle', "Couldn't load the dashboard", 'Check that MySQL is running and the schema is imported, then try again.', '<button type="button" class="ad-btn ad-btn-primary" data-act="refresh">Try again</button>') + '</div>';
  });
}
init();

})();
