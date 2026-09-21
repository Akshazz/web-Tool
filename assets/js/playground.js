/* =========================================================================
   A-Code Playground: combined Playground (?page=playground)
   -------------------------------------------------------------------------
   One editor, three engines:
     web  HTML + CSS + JavaScript in a single file, shown in a sandboxed iframe
     php  the PHP engine from php-playground.js (WebAssembly)
     sql  the SQL engine from sql-playground.js (WebAssembly)

   The PHP and SQL engines are the existing scripts, unchanged in behaviour.
   They keep working against hidden #phpCode / #sqlCode textareas; this file
   keeps those in sync with the one visible editor, starts each engine the
   first time it is needed, and shows the matching output panel.
   ========================================================================= */
(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var textarea = $('#pgCode');
  if (!textarea) return; // not on the Playground page

  var UID = window.CURRENT_USER_ID ? String(window.CURRENT_USER_ID) : 'guest';
  var KEY = 'u:' + UID + ':playground:';
  var toast = function (m) { if (window.toast) window.toast(m); };

  /* ---------------- languages ---------------- */
  var LANGS = {
    web: { file: 'index.html', ext: 'html', dot: 'html', mode: 'htmlmixed', mime: 'text/html',
           info: 'Local sandbox' },
    php: { file: 'playground.php', ext: 'php', dot: 'php', mode: 'application/x-httpd-php', mime: 'text/x-php',
           info: 'PHP runs in your browser (WebAssembly)' },
    sql: { file: 'query.sql', ext: 'sql', dot: 'sql', mode: 'text/x-mysql', mime: 'text/plain',
           info: 'SQL runs in your browser (WebAssembly)' }
  };
  var hidden = { php: $('#phpCode'), sql: $('#sqlCode') };
  var hiddenSelect = { php: $('#phpSampleSelect'), sql: $('#sqlSampleSelect') };

  /* ---------------- web samples (one combined file each) ---------------- */
  var WEB_SAMPLES = [
    { name: 'Hello A-Code Playground', code:
'<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <style>\n' +
'    :root { font-family: Inter, system-ui, sans-serif; color: #15171a; }\n' +
'    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f5f6f8; }\n' +
'    .demo { width: min(520px, calc(100% - 40px)); padding: 32px; background: #fff; border: 1px solid #e3e6ea; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,.08); }\n' +
'    .eyebrow { font-size: 11px; font-weight: 800; letter-spacing: .12em; color: #68707a; }\n' +
'    h1 { margin: 8px 0; font-size: 38px; letter-spacing: -.04em; }\n' +
'    p { color: #68707a; line-height: 1.6; }\n' +
'    button { border: 0; border-radius: 10px; padding: 11px 16px; background: #15171a; color: #fff; font-weight: 700; cursor: pointer; }\n' +
'    button:hover { transform: translateY(-1px); }\n' +
'  </style>\n</head>\n<body>\n  <main class="demo">\n    <span class="eyebrow">DEV DESK</span>\n    <h1>Hello A-Code Playground</h1>\n' +
'    <p>Edit HTML, CSS and JavaScript in this one file, then press Run.</p>\n    <button id="demoButton">Test interaction</button>\n  </main>\n' +
'  <script>\n    document.getElementById(\'demoButton\').addEventListener(\'click\', function () {\n      this.textContent = \'It works!\';\n    });\n  </script>\n</body>\n</html>\n' },
    { name: 'Counter', code:
'<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <style>\n' +
'    body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f5f6f8; }\n' +
'    .box { text-align: center; }\n    #count { font-size: 64px; font-weight: 800; margin: 8px 0 16px; }\n' +
'    button { border: 1px solid #d5d9de; background: #fff; border-radius: 10px; padding: 10px 18px; font-size: 18px; cursor: pointer; }\n' +
'    button:hover { background: #eef0f3; }\n  </style>\n</head>\n<body>\n  <div class="box">\n    <div>Clicks</div>\n    <div id="count">0</div>\n' +
'    <button id="minus">-</button> <button id="plus">+</button>\n  </div>\n  <script>\n    var n = 0;\n' +
'    var show = function () { document.getElementById(\'count\').textContent = n; };\n' +
'    document.getElementById(\'plus\').onclick = function () { n++; show(); };\n' +
'    document.getElementById(\'minus\').onclick = function () { n--; show(); };\n  </script>\n</body>\n</html>\n' },
    { name: 'To-do list', code:
'<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <style>\n' +
'    body { font-family: system-ui, sans-serif; max-width: 420px; margin: 40px auto; padding: 0 16px; }\n' +
'    form { display: flex; gap: 8px; }\n    input { flex: 1; padding: 10px 12px; border: 1px solid #d5d9de; border-radius: 10px; }\n' +
'    button { border: 0; background: #15171a; color: #fff; border-radius: 10px; padding: 10px 16px; font-weight: 700; cursor: pointer; }\n' +
'    ul { list-style: none; padding: 0; }\n    li { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e3e6ea; }\n' +
'    li.done span { text-decoration: line-through; color: #8a949c; }\n    li button { background: none; color: #c0392b; padding: 0 6px; }\n  </style>\n</head>\n<body>\n' +
'  <h1>To-do</h1>\n  <form id="form"><input id="task" placeholder="What needs doing?" autocomplete="off"><button>Add</button></form>\n  <ul id="list"></ul>\n' +
'  <script>\n    var list = document.getElementById(\'list\');\n' +
'    document.getElementById(\'form\').addEventListener(\'submit\', function (e) {\n      e.preventDefault();\n' +
'      var input = document.getElementById(\'task\');\n      if (!input.value.trim()) return;\n' +
'      var li = document.createElement(\'li\');\n      li.innerHTML = \'<span></span><button type="button">x</button>\';\n' +
'      li.firstChild.textContent = input.value.trim();\n' +
'      li.firstChild.onclick = function () { li.classList.toggle(\'done\'); };\n' +
'      li.lastChild.onclick = function () { li.remove(); };\n      list.appendChild(li);\n      input.value = \'\';\n    });\n  </script>\n</body>\n</html>\n' },
    { name: 'Form with validation', code:
'<!doctype html>\n<html>\n<head>\n  <meta charset="utf-8">\n  <style>\n' +
'    body { font-family: system-ui, sans-serif; max-width: 360px; margin: 40px auto; padding: 0 16px; }\n' +
'    label { display: block; font-weight: 700; margin: 14px 0 6px; }\n' +
'    input { width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid #d5d9de; border-radius: 10px; }\n' +
'    input.bad { border-color: #c0392b; }\n    small { color: #c0392b; display: block; min-height: 18px; margin-top: 4px; }\n' +
'    button { margin-top: 12px; border: 0; background: #15171a; color: #fff; border-radius: 10px; padding: 11px 18px; font-weight: 700; cursor: pointer; }\n' +
'    #ok { color: #2d8a42; font-weight: 700; margin-top: 12px; }\n  </style>\n</head>\n<body>\n  <h1>Sign up</h1>\n  <form id="f" novalidate>\n' +
'    <label for="email">Email</label><input id="email" type="email"><small id="e1"></small>\n' +
'    <label for="pw">Password</label><input id="pw" type="password"><small id="e2"></small>\n    <button>Create account</button>\n  </form>\n  <div id="ok"></div>\n' +
'  <script>\n    document.getElementById(\'f\').addEventListener(\'submit\', function (e) {\n      e.preventDefault();\n' +
'      var email = document.getElementById(\'email\'), pw = document.getElementById(\'pw\');\n' +
'      var okEmail = /^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$/.test(email.value), okPw = pw.value.length >= 8;\n' +
'      email.classList.toggle(\'bad\', !okEmail); pw.classList.toggle(\'bad\', !okPw);\n' +
'      document.getElementById(\'e1\').textContent = okEmail ? \'\' : \'Enter a valid email.\';\n' +
'      document.getElementById(\'e2\').textContent = okPw ? \'\' : \'Use at least 8 characters.\';\n' +
'      document.getElementById(\'ok\').textContent = okEmail && okPw ? \'Account created!\' : \'\';\n    });\n  </script>\n</body>\n</html>\n' }
  ];

  /* ---------------- state ---------------- */
  var cur = null;   // set by the first setLang() call below
  var docs = { web: WEB_SAMPLES[0].code, php: '', sql: '' };
  var started = { php: false, sql: false };
  var programmatic = false;
  var cm = null;
  var lastAwarded = '';
  var saveTimer = null;

  function store(k, v) { try { localStorage.setItem(KEY + k, v); } catch (e) { /* storage full or blocked */ } }
  function load(k) { try { return localStorage.getItem(KEY + k); } catch (e) { return null; } }

  /* ---------------- editor ---------------- */
  function themeName() {
    return window.cmThemeName ? window.cmThemeName() : (document.body.classList.contains('dark') ? 'material-darker' : 'neat');
  }

  if (typeof CodeMirror !== 'undefined') {
    cm = CodeMirror.fromTextArea(textarea, {
      lineNumbers: true, lineWrapping: true, theme: themeName(), tabSize: 2, indentUnit: 2,
      matchBrackets: true, autoCloseBrackets: true, styleActiveLine: true, mode: LANGS.web.mode,
      extraKeys: {
        'Ctrl-Enter': function () { run(); },
        'Cmd-Enter': function () { run(); }
      }
    });
    new MutationObserver(function () { cm.setOption('theme', themeName()); })
      .observe(document.body, { attributes: true, attributeFilter: ['class'] });
  } else {
    // CodeMirror (CDN) unreachable: fall back to the plain textarea.
    textarea.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); run(); }
    });
  }

  function getCode() { return cm ? cm.getValue() : textarea.value; }
  function setCode(v) {
    programmatic = true;
    if (cm) cm.setValue(v); else textarea.value = v;
    programmatic = false;
    updateCount();
  }
  function updateCount() { $('#pgCharCount').textContent = getCode().length.toLocaleString() + ' chars'; }
  function setDirty(text) { $('#pgDirty').textContent = text; }

  /* Keep the hidden engine textareas (and their own draft saving) in sync. */
  function pushToHidden(lang, value) {
    var h = hidden[lang];
    if (!h) return;
    h.value = value;
    h.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function onEdit() {
    if (programmatic) return;
    var v = getCode();
    docs[cur] = v;
    updateCount();
    setDirty('Editing…');
    if (cur === 'web') {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(function () { store('web', docs.web); setDirty('Saved locally'); }, 400);
    } else {
      pushToHidden(cur, v);
      setDirty('Saved locally');
    }
  }
  if (cm) cm.on('change', onEdit); else textarea.addEventListener('input', onEdit);

  /* ---------------- language switching ---------------- */
  function startEngine(lang) {
    if (lang === 'web' || started[lang]) return;
    started[lang] = true;
    document.dispatchEvent(new CustomEvent('adev:start-' + lang));
  }

  function buildSamples(lang) {
    var sel = $('#pgSample');
    sel.innerHTML = '';
    if (lang === 'web') {
      var ph = document.createElement('option');
      ph.value = ''; ph.textContent = 'Samples…'; ph.disabled = true;
      sel.appendChild(ph);
      WEB_SAMPLES.forEach(function (s, i) {
        var o = document.createElement('option');
        o.value = String(i); o.textContent = s.name; sel.appendChild(o);
      });
      var idx = WEB_SAMPLES.findIndex(function (s) { return s.code === docs.web; });
      sel.value = idx < 0 ? '' : String(idx);
      return;
    }
    var src = hiddenSelect[lang];
    if (!src) return;
    Array.prototype.forEach.call(src.children, function (c) { sel.appendChild(c.cloneNode(true)); });
    sel.value = src.value;
  }

  function setLang(lang) {
    if (!LANGS[lang]) lang = 'web';
    if (lang === cur) return;
    if (cur) docs[cur] = getCode();
    cur = lang;
    var L = LANGS[lang];

    $$('#pgLangTabs .tab').forEach(function (t) {
      var on = t.dataset.lang === lang;
      t.classList.toggle('active', on);
      t.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    $$('[data-pg-head]').forEach(function (el) { el.hidden = el.dataset.pgHead !== lang; });
    $$('[data-pg-stage]').forEach(function (el) { el.hidden = el.dataset.pgStage !== lang; });

    $('#pgFileName').textContent = L.file;
    $('#pgFileDot').className = 'file-dot ' + L.dot;
    $('#pgStatusInfo').innerHTML = '<i class="bx bx-check-circle"></i> ' + L.info + ' &middot; <kbd>Ctrl</kbd>+<kbd>Enter</kbd> to run';
    if (cm) cm.setOption('mode', L.mode);
    setCode(docs[lang]);
    setDirty('Saved locally');
    buildSamples(lang);
    startEngine(lang);
    store('lang', lang);
    if (cm) requestAnimationFrame(function () { cm.refresh(); });
    if (lang === 'web' && window.dispatchEvent) window.dispatchEvent(new Event('resize'));
  }

  $$('#pgLangTabs .tab').forEach(function (t) {
    t.addEventListener('click', function () { setLang(t.dataset.lang); if (cm) cm.focus(); });
  });

  $('#pgSample').addEventListener('change', function (e) {
    var v = e.target.value;
    if (v === '') return;
    if (cur === 'web') {
      var s = WEB_SAMPLES[parseInt(v, 10)];
      if (!s) return;
      docs.web = s.code; setCode(s.code); store('web', s.code);
      runWeb(false);
    } else {
      var sel = hiddenSelect[cur];
      if (!sel) return;
      sel.value = v;
      sel.dispatchEvent(new Event('change', { bubbles: true }));   // the engine script loads the sample
      docs[cur] = hidden[cur].value;
      setCode(docs[cur]);
    }
    setDirty('Saved locally');
    if (cm) cm.focus();
  });

  /* ---------------- running ---------------- */
  function looksLikeSql(code) {
    var stripped = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*(--|#)[^\n]*\n?/gm, '').trim();
    return /^(select|insert|update|delete|create|drop|alter|show|describe|desc|explain|with|replace|truncate)\b/i.test(stripped) &&
           !/^\s*</.test(stripped) && !/<\?php/i.test(code);
  }
  /* Only switch when the code is clearly for another language. */
  function detect(code) {
    if (/<\?(php|=)/i.test(code)) return 'php';
    if (cur !== 'sql' && looksLikeSql(code)) return 'sql';
    if (cur === 'sql' && /^\s*<(!doctype|html|body|div|main|section|style|script|h1)/i.test(code)) return 'web';
    return cur;
  }

  function run() {
    var code = getCode();
    var want = detect(code);
    if (want !== cur) {
      var was = cur;
      setLang(want);                                   // shows the code in the right language
      docs[want] = code;
      if (want !== 'web') pushToHidden(want, code);
      if (was === 'web') { docs.web = WEB_SAMPLES[0].code; store('web', docs.web); }   // don't keep the pasted PHP/SQL as the web file
      buildSamples(want);
      toast('Detected ' + (want === 'web' ? 'HTML' : want.toUpperCase()) + ' and switched language');
    }
    if (cur === 'web') return runWeb(true);
    var btn = $(cur === 'php' ? '#phpRun' : '#sqlRun');
    if (!btn || btn.disabled) { toast('The ' + cur.toUpperCase() + ' engine is still loading. Try again in a moment.'); return; }
    btn.click();
  }

  function runWeb(award) {
    var code = getCode();
    var frame = $('#preview');
    if (!frame) return;
    frame.srcdoc = window.ensureResponsiveDoc ? window.ensureResponsiveDoc(code) : code;
    var st = $('#runStatus');
    if (st) {
      st.classList.add('running'); st.innerHTML = '<i></i> Running…';
      setTimeout(function () { st.classList.remove('running'); st.innerHTML = '<i></i> Updated'; }, 480);
    }
    if (award && code !== lastAwarded) {
      lastAwarded = code;
      if (window.awardOnce) window.awardOnce('run-code', code, 'Ran code playground');
      if (window.markGs) window.markGs('ranCode');
    }
  }

  $('#pgRunWeb').addEventListener('click', function () { run(); });

  $('#pgResetWeb').addEventListener('click', function () {
    if (!confirm('Reset the editor back to the starting example? Your current changes will be lost.')) return;
    docs.web = WEB_SAMPLES[0].code; setCode(docs.web); store('web', docs.web);
    buildSamples('web'); runWeb(false); toast('Playground reset');
  });

  // The PHP / SQL "Reset" buttons live in the engine scripts; when they reload a
  // sample into the hidden textarea, pull it into the visible editor.
  ['#phpReset', '#sqlReset'].forEach(function (id, i) {
    var b = $(id), lang = i === 0 ? 'php' : 'sql';
    if (b) b.addEventListener('click', function () {
      setTimeout(function () { docs[lang] = hidden[lang].value; if (cur === lang) setCode(docs[lang]); }, 0);
    });
  });

  /* ---------------- PHP output as a rendered page ---------------- */
  var phpRaw = '';
  var phpView = 'console';
  var phpAuto = false;      // true when the Page view was chosen automatically

  function setPhpView(view, auto) {
    phpView = view;
    phpAuto = !!auto;
    $$('#phpViewSwitch button').forEach(function (b) { b.classList.toggle('active', b.dataset.view === view); });
    var stage = $('#phpStage'), page = $('#phpPage');
    if (!stage || !page) return;
    stage.classList.toggle('page-mode', view === 'page');
    page.hidden = view !== 'page';
    if (view === 'page') {
      page.srcdoc = window.ensureResponsiveDoc ? window.ensureResponsiveDoc(phpRaw) : phpRaw;
    }
  }
  $$('#phpViewSwitch button').forEach(function (b) {
    b.addEventListener('click', function () { setPhpView(b.dataset.view, false); });
  });

  document.addEventListener('adev:php-run', function () { phpRaw = ''; });
  document.addEventListener('adev:php-output', function (e) { phpRaw += e.detail.text; });
  document.addEventListener('adev:php-done', function () {
    var looksHtml = /^\s*(<!doctype|<html|<body|<main|<section|<div|<h1|<style)/i.test(phpRaw);
    if (looksHtml) setPhpView('page', phpView === 'page' ? phpAuto : true);
    else if (phpView === 'page' && phpAuto) setPhpView('console', false);   // plain-text output: back to the console
    else if (phpView === 'page') setPhpView('page', false);                 // manual Page view: refresh it
  });
  $('#phpClearOutput').addEventListener('click', function () { phpRaw = ''; if (phpView === 'page') setPhpView('console', false); });

  /* ---------------- editor tools ---------------- */
  $('#pgWrap').addEventListener('click', function () {
    var on = this.getAttribute('aria-pressed') !== 'true';
    this.setAttribute('aria-pressed', on ? 'true' : 'false');
    this.classList.toggle('active', on);
    if (cm) cm.setOption('lineWrapping', on);
  });

  $('#pgFormat').addEventListener('click', function () {
    var code = getCode();
    if (cur === 'web' && window.html_beautify) {
      var out = window.html_beautify(code, { indent_size: 2, indent_inner_html: true, wrap_line_length: 0 });
      setCode(out); docs.web = out; store('web', out); setDirty('Formatted');
    } else if (cur === 'sql') {
      var q = code.replace(/\s+(FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|LEFT JOIN|INNER JOIN|JOIN)\b/gi, '\n$1');
      setCode(q); docs.sql = q; pushToHidden('sql', q); setDirty('Formatted');
    } else {
      toast('Format works for HTML/CSS/JS and SQL');
    }
  });

  $('#pgClear').addEventListener('click', function () {
    if (!getCode().trim()) return;
    if (!confirm('Clear the editor?')) return;
    setCode(''); onEditProgrammaticClear();
    if (cm) cm.focus();
  });
  function onEditProgrammaticClear() {
    docs[cur] = '';
    if (cur === 'web') store('web', ''); else pushToHidden(cur, '');
    setDirty('Cleared');
  }

  $('#pgDownload').addEventListener('click', function () {
    var L = LANGS[cur];
    var Z = window.ACodeZip;
    if (!Z || typeof JSZip === 'undefined') {
      // Fallback: plain single-file download, same as before.
      var blob = new Blob([getCode()], { type: L.mime + ';charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = L.file;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      return;
    }
    var files = {};
    var zipName = 'playground-' + cur + '.zip';
    if (cur === 'web') {
      // Split the one editor's inline <style>/<script> into their own
      // categorized files, same shape as the main HTML/CSS/JS editor.
      var split = Z.splitWebDoc(getCode());
      var hasCss = !!split.css.trim(), hasJs = !!split.js.trim();
      files['index.html'] = Z.injectAssetLinks(split.html, { css: hasCss, js: hasJs });
      if (hasCss) files['assets/css/style.css'] = split.css;
      if (hasJs) files['assets/js/script.js'] = split.js;
      zipName = 'playground-web.zip';
    } else {
      // PHP/SQL: nothing to categorize into assets/, just the one file
      // at the root of the zip.
      files[L.file] = getCode();
    }
    Z.buildProjectZip(files).then(function (blob) {
      Z.triggerBlobDownload(blob, zipName);
      toast('Downloaded ' + zipName);
    }).catch(function (err) {
      console.error(err);
      toast('Could not build the zip file');
    });
  });

  /* ---------------- init ---------------- */
  function langFromPayload(lang) {
    var l = String(lang || '').toLowerCase();
    if (l.indexOf('php') === 0) return 'php';
    if (l.indexOf('sql') > -1) return 'sql';
    return 'web';
  }
  function wrapForWeb(code, lang) {
    var l = String(lang || '').toLowerCase();
    if (l === 'css') return '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<style>\n' + code + '\n</style>\n</head>\n<body>\n  <!-- Add HTML that uses this CSS -->\n</body>\n</html>\n';
    if (l === 'js' || l === 'javascript') return '<!doctype html>\n<html>\n<head><meta charset="utf-8"></head>\n<body>\n  <div id="app"></div>\n  <script>\n' + code + '\n  <\/script>\n</body>\n</html>\n';
    return code;
  }

  // Saved work for each language.
  var savedWeb = load('web');
  if (savedWeb !== null && savedWeb !== '') docs.web = savedWeb;
  docs.php = hidden.php ? hidden.php.value : '';
  docs.sql = hidden.sql ? hidden.sql.value : '';

  // Which language to open: a handed-over snippet wins, then ?mode=, then last used.
  var startLang = null;
  var params = new URLSearchParams(location.search);
  var mode = params.get('mode');
  if (mode === 'web' || mode === 'php' || mode === 'sql') startLang = mode;

  try {
    var raw = sessionStorage.getItem('acodeplaygroundPlayground');
    if (raw) {
      sessionStorage.removeItem('acodeplaygroundPlayground');
      var title = sessionStorage.getItem('acodeplaygroundPlaygroundTitle') || 'Snippet';
      sessionStorage.removeItem('acodeplaygroundPlaygroundTitle');
      var payload = JSON.parse(raw);
      if (payload && typeof payload.code === 'string') {
        var pl = langFromPayload(payload.lang);
        startLang = pl;
        if (pl === 'web') { docs.web = wrapForWeb(payload.code, payload.lang); store('web', docs.web); }
        else { docs[pl] = payload.code; pushToHidden(pl, payload.code); }
        setTimeout(function () { toast('Loaded "' + title + '". Press Run.'); }, 300);
      }
    }
  } catch (e) { /* ignore a bad payload */ }

  if (!startLang) { var last = load('lang'); startLang = (last === 'php' || last === 'sql') ? last : 'web'; }

  // Render the initial state.
  setLang(startLang);
  if (startLang === 'web') { runWeb(false); lastAwarded = getCode(); }
  updateCount();
})();
