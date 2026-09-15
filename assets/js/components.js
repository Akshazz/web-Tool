/* =========================================================================
   A-DevTools — UI component library
   -------------------------------------------------------------------------
   Every entry below is a self-contained HTML + CSS (+ JS) fragment written
   against the shared design tokens injected by TOKENS. The page renders each
   one in a sandboxed iframe so what you see is the component actually
   running, not a picture of it. Copy / Run / Save prepend TOKENS so the
   fragment keeps working outside this page.

   Loaded only on ?page=components. Depends on app.js for store, toast,
   activity, savePlaygroundPayload, buildCodePreviewMarkup, openModal.
   ========================================================================= */
(function () {
  'use strict';

  var root = document.getElementById('componentLibrary');
  if (!root) return;

  /* ---- Shared tokens -------------------------------------------------- */
  function tokens(dark) {
    return dark
      ? ':root{--bg:#0e0f10;--surface:#151718;--surface2:#1b1d1f;--text:#f3f4f5;--muted:#9ca3aa;--border:#2a2e32;--accent:#f3f4f5;--accent-ink:#111;--danger:#f06b61;--success:#49b675;--radius:12px}'
      : ':root{--bg:#f7f7f8;--surface:#fff;--surface2:#f2f3f4;--text:#111214;--muted:#6b7177;--border:#e3e5e8;--accent:#111214;--accent-ink:#fff;--danger:#c0392b;--success:#2d8a42;--radius:12px}';
  }

  var BASE =
    '*{box-sizing:border-box}' +
    'body{margin:0;padding:22px;background:var(--bg);color:var(--text);' +
    'font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif}' +
    'button,input,select,textarea{font:inherit}button{cursor:pointer}' +
    'h1,h2,h3,p{margin:0 0 8px}';

  /* TOKENS is what gets prepended on copy / run so the fragment is portable. */
  var TOKENS = '<style>\n' + tokens(false) + '\n' + BASE + '\n</style>\n';

  /* ---- Catalog -------------------------------------------------------- */
  var COMPONENTS = [
    /* ================= ACTIONS ================= */
    {
      id: 'buttons', name: 'Buttons', cat: 'Actions', h: 130,
      desc: 'Primary, secondary and destructive actions plus a disabled state.',
      code:
'<div class="row">\n' +
'  <button class="btn primary">Save changes</button>\n' +
'  <button class="btn">Cancel</button>\n' +
'  <button class="btn danger">Delete</button>\n' +
'  <button class="btn" disabled>Unavailable</button>\n' +
'</div>\n' +
'<style>\n' +
'.row{display:flex;flex-wrap:wrap;gap:10px}\n' +
'.btn{display:inline-flex;align-items:center;gap:7px;padding:10px 15px;border-radius:9px;\n' +
'  border:1px solid var(--border);background:var(--surface);color:var(--text);font-weight:650;\n' +
'  transition:background .15s ease,border-color .15s ease,transform .06s ease}\n' +
'.btn:hover{background:var(--surface2)}\n' +
'.btn:active{transform:translateY(1px)}\n' +
'.btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}\n' +
'.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}\n' +
'.btn.primary:hover{opacity:.9}\n' +
'.btn.danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 35%,var(--border))}\n' +
'.btn[disabled]{opacity:.45;cursor:not-allowed}\n' +
'</style>'
    },
    {
      id: 'button-group', name: 'Segmented control', cat: 'Actions', h: 130,
      desc: 'One choice from a small set. The selection moves with a sliding indicator.',
      code:
'<div class="seg" role="tablist" aria-label="View">\n' +
'  <span class="seg-ind" aria-hidden="true"></span>\n' +
'  <button role="tab" aria-selected="true">Grid</button>\n' +
'  <button role="tab" aria-selected="false">List</button>\n' +
'  <button role="tab" aria-selected="false">Table</button>\n' +
'</div>\n' +
'<style>\n' +
'.seg{position:relative;display:inline-flex;padding:4px;gap:2px;background:var(--surface2);\n' +
'  border:1px solid var(--border);border-radius:11px}\n' +
'.seg button{position:relative;z-index:2;border:0;background:transparent;color:var(--muted);\n' +
'  padding:8px 18px;border-radius:8px;font-weight:650;transition:color .15s ease}\n' +
'.seg button[aria-selected="true"]{color:var(--text)}\n' +
'.seg-ind{position:absolute;z-index:1;top:4px;bottom:4px;border-radius:8px;background:var(--surface);\n' +
'  box-shadow:0 1px 3px rgba(0,0,0,.12);transition:transform .25s cubic-bezier(.22,.61,.36,1),width .25s}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var seg=document.querySelector(".seg"),ind=seg.querySelector(".seg-ind");\n' +
'  var tabs=[].slice.call(seg.querySelectorAll("button"));\n' +
'  function move(el){ind.style.width=el.offsetWidth+"px";ind.style.transform="translateX("+(el.offsetLeft-4)+"px)"}\n' +
'  tabs.forEach(function(t){t.addEventListener("click",function(){\n' +
'    tabs.forEach(function(x){x.setAttribute("aria-selected",x===t)});move(t)})});\n' +
'  move(tabs[0]);\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'copy-button', name: 'Copy to clipboard', cat: 'Actions', h: 130,
      desc: 'A copy button that confirms in place instead of firing a toast.',
      code:
'<button class="copy" data-value="npm install a-devtools">\n' +
'  <span class="label">Copy install command</span>\n' +
'</button>\n' +
'<style>\n' +
'.copy{padding:10px 15px;border-radius:9px;border:1px solid var(--border);background:var(--surface);\n' +
'  color:var(--text);font-weight:650;min-width:210px;transition:border-color .2s ease,color .2s ease}\n' +
'.copy.done{color:var(--success);border-color:color-mix(in srgb,var(--success) 45%,var(--border))}\n' +
'</style>\n' +
'<script>\n' +
'document.querySelector(".copy").addEventListener("click",function(){\n' +
'  var b=this,l=b.querySelector(".label"),old=l.textContent;\n' +
'  var t=document.createElement("textarea");t.value=b.dataset.value;document.body.appendChild(t);\n' +
'  t.select();try{document.execCommand("copy")}catch(e){}document.body.removeChild(t);\n' +
'  b.classList.add("done");l.textContent="Copied";\n' +
'  setTimeout(function(){b.classList.remove("done");l.textContent=old},1400);\n' +
'});\n' +
'<\/script>'
    },
    {
      id: 'split-button', name: 'Dropdown menu', cat: 'Actions', h: 230,
      desc: 'A menu button that closes on outside click and on Escape.',
      code:
'<div class="menu">\n' +
'  <button class="trigger" aria-haspopup="true" aria-expanded="false">Export &#9662;</button>\n' +
'  <div class="list" role="menu" hidden>\n' +
'    <button role="menuitem">Download as JSON</button>\n' +
'    <button role="menuitem">Download as CSV</button>\n' +
'    <button role="menuitem">Copy share link</button>\n' +
'  </div>\n' +
'</div>\n' +
'<style>\n' +
'.menu{position:relative;display:inline-block}\n' +
'.trigger{padding:10px 15px;border-radius:9px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--text);font-weight:650}\n' +
'.list{position:absolute;top:calc(100% + 6px);left:0;min-width:200px;padding:6px;z-index:5;\n' +
'  background:var(--surface);border:1px solid var(--border);border-radius:12px;\n' +
'  box-shadow:0 14px 34px rgba(0,0,0,.16);animation:pop .14s ease}\n' +
'@keyframes pop{from{opacity:0;transform:translateY(-4px)}}\n' +
'.list button{display:block;width:100%;text-align:left;border:0;background:transparent;\n' +
'  color:var(--text);padding:9px 10px;border-radius:8px}\n' +
'.list button:hover{background:var(--surface2)}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var m=document.querySelector(".menu"),t=m.querySelector(".trigger"),l=m.querySelector(".list");\n' +
'  function close(){l.hidden=true;t.setAttribute("aria-expanded","false")}\n' +
'  t.addEventListener("click",function(e){e.stopPropagation();\n' +
'    l.hidden=!l.hidden;t.setAttribute("aria-expanded",String(!l.hidden))});\n' +
'  document.addEventListener("click",close);\n' +
'  document.addEventListener("keydown",function(e){if(e.key==="Escape")close()});\n' +
'})();\n' +
'<\/script>'
    },

    /* ================= FORMS ================= */
    {
      id: 'text-field', name: 'Text field', cat: 'Forms', h: 210,
      desc: 'Label, helper text and an error state that reads out to screen readers.',
      code:
'<div class="field">\n' +
'  <label for="pname">Project name</label>\n' +
'  <input id="pname" placeholder="Checkout redesign" aria-describedby="pname-hint">\n' +
'  <small id="pname-hint">Shown in your workspace sidebar.</small>\n' +
'</div>\n' +
'<div class="field bad">\n' +
'  <label for="slug">URL slug</label>\n' +
'  <input id="slug" value="Checkout Redesign" aria-invalid="true" aria-describedby="slug-err">\n' +
'  <small id="slug-err" role="alert">Use lowercase letters and dashes only.</small>\n' +
'</div>\n' +
'<style>\n' +
'.field{max-width:340px;margin-bottom:16px}\n' +
'.field label{display:block;font-weight:650;margin-bottom:6px}\n' +
'.field input{width:100%;padding:10px 12px;border-radius:9px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--text);outline:0;transition:border-color .15s,box-shadow .15s}\n' +
'.field input:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 16%,transparent)}\n' +
'.field small{display:block;margin-top:6px;color:var(--muted);font-size:12.5px}\n' +
'.field.bad input{border-color:var(--danger)}\n' +
'.field.bad small{color:var(--danger)}\n' +
'</style>'
    },
    {
      id: 'select', name: 'Select', cat: 'Forms', h: 150,
      desc: 'A native select styled to match custom inputs — keyboard and mobile behaviour for free.',
      code:
'<label class="sel">\n' +
'  <span>Framework</span>\n' +
'  <select>\n' +
'    <option>Native PHP</option>\n' +
'    <option>JavaScript</option>\n' +
'    <option>HTML5 / CSS3</option>\n' +
'  </select>\n' +
'</label>\n' +
'<style>\n' +
'.sel{display:block;max-width:300px}\n' +
'.sel span{display:block;font-weight:650;margin-bottom:6px}\n' +
'.sel select{width:100%;padding:10px 34px 10px 12px;border-radius:9px;appearance:none;\n' +
'  border:1px solid var(--border);background:var(--surface);color:var(--text);outline:0;\n' +
'  background-image:linear-gradient(45deg,transparent 50%,currentColor 50%),linear-gradient(135deg,currentColor 50%,transparent 50%);\n' +
'  background-position:calc(100% - 17px) 55%,calc(100% - 12px) 55%;\n' +
'  background-size:5px 5px,5px 5px;background-repeat:no-repeat}\n' +
'.sel select:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 16%,transparent)}\n' +
'</style>'
    },
    {
      id: 'textarea', name: 'Textarea with counter', cat: 'Forms', h: 210,
      desc: 'Live character count that turns red past the limit.',
      code:
'<label class="ta">\n' +
'  <span>Release notes</span>\n' +
'  <textarea maxlength="180" rows="4" placeholder="What changed in this version?"></textarea>\n' +
'  <small><b>0</b> / 180</small>\n' +
'</label>\n' +
'<style>\n' +
'.ta{display:block;max-width:400px}\n' +
'.ta span{display:block;font-weight:650;margin-bottom:6px}\n' +
'.ta textarea{width:100%;padding:11px 12px;border-radius:9px;resize:vertical;\n' +
'  border:1px solid var(--border);background:var(--surface);color:var(--text);outline:0}\n' +
'.ta textarea:focus{border-color:var(--accent)}\n' +
'.ta small{display:block;text-align:right;margin-top:6px;color:var(--muted);font-size:12.5px}\n' +
'.ta small.near b{color:var(--danger)}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var t=document.querySelector(".ta textarea"),s=document.querySelector(".ta small"),b=s.querySelector("b");\n' +
'  t.addEventListener("input",function(){b.textContent=t.value.length;\n' +
'    s.classList.toggle("near",t.value.length>150)});\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'checkbox-radio', name: 'Checkbox and radio', cat: 'Forms', h: 230,
      desc: 'Custom marks drawn with CSS while the real inputs stay in the tab order.',
      code:
'<fieldset>\n' +
'  <legend>Include in backup</legend>\n' +
'  <label class="ck"><input type="checkbox" checked><i></i>Projects</label>\n' +
'  <label class="ck"><input type="checkbox" checked><i></i>Snippets</label>\n' +
'  <label class="ck"><input type="checkbox"><i></i>Activity log</label>\n' +
'</fieldset>\n' +
'<fieldset>\n' +
'  <legend>Run backup</legend>\n' +
'  <label class="ck rd"><input type="radio" name="freq" checked><i></i>Every save</label>\n' +
'  <label class="ck rd"><input type="radio" name="freq"><i></i>Daily</label>\n' +
'</fieldset>\n' +
'<style>\n' +
'fieldset{border:1px solid var(--border);border-radius:12px;padding:14px 16px;margin:0 0 14px;max-width:320px}\n' +
'legend{font-weight:650;padding:0 6px}\n' +
'.ck{display:flex;align-items:center;gap:10px;padding:6px 0;cursor:pointer}\n' +
'.ck input{position:absolute;opacity:0;width:0;height:0}\n' +
'.ck i{width:19px;height:19px;flex:0 0 19px;border:1.5px solid var(--border);border-radius:6px;\n' +
'  background:var(--surface);position:relative;transition:.15s}\n' +
'.ck.rd i{border-radius:50%}\n' +
'.ck input:checked + i{background:var(--accent);border-color:var(--accent)}\n' +
'.ck input:checked + i::after{content:"";position:absolute;left:6px;top:2px;width:5px;height:10px;\n' +
'  border:solid var(--accent-ink);border-width:0 2px 2px 0;transform:rotate(45deg)}\n' +
'.ck.rd input:checked + i::after{left:5px;top:5px;width:7px;height:7px;border:0;border-radius:50%;\n' +
'  background:var(--accent-ink);transform:none}\n' +
'.ck input:focus-visible + i{outline:2px solid var(--accent);outline-offset:2px}\n' +
'</style>'
    },
    {
      id: 'switch', name: 'Toggle switch', cat: 'Forms', h: 160,
      desc: 'For settings that take effect immediately — no Save button implied.',
      code:
'<div class="sw-row">\n' +
'  <div><b>Auto-save to disk</b><small>Write every change to your local folder.</small></div>\n' +
'  <label class="sw"><input type="checkbox" checked><span></span></label>\n' +
'</div>\n' +
'<div class="sw-row">\n' +
'  <div><b>Weekly summary</b><small>A digest of what you built.</small></div>\n' +
'  <label class="sw"><input type="checkbox"><span></span></label>\n' +
'</div>\n' +
'<style>\n' +
'.sw-row{display:flex;justify-content:space-between;align-items:center;gap:20px;max-width:400px;\n' +
'  padding:12px 0;border-bottom:1px solid var(--border)}\n' +
'.sw-row small{display:block;color:var(--muted);font-size:12.5px}\n' +
'.sw input{position:absolute;opacity:0}\n' +
'.sw span{display:block;width:44px;height:25px;border-radius:20px;background:var(--border);\n' +
'  position:relative;cursor:pointer;transition:background .2s}\n' +
'.sw span::after{content:"";position:absolute;top:3px;left:3px;width:19px;height:19px;border-radius:50%;\n' +
'  background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:left .2s}\n' +
'.sw input:checked + span{background:var(--success)}\n' +
'.sw input:checked + span::after{left:22px}\n' +
'.sw input:focus-visible + span{outline:2px solid var(--accent);outline-offset:2px}\n' +
'</style>'
    },
    {
      id: 'range', name: 'Range slider', cat: 'Forms', h: 160,
      desc: 'Value bubble updates as you drag; the filled track follows the thumb.',
      code:
'<label class="rg">\n' +
'  <span>Preview width <b>960</b>px</span>\n' +
'  <input type="range" min="320" max="1440" value="960" step="20">\n' +
'</label>\n' +
'<style>\n' +
'.rg{display:block;max-width:360px}\n' +
'.rg span{display:block;font-weight:650;margin-bottom:10px}\n' +
'.rg input{width:100%;-webkit-appearance:none;appearance:none;height:6px;border-radius:5px;outline:0;\n' +
'  background:linear-gradient(var(--accent),var(--accent)) 0/57% 100% no-repeat var(--border)}\n' +
'.rg input::-webkit-slider-thumb{-webkit-appearance:none;width:19px;height:19px;border-radius:50%;\n' +
'  background:var(--surface);border:2px solid var(--accent);cursor:grab}\n' +
'.rg input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;\n' +
'  background:var(--surface);border:2px solid var(--accent);cursor:grab}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var r=document.querySelector(".rg input"),b=document.querySelector(".rg b");\n' +
'  function sync(){var p=(r.value-r.min)/(r.max-r.min)*100;\n' +
'    r.style.backgroundSize=p+"% 100%";b.textContent=r.value}\n' +
'  r.addEventListener("input",sync);sync();\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'search-field', name: 'Search with clear', cat: 'Forms', h: 150,
      desc: 'The clear button only appears once there is something to clear.',
      code:
'<div class="search">\n' +
'  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2">\n' +
'    <circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>\n' +
'  <input placeholder="Find a snippet" aria-label="Search snippets">\n' +
'  <button class="clear" hidden aria-label="Clear search">&times;</button>\n' +
'</div>\n' +
'<style>\n' +
'.search{display:flex;align-items:center;gap:9px;max-width:360px;padding:0 10px;height:42px;\n' +
'  border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--muted)}\n' +
'.search:focus-within{border-color:var(--accent)}\n' +
'.search input{flex:1;border:0;outline:0;background:transparent;color:var(--text)}\n' +
'.clear{border:0;background:transparent;color:var(--muted);font-size:20px;line-height:1;padding:0 4px}\n' +
'.clear:hover{color:var(--text)}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var i=document.querySelector(".search input"),c=document.querySelector(".clear");\n' +
'  i.addEventListener("input",function(){c.hidden=!i.value});\n' +
'  c.addEventListener("click",function(){i.value="";c.hidden=true;i.focus()});\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'password', name: 'Password with reveal', cat: 'Forms', h: 190,
      desc: 'Reveal toggle plus a strength meter driven by length and character variety.',
      code:
'<label class="pw">\n' +
'  <span>Password</span>\n' +
'  <div class="pw-box">\n' +
'    <input type="password" value="devtools">\n' +
'    <button type="button">Show</button>\n' +
'  </div>\n' +
'  <div class="meter"><i></i></div>\n' +
'  <small>Mix letters, numbers and symbols.</small>\n' +
'</label>\n' +
'<style>\n' +
'.pw{display:block;max-width:340px}\n' +
'.pw > span{display:block;font-weight:650;margin-bottom:6px}\n' +
'.pw-box{display:flex;align-items:center;border:1px solid var(--border);border-radius:9px;\n' +
'  background:var(--surface);padding-right:6px}\n' +
'.pw-box:focus-within{border-color:var(--accent)}\n' +
'.pw-box input{flex:1;border:0;outline:0;background:transparent;color:var(--text);padding:10px 12px}\n' +
'.pw-box button{border:0;background:transparent;color:var(--muted);font-weight:650;font-size:12.5px}\n' +
'.meter{height:5px;border-radius:4px;background:var(--border);margin-top:9px;overflow:hidden}\n' +
'.meter i{display:block;height:100%;width:35%;background:var(--danger);transition:width .25s,background .25s}\n' +
'.pw small{display:block;margin-top:6px;color:var(--muted);font-size:12.5px}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var i=document.querySelector(".pw-box input"),b=document.querySelector(".pw-box button"),\n' +
'      f=document.querySelector(".meter i");\n' +
'  b.addEventListener("click",function(){\n' +
'    var show=i.type==="password";i.type=show?"text":"password";b.textContent=show?"Hide":"Show"});\n' +
'  function score(v){var s=0;if(v.length>7)s++;if(v.length>11)s++;\n' +
'    if(/[0-9]/.test(v))s++;if(/[^A-Za-z0-9]/.test(v))s++;return s}\n' +
'  function sync(){var s=score(i.value);\n' +
'    f.style.width=(s*25||8)+"%";\n' +
'    f.style.background=s>=3?"var(--success)":s===2?"#d9a441":"var(--danger)"}\n' +
'  i.addEventListener("input",sync);sync();\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'chips-input', name: 'Tag input', cat: 'Forms', h: 190,
      desc: 'Type and press Enter to add; Backspace on an empty field removes the last tag.',
      code:
'<div class="tags">\n' +
'  <span class="tag">php<button aria-label="Remove php">&times;</button></span>\n' +
'  <span class="tag">layout<button aria-label="Remove layout">&times;</button></span>\n' +
'  <input placeholder="Add a tag" aria-label="Add a tag">\n' +
'</div>\n' +
'<style>\n' +
'.tags{display:flex;flex-wrap:wrap;gap:7px;align-items:center;max-width:400px;padding:8px;\n' +
'  border:1px solid var(--border);border-radius:10px;background:var(--surface)}\n' +
'.tags:focus-within{border-color:var(--accent)}\n' +
'.tag{display:inline-flex;align-items:center;gap:5px;padding:5px 6px 5px 10px;border-radius:7px;\n' +
'  background:var(--surface2);font-size:12.5px;font-weight:650}\n' +
'.tag button{border:0;background:transparent;color:var(--muted);font-size:15px;line-height:1;padding:0 2px}\n' +
'.tag button:hover{color:var(--danger)}\n' +
'.tags input{flex:1;min-width:110px;border:0;outline:0;background:transparent;color:var(--text);padding:5px}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var box=document.querySelector(".tags"),input=box.querySelector("input");\n' +
'  function add(text){var s=document.createElement("span");s.className="tag";\n' +
'    s.textContent=text;var b=document.createElement("button");b.innerHTML="&times;";\n' +
'    b.setAttribute("aria-label","Remove "+text);s.appendChild(b);box.insertBefore(s,input)}\n' +
'  input.addEventListener("keydown",function(e){\n' +
'    if(e.key==="Enter"&&input.value.trim()){e.preventDefault();add(input.value.trim());input.value=""}\n' +
'    else if(e.key==="Backspace"&&!input.value){var last=box.querySelectorAll(".tag");\n' +
'      if(last.length)last[last.length-1].remove()}});\n' +
'  box.addEventListener("click",function(e){var b=e.target.closest(".tag button");\n' +
'    if(b)b.parentNode.remove();else input.focus()});\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'file-drop', name: 'File drop zone', cat: 'Forms', h: 220,
      desc: 'Drag a file in or click to browse. Shows the chosen file name back to you.',
      code:
'<label class="drop">\n' +
'  <input type="file" hidden>\n' +
'  <b>Drop a backup file here</b>\n' +
'  <small>or click to browse — .json up to 10 MB</small>\n' +
'</label>\n' +
'<style>\n' +
'.drop{display:grid;place-items:center;gap:4px;max-width:420px;padding:32px;text-align:center;\n' +
'  border:1.5px dashed var(--border);border-radius:14px;background:var(--surface);cursor:pointer;\n' +
'  transition:border-color .18s,background .18s}\n' +
'.drop:hover,.drop.over{border-color:var(--accent);background:var(--surface2)}\n' +
'.drop small{color:var(--muted);font-size:12.5px}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var d=document.querySelector(".drop"),i=d.querySelector("input"),b=d.querySelector("b");\n' +
'  ["dragenter","dragover"].forEach(function(ev){d.addEventListener(ev,function(e){\n' +
'    e.preventDefault();d.classList.add("over")})});\n' +
'  ["dragleave","drop"].forEach(function(ev){d.addEventListener(ev,function(){d.classList.remove("over")})});\n' +
'  d.addEventListener("drop",function(e){e.preventDefault();\n' +
'    if(e.dataTransfer.files[0])b.textContent=e.dataTransfer.files[0].name});\n' +
'  i.addEventListener("change",function(){if(i.files[0])b.textContent=i.files[0].name});\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'stepper', name: 'Quantity stepper', cat: 'Forms', h: 140,
      desc: 'Bounded numeric input; the buttons disable at the limits.',
      code:
'<div class="qty">\n' +
'  <button class="minus" aria-label="Decrease">&minus;</button>\n' +
'  <input type="text" inputmode="numeric" value="1" aria-label="Quantity">\n' +
'  <button class="plus" aria-label="Increase">&plus;</button>\n' +
'</div>\n' +
'<style>\n' +
'.qty{display:inline-flex;align-items:center;border:1px solid var(--border);border-radius:10px;\n' +
'  background:var(--surface);overflow:hidden}\n' +
'.qty button{border:0;background:transparent;color:var(--text);width:40px;height:40px;font-size:17px}\n' +
'.qty button:hover:not([disabled]){background:var(--surface2)}\n' +
'.qty button[disabled]{opacity:.35;cursor:not-allowed}\n' +
'.qty input{width:52px;text-align:center;border:0;border-left:1px solid var(--border);\n' +
'  border-right:1px solid var(--border);background:transparent;color:var(--text);height:40px;outline:0}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var MIN=1,MAX=10,box=document.querySelector(".qty"),i=box.querySelector("input"),\n' +
'      m=box.querySelector(".minus"),p=box.querySelector(".plus");\n' +
'  function set(v){v=Math.min(MAX,Math.max(MIN,v||MIN));i.value=v;\n' +
'    m.disabled=v<=MIN;p.disabled=v>=MAX}\n' +
'  m.addEventListener("click",function(){set(+i.value-1)});\n' +
'  p.addEventListener("click",function(){set(+i.value+1)});\n' +
'  i.addEventListener("change",function(){set(parseInt(i.value,10))});\n' +
'  set(+i.value);\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'rating', name: 'Star rating', cat: 'Forms', h: 150,
      desc: 'Hover to preview, click to set. Works from the keyboard as a radio group.',
      code:
'<div class="rate" role="radiogroup" aria-label="Rate this starter">\n' +
'  <button role="radio" aria-checked="false" data-v="1">&#9733;</button>\n' +
'  <button role="radio" aria-checked="false" data-v="2">&#9733;</button>\n' +
'  <button role="radio" aria-checked="false" data-v="3">&#9733;</button>\n' +
'  <button role="radio" aria-checked="false" data-v="4">&#9733;</button>\n' +
'  <button role="radio" aria-checked="false" data-v="5">&#9733;</button>\n' +
'  <span class="out">Not rated</span>\n' +
'</div>\n' +
'<style>\n' +
'.rate{display:flex;align-items:center;gap:2px}\n' +
'.rate button{border:0;background:transparent;font-size:26px;line-height:1;padding:2px;\n' +
'  color:var(--border);transition:color .12s,transform .12s}\n' +
'.rate button.on{color:#e0a82e}\n' +
'.rate button:hover{transform:scale(1.15)}\n' +
'.out{margin-left:12px;color:var(--muted);font-size:13px}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var box=document.querySelector(".rate"),stars=[].slice.call(box.querySelectorAll("button")),\n' +
'      out=box.querySelector(".out"),value=0;\n' +
'  function paint(n){stars.forEach(function(s,idx){s.classList.toggle("on",idx<n)})}\n' +
'  stars.forEach(function(s){\n' +
'    s.addEventListener("mouseenter",function(){paint(+s.dataset.v)});\n' +
'    s.addEventListener("click",function(){value=+s.dataset.v;\n' +
'      stars.forEach(function(x){x.setAttribute("aria-checked",String(+x.dataset.v===value))});\n' +
'      out.textContent=value+" of 5";paint(value)});\n' +
'  });\n' +
'  box.addEventListener("mouseleave",function(){paint(value)});\n' +
'})();\n' +
'<\/script>'
    },

    /* ================= FEEDBACK ================= */
    {
      id: 'alerts', name: 'Alerts', cat: 'Feedback', h: 260,
      desc: 'Four severities. Each says what happened and what to do next.',
      code:
'<div class="alert info"><b>Backup location changed</b><p>New files go to your Desktop folder. Old files stay where they are.</p></div>\n' +
'<div class="alert ok"><b>Snippet saved</b><p>Find it under Snippets, or press Ctrl K to jump there.</p></div>\n' +
'<div class="alert warn"><b>Storage almost full</b><p>Delete unused projects to keep auto-save working.</p></div>\n' +
'<div class="alert bad"><b>Import failed</b><p>That file is not a A-DevTools backup. Pick a .json export.</p></div>\n' +
'<style>\n' +
'.alert{max-width:480px;padding:13px 15px;border-radius:11px;margin-bottom:10px;\n' +
'  background:var(--surface);border:1px solid var(--border);border-left-width:3px}\n' +
'.alert p{margin:3px 0 0;color:var(--muted);font-size:13px}\n' +
'.alert.info{border-left-color:var(--muted)}\n' +
'.alert.ok{border-left-color:var(--success)}\n' +
'.alert.warn{border-left-color:#d9a441}\n' +
'.alert.bad{border-left-color:var(--danger)}\n' +
'</style>'
    },
    {
      id: 'toast', name: 'Toast', cat: 'Feedback', h: 210,
      desc: 'A short confirmation that leaves on its own. Stacks if several fire.',
      code:
'<button class="fire">Save changes</button>\n' +
'<div class="toasts" role="status" aria-live="polite"></div>\n' +
'<style>\n' +
'.fire{padding:10px 15px;border-radius:9px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--text);font-weight:650}\n' +
'.toasts{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px}\n' +
'.toasts div{padding:11px 15px;border-radius:10px;background:#111214;color:#fff;font-size:13px;\n' +
'  box-shadow:0 12px 30px rgba(0,0,0,.25);animation:slide .22s ease}\n' +
'@keyframes slide{from{opacity:0;transform:translateY(10px)}}\n' +
'</style>\n' +
'<script>\n' +
'document.querySelector(".fire").addEventListener("click",function(){\n' +
'  var t=document.createElement("div");t.textContent="Changes saved to disk";\n' +
'  document.querySelector(".toasts").appendChild(t);\n' +
'  setTimeout(function(){t.remove()},2200);\n' +
'});\n' +
'<\/script>'
    },
    {
      id: 'progress', name: 'Progress bar', cat: 'Feedback', h: 180,
      desc: 'Determinate progress with a percentage that is announced as it changes.',
      code:
'<div class="pr">\n' +
'  <div class="pr-top"><b>Writing backup</b><span>0%</span></div>\n' +
'  <div class="pr-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><i></i></div>\n' +
'</div>\n' +
'<style>\n' +
'.pr{max-width:380px}\n' +
'.pr-top{display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px}\n' +
'.pr-top span{color:var(--muted)}\n' +
'.pr-track{height:8px;border-radius:6px;background:var(--border);overflow:hidden}\n' +
'.pr-track i{display:block;height:100%;width:0;background:var(--accent);transition:width .3s ease}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var bar=document.querySelector(".pr-track"),fill=bar.querySelector("i"),\n' +
'      label=document.querySelector(".pr-top span"),v=0;\n' +
'  setInterval(function(){v=v>=100?0:Math.min(100,v+Math.ceil(Math.random()*18));\n' +
'    fill.style.width=v+"%";label.textContent=v+"%";bar.setAttribute("aria-valuenow",v)},900);\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'spinner', name: 'Loading spinner', cat: 'Feedback', h: 150,
      desc: 'Pure CSS, honours reduced-motion, and carries a text label for screen readers.',
      code:
'<div class="load"><span class="sp" aria-hidden="true"></span><span>Checking disk access</span></div>\n' +
'<style>\n' +
'.load{display:inline-flex;align-items:center;gap:11px;color:var(--muted);font-size:13.5px}\n' +
'.sp{width:20px;height:20px;border-radius:50%;border:2.5px solid var(--border);\n' +
'  border-top-color:var(--accent);animation:spin .7s linear infinite}\n' +
'@keyframes spin{to{transform:rotate(360deg)}}\n' +
'@media(prefers-reduced-motion:reduce){.sp{animation-duration:2.4s}}\n' +
'</style>'
    },
    {
      id: 'skeleton', name: 'Skeleton loader', cat: 'Feedback', h: 210,
      desc: 'Placeholder shaped like the content it replaces, so the layout does not jump.',
      code:
'<div class="sk-card">\n' +
'  <div class="sk sk-line w40"></div>\n' +
'  <div class="sk sk-line"></div>\n' +
'  <div class="sk sk-line w70"></div>\n' +
'  <div class="sk sk-box"></div>\n' +
'</div>\n' +
'<style>\n' +
'.sk-card{max-width:380px;padding:18px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}\n' +
'.sk{background:linear-gradient(90deg,var(--surface2) 25%,var(--border) 37%,var(--surface2) 63%);\n' +
'  background-size:400% 100%;animation:shine 1.4s ease infinite;border-radius:6px}\n' +
'.sk-line{height:11px;margin-bottom:11px}\n' +
'.w40{width:40%}.w70{width:70%}\n' +
'.sk-box{height:84px;border-radius:10px;margin-top:14px}\n' +
'@keyframes shine{from{background-position:100% 50%}to{background-position:0 50%}}\n' +
'@media(prefers-reduced-motion:reduce){.sk{animation:none}}\n' +
'</style>'
    },
    {
      id: 'empty-state', name: 'Empty state', cat: 'Feedback', h: 260,
      desc: 'An empty screen is an invitation, so it names the next action rather than apologising.',
      code:
'<div class="empty">\n' +
'  <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4">\n' +
'    <path d="M4 7h16v12H4z"/><path d="M4 7l2-3h12l2 3"/><path d="M10 12h4"/></svg>\n' +
'  <b>No projects yet</b>\n' +
'  <p>Projects keep your code, notes and previews in one place.</p>\n' +
'  <button>Create your first project</button>\n' +
'</div>\n' +
'<style>\n' +
'.empty{display:grid;justify-items:center;gap:6px;max-width:400px;padding:40px 24px;text-align:center;\n' +
'  border:1px solid var(--border);border-radius:16px;background:var(--surface)}\n' +
'.empty svg{color:var(--muted);margin-bottom:6px}\n' +
'.empty p{color:var(--muted);font-size:13px;max-width:34ch}\n' +
'.empty button{margin-top:10px;padding:10px 16px;border-radius:9px;border:1px solid var(--accent);\n' +
'  background:var(--accent);color:var(--accent-ink);font-weight:650}\n' +
'</style>'
    },
    {
      id: 'badges', name: 'Badges and status', cat: 'Feedback', h: 150,
      desc: 'Status is carried by text, not colour alone, so it survives colour-blind viewing.',
      code:
'<div class="row">\n' +
'  <span class="badge"><i class="dot live"></i>Running</span>\n' +
'  <span class="badge"><i class="dot idle"></i>Draft</span>\n' +
'  <span class="badge"><i class="dot down"></i>Failed</span>\n' +
'  <span class="badge plain">v2.4.0</span>\n' +
'</div>\n' +
'<style>\n' +
'.row{display:flex;flex-wrap:wrap;gap:8px}\n' +
'.badge{display:inline-flex;align-items:center;gap:7px;padding:5px 11px;border-radius:20px;\n' +
'  border:1px solid var(--border);background:var(--surface);font-size:12.5px;font-weight:650}\n' +
'.badge.plain{border-radius:7px;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Consolas,monospace}\n' +
'.dot{width:7px;height:7px;border-radius:50%;flex:0 0 7px}\n' +
'.dot.live{background:var(--success)}\n' +
'.dot.idle{background:var(--muted)}\n' +
'.dot.down{background:var(--danger)}\n' +
'</style>'
    },

    /* ================= NAVIGATION ================= */
    {
      id: 'tabs', name: 'Tabs', cat: 'Navigation', h: 250,
      desc: 'Arrow keys move between tabs; only the active panel stays in the document.',
      code:
'<div class="tabs">\n' +
'  <div class="tablist" role="tablist">\n' +
'    <button role="tab" aria-selected="true" aria-controls="p1">Overview</button>\n' +
'    <button role="tab" aria-selected="false" aria-controls="p2">Files</button>\n' +
'    <button role="tab" aria-selected="false" aria-controls="p3">History</button>\n' +
'  </div>\n' +
'  <div id="p1" role="tabpanel"><p>Three snippets and one project live in this workspace.</p></div>\n' +
'  <div id="p2" role="tabpanel" hidden><p>Everything mirrors to your local backup folder.</p></div>\n' +
'  <div id="p3" role="tabpanel" hidden><p>Last change: today at 09:52.</p></div>\n' +
'</div>\n' +
'<style>\n' +
'.tabs{max-width:460px;border:1px solid var(--border);border-radius:14px;background:var(--surface);overflow:hidden}\n' +
'.tablist{display:flex;border-bottom:1px solid var(--border);background:var(--surface2)}\n' +
'.tablist button{flex:1;border:0;background:transparent;color:var(--muted);padding:13px 10px;\n' +
'  font-weight:650;box-shadow:inset 0 -2px transparent;transition:color .15s,box-shadow .15s}\n' +
'.tablist button[aria-selected="true"]{color:var(--text);box-shadow:inset 0 -2px var(--accent)}\n' +
'[role="tabpanel"]{padding:18px}\n' +
'[role="tabpanel"] p{margin:0;color:var(--muted)}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var tabs=[].slice.call(document.querySelectorAll(\'[role="tab"]\'));\n' +
'  function select(t){tabs.forEach(function(x){\n' +
'    var on=x===t;x.setAttribute("aria-selected",on);x.tabIndex=on?0:-1;\n' +
'    document.getElementById(x.getAttribute("aria-controls")).hidden=!on});t.focus()}\n' +
'  tabs.forEach(function(t,i){\n' +
'    t.addEventListener("click",function(){select(t)});\n' +
'    t.addEventListener("keydown",function(e){\n' +
'      if(e.key==="ArrowRight")select(tabs[(i+1)%tabs.length]);\n' +
'      if(e.key==="ArrowLeft")select(tabs[(i-1+tabs.length)%tabs.length])});\n' +
'  });\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'breadcrumb', name: 'Breadcrumb', cat: 'Navigation', h: 130,
      desc: 'Shows where you are and gives one click back to every level above.',
      code:
'<nav class="crumbs" aria-label="Breadcrumb">\n' +
'  <a href="#">Workspace</a>\n' +
'  <span aria-hidden="true">/</span>\n' +
'  <a href="#">Projects</a>\n' +
'  <span aria-hidden="true">/</span>\n' +
'  <span aria-current="page">Checkout redesign</span>\n' +
'</nav>\n' +
'<style>\n' +
'.crumbs{display:flex;flex-wrap:wrap;align-items:center;gap:9px;font-size:13px}\n' +
'.crumbs a{color:var(--muted);text-decoration:none}\n' +
'.crumbs a:hover{color:var(--text);text-decoration:underline}\n' +
'.crumbs span[aria-hidden]{color:var(--border)}\n' +
'.crumbs [aria-current]{font-weight:650}\n' +
'</style>'
    },
    {
      id: 'pagination', name: 'Pagination', cat: 'Navigation', h: 150,
      desc: 'Current page is a non-interactive element, so it cannot be clicked twice.',
      code:
'<nav class="pg" aria-label="Pagination">\n' +
'  <button disabled>Previous</button>\n' +
'  <span class="pg-now" aria-current="page">1</span>\n' +
'  <button>2</button><button>3</button>\n' +
'  <span class="gap">&hellip;</span>\n' +
'  <button>9</button>\n' +
'  <button>Next</button>\n' +
'</nav>\n' +
'<style>\n' +
'.pg{display:flex;flex-wrap:wrap;align-items:center;gap:5px}\n' +
'.pg button,.pg-now{min-width:38px;height:38px;padding:0 12px;border-radius:9px;\n' +
'  border:1px solid var(--border);background:var(--surface);color:var(--text);font-weight:650;\n' +
'  display:inline-flex;align-items:center;justify-content:center}\n' +
'.pg button:hover:not([disabled]){background:var(--surface2)}\n' +
'.pg button[disabled]{opacity:.4;cursor:not-allowed}\n' +
'.pg-now{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}\n' +
'.gap{color:var(--muted);padding:0 4px}\n' +
'</style>'
    },
    {
      id: 'sidebar-nav', name: 'Sidebar navigation', cat: 'Navigation', h: 280,
      desc: 'Grouped links with an active marker. Collapses to icons under 700px.',
      code:
'<nav class="side">\n' +
'  <p class="side-label">Workspace</p>\n' +
'  <a class="on" href="#"><b>&#9632;</b><span>Dashboard</span></a>\n' +
'  <a href="#"><b>&#9670;</b><span>Projects</span></a>\n' +
'  <a href="#"><b>&#9679;</b><span>Snippets</span></a>\n' +
'  <p class="side-label">Account</p>\n' +
'  <a href="#"><b>&#9650;</b><span>Settings</span></a>\n' +
'</nav>\n' +
'<style>\n' +
'.side{width:230px;padding:16px 12px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}\n' +
'.side-label{margin:14px 12px 7px;font-size:11px;font-weight:750;color:var(--muted);letter-spacing:.08em}\n' +
'.side-label:first-child{margin-top:0}\n' +
'.side a{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:9px;\n' +
'  color:var(--muted);text-decoration:none;font-size:13.5px}\n' +
'.side a b{width:18px;text-align:center;font-size:10px}\n' +
'.side a:hover{background:var(--surface2);color:var(--text)}\n' +
'.side a.on{background:var(--surface2);color:var(--text);font-weight:650;box-shadow:inset 2px 0 var(--accent)}\n' +
'@media(max-width:700px){.side{width:64px}.side span,.side-label{display:none}}\n' +
'</style>'
    },
    {
      id: 'wizard', name: 'Progress steps', cat: 'Navigation', h: 190,
      desc: 'A real sequence, so numbers are justified here. Completed steps get a check.',
      code:
'<ol class="steps">\n' +
'  <li class="done"><span>&#10003;</span><div><b>Choose a starter</b><small>Admin dashboard</small></div></li>\n' +
'  <li class="now"><span>2</span><div><b>Name your project</b><small>In progress</small></div></li>\n' +
'  <li><span>3</span><div><b>Run it</b><small>Not started</small></div></li>\n' +
'</ol>\n' +
'<style>\n' +
'.steps{display:flex;gap:10px;list-style:none;margin:0;padding:0;flex-wrap:wrap}\n' +
'.steps li{flex:1;min-width:150px;display:flex;gap:11px;align-items:center;padding:14px;\n' +
'  border:1px solid var(--border);border-radius:12px;background:var(--surface)}\n' +
'.steps span{display:grid;place-items:center;width:26px;height:26px;flex:0 0 26px;border-radius:50%;\n' +
'  border:1px solid var(--border);font-size:12px;font-weight:700;color:var(--muted)}\n' +
'.steps small{display:block;color:var(--muted);font-size:12px}\n' +
'.steps .done span{background:var(--success);border-color:var(--success);color:#fff}\n' +
'.steps .now{border-color:var(--accent)}\n' +
'.steps .now span{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}\n' +
'</style>'
    },

    /* ================= DATA DISPLAY ================= */
    {
      id: 'table', name: 'Data table', cat: 'Data display', h: 300,
      desc: 'Sortable headers and a horizontal scroll that keeps the layout intact on phones.',
      code:
'<div class="tw">\n' +
'  <table>\n' +
'    <thead><tr><th data-sort>Project</th><th data-sort>Owner</th><th data-sort>Status</th></tr></thead>\n' +
'    <tbody>\n' +
'      <tr><td>Checkout redesign</td><td>Ana</td><td><span class="st ok">Live</span></td></tr>\n' +
'      <tr><td>Billing export</td><td>Marco</td><td><span class="st">Draft</span></td></tr>\n' +
'      <tr><td>Auth cleanup</td><td>Ken</td><td><span class="st bad">Blocked</span></td></tr>\n' +
'    </tbody>\n' +
'  </table>\n' +
'</div>\n' +
'<style>\n' +
'.tw{max-width:520px;border:1px solid var(--border);border-radius:14px;overflow:auto;background:var(--surface)}\n' +
'table{width:100%;border-collapse:collapse;font-size:13.5px;min-width:420px}\n' +
'th,td{padding:12px 15px;text-align:left;border-bottom:1px solid var(--border)}\n' +
'tbody tr:last-child td{border-bottom:0}\n' +
'th{background:var(--surface2);font-size:12px;color:var(--muted);cursor:pointer;user-select:none}\n' +
'th[data-sort]::after{content:" \\2195";opacity:.4}\n' +
'tbody tr:hover{background:var(--surface2)}\n' +
'.st{padding:3px 9px;border-radius:20px;border:1px solid var(--border);font-size:11.5px;font-weight:650}\n' +
'.st.ok{color:var(--success);border-color:color-mix(in srgb,var(--success) 40%,var(--border))}\n' +
'.st.bad{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 40%,var(--border))}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var tb=document.querySelector("tbody");\n' +
'  [].slice.call(document.querySelectorAll("th[data-sort]")).forEach(function(th,col){\n' +
'    var asc=true;\n' +
'    th.addEventListener("click",function(){\n' +
'      var rows=[].slice.call(tb.rows);\n' +
'      rows.sort(function(a,b){return a.cells[col].textContent.localeCompare(b.cells[col].textContent)*(asc?1:-1)});\n' +
'      asc=!asc;rows.forEach(function(r){tb.appendChild(r)})});\n' +
'  });\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'stat-cards', name: 'Stat cards', cat: 'Data display', h: 190,
      desc: 'One number per card with the change beside it, so the figure reads first.',
      code:
'<div class="stats">\n' +
'  <div class="stat"><span>Projects</span><b>12</b><small class="up">&#9650; 3 this week</small></div>\n' +
'  <div class="stat"><span>Snippets</span><b>48</b><small class="up">&#9650; 9 this week</small></div>\n' +
'  <div class="stat"><span>Storage</span><b>2.4 MB</b><small>of 5 MB local</small></div>\n' +
'</div>\n' +
'<style>\n' +
'.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;max-width:520px}\n' +
'.stat{padding:17px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}\n' +
'.stat span{display:block;color:var(--muted);font-size:12.5px}\n' +
'.stat b{display:block;font-size:27px;letter-spacing:-.02em;margin:5px 0 3px}\n' +
'.stat small{color:var(--muted);font-size:12px}\n' +
'.stat small.up{color:var(--success)}\n' +
'</style>'
    },
    {
      id: 'avatar', name: 'Avatar and stack', cat: 'Data display', h: 160,
      desc: 'Initials fall back cleanly when there is no photo; the stack caps with a count.',
      code:
'<div class="row">\n' +
'  <span class="av lg">AD</span>\n' +
'  <span class="av">MR</span>\n' +
'  <div class="stack">\n' +
'    <span class="av">AN</span><span class="av">KV</span><span class="av">JP</span>\n' +
'    <span class="av more">+5</span>\n' +
'  </div>\n' +
'</div>\n' +
'<style>\n' +
'.row{display:flex;align-items:center;gap:16px}\n' +
'.av{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;\n' +
'  background:var(--accent);color:var(--accent-ink);font-weight:750;font-size:13px}\n' +
'.av.lg{width:52px;height:52px;font-size:17px}\n' +
'.stack{display:flex}\n' +
'.stack .av{margin-left:-11px;border:2px solid var(--bg)}\n' +
'.stack .av:first-child{margin-left:0}\n' +
'.av.more{background:var(--surface2);color:var(--muted)}\n' +
'</style>'
    },
    {
      id: 'accordion', name: 'Accordion', cat: 'Data display', h: 250,
      desc: 'Built on native details/summary, so it is keyboard-accessible with no JavaScript.',
      code:
'<div class="acc">\n' +
'  <details open><summary>Where is my work saved?</summary>\n' +
'    <p>In your browser and mirrored to a folder on this computer.</p></details>\n' +
'  <details><summary>Can I move it to another machine?</summary>\n' +
'    <p>Export a backup file from Settings, then import it on the other machine.</p></details>\n' +
'  <details><summary>Does this need an internet connection?</summary>\n' +
'    <p>No. Everything runs locally once the page has loaded.</p></details>\n' +
'</div>\n' +
'<style>\n' +
'.acc{max-width:440px;border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface)}\n' +
'details{border-bottom:1px solid var(--border)}\n' +
'details:last-child{border-bottom:0}\n' +
'summary{padding:14px 16px;cursor:pointer;font-weight:650;list-style:none;display:flex;\n' +
'  justify-content:space-between;align-items:center}\n' +
'summary::-webkit-details-marker{display:none}\n' +
'summary::after{content:"+";color:var(--muted);font-size:17px}\n' +
'details[open] summary::after{content:"\\2013"}\n' +
'details p{margin:0;padding:0 16px 15px;color:var(--muted);font-size:13.5px}\n' +
'</style>'
    },
    {
      id: 'timeline', name: 'Activity timeline', cat: 'Data display', h: 250,
      desc: 'Chronological events on a single rail, newest first.',
      code:
'<ul class="tl">\n' +
'  <li><b>Ran code in playground</b><time>Today, 09:52</time></li>\n' +
'  <li><b>Saved snippet: Responsive Sidebar</b><time>Today, 09:41</time></li>\n' +
'  <li><b>Created project: Checkout redesign</b><time>Yesterday, 17:08</time></li>\n' +
'</ul>\n' +
'<style>\n' +
'.tl{list-style:none;margin:0;padding:0 0 0 22px;max-width:380px;position:relative}\n' +
'.tl::before{content:"";position:absolute;left:5px;top:6px;bottom:6px;width:1px;background:var(--border)}\n' +
'.tl li{position:relative;padding:0 0 18px}\n' +
'.tl li::before{content:"";position:absolute;left:-21px;top:5px;width:9px;height:9px;border-radius:50%;\n' +
'  background:var(--surface);border:2px solid var(--border)}\n' +
'.tl li:first-child::before{border-color:var(--accent)}\n' +
'.tl b{display:block;font-size:13.5px}\n' +
'.tl time{color:var(--muted);font-size:12px}\n' +
'</style>'
    },
    {
      id: 'kv-list', name: 'Detail list', cat: 'Data display', h: 210,
      desc: 'Label and value pairs that stack into one column on narrow screens.',
      code:
'<dl class="kv">\n' +
'  <dt>Project</dt><dd>Checkout redesign</dd>\n' +
'  <dt>Technology</dt><dd>Native PHP</dd>\n' +
'  <dt>Created</dt><dd>15 Sep 2026</dd>\n' +
'  <dt>Backup</dt><dd>Local folder on this computer</dd>\n' +
'</dl>\n' +
'<style>\n' +
'.kv{display:grid;grid-template-columns:130px 1fr;gap:0;margin:0;max-width:440px;\n' +
'  border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface);font-size:13.5px}\n' +
'.kv dt{padding:12px 15px;color:var(--muted);border-bottom:1px solid var(--border);background:var(--surface2)}\n' +
'.kv dd{padding:12px 15px;margin:0;border-bottom:1px solid var(--border)}\n' +
'.kv dt:nth-last-of-type(1),.kv dd:nth-last-of-type(1){border-bottom:0}\n' +
'@media(max-width:520px){.kv{grid-template-columns:1fr}.kv dt{border-bottom:0}}\n' +
'</style>'
    },
    {
      id: 'card', name: 'Content card', cat: 'Data display', h: 260,
      desc: 'Whole card is one link target, with the actions kept clickable separately.',
      code:
'<article class="card">\n' +
'  <div class="card-top"><span class="tag">HTML + CSS</span><span class="when">Updated today</span></div>\n' +
'  <h3>Responsive sidebar</h3>\n' +
'  <p>A fixed sidebar that becomes a stacked block below 700px.</p>\n' +
'  <div class="card-acts"><button>Preview</button><button class="go">Open in playground</button></div>\n' +
'</article>\n' +
'<style>\n' +
'.card{max-width:360px;padding:18px;border:1px solid var(--border);border-radius:16px;\n' +
'  background:var(--surface);transition:border-color .18s,transform .18s}\n' +
'.card:hover{border-color:var(--accent);transform:translateY(-2px)}\n' +
'.card-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}\n' +
'.tag{padding:4px 9px;border-radius:6px;background:var(--surface2);font-size:11.5px;font-weight:700}\n' +
'.when{color:var(--muted);font-size:12px}\n' +
'.card h3{margin:0 0 6px;font-size:16px}\n' +
'.card p{margin:0 0 16px;color:var(--muted);font-size:13.5px}\n' +
'.card-acts{display:flex;gap:8px}\n' +
'.card-acts button{flex:1;padding:9px;border-radius:9px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--text);font-weight:650;font-size:13px}\n' +
'.card-acts .go{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}\n' +
'</style>'
    },
    {
      id: 'code-block', name: 'Code block', cat: 'Data display', h: 230,
      desc: 'Monospaced block with a filename bar and a copy action that confirms in place.',
      code:
'<figure class="code">\n' +
'  <figcaption><span>backup.php</span><button>Copy</button></figcaption>\n' +
'  <pre>&lt;?php\n' +
'$dir = __DIR__ . &#39;/data/backups&#39;;\n' +
'if (!is_dir($dir)) mkdir($dir, 0775, true);\n' +
'file_put_contents("$dir/snapshot.json", $json);</pre>\n' +
'</figure>\n' +
'<style>\n' +
'.code{margin:0;max-width:460px;border:1px solid var(--border);border-radius:12px;overflow:hidden}\n' +
'figcaption{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;\n' +
'  background:var(--surface2);border-bottom:1px solid var(--border);font-size:12px;color:var(--muted)}\n' +
'figcaption button{border:1px solid var(--border);background:var(--surface);color:var(--text);\n' +
'  padding:4px 10px;border-radius:7px;font-size:11.5px;font-weight:650}\n' +
'.code pre{margin:0;padding:15px;background:#101112;color:#e6e6e6;overflow:auto;\n' +
'  font:12.5px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace}\n' +
'</style>\n' +
'<script>\n' +
'document.querySelector("figcaption button").addEventListener("click",function(){\n' +
'  var b=this,t=document.createElement("textarea");\n' +
'  t.value=document.querySelector(".code pre").textContent;document.body.appendChild(t);t.select();\n' +
'  try{document.execCommand("copy")}catch(e){}document.body.removeChild(t);\n' +
'  b.textContent="Copied";setTimeout(function(){b.textContent="Copy"},1300);\n' +
'});\n' +
'<\/script>'
    },

    /* ================= OVERLAYS ================= */
    {
      id: 'modal', name: 'Modal dialog', cat: 'Overlays', h: 200,
      desc: 'Closes on Escape, on backdrop click, and returns focus to the button that opened it.',
      code:
'<button class="open">Delete project</button>\n' +
'<div class="backdrop" hidden>\n' +
'  <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dt">\n' +
'    <h2 id="dt">Delete this project?</h2>\n' +
'    <p>The project and its files are removed from this computer. This cannot be undone.</p>\n' +
'    <div class="acts"><button class="cancel">Keep it</button><button class="del">Delete project</button></div>\n' +
'  </div>\n' +
'</div>\n' +
'<style>\n' +
'.open{padding:10px 15px;border-radius:9px;border:1px solid var(--border);background:var(--surface);\n' +
'  color:var(--text);font-weight:650}\n' +
'.backdrop{position:fixed;inset:0;background:rgba(0,0,0,.55);display:grid;place-items:center;padding:20px;z-index:9}\n' +
'.dialog{width:min(400px,100%);padding:24px;border-radius:16px;background:var(--surface);\n' +
'  border:1px solid var(--border);animation:rise .18s ease}\n' +
'@keyframes rise{from{opacity:0;transform:translateY(12px)}}\n' +
'.dialog h2{margin:0 0 7px;font-size:18px}\n' +
'.dialog p{margin:0 0 20px;color:var(--muted);font-size:13.5px}\n' +
'.acts{display:flex;gap:9px;justify-content:flex-end}\n' +
'.acts button{padding:9px 14px;border-radius:9px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--text);font-weight:650}\n' +
'.acts .del{background:var(--danger);border-color:var(--danger);color:#fff}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var open=document.querySelector(".open"),bd=document.querySelector(".backdrop");\n' +
'  function show(){bd.hidden=false;bd.querySelector(".cancel").focus()}\n' +
'  function hide(){bd.hidden=true;open.focus()}\n' +
'  open.addEventListener("click",show);\n' +
'  bd.querySelector(".cancel").addEventListener("click",hide);\n' +
'  bd.querySelector(".del").addEventListener("click",hide);\n' +
'  bd.addEventListener("click",function(e){if(e.target===bd)hide()});\n' +
'  document.addEventListener("keydown",function(e){if(e.key==="Escape"&&!bd.hidden)hide()});\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'drawer', name: 'Slide-over drawer', cat: 'Overlays', h: 200,
      desc: 'For editing beside the page instead of covering it. Slides from the right.',
      code:
'<button class="open">Edit details</button>\n' +
'<div class="scrim" hidden></div>\n' +
'<aside class="drawer" aria-label="Edit details">\n' +
'  <header><b>Edit project</b><button class="x" aria-label="Close">&times;</button></header>\n' +
'  <label>Name<input value="Checkout redesign"></label>\n' +
'  <label>Owner<input value="Ana"></label>\n' +
'  <button class="save">Save changes</button>\n' +
'</aside>\n' +
'<style>\n' +
'.open,.save{padding:10px 15px;border-radius:9px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--text);font-weight:650}\n' +
'.scrim{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:8}\n' +
'.drawer{position:fixed;top:0;right:0;bottom:0;width:min(320px,86vw);z-index:9;padding:20px;\n' +
'  background:var(--surface);border-left:1px solid var(--border);transform:translateX(100%);\n' +
'  transition:transform .26s cubic-bezier(.22,.61,.36,1)}\n' +
'.drawer.on{transform:none}\n' +
'.drawer header{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}\n' +
'.x{border:0;background:transparent;color:var(--muted);font-size:24px;line-height:1}\n' +
'.drawer label{display:block;font-weight:650;margin-bottom:14px;font-size:13px}\n' +
'.drawer input{width:100%;margin-top:6px;padding:9px 11px;border-radius:9px;font-weight:400;\n' +
'  border:1px solid var(--border);background:var(--bg);color:var(--text);outline:0}\n' +
'.save{width:100%;margin-top:6px}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var d=document.querySelector(".drawer"),s=document.querySelector(".scrim"),\n' +
'      o=document.querySelector(".open");\n' +
'  function open(){d.classList.add("on");s.hidden=false;d.querySelector("input").focus()}\n' +
'  function close(){d.classList.remove("on");s.hidden=true;o.focus()}\n' +
'  o.addEventListener("click",open);s.addEventListener("click",close);\n' +
'  d.querySelector(".x").addEventListener("click",close);\n' +
'  d.querySelector(".save").addEventListener("click",close);\n' +
'  document.addEventListener("keydown",function(e){if(e.key==="Escape")close()});\n' +
'})();\n' +
'<\/script>'
    },
    {
      id: 'tooltip', name: 'Tooltip', cat: 'Overlays', h: 170,
      desc: 'CSS-only, shown on hover and on keyboard focus so it is not mouse-only.',
      code:
'<p>Backups are written to <button class="tip" data-tip="C:/xampp/htdocs/web-Tool/data/backups">your local folder</button> after every change.</p>\n' +
'<style>\n' +
'p{max-width:44ch;color:var(--muted)}\n' +
'.tip{position:relative;border:0;background:transparent;color:var(--text);padding:0;\n' +
'  font-weight:650;border-bottom:1px dashed var(--muted)}\n' +
'.tip::after{content:attr(data-tip);position:absolute;bottom:calc(100% + 9px);left:50%;\n' +
'  transform:translate(-50%,4px);white-space:nowrap;padding:7px 10px;border-radius:8px;\n' +
'  background:#111214;color:#fff;font-size:11.5px;font-weight:600;opacity:0;pointer-events:none;\n' +
'  transition:opacity .15s,transform .15s}\n' +
'.tip::before{content:"";position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);\n' +
'  border:5px solid transparent;border-top-color:#111214;opacity:0;transition:opacity .15s}\n' +
'.tip:hover::after,.tip:focus-visible::after{opacity:1;transform:translate(-50%,0)}\n' +
'.tip:hover::before,.tip:focus-visible::before{opacity:1}\n' +
'</style>'
    },
    {
      id: 'popconfirm', name: 'Inline confirm', cat: 'Overlays', h: 200,
      desc: 'A lighter alternative to a modal for one small, reversible destructive action.',
      code:
'<div class="pc">\n' +
'  <button class="trigger">Remove snippet</button>\n' +
'  <div class="bubble" hidden role="dialog">\n' +
'    <p>Remove this snippet?</p>\n' +
'    <div><button class="no">No</button><button class="yes">Yes, remove</button></div>\n' +
'  </div>\n' +
'</div>\n' +
'<style>\n' +
'.pc{position:relative;display:inline-block}\n' +
'.trigger{padding:10px 15px;border-radius:9px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--danger);font-weight:650}\n' +
'.bubble{position:absolute;top:calc(100% + 8px);left:0;width:220px;padding:14px;z-index:5;\n' +
'  background:var(--surface);border:1px solid var(--border);border-radius:12px;\n' +
'  box-shadow:0 14px 34px rgba(0,0,0,.16)}\n' +
'.bubble p{margin:0 0 12px;font-size:13.5px}\n' +
'.bubble div{display:flex;gap:7px;justify-content:flex-end}\n' +
'.bubble button{padding:6px 11px;border-radius:8px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--text);font-size:12.5px;font-weight:650}\n' +
'.bubble .yes{background:var(--danger);border-color:var(--danger);color:#fff}\n' +
'</style>\n' +
'<script>\n' +
'(function(){\n' +
'  var pc=document.querySelector(".pc"),t=pc.querySelector(".trigger"),b=pc.querySelector(".bubble");\n' +
'  t.addEventListener("click",function(e){e.stopPropagation();b.hidden=!b.hidden});\n' +
'  pc.querySelector(".no").addEventListener("click",function(){b.hidden=true});\n' +
'  pc.querySelector(".yes").addEventListener("click",function(){b.hidden=true;t.textContent="Removed"});\n' +
'  document.addEventListener("click",function(){b.hidden=true});\n' +
'  b.addEventListener("click",function(e){e.stopPropagation()});\n' +
'})();\n' +
'<\/script>'
    },

    /* ================= LAYOUT ================= */
    {
      id: 'grid', name: 'Responsive grid', cat: 'Layout', h: 230,
      desc: 'auto-fit and minmax reflow the columns with no media queries at all.',
      code:
'<div class="grid">\n' +
'  <div>Dashboard</div><div>Playground</div><div>Snippets</div>\n' +
'  <div>Projects</div><div>Notes</div><div>Settings</div>\n' +
'</div>\n' +
'<style>\n' +
'.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}\n' +
'.grid div{padding:26px 16px;border:1px solid var(--border);border-radius:12px;\n' +
'  background:var(--surface);text-align:center;font-weight:650;font-size:13.5px}\n' +
'</style>'
    },
    {
      id: 'split', name: 'Editor and preview split', cat: 'Layout', h: 260,
      desc: 'Two panes side by side that stack vertically on small screens.',
      code:
'<div class="split">\n' +
'  <div class="pane"><header>Editor</header><pre>&lt;h1&gt;Hello&lt;/h1&gt;</pre></div>\n' +
'  <div class="pane"><header>Preview</header><div class="out"><h1>Hello</h1></div></div>\n' +
'</div>\n' +
'<style>\n' +
'.split{display:grid;grid-template-columns:1fr 1fr;min-height:190px;max-width:520px;\n' +
'  border:1px solid var(--border);border-radius:14px;overflow:hidden;background:var(--surface)}\n' +
'.pane{display:flex;flex-direction:column;border-right:1px solid var(--border)}\n' +
'.pane:last-child{border-right:0}\n' +
'.pane header{padding:9px 13px;border-bottom:1px solid var(--border);background:var(--surface2);\n' +
'  font-size:11.5px;font-weight:750;color:var(--muted)}\n' +
'.pane pre{margin:0;flex:1;padding:14px;background:#101112;color:#e6e6e6;\n' +
'  font:12.5px/1.6 ui-monospace,Consolas,monospace}\n' +
'.out{flex:1;padding:14px;background:#fff;color:#111}\n' +
'.out h1{margin:0;font-size:22px}\n' +
'@media(max-width:560px){.split{grid-template-columns:1fr}\n' +
'  .pane{border-right:0;border-bottom:1px solid var(--border)}}\n' +
'</style>'
    },
    {
      id: 'banner', name: 'Dismissible banner', cat: 'Layout', h: 180,
      desc: 'A page-level notice with one action and a way out.',
      code:
'<div class="banner">\n' +
'  <div><b>Back up your work to disk</b><p>Projects and snippets auto-save to a local folder on this computer.</p></div>\n' +
'  <div class="banner-acts"><button>Download backup</button><button class="x" aria-label="Dismiss">&times;</button></div>\n' +
'</div>\n' +
'<style>\n' +
'.banner{display:flex;justify-content:space-between;align-items:center;gap:18px;flex-wrap:wrap;\n' +
'  max-width:560px;padding:15px 17px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}\n' +
'.banner p{margin:3px 0 0;color:var(--muted);font-size:13px}\n' +
'.banner-acts{display:flex;align-items:center;gap:8px}\n' +
'.banner-acts button{padding:9px 13px;border-radius:9px;border:1px solid var(--border);\n' +
'  background:var(--surface);color:var(--text);font-weight:650;font-size:13px}\n' +
'.banner .x{border:0;font-size:21px;line-height:1;padding:0 8px;color:var(--muted)}\n' +
'</style>\n' +
'<script>\n' +
'document.querySelector(".banner .x").addEventListener("click",function(){\n' +
'  document.querySelector(".banner").remove()});\n' +
'<\/script>'
    }
  ];

  /* ---- Rendering ------------------------------------------------------ */
  var esc = window.escapeHtml || function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  };

  var CATS = ['All'];
  COMPONENTS.forEach(function (c) { if (CATS.indexOf(c.cat) < 0) CATS.push(c.cat); });

  var state = { cat: 'All', q: '' };

  var chipBar = root.querySelector('#componentCats');
  var grid = root.querySelector('#componentGrid');
  var countEl = document.getElementById('componentCount');
  var searchEl = document.getElementById('componentSearch');
  if (!chipBar || !grid) return;

  chipBar.innerHTML = CATS.map(function (c) {
    var n = c === 'All' ? COMPONENTS.length
      : COMPONENTS.filter(function (x) { return x.cat === c; }).length;
    return '<button class="cmp-chip' + (c === 'All' ? ' on' : '') + '" data-cat="' + esc(c) + '">' +
      esc(c) + '<span>' + n + '</span></button>';
  }).join('');

  function isDark() { return document.body.classList.contains('dark'); }

  function demoDoc(code) {
    return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1"><style>' +
      tokens(isDark()) + BASE + '</style></head><body>' + code + '</body></html>';
  }

  /* Portable version: tokens travel with the fragment. */
  function portable(c) { return TOKENS + c.code; }

  function visible() {
    var q = state.q.toLowerCase();
    return COMPONENTS.filter(function (c) {
      if (state.cat !== 'All' && c.cat !== state.cat) return false;
      if (!q) return true;
      return (c.name + ' ' + c.cat + ' ' + c.desc).toLowerCase().indexOf(q) > -1;
    });
  }

  function cardMarkup(c) {
    return '<article class="cmp-card" data-id="' + esc(c.id) + '">' +
      '<div class="cmp-stage" style="height:' + (c.h || 200) + 'px">' +
        '<div class="cmp-loading"><span></span></div>' +
      '</div>' +
      '<div class="cmp-body">' +
        '<div class="cmp-head"><h3>' + esc(c.name) + '</h3>' +
        '<span class="cmp-cat">' + esc(c.cat) + '</span></div>' +
        '<p>' + esc(c.desc) + '</p>' +
        '<div class="cmp-acts">' +
          '<button class="small-btn" data-act="code"><i class="bx bx-code-alt"></i> Code</button>' +
          '<button class="small-btn" data-act="copy"><i class="bx bx-copy"></i> Copy</button>' +
          '<button class="small-btn" data-act="run"><i class="bx bx-play"></i> Playground</button>' +
          '<button class="small-btn" data-act="save"><i class="bx bx-bookmark"></i> Save</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function mountFrames() {
    root.querySelectorAll('.cmp-stage').forEach(function (stage) {
      if (stage.querySelector('iframe')) return;
      var c = byId(stage.closest('.cmp-card').dataset.id);
      if (!c) return;
      var f = document.createElement('iframe');
      f.className = 'cmp-frame';
      f.setAttribute('title', c.name + ' demo');
      f.setAttribute('loading', 'lazy');
      f.addEventListener('load', function () { stage.classList.add('ready'); });
      f.srcdoc = demoDoc(c.code);
      stage.appendChild(f);
    });
  }

  function byId(id) {
    for (var i = 0; i < COMPONENTS.length; i++) if (COMPONENTS[i].id === id) return COMPONENTS[i];
    return null;
  }

  function render() {
    var list = visible();
    if (countEl) countEl.textContent = list.length + (list.length === 1 ? ' component' : ' components');
    grid.innerHTML = list.length
      ? list.map(cardMarkup).join('')
      : '<div class="empty">Nothing matches that search. Try a shorter word, or pick All.</div>';
    mountFrames();
  }

  /* Re-render the demos when the theme changes so they never sit light-on-dark. */
  var themeWatch = new MutationObserver(function () {
    root.querySelectorAll('.cmp-card').forEach(function (card) {
      var c = byId(card.dataset.id), f = card.querySelector('iframe');
      if (c && f) f.srcdoc = demoDoc(c.code);
    });
  });
  themeWatch.observe(document.body, { attributes: true, attributeFilter: ['class'] });

  /* ---- Actions -------------------------------------------------------- */
  function copyText(text, done) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
    } else fallback(text, done);
    function fallback(t, cb) {
      var ta = document.createElement('textarea');
      ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { }
      document.body.removeChild(ta); cb();
    }
  }

  grid.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    var c = byId(btn.closest('.cmp-card').dataset.id);
    if (!c) return;

    if (btn.dataset.act === 'copy') {
      copyText(portable(c), function () {
        if (window.toast) toast(c.name + ' copied with its styles');
      });
    } else if (btn.dataset.act === 'run') {
      if (window.savePlaygroundPayload) {
        savePlaygroundPayload({ code: portable(c), lang: 'HTML + CSS' }, c.name);
      }
    } else if (btn.dataset.act === 'save') {
      var list = store.get('snippets');
      var id = 'component-' + c.id;
      if (list.some(function (x) { return String(x.id) === id; })) {
        if (window.toast) toast(c.name + ' is already in your snippets');
        return;
      }
      var item = { id: id, title: c.name, lang: 'HTML + CSS', code: portable(c), createdAt: Date.now() };
      list.unshift(item);
      store.set('snippets', list);
      if (window.diskSaveItem) diskSaveItem('snippets', item);
      if (window.activity) activity('Saved component: ' + c.name);
      if (window.toast) toast(c.name + ' saved to Snippets');
    } else if (btn.dataset.act === 'code') {
      var body = window.buildCodePreviewMarkup
        ? buildCodePreviewMarkup(portable(c))
        : '<pre class="modal-code">' + esc(portable(c)) + '</pre>';
      openModal(
        '<div class="modal-preview-head"><div><span class="section-kicker">' + esc(c.cat) +
        '</span><h2>' + esc(c.name) + '</h2></div></div>' + body +
        '<div class="modal-footer"><button class="ghost-btn" data-close-modal>Close</button>' +
        '<button class="primary-btn" data-cmp-copy="' + esc(c.id) + '">' +
        '<i class="bx bx-copy"></i> Copy code</button></div>'
      );
    }
  });

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-cmp-copy]');
    if (!b) return;
    var c = byId(b.getAttribute('data-cmp-copy'));
    if (c) copyText(portable(c), function () { if (window.toast) toast('Code copied'); });
  });

  chipBar.addEventListener('click', function (e) {
    var b = e.target.closest('.cmp-chip');
    if (!b) return;
    state.cat = b.dataset.cat;
    chipBar.querySelectorAll('.cmp-chip').forEach(function (x) { x.classList.toggle('on', x === b); });
    render();
  });

  if (searchEl) {
    searchEl.addEventListener('input', function () { state.q = searchEl.value.trim(); render(); });
  }

  render();
})();
