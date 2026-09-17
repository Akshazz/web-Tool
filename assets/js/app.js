(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
/* --- Per-user storage scoping -------------------------------------------
   A-DevTools supports multiple community accounts, and several people can
   use the same browser/computer. Everything gamified or personal (XP,
   rank, activity feed, getting-started progress, exam results, projects,
   snippets, notes, run counts...) must never leak from one account to the
   next. index.php prints window.CURRENT_USER_ID for the signed-in
   account; every localStorage key that holds per-user data is namespaced
   under it, so logging in as someone else starts from that person's own,
   separate XP and activity — never a shared or previous user's. */
const CURRENT_USER_ID=(typeof window!=='undefined'&&window.CURRENT_USER_ID)?String(window.CURRENT_USER_ID):'guest';
function userScopedKey(k){return 'u:'+CURRENT_USER_ID+':'+k}
const store={get(k,d=[]){try{const v=localStorage.getItem(userScopedKey(k));return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){localStorage.setItem(userScopedKey(k),JSON.stringify(v))}};
const escapeHtml=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const escapeAttr=escapeHtml;
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1800)}
function activity(text){const a=store.get('activity');a.unshift({text,time:new Date().toLocaleString()});store.set('activity',a.slice(0,10));renderActivity()}
function renderActivity(){const el=$('#activityList');if(!el)return;const a=store.get('activity').slice(0,5);el.innerHTML=a.length?a.map(x=>`<div class="activity"><b><i class="bx bx-history"></i></b><div>${escapeHtml(x.text)}<div class="muted">${escapeHtml(x.time)}</div></div></div>`).join(''):'<div class="empty">No activity yet.</div>'}
/* --- Local disk mirror ---------------------------------------------------
   Projects, snippets and notes live in localStorage for instant offline
   use, but every create/update/delete is also sent to save-data.php, which
   writes a real file into the data/ folder next to this app on disk. That
   way "your data" is never only inside the browser. */
const DISK_ENDPOINT='save-data.php';
const CSRF_TOKEN=typeof window!=='undefined'&&window.CSRF_TOKEN?window.CSRF_TOKEN:null;
function diskSaveItem(type,item){
  if(!item)return;
  fetch(DISK_ENDPOINT+'?action=save-item',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,item,csrf:CSRF_TOKEN})}).catch(()=>{});
}
function diskDeleteItem(type,id){
  fetch(DISK_ENDPOINT+'?action=delete-item',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,id,csrf:CSRF_TOKEN})}).catch(()=>{});
}
function collectSnapshot(){
  return{projects:store.get('projects'),snippets:store.get('snippets'),notes:store.get('notes'),savedAt:Date.now()};
}
function saveBackupToDisk(btn){
  const b=btn||$('#saveBackupBtn');const original=b?b.innerHTML:null;
  if(b){b.disabled=true;b.innerHTML='<span class="spinner-ring sm"></span> Saving…'}
  fetch(DISK_ENDPOINT+'?action=backup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot:collectSnapshot(),csrf:CSRF_TOKEN})})
    .then(r=>r.json()).then(res=>{
      if(res&&res.ok){toast('Backup saved to disk');refreshDiskStatus()}
      else{toast('Could not save backup to disk')}
    })
    .catch(()=>toast('Could not reach the local save endpoint'))
    .finally(()=>{if(b){b.disabled=false;b.innerHTML=original}});
}
function downloadBackupFile(){
  const data=JSON.stringify(collectSnapshot(),null,2);
  const blob=new Blob([data],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const ts=new Date().toISOString().replace(/[:.]/g,'-');
  a.href=url;a.download='a-devtools-backup-'+ts+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Backup file downloading — pick Desktop or any folder to save it');
}
function applyImportedSnapshot(snapshot,mode){
  const clean=k=>Array.isArray(snapshot[k])?snapshot[k]:[];
  if(mode==='merge'){
    ['projects','snippets','notes'].forEach(k=>{
      const existing=store.get(k),incoming=clean(k);
      const byId=new Map(existing.map(x=>[String(x.id),x]));
      incoming.forEach(x=>byId.set(String(x.id),x));
      store.set(k,Array.from(byId.values()));
    });
  }else{
    ['projects','snippets','notes'].forEach(k=>store.set(k,clean(k)));
  }
  renderProjects();renderSnippets();renderNotes();updateCounts();
  activity('Imported backup ('+mode+')');
  // Mirror the merged result to disk too, so the imported data isn't only in the browser.
  fetch(DISK_ENDPOINT+'?action=restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({snapshot:collectSnapshot(),csrf:CSRF_TOKEN})})
    .then(r=>r.json()).then(res=>{if(res&&res.ok){toast('Backup imported and saved to disk');refreshDiskStatus()}else{toast('Imported into the browser, but disk save failed')}})
    .catch(()=>toast('Imported into the browser, but disk save failed'));
}
function importBackupFile(file){
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    let snapshot;
    try{snapshot=JSON.parse(reader.result)}catch(e){toast('That file is not valid JSON');return}
    if(!snapshot||typeof snapshot!=='object'||(!Array.isArray(snapshot.projects)&&!Array.isArray(snapshot.snippets)&&!Array.isArray(snapshot.notes))){
      toast('That file does not look like an A-DevTools backup');return;
    }
    const replace=confirm('Import this backup?\n\nOK = merge with your current data (matching items get overwritten)\nCancel = replace all current projects, snippets and notes with the file\'s contents');
    applyImportedSnapshot(snapshot,replace?'merge':'replace');
  };
  reader.onerror=()=>toast('Could not read that file');
  reader.readAsText(file);
}
function updateDashboardSaveStatus(res){
  const banner=$('#saveSetupBanner'),warning=$('#saveSetupWarning'),card=$('#saveStatusCard');
  if(!banner && !warning && !card)return; // not on the dashboard
  if(!res||!res.ok){
    if(banner)banner.hidden=true;
    if(card)card.hidden=true;
    if(warning)warning.hidden=false;
    return;
  }
  if(warning)warning.hidden=true;
  const hasData=store.get('projects').length||store.get('snippets').length||store.get('notes').length;
  const confirmed=localStorage.getItem('localSaveConfirmed')==='true';
  if(confirmed||hasData||res.isCustom){
    if(!confirmed)localStorage.setItem('localSaveConfirmed','true');
    if(banner)banner.hidden=true;
    if(card){card.hidden=false;const t=$('#saveStatusText');if(t)t.textContent='Saving projects, snippets, components and notes automatically to '+res.path+'.'}
  }else{
    if(card)card.hidden=true;
    if(banner)banner.hidden=false;
  }
}
function refreshDiskStatus(){
  const el=$('#diskStatusBody');
  fetch(DISK_ENDPOINT+'?action=status').then(r=>r.json()).then(res=>{
    if(!res||!res.ok){
      if(el)el.innerHTML='<p class="muted status-bad"><i class="bx bx-error-circle"></i> Local save endpoint is unavailable right now.</p>';
      updateDashboardSaveStatus(null);
      return;
    }
    const c=res.counts||{};
    const last=res.lastBackup?new Date(res.lastBackup.savedAt).toLocaleString():'No full backup yet';
    if(el)el.innerHTML=`<p class="muted"><span class="status-ok"><i class="bx bx-check-circle"></i> Connected.</span> Files are written to <code>${escapeHtml(res.path)}</code> on this computer${res.isCustom?' <span class="tag">custom location</span>':''}.</p><div class="disk-counts"><span><b>${c.projects||0}</b> projects</span><span><b>${c.snippets||0}</b> snippets</span><span><b>${c.components||0}</b> components</span><span><b>${c.notes||0}</b> notes</span></div><p class="muted">Last full backup: ${escapeHtml(last)}</p>`;
    const locInput=$('#dataLocationInput');
    if(locInput && document.activeElement!==locInput){locInput.value=res.isCustom?res.path:'';locInput.placeholder=res.default||res.path}
    updateDashboardSaveStatus(res);
  }).catch(()=>{
    if(el)el.innerHTML='<p class="muted status-bad"><i class="bx bx-error-circle"></i> Local save endpoint is unavailable right now.</p>';
    updateDashboardSaveStatus(null);
  });
}
function saveDataLocation(){
  const input=$('#dataLocationInput'),btn=$('#saveLocationBtn');if(!input)return;
  const dataDir=input.value.trim();
  if(btn){btn.disabled=true;btn.dataset.original=btn.innerHTML;btn.innerHTML='<span class="spinner-ring sm"></span> Applying…'}
  fetch(DISK_ENDPOINT+'?action=set-location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({dataDir,csrf:CSRF_TOKEN})})
    .then(r=>r.json()).then(res=>{
      if(res&&res.ok){localStorage.setItem('localSaveConfirmed','true');toast(dataDir?'Save location updated':'Save location reset to default');refreshDiskStatus()}
      else{toast((res&&res.error)||'Could not use that folder')}
    })
    .catch(()=>toast('Could not reach the local save endpoint'))
    .finally(()=>{if(btn){btn.disabled=false;btn.innerHTML=btn.dataset.original}});
}
$('#saveBackupBtn')?.addEventListener('click',e=>saveBackupToDisk(e.currentTarget));
$('#downloadBackupBtn')?.addEventListener('click',downloadBackupFile);
$('#importBackupInput')?.addEventListener('change',e=>{importBackupFile(e.target.files[0]);e.target.value=''});
$('#importBackupBtn')?.addEventListener('click',()=>$('#importBackupInput')?.click());
$('#saveLocationBtn')?.addEventListener('click',saveDataLocation);
$$('#viewBackupFolderBtn').forEach(btn=>btn.addEventListener('click',()=>{
  if(!CSRF_TOKEN){toast('Log in to open the backup folder');return}
  btn.disabled=true;
  fetch(DISK_ENDPOINT+'?action=open-folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:CSRF_TOKEN})})
    .then(r=>r.json())
    .then(res=>{
      if(res&&res.ok){toast('Opened '+res.path+' on this computer')}
      else{toast((res&&res.error)||'Could not open the backup folder')}
    })
    .catch(()=>toast('Could not reach the local save endpoint'))
    .finally(()=>{btn.disabled=false});
}));
$('#resetLocationBtn')?.addEventListener('click',()=>{const input=$('#dataLocationInput');if(input)input.value='';saveDataLocation()});
$('#saveSetupConfirm')?.addEventListener('click',()=>{localStorage.setItem('localSaveConfirmed','true');toast('Local saving confirmed — your work will keep saving automatically');refreshDiskStatus()});
refreshDiskStatus();
/* --- Backup reminder banner: shown once real data exists, dismissible --- */
const backupNotice=$('#backupNotice');
if(backupNotice && localStorage.getItem('backupNoticeDismissed')!=='true' && (store.get('projects').length||store.get('snippets').length||store.get('notes').length)){
  backupNotice.hidden=false;
}
$('#backupNoticeDownload')?.addEventListener('click',downloadBackupFile);
$('#backupNoticeDismiss')?.addEventListener('click',()=>{localStorage.setItem('backupNoticeDismissed','true');if(backupNotice)backupNotice.hidden=true});

const sidebar=$('#sidebar'),main=$('.main'),sidebarToggleBtn=$('#sidebarToggle');
function setDesktopCollapsed(collapsed){
  sidebar?.classList.toggle('collapsed',collapsed);
  main?.classList.toggle('expanded',collapsed);
  document.body.classList.toggle('sidebar-collapsed',collapsed);
  sidebarToggleBtn?.setAttribute('aria-expanded',collapsed?'false':'true');
  if(sidebarToggleBtn) sidebarToggleBtn.title=collapsed?'Expand sidebar':'Collapse sidebar';
  localStorage.setItem('sidebarCollapsed',collapsed?'true':'false');
}
$('#sidebarToggle')?.addEventListener('click',()=>{
  if(window.innerWidth<=820){sidebar?.classList.toggle('open');return}
  setDesktopCollapsed(!sidebar?.classList.contains('collapsed'));
});
setDesktopCollapsed(localStorage.getItem('sidebarCollapsed')==='true');
/* Name of the CodeMirror theme that matches the app's current light/dark
   mode - 'material-darker' in dark mode, the light 'neat' theme otherwise.
   Used both when an editor first mounts and whenever the theme toggle
   flips, so the Playground and every read-only code preview always match
   the rest of the UI instead of always looking like a dark IDE. */
function cmThemeName(){return document.body.classList.contains('dark')?'material-darker':'neat'}
/* Pushes the current cmThemeName() onto every live CodeMirror instance:
   the three Playground editors plus any already-mounted read-only
   preview panels (Snippets/UI Components "View code" modals). */
function applyCodeMirrorTheme(){
  const name=cmThemeName();
  [cmHtml,cmCss,cmJs].forEach(cm=>{if(cm){cm.setOption('theme',name);cm.refresh()}});
  $$('.code-mini-editor').forEach(el=>{if(el._cm){el._cm.setOption('theme',name);el._cm.refresh()}});
}
function setTheme(dark){document.body.classList.toggle('dark',!!dark);localStorage.setItem('theme',dark?'dark':'light');const c=$('#darkSetting');if(c)c.checked=!!dark;const ti=$('#themeToggle')?.querySelector('.bx');if(ti)ti.className='bx '+(dark?'bx-sun':'bx-moon');const tl=$('#themeToggleLabel');if(tl)tl.textContent=dark?'Light mode':'Dark mode';applyCodeMirrorTheme()}
$('#themeToggle')?.addEventListener('click',()=>setTheme(!document.body.classList.contains('dark')));
setTheme(localStorage.getItem('theme')==='dark');
$('#darkSetting')?.addEventListener('change',e=>setTheme(e.target.checked));
$('#notificationBtn')?.addEventListener('click',()=>{location.href='?page=dashboard';toast('Activity is available on the Dashboard')});
const modal=$('#modal'),modalBody=$('#modalBody');
function openModal(html,extraClass){if(!modal)return;modalBody.innerHTML=html;const box=modal.querySelector('.modal');if(box){box.classList.remove('modal-compact');if(extraClass)box.classList.add(extraClass)}modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');modalBody.querySelectorAll('.code-mini-editor.active').forEach(mountCodeEditor);setTimeout(()=>{const first=modal.querySelector('input,textarea,select,button:not(.modal-close)');first?.focus()},30)}
function closeModal(){if(!modal)return;modal.classList.remove('show');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')}
/* Exposed globally: the first-run experience picker and tour live in a separate
   script block later in the file and call these by name. */
window.openModal=openModal;
window.closeModal=closeModal;
$('#modalClose')?.addEventListener('click',closeModal);modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.classList.contains('show'))closeModal()});
function projectForm(editId){
  const p=store.get('projects'),item=editId?p.find(x=>String(x.id)===String(editId)):null;
  openModal(`<h2 id="modalTitle">${item?'Edit':'New'} Project</h2><p class="modal-subtitle">${item?'Update this local project reference.':'Create a local project reference for your workspace.'}</p><div class="form-grid"><label>Project name<input id="mName" class="input" value="${escapeAttr(item?.name||'')}" placeholder="e.g. Client Portal"></label><label>Technology<input id="mTech" class="input" value="${escapeAttr(item?.tech||'')}" placeholder="PHP, JavaScript, MySQL"></label><label class="full">Description<textarea id="mDesc" class="input" rows="5" placeholder="What are you building?">${escapeHtml(item?.desc||'')}</textarea></label></div><div class="modal-footer"><button class="ghost-btn" data-close-modal><i class="bx bx-x"></i> Cancel</button><button class="primary-btn" id="saveProject"><i class="bx bx-save"></i> ${item?'Update':'Save'} Project</button></div>`);
  $('#saveProject').onclick=()=>{const name=$('#mName').value.trim()||'Untitled Project',tech=$('#mTech').value.trim()||'Web',desc=$('#mDesc').value.trim();if(item){item.name=name;item.tech=tech;item.desc=desc;item.updatedAt=Date.now();store.set('projects',p);diskSaveItem('projects',item);awardPoints(5,'Updated project: '+name)}else{const newProject={id:Date.now(),name,tech,desc};p.unshift(newProject);store.set('projects',p);diskSaveItem('projects',newProject);awardPoints(15,'Created project: '+name);markGs('createdProject')}closeModal();renderProjects();updateCounts();toast(item?'Project updated on your local drive':'Project saved to your local drive')};
}
['newProject','newProjectHero','newProjectPage'].forEach(id=>$('#'+id)?.addEventListener('click',()=>projectForm()));
function renderProjects(){const el=$('#projectGrid');if(!el)return;const p=store.get('projects');el.innerHTML=p.length?p.map(x=>`<article class="project-card"><div class="card-title">${escapeHtml(x.name)}</div><div class="card-meta">${escapeHtml(x.tech)}</div><p>${escapeHtml(x.desc||'No description.')}</p><div class="card-actions"><button class="small-btn" data-edit-project="${escapeAttr(x.id)}"><i class="bx bx-edit"></i> Edit</button><button class="small-btn" data-delete-project="${escapeAttr(x.id)}"><i class="bx bx-trash"></i> Delete</button></div></article>`).join(''):'<div class="empty">No projects yet. Create your first project.</div>'}
$('#projectGrid')?.addEventListener('click',e=>{const editBtn=e.target.closest('[data-edit-project]');if(editBtn){projectForm(editBtn.getAttribute('data-edit-project'));return}const btn=e.target.closest('[data-delete-project]');if(!btn)return;deleteProject(btn.getAttribute('data-delete-project'))});
function deleteProject(id){const p=store.get('projects'),x=p.find(i=>String(i.id)===String(id));store.set('projects',p.filter(i=>String(i.id)!==String(id)));diskDeleteItem('projects',id);activity('Deleted project: '+(x?.name||''));renderProjects();updateCounts();toast('Project deleted')}
const starterTemplates={
 dashboard:{title:'Admin Dashboard Layout',lang:'HTML + CSS',code:`<div class="demo-shell"><header class="demo-nav"><b>A-DevTools</b><span>Dashboard · Projects · Settings</span></header><aside class="demo-side"><b>Workspace</b><a class="active">Dashboard</a><a>Projects</a><a>Snippets</a><a>Settings</a></aside><main class="demo-main"><span class="eyebrow">WORKSPACE</span><h1>Admin Dashboard</h1><p>Responsive starter layout.</p><div class="demo-stats"><article><b>24</b><span>Projects</span></article><article><b>18</b><span>Snippets</span></article><article><b>92%</b><span>Progress</span></article></div></main></div>\n<style>\nbody{margin:0;background:#f4f6f8;font:14px system-ui;color:#15171a}.demo-shell{min-height:100vh}.demo-nav{height:58px;background:#fff;border-bottom:1px solid #e2e5e8;display:flex;align-items:center;padding:0 22px;gap:25px}.demo-nav span{color:#68707a}.demo-side{position:absolute;top:58px;bottom:0;width:190px;background:#fff;border-right:1px solid #e2e5e8;padding:20px}.demo-side a,.demo-side b{display:block;padding:10px;border-radius:8px}.demo-side b{font-size:11px;text-transform:uppercase;color:#8a9198}.demo-side .active{background:#f1f3f5;font-weight:700}.demo-main{margin-left:230px;padding:38px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.12em;color:#737b83}.demo-main h1{font-size:34px;margin:8px 0}.demo-main p{color:#68707a}.demo-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}.demo-stats article{background:#fff;border:1px solid #e2e5e8;border-radius:14px;padding:20px}.demo-stats b{font-size:28px;display:block}.demo-stats span{color:#68707a}@media(max-width:700px){.demo-side{position:static;width:auto;border-right:0}.demo-main{margin:0}.demo-stats{grid-template-columns:1fr}}\n</style>`},
 landing:{title:'Responsive Landing Page',lang:'HTML + CSS',code:`<header class="demo-nav"><b>Launch</b><nav><a href="#features">Features</a><a href="#about">About</a><a href="#contact">Contact</a></nav></header><main><section class="demo-hero"><span>NEW · DEV DESK STARTER</span><h1>Build something people remember.</h1><p>A polished landing page starter with responsive cards and a strong call to action.</p><button>Get started</button></section><section id="features" class="demo-cards"><article><b>Fast</b><p>Lightweight native HTML and CSS.</p></article><article><b>Responsive</b><p>Adapts to phones, tablets and desktops.</p></article><article><b>Reusable</b><p>Simple structure you can copy and extend.</p></article></section></main><style>body{margin:0;background:#f7f8fa;color:#15171a;font:14px system-ui}.demo-nav{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 7%;background:#fff;border-bottom:1px solid #e4e7ea}.demo-nav nav{display:flex;gap:20px}.demo-nav a{color:#68707a;text-decoration:none}.demo-hero{max-width:820px;margin:70px auto 30px;text-align:center;padding:0 20px}.demo-hero span{font-size:10px;font-weight:800;letter-spacing:.12em;color:#68707a}.demo-hero h1{font-size:clamp(38px,7vw,72px);line-height:.98;letter-spacing:-.06em;margin:14px 0}.demo-hero p{max-width:600px;margin:0 auto 24px;color:#68707a;line-height:1.7}.demo-hero button{border:0;background:#15171a;color:#fff;padding:13px 19px;border-radius:10px;font-weight:700}.demo-cards{max-width:1000px;margin:50px auto;padding:0 20px;display:grid;grid-template-columns:repeat(3,1fr);gap:15px}.demo-cards article{background:#fff;border:1px solid #e4e7ea;border-radius:16px;padding:22px}.demo-cards p{color:#68707a;line-height:1.6}@media(max-width:650px){.demo-nav{padding:0 20px}.demo-nav nav{display:none}.demo-cards{grid-template-columns:1fr}}\n</style>`},
 form:{title:'Responsive Form Layout',lang:'HTML + CSS',code:`<form class="demo-form" onsubmit="event.preventDefault();document.getElementById('result').textContent='Saved successfully.'"><span class="eyebrow">PROJECT SETUP</span><h1>Create project</h1><label>Project name<input required placeholder="Client Portal"></label><label>Email<input required type="email" placeholder="you@example.com"></label><label>Project type<select><option>Website</option><option>Web application</option><option>Internal tool</option></select></label><button>Save project</button><strong id="result"></strong></form><style>body{margin:0;background:#f4f6f8;font:14px system-ui}.demo-form{max-width:480px;margin:50px auto;background:#fff;border:1px solid #e2e5e8;border-radius:18px;padding:28px;box-shadow:0 18px 50px #0000000d}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.12em;color:#68707a}.demo-form h1{margin:7px 0 24px}.demo-form label{display:grid;gap:7px;font-weight:700;margin:15px 0}.demo-form input,.demo-form select{box-sizing:border-box;width:100%;padding:12px;border:1px solid #dfe3e7;border-radius:9px;font:inherit}.demo-form button{border:0;background:#15171a;color:#fff;padding:12px 17px;border-radius:9px;font-weight:700}.demo-form strong{display:block;margin-top:14px;color:#21864b}</style>`},
 table:{title:'Responsive Data Table',lang:'HTML + CSS',code:`<section class="table-wrap"><div class="table-head"><div><span>PROJECTS</span><h1>Recent work</h1></div><button>Export</button></div><div class="scroll"><table><thead><tr><th>Project</th><th>Owner</th><th>Status</th><th>Updated</th></tr></thead><tbody><tr><td>Client Portal</td><td>Admin</td><td><em>Active</em></td><td>Today</td></tr><tr><td>Billing System</td><td>Team</td><td><em>Review</em></td><td>Yesterday</td></tr><tr><td>Landing Page</td><td>Design</td><td><em>Draft</em></td><td>2 days ago</td></tr></tbody></table></div></section><style>body{margin:0;background:#f5f6f8;font:13px system-ui;color:#15171a}.table-wrap{margin:30px auto;max-width:850px;background:#fff;border:1px solid #e1e5e9;border-radius:16px;overflow:hidden}.table-head{display:flex;justify-content:space-between;align-items:center;padding:22px;border-bottom:1px solid #e1e5e9}.table-head span{font-size:10px;font-weight:800;color:#68707a}.table-head h1{margin:4px 0 0;font-size:24px}.table-head button{border:0;background:#15171a;color:#fff;padding:10px 14px;border-radius:8px}.scroll{overflow:auto}table{width:100%;min-width:620px;border-collapse:collapse}th,td{text-align:left;padding:14px 20px;border-bottom:1px solid #edf0f2}th{font-size:10px;text-transform:uppercase;color:#68707a;background:#fafbfc}em{font-style:normal;border:1px solid #dce1e5;border-radius:20px;padding:4px 8px;font-size:11px}</style>`},
 modal:{title:'JavaScript Modal Pattern',lang:'HTML + JS',code:`<button class="open" onclick="openDialog()">Open interactive modal</button><div id="dialog" class="backdrop" hidden><div class="dialog" role="dialog" aria-modal="true"><button class="x" onclick="closeDialog()">×</button><span>CONFIRMATION</span><h2>Delete project?</h2><p>This is a working modal example. Try the buttons.</p><div><button onclick="closeDialog()">Cancel</button><button class="danger" onclick="closeDialog();document.getElementById('msg').textContent='Action completed.'">Confirm</button></div></div></div><p id="msg"></p><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:14px system-ui;background:#f4f6f8}.open,.dialog button{border:0;border-radius:9px;padding:11px 16px;background:#15171a;color:#fff;font-weight:700}.backdrop{position:fixed;inset:0;background:#0008;display:grid;place-items:center;padding:20px}.dialog{position:relative;width:min(430px,100%);background:#fff;border-radius:18px;padding:28px;box-shadow:0 25px 80px #0005}.dialog span{font-size:10px;font-weight:800;color:#68707a;letter-spacing:.1em}.dialog h2{margin:8px 0}.dialog p{color:#68707a;line-height:1.6}.dialog>div{display:flex;justify-content:flex-end;gap:8px}.dialog .danger{background:#c83b32}.x{position:absolute;right:12px;top:12px!important;padding:5px 10px!important;background:#eef0f2!important;color:#15171a!important}</style><script>function openDialog(){document.getElementById('dialog').hidden=false}function closeDialog(){document.getElementById('dialog').hidden=true}</script>`},
 navbar:{title:'Responsive Navigation Pattern',lang:'HTML + CSS + JS',code:`<nav class="nav" id="nav"><b>DevTool</b><div class="links"><a href="#">Home</a><a href="#">Projects</a><a href="#">Docs</a></div><button onclick="toggleNav()" aria-expanded="false">Menu</button></nav><main><h1>Responsive navigation</h1><p>Resize the preview and use Menu to test the mobile state.</p></main><style>body{margin:0;font:14px system-ui;background:#f6f7f9;color:#15171a}.nav{height:62px;padding:0 25px;background:#fff;border-bottom:1px solid #e2e5e8;display:flex;align-items:center;gap:25px}.links{display:flex;gap:18px;margin-left:auto}.links a{text-decoration:none;color:#68707a}.nav button{display:none;border:0;background:#15171a;color:#fff;padding:9px 12px;border-radius:8px}main{max-width:800px;margin:90px auto;padding:20px}main p{color:#68707a}@media(max-width:600px){.nav button{display:block;margin-left:auto}.links{display:none}.nav.responsive{height:auto;min-height:62px;flex-wrap:wrap;padding-bottom:14px}.nav.responsive .links{display:flex;order:3;width:100%;flex-direction:column}}\n</style><script>function toggleNav(){const n=document.getElementById('nav');n.classList.toggle('responsive');document.querySelector('.nav button').setAttribute('aria-expanded',n.classList.contains('responsive'))}</script>`}
};

/* Render real, live thumbnails for the starter library instead of hand-drawn skeleton boxes */
function renderStarterPreviews(){
  const VIRTUAL_WIDTH=1280;
  $$('.starter-preview[data-template]').forEach(box=>{
    const key=box.getAttribute('data-template');
    const tpl=starterTemplates[key];
    if(!tpl) return;
    const cw=box.clientWidth||340, ch=box.clientHeight||150;
    if(!cw||!ch) return;
    const scale=cw/VIRTUAL_WIDTH;
    let frame=box.querySelector('.preview-frame');
    if(!frame){
      frame=document.createElement('iframe');
      frame.className='preview-frame';
      frame.setAttribute('tabindex','-1');
      frame.setAttribute('aria-hidden','true');
      frame.setAttribute('title','');
      box.appendChild(frame);
    }
    frame.style.width=VIRTUAL_WIDTH+'px';
    frame.style.height=Math.ceil(ch/scale)+'px';
    frame.style.transform='scale('+scale+')';
    frame.style.transformOrigin='top left';
    if(frame.dataset.loadedTemplate!==key){
      frame.srcdoc=tpl.code;
      frame.dataset.loadedTemplate=key;
    }
    box.classList.add('preview-rendered');
  });
}
window.addEventListener('load',renderStarterPreviews);
let previewResizeTimer;
window.addEventListener('resize',()=>{clearTimeout(previewResizeTimer);previewResizeTimer=setTimeout(renderStarterPreviews,150)});

function savePlaygroundPayload(payload,title){
  sessionStorage.setItem('adevtoolsPlayground',JSON.stringify(payload));
  sessionStorage.setItem('adevtoolsPlaygroundTitle',title||'Snippet');
  location.href='?page=code';
}
function runStarter(key){const t=starterTemplates[key];if(!t)return;bumpStarterRun(key);savePlaygroundPayload({code:t.code,lang:t.lang},t.title)}
/* --- Popularity ranking ---------------------------------------------------
   Every time a starter template or a saved snippet is run in the Playground,
   we count it. That count powers three things: a "Most popular" sort on the
   Starter Library, a "Most run" sort on saved Snippets, and a small
   leaderboard panel on the Code Playground page itself — all purely local,
   no account or server-side data involved. */
function bumpStarterRun(key){
  const counts=store.get('starterRunCounts',{});
  counts[key]=(counts[key]||0)+1;
  store.set('starterRunCounts',counts);
  renderStarterRanking();
  renderPlaygroundLeaderboard();
  awardPoints(3,'Ran starter: '+(starterTemplates[key]?.title||key));
}
function bumpSnippetRun(id){
  const list=store.get('snippets'),x=list.find(i=>String(i.id)===String(id));
  if(!x)return;
  x.runCount=(x.runCount||0)+1;
  store.set('snippets',list);
  diskSaveItem('snippets',x);
  renderSnippets();
  renderPlaygroundLeaderboard();
  awardPoints(3,'Ran snippet: '+x.title);
}
function computeLeaderboard(){
  const starterCounts=store.get('starterRunCounts',{});
  const starterItems=Object.keys(starterTemplates).map(key=>({title:starterTemplates[key].title,type:'Starter',runs:starterCounts[key]||0}));
  const snippetItems=store.get('snippets').map(s=>({title:s.title,type:'Snippet',runs:s.runCount||0}));
  return starterItems.concat(snippetItems).filter(x=>x.runs>0).sort((a,b)=>b.runs-a.runs).slice(0,5);
}
function renderPlaygroundLeaderboard(){
  const el=$('#leaderboardList');if(!el)return;
  const top=computeLeaderboard();
  el.innerHTML=top.length?top.map((x,i)=>`<div class="leaderboard-row"><span class="rank-num rank-${i+1}">#${i+1}</span><span class="lb-title">${escapeHtml(x.title)}</span><span class="tag">${escapeHtml(x.type)}</span><span class="lb-runs">${x.runs} run${x.runs===1?'':'s'}</span></div>`).join(''):'<div class="empty">Run a starter or a snippet to see rankings here.</div>';
}
function renderStarterRanking(){
  const grid=$('.starter-grid');if(!grid)return;
  const sort=$('#starterSort')?.value||'featured';
  const counts=store.get('starterRunCounts',{});
  const cards=Array.from(grid.querySelectorAll('.starter-card'));
  cards.forEach(card=>{card.dataset.key=card.querySelector('[data-template]')?.getAttribute('data-template')||''});
  const originalOrder=cards.slice();
  const byPopularity=cards.slice().sort((a,b)=>(counts[b.dataset.key]||0)-(counts[a.dataset.key]||0));
  const ordered=sort==='popular'?byPopularity:originalOrder;
  ordered.forEach(card=>grid.appendChild(card));
  cards.forEach(card=>{
    const badge=card.querySelector('[data-rank-badge]');if(!badge)return;
    const runs=counts[card.dataset.key]||0;
    const rank=byPopularity.indexOf(card)+1;
    if(sort==='popular'&&runs>0&&rank<=3){badge.hidden=false;badge.textContent='#'+rank+' Most Popular';badge.className='rank-badge rank-'+rank}
    else{badge.hidden=true}
  });
}
$('#starterSort')?.addEventListener('change',renderStarterRanking);
/* Starter snippet library.
   Seeded by id, not by "is the list empty", so people who already had the
   first three samples still receive the ones added later. A sample is only
   inserted when no snippet with that id is present, so nothing the person
   wrote is overwritten. One caveat: a sample they deleted comes back once on
   the next seed-version bump, since deletions are not tracked separately. */
const SAMPLE_SNIPPETS=[
  {id:'sample-sidebar',title:'Responsive Sidebar',lang:'HTML + CSS',code:`<aside class="sidebar"><a class="active">Dashboard</a><a>Projects</a><a>Settings</a></aside><main class="content"><h1>Responsive workspace</h1><p>Resize the page to test the layout.</p></main><style>body{margin:0;font:14px system-ui}.sidebar{position:fixed;width:210px;height:100vh;padding:20px;background:#fff;border-right:1px solid #ddd}.sidebar a{display:block;padding:10px;border-radius:8px}.active{background:#eee}.content{margin-left:250px;padding:35px}@media(max-width:700px){.sidebar{position:relative;width:auto;height:auto}.content{margin-left:0}}</style>`},
  {id:'sample-cards',title:'Responsive Card Grid',lang:'CSS',code:`.card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.card{padding:20px;border:1px solid #ddd;border-radius:14px;background:#fff}`},
  {id:'sample-modal',title:'Simple Modal',lang:'HTML + JS',code:`<button onclick="openModal()">Open</button><div id="modal" class="modal" hidden><div class="box"><button onclick="closeModal()">Close</button><h2>Hello</h2><p>Working JavaScript modal.</p></div></div><style>.modal{position:fixed;inset:0;background:#0008;display:grid;place-items:center}.box{background:#fff;padding:25px;border-radius:14px}</style><script>function openModal(){document.getElementById('modal').hidden=false}function closeModal(){document.getElementById('modal').hidden=true}<\/script>`},

  {id:'sample-flex-center',title:'Centre Anything',lang:'CSS',code:`/* Three ways to centre a box. Pick one. */
.centre-grid{display:grid;place-items:center;min-height:100vh}
.centre-flex{display:flex;align-items:center;justify-content:center;min-height:100vh}
.centre-abs{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)}`},
  {id:'sample-sticky-header',title:'Sticky Header on Scroll',lang:'HTML + CSS + JS',code:`<header id="bar"><b>A-DevTools</b><nav><a href="#">Docs</a><a href="#">Pricing</a></nav></header><main><p>Scroll down — the header gets a shadow once you leave the top.</p></main><style>body{margin:0;font:15px system-ui}#bar{position:sticky;top:0;display:flex;justify-content:space-between;align-items:center;padding:18px 24px;background:#fff;transition:padding .2s,box-shadow .2s}#bar.small{padding:11px 24px;box-shadow:0 6px 20px rgba(0,0,0,.09)}nav a{margin-left:16px;color:#555;text-decoration:none}main{height:200vh;padding:40px 24px}</style><script>addEventListener('scroll',function(){document.getElementById('bar').classList.toggle('small',scrollY>32)});<\/script>`},
  {id:'sample-form-validate',title:'Form Validation',lang:'HTML + JS',code:`<form id="f" novalidate><label>Email<input name="email" type="email" required></label><label>Password<input name="pw" type="password" minlength="8" required></label><button>Create account</button><p id="msg"></p></form><style>body{font:14px system-ui;padding:24px}label{display:block;margin-bottom:14px}input{display:block;width:100%;max-width:300px;padding:9px;margin-top:5px;border:1px solid #ccc;border-radius:8px}input:invalid.touched{border-color:#c0392b}button{padding:10px 16px;border-radius:8px;border:0;background:#111;color:#fff}#msg{color:#2d8a42}</style><script>
var f=document.getElementById('f');
f.addEventListener('submit',function(e){
  e.preventDefault();
  var ok=true;
  [].forEach.call(f.elements,function(el){
    if(!el.name)return;
    el.classList.add('touched');
    if(!el.checkValidity())ok=false;
  });
  document.getElementById('msg').textContent=ok?'Account created.':'';
});
<\/script>`},
  {id:'sample-fetch',title:'Fetch with Error Handling',lang:'JavaScript',code:`async function loadProjects(){
  const list=document.getElementById('list');
  list.textContent='Loading…';
  try{
    const res=await fetch('/api/projects.php',{headers:{'Accept':'application/json'}});
    if(!res.ok)throw new Error('Server returned '+res.status);
    const data=await res.json();
    list.textContent=data.length?'':'No projects yet.';
    data.forEach(p=>{
      const li=document.createElement('li');
      li.textContent=p.name;
      list.appendChild(li);
    });
  }catch(err){
    list.textContent='Could not load projects: '+err.message;
  }
}`},
  {id:'sample-debounce',title:'Debounce and Throttle',lang:'JavaScript',code:`/* Debounce: run once the calls stop. Good for search inputs. */
function debounce(fn,wait){
  let t;
  return function(...args){clearTimeout(t);t=setTimeout(()=>fn.apply(this,args),wait)};
}

/* Throttle: run at most once per interval. Good for scroll and resize. */
function throttle(fn,every){
  let last=0;
  return function(...args){
    const now=Date.now();
    if(now-last>=every){last=now;fn.apply(this,args)}
  };
}

const search=debounce(q=>console.log('searching',q),300);`},
  {id:'sample-localstorage',title:'Safe localStorage Wrapper',lang:'JavaScript',code:`/* localStorage throws in private mode and on quota errors, so wrap it. */
const store={
  get(key,fallback=null){
    try{const v=localStorage.getItem(key);return v===null?fallback:JSON.parse(v)}
    catch(e){return fallback}
  },
  set(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true}
    catch(e){console.warn('Storage full or unavailable:',e.name);return false}
  },
  remove(key){try{localStorage.removeItem(key)}catch(e){}}
};`},
  {id:'sample-dark-toggle',title:'Dark Mode Toggle',lang:'HTML + CSS + JS',code:`<button id="t">Toggle theme</button><h1>Readable in both themes</h1><p>The choice is remembered, and the first visit follows your system setting.</p><style>:root{--bg:#fff;--fg:#111}body.dark{--bg:#111;--fg:#f2f2f2}body{margin:0;padding:34px;background:var(--bg);color:var(--fg);font:15px system-ui;transition:background .2s,color .2s}button{padding:9px 14px;border-radius:8px;border:1px solid currentColor;background:transparent;color:inherit}</style><script>
var saved=localStorage.getItem('theme');
var dark=saved?saved==='dark':matchMedia('(prefers-color-scheme:dark)').matches;
function apply(){document.body.classList.toggle('dark',dark);localStorage.setItem('theme',dark?'dark':'light')}
document.getElementById('t').onclick=function(){dark=!dark;apply()};
apply();
<\/script>`},
  {id:'sample-accordion',title:'Accordion (no JavaScript)',lang:'HTML + CSS',code:`<details open><summary>What is saved locally?</summary><p>Projects, snippets and notes.</p></details><details><summary>Can I export it?</summary><p>Yes — Settings has a backup file download.</p></details><style>body{font:15px system-ui;padding:24px}details{border:1px solid #e3e5e8;border-radius:12px;margin-bottom:9px;background:#fff}summary{padding:13px 16px;cursor:pointer;font-weight:650;list-style:none;display:flex;justify-content:space-between}summary::-webkit-details-marker{display:none}summary::after{content:'+';color:#888}details[open] summary::after{content:'–'}details p{margin:0;padding:0 16px 14px;color:#666}</style>`},
  {id:'sample-toast',title:'Toast Notifications',lang:'HTML + CSS + JS',code:`<button onclick="toast('Saved to disk')">Save</button><button onclick="toast('Could not connect',true)">Fail</button><div id="toasts"></div><style>body{font:15px system-ui;padding:24px}button{margin-right:8px;padding:9px 14px;border-radius:8px;border:1px solid #ddd;background:#fff}#toasts{position:fixed;right:18px;bottom:18px;display:flex;flex-direction:column;gap:8px}#toasts div{padding:11px 15px;border-radius:10px;background:#111;color:#fff;font-size:13px;box-shadow:0 12px 30px rgba(0,0,0,.22);animation:in .2s ease}#toasts div.bad{background:#b42318}@keyframes in{from{opacity:0;transform:translateY(10px)}}</style><script>
function toast(text,bad){
  var d=document.createElement('div');
  d.textContent=text;if(bad)d.className='bad';
  document.getElementById('toasts').appendChild(d);
  setTimeout(function(){d.remove()},2400);
}
<\/script>`},
  {id:'sample-tabs',title:'Accessible Tabs',lang:'HTML + CSS + JS',code:`<div role="tablist"><button role="tab" aria-selected="true" aria-controls="a">Overview</button><button role="tab" aria-selected="false" aria-controls="b">Files</button></div><div id="a" role="tabpanel"><p>Arrow keys move between tabs.</p></div><div id="b" role="tabpanel" hidden><p>Only the visible panel stays in the page.</p></div><style>body{font:15px system-ui;padding:24px}[role=tablist]{display:flex;border-bottom:1px solid #e3e5e8}[role=tab]{border:0;background:transparent;padding:12px 18px;color:#777;font-weight:650;box-shadow:inset 0 -2px transparent}[role=tab][aria-selected=true]{color:#111;box-shadow:inset 0 -2px #111}[role=tabpanel]{padding:16px 0}</style><script>
var tabs=[].slice.call(document.querySelectorAll('[role=tab]'));
function select(t){
  tabs.forEach(function(x){
    var on=x===t;
    x.setAttribute('aria-selected',on);x.tabIndex=on?0:-1;
    document.getElementById(x.getAttribute('aria-controls')).hidden=!on;
  });
  t.focus();
}
tabs.forEach(function(t,i){
  t.addEventListener('click',function(){select(t)});
  t.addEventListener('keydown',function(e){
    if(e.key==='ArrowRight')select(tabs[(i+1)%tabs.length]);
    if(e.key==='ArrowLeft')select(tabs[(i-1+tabs.length)%tabs.length]);
  });
});
<\/script>`},
  {id:'sample-table',title:'Sortable Table',lang:'HTML + CSS + JS',code:`<table id="t"><thead><tr><th>Project</th><th>Owner</th><th>Status</th></tr></thead><tbody><tr><td>Checkout</td><td>Ana</td><td>Live</td></tr><tr><td>Billing</td><td>Marco</td><td>Draft</td></tr><tr><td>Auth</td><td>Ken</td><td>Blocked</td></tr></tbody></table><style>body{font:14px system-ui;padding:24px}table{border-collapse:collapse;width:100%;max-width:520px;background:#fff}th,td{padding:11px 14px;text-align:left;border-bottom:1px solid #e3e5e8}th{background:#f6f7f8;cursor:pointer;user-select:none;font-size:12px;color:#666}tr:hover td{background:#fafafa}</style><script>
var body=document.querySelector('#t tbody');
[].forEach.call(document.querySelectorAll('#t th'),function(th,col){
  var asc=true;
  th.addEventListener('click',function(){
    var rows=[].slice.call(body.rows);
    rows.sort(function(a,b){
      return a.cells[col].textContent.localeCompare(b.cells[col].textContent)*(asc?1:-1);
    });
    asc=!asc;
    rows.forEach(function(r){body.appendChild(r)});
  });
});
<\/script>`},
  {id:'sample-grid-areas',title:'App Layout with Grid Areas',lang:'CSS',code:`.app{
  display:grid;
  min-height:100vh;
  grid-template-columns:240px 1fr;
  grid-template-rows:64px 1fr auto;
  grid-template-areas:
    "head head"
    "side main"
    "side foot";
}
.app > header{grid-area:head}
.app > aside{grid-area:side}
.app > main{grid-area:main}
.app > footer{grid-area:foot}

@media(max-width:780px){
  .app{
    grid-template-columns:1fr;
    grid-template-areas:"head" "main" "foot";
  }
  .app > aside{display:none}
}`},
  {id:'sample-truncate',title:'Truncate Text Cleanly',lang:'CSS',code:`/* One line */
.truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Exactly N lines, with an ellipsis on the last one */
.clamp{
  display:-webkit-box;
  -webkit-line-clamp:3;
  -webkit-box-orient:vertical;
  overflow:hidden;
}

/* Long URLs and code that would otherwise blow out the layout */
.break-anywhere{overflow-wrap:anywhere;word-break:break-word}`},
  {id:'sample-php-pdo',title:'PHP: Safe PDO Query',lang:'PHP',code:`<?php
// Prepared statements are the whole defence against SQL injection.
$pdo = new PDO(
    'mysql:host=localhost;dbname=a_devtools;charset=utf8mb4',
    $user,
    $pass,
    [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ]
);

$stmt = $pdo->prepare('SELECT id, name FROM projects WHERE owner_id = ? ORDER BY updated_at DESC');
$stmt->execute([$ownerId]);

foreach ($stmt as $row) {
    echo htmlspecialchars($row['name'], ENT_QUOTES, 'UTF-8'), "\n";
}`},
  {id:'sample-php-json',title:'PHP: JSON API Endpoint',lang:'PHP',code:`<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

try {
    $raw   = file_get_contents('php://input');
    $input = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);

    if (empty($input['name'])) {
        http_response_code(422);
        echo json_encode(['error' => 'Name is required.']);
        exit;
    }

    // ... save it ...

    echo json_encode(['ok' => true, 'id' => 12]);
} catch (JsonException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Body must be valid JSON.']);
}`},
  {id:'sample-css-vars',title:'Theme Tokens with CSS Variables',lang:'CSS',code:`:root{
  --bg:#f5f6f8;
  --surface:#fff;
  --text:#15171a;
  --muted:#68707a;
  --border:#e3e6ea;
  --accent:#111214;
  --radius:12px;
}

body.dark{
  --bg:#0e0f10;
  --surface:#151718;
  --text:#f3f4f5;
  --muted:#9ca3aa;
  --border:#2a2e32;
  --accent:#f3f4f5;
}

.card{
  background:var(--surface);
  color:var(--text);
  border:1px solid var(--border);
  border-radius:var(--radius);
}

/* Derive related shades instead of hand-picking them */
.card--accent{border-color:color-mix(in srgb,var(--accent) 40%,var(--border))}`},
  {id:'sample-a11y',title:'Accessibility Starter Kit',lang:'HTML + CSS',code:`<a class="skip" href="#main">Skip to main content</a>
<main id="main" tabindex="-1">
  <h1>One h1 per page</h1>
  <button aria-expanded="false" aria-controls="panel">Details</button>
  <div id="panel" hidden>Toggled content.</div>
  <img src="chart.png" alt="Revenue rose from 2 to 9 million across 2024">
  <span class="sr-only">Read by screen readers, invisible on screen.</span>
</main>
<style>
.skip{position:absolute;left:-9999px}
.skip:focus{left:12px;top:12px;padding:10px 14px;background:#111;color:#fff;border-radius:8px;z-index:99}
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
:focus-visible{outline:2px solid currentColor;outline-offset:2px}
@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;transition-duration:.01ms!important}}
</style>`}
];

/* Sample seeding is turned off — Your Library now only ever holds what you
   explicitly click Save on. This runs once to strip out any sample-* items
   an earlier version already added, then never runs again. */
function ensureSampleSnippets(){
  if(localStorage.getItem(userScopedKey('samplesRemoved'))==='true')return;
  const list=store.get('snippets');
  const kept=list.filter(x=>!String(x.id).startsWith('sample-'));
  if(kept.length!==list.length){
    store.set('snippets',kept);
    list.filter(x=>String(x.id).startsWith('sample-')).forEach(x=>diskDeleteItem('snippets',x.id));
  }
  localStorage.setItem(userScopedKey('samplesRemoved'),'true');
}
function snippetForm(editId){
  const list=store.get('snippets'),item=editId?list.find(x=>String(x.id)===String(editId)):null;
  openModal(`<h2>${item?'Edit':'Add'} Snippet</h2><p class="modal-subtitle">Save reusable code and run it directly from your library.</p><div class="form-grid"><label>Title<input id="sTitle" class="input" value="${escapeAttr(item?.title||'')}" placeholder="Responsive card"></label><label>Language<select id="sLang" class="input"><option>HTML + CSS</option><option>HTML + JS</option><option>HTML + CSS + JS</option><option>CSS</option><option>JavaScript</option></select></label><label class="full">Code<textarea id="sCode" class="modal-code" rows="15" placeholder="Paste runnable code here">${escapeHtml(item?.code||'')}</textarea></label></div><div class="modal-footer"><button class="ghost-btn" data-close-modal><i class="bx bx-x"></i> Cancel</button><button class="primary-btn" id="saveSnippet"><i class="bx bx-save"></i> ${item?'Update':'Save'} Snippet</button></div>`);
  if(item)$('#sLang').value=item.lang;
  $('#saveSnippet').onclick=()=>{const title=$('#sTitle').value.trim()||'Untitled Snippet',lang=$('#sLang').value,code=$('#sCode').value;if(!code.trim()){toast('Add some code first');$('#sCode').focus();return}if(item){item.title=title;item.lang=lang;item.code=code;item.updatedAt=Date.now();store.set('snippets',list);diskSaveItem('snippets',item);awardPoints(3,'Updated snippet: '+title)}else{const newSnippet={id:Date.now(),title,lang,code,source:'snippet',createdAt:Date.now()};list.unshift(newSnippet);store.set('snippets',list);diskSaveItem('snippets',newSnippet);awardPoints(10,'Saved snippet: '+title);markGs('savedSnippet')}closeModal();renderSnippets();updateCounts();toast(item?'Snippet updated':'Snippet saved to your local drive')};
}
$('#addSnippet')?.addEventListener('click',()=>snippetForm());

function copySnippet(id){const x=store.get('snippets').find(i=>String(i.id)===String(id));if(!x)return;const done=()=>{awardPoints(2,'Copied snippet: '+x.title);toast('Snippet copied')};if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(x.code).then(done).catch(()=>fallbackCopy(x.code,done));else fallbackCopy(x.code,done)}
function fallbackCopy(text,done){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}finally{ta.remove()}}
function deleteSnippet(id){const list=store.get('snippets'),x=list.find(i=>String(i.id)===String(id));if(!x)return;if(!confirm('Delete this snippet?'))return;store.set('snippets',list.filter(i=>String(i.id)!==String(id)));diskDeleteItem('snippets',id);activity('Deleted snippet: '+x.title);renderSnippets();updateCounts();toast('Snippet deleted')}
function previewSnippet(id){const x=store.get('snippets').find(i=>String(i.id)===String(id));if(!x)return;markGs('viewedSnippet');openModal(`<div class="modal-preview-head"><div><span class="section-kicker">${escapeHtml(x.lang)}</span><h2>${escapeHtml(x.title)}</h2></div><button class="primary-btn" data-run-snippet="${escapeAttr(x.id)}"><i class="bx bx-play"></i> Run in Playground</button></div>${buildCodePreviewMarkup(x.code)}<div class="modal-footer"><button class="ghost-btn" data-close-modal>Close</button><button class="primary-btn" data-copy-preview="${escapeAttr(x.id)}"><i class="bx bx-copy"></i> Copy code</button></div>`)}
/* Saved Snippets and Saved Components each have their own page and grid
   now (no more shared "Your Library" panel with tabs). Components saved
   from the UI Components page (components.js) are still written into this
   same `snippets` store — there's only ever been one list — but tagged
   source:'component' and their component category (Actions, Forms,
   Feedback...) at save time. Items saved before this existed have neither
   field, so both are recovered with a fallback: the 'component-' id prefix
   that component saves have always used identifies the source, and the
   snippet's own language stands in for a category on the plain-snippet
   side (components fall back to 'Other' there, since every saved component
   recorded the same generic lang). */
function snippetSource(x){return x.source||(String(x.id).indexOf('component-')===0?'component':'snippet')}
function snippetCategory(x){return x.category||(snippetSource(x)==='component'?'Other':(x.lang||'Other'))}
function renderSavedGrid(source,ids,emptyMsg){
  const el=$('#'+ids.grid);if(!el)return;
  const list=store.get('snippets').filter(x=>snippetSource(x)===source);
  const q=($('#'+ids.search)?.value||'').trim().toLowerCase(),filter=$('#'+ids.filter)?.value||'all',sort=$('#'+ids.sort)?.value||'recent';
  const pageCount=$('#'+ids.pageCount);if(pageCount)pageCount.textContent=list.length;
  let filtered=list.filter(x=>(filter==='all'||x.lang===filter)&&(!q||(x.title+' '+x.lang+' '+x.code).toLowerCase().includes(q)));
  if(sort==='name')filtered.sort((a,b)=>a.title.localeCompare(b.title));else if(sort==='language')filtered.sort((a,b)=>a.lang.localeCompare(b.lang)||a.title.localeCompare(b.title));else if(sort==='popular')filtered.sort((a,b)=>(b.runCount||0)-(a.runCount||0)||a.title.localeCompare(b.title));else filtered.sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0));
  if(!filtered.length){el.innerHTML='<div class="empty">'+emptyMsg+'</div>';return}
  const groups=[],groupIndex={};
  filtered.forEach(x=>{const cat=snippetCategory(x);if(!(cat in groupIndex)){groupIndex[cat]=groups.length;groups.push({cat,items:[]})}groups[groupIndex[cat]].items.push(x)});
  groups.sort((a,b)=>a.cat.localeCompare(b.cat));
  el.innerHTML=groups.map(g=>'<div class="snippet-cat-group"><div class="snippet-cat-heading">'+escapeHtml(g.cat)+' <span class="count-pill">'+g.items.length+'</span></div><div class="snippet-grid">'+g.items.map((x,i)=>{const rank=sort==='popular'&&(x.runCount||0)>0&&i<3?i+1:0;return `<article class="snippet-card"><div class="snippet-card-top"><div>${rank?`<span class="rank-badge rank-${rank}">#${rank} Most Run</span>`:''}<span class="tag">${escapeHtml(x.lang)}</span><div class="card-title">${escapeHtml(x.title)}</div></div><span class="snippet-live"><i></i> Runnable</span></div><pre class="code-mini">${escapeHtml(x.code)}</pre><div class="card-actions"><div class="action-left"><button class="small-btn run-snippet" data-run-snippet="${escapeAttr(x.id)}"><i class="bx bx-play"></i> Run</button><button class="small-btn" data-copy-snippet="${escapeAttr(x.id)}"><i class="bx bx-copy"></i> Copy</button><button class="small-btn" data-preview-snippet="${escapeAttr(x.id)}"><i class="bx bx-show"></i> Preview</button></div><div class="action-right"><button class="small-btn" data-edit-snippet="${escapeAttr(x.id)}"><i class="bx bx-edit"></i></button><button class="small-btn" data-delete-snippet="${escapeAttr(x.id)}"><i class="bx bx-trash"></i></button></div></div><div class="muted snippet-runs">${x.runCount||0} run${(x.runCount||0)===1?'':'s'}</div></article>`}).join('')+'</div></div>').join('');
}
const SAVED_SNIPPETS_IDS={grid:'savedSnippetsGrid',search:'savedSnippetsSearch',filter:'savedSnippetsFilter',sort:'savedSnippetsSort',pageCount:'savedSnippetsPageCount'};
const SAVED_COMPONENTS_IDS={grid:'savedComponentsGrid',search:'savedComponentsSearch',filter:'savedComponentsFilter',sort:'savedComponentsSort',pageCount:'savedComponentsPageCount'};
function renderSavedSnippets(){renderSavedGrid('snippet',SAVED_SNIPPETS_IDS,'No snippets match the current filter.')}
function renderSavedComponents(){renderSavedGrid('component',SAVED_COMPONENTS_IDS,'No saved components yet — save one from the UI Components page.')}
/* Whichever of the two saved pages (if either) is currently open, this
   refreshes it. Safe to call from anywhere (add/edit/delete/run a snippet,
   import a backup, etc.) since renderSavedGrid no-ops when its grid isn't
   on the current page. */
function renderSnippets(){renderSavedSnippets();renderSavedComponents()}
function handleSavedGridClick(e){
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.runSnippet){const x=store.get('snippets').find(i=>String(i.id)===String(b.dataset.runSnippet));if(x){bumpSnippetRun(x.id);savePlaygroundPayload({code:x.code,lang:x.lang},x.title)}}
  else if(b.dataset.copySnippet)copySnippet(b.dataset.copySnippet);
  else if(b.dataset.previewSnippet)previewSnippet(b.dataset.previewSnippet);
  else if(b.dataset.editSnippet)snippetForm(b.dataset.editSnippet);
  else if(b.dataset.deleteSnippet)deleteSnippet(b.dataset.deleteSnippet);
}
$('#savedSnippetsGrid')?.addEventListener('click',handleSavedGridClick);
$('#savedComponentsGrid')?.addEventListener('click',handleSavedGridClick);
['savedSnippetsSearch','savedSnippetsFilter','savedSnippetsSort'].forEach(id=>$('#'+id)?.addEventListener(id==='savedSnippetsSearch'?'input':'change',renderSavedSnippets));
['savedComponentsSearch','savedComponentsFilter','savedComponentsSort'].forEach(id=>$('#'+id)?.addEventListener(id==='savedComponentsSearch'?'input':'change',renderSavedComponents));
$$('.view-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.view-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');const grid=$('#savedSnippetsGrid')||$('#savedComponentsGrid');grid?.classList.toggle('snippet-list',btn.dataset.view==='list');localStorage.setItem('snippetView',btn.dataset.view)}));
if(localStorage.getItem('snippetView')==='list')$('.view-btn[data-view="list"]')?.click();
$$('.run-template').forEach(btn=>btn.addEventListener('click',()=>runStarter(btn.dataset.template)));
function saveStarterToLibrary(key){
  const t=starterTemplates[key];if(!t)return;
  const id='starter-'+key;
  const list=store.get('snippets');
  if(list.some(x=>String(x.id)===id)){toast(t.title+' is already in your snippets');return}
  const item={id,title:t.title,lang:t.lang,code:t.code,source:'snippet',createdAt:Date.now()};
  list.unshift(item);
  store.set('snippets',list);
  diskSaveItem('snippets',item);
  awardPoints(8,'Saved starter: '+t.title);
  markGs('savedSnippet');
  renderSnippets();updateCounts();
  toast(t.title+' saved to Snippets');
}
$$('.save-template').forEach(btn=>btn.addEventListener('click',()=>saveStarterToLibrary(btn.dataset.template)));
$$('.preview-template').forEach(btn=>btn.addEventListener('click',()=>{const t=starterTemplates[btn.dataset.template];if(!t)return;markGs('viewedSnippet');openModal(`<div class="modal-preview-head"><div><span class="section-kicker">${escapeHtml(t.lang)}</span><h2>${escapeHtml(t.title)}</h2></div><button class="primary-btn" data-run-template="${escapeAttr(btn.dataset.template)}"><i class="bx bx-play"></i> Run in Playground</button></div>${buildCodePreviewMarkup(t.code,'preview-code-large')}`)}));
modal?.addEventListener('click',e=>{
  const close=e.target.closest('[data-close-modal]');if(close)closeModal();
  const rankupNext=e.target.closest('[data-rankup-next]');
  if(rankupNext){
    closeModal();
    rankUpQueue.shift();
    if(rankUpQueue.length)setTimeout(advanceRankUpQueue,320);
  }
  const expConfirm=e.target.closest('[data-exp-confirm]');if(expConfirm && typeof window.__expConfirmHandler==='function')window.__expConfirmHandler();
  const expCancel=e.target.closest('[data-exp-cancel]');if(expCancel && typeof window.__expCancelHandler==='function')window.__expCancelHandler();
  const run=e.target.closest('[data-run-template]');if(run)runStarter(run.dataset.runTemplate);
  const runSnippetBtn=e.target.closest('[data-run-snippet]');if(runSnippetBtn){const x=store.get('snippets').find(i=>String(i.id)===String(runSnippetBtn.dataset.runSnippet));if(x){bumpSnippetRun(x.id);savePlaygroundPayload({code:x.code,lang:x.lang},x.title)}}
  const copyPrev=e.target.closest('[data-copy-preview]');if(copyPrev)copySnippet(copyPrev.dataset.copyPreview);
  const pTab=e.target.closest('[data-preview-tab]');
  if(pTab){
    const frame=pTab.closest('.preview-code-frame');if(!frame)return;
    frame.querySelectorAll('[data-preview-tab]').forEach(b=>b.classList.remove('active'));
    pTab.classList.add('active');
    const key=pTab.dataset.previewTab;
    frame.querySelectorAll('[data-preview-panel]').forEach(p=>{
      const isActive=p.dataset.previewPanel===key;
      p.classList.toggle('active',isActive);
      if(isActive){mountCodeEditor(p);if(p._cm)requestAnimationFrame(()=>p._cm.refresh())}
    });
  }
});
function noteForm(editId){
  const n=store.get('notes'),item=editId?n.find(x=>String(x.id)===String(editId)):null;
  openModal(`<h2>${item?'Edit':'New'} Note</h2><p class="modal-subtitle">${item?'Update this technical reference or decision.':'Capture a short technical reference or development decision.'}</p><label>Title<input id="nTitle" class="input" value="${escapeAttr(item?.title||'')}" placeholder="PHP routing notes"></label><label>Note<textarea id="nText" class="input" rows="8" placeholder="Write your development notes...">${escapeHtml(item?.text||'')}</textarea></label><div class="modal-footer"><button class="ghost-btn" data-close-modal><i class="bx bx-x"></i> Cancel</button><button class="primary-btn" id="saveNote"><i class="bx bx-save"></i> ${item?'Update':'Save'} Note</button></div>`);
  $('#saveNote').onclick=()=>{const title=$('#nTitle').value.trim()||'Untitled Note',text=$('#nText').value.trim();if(item){item.title=title;item.text=text;item.updatedAt=Date.now();store.set('notes',n);diskSaveItem('notes',item);awardPoints(2,'Updated note: '+title)}else{const newNote={id:Date.now(),title,text,createdAt:Date.now()};n.unshift(newNote);store.set('notes',n);diskSaveItem('notes',newNote);awardPoints(5,'Created note: '+title)}closeModal();renderNotes();updateCounts();toast(item?'Note updated on your local drive':'Note saved to your local drive')}
}
$('#addNote')?.addEventListener('click',()=>noteForm());
function renderNotes(){const el=$('#noteGrid');if(!el)return;const n=store.get('notes');el.innerHTML=n.length?n.map(x=>`<article class="note-card"><div class="card-title">${escapeHtml(x.title)}</div><p>${escapeHtml(x.text)}</p><div class="card-actions"><button class="small-btn" data-edit-note="${escapeAttr(x.id)}"><i class="bx bx-edit"></i> Edit</button><button class="small-btn" data-delete-note="${escapeAttr(x.id)}"><i class="bx bx-trash"></i> Delete</button></div></article>`).join(''):'<div class="empty">No notes yet.</div>'}
$('#noteGrid')?.addEventListener('click',e=>{const editBtn=e.target.closest('[data-edit-note]');if(editBtn){noteForm(editBtn.getAttribute('data-edit-note'));return}const b=e.target.closest('[data-delete-note]');if(!b)return;const id=b.dataset.deleteNote;const list=store.get('notes'),x=list.find(i=>String(i.id)===String(id));store.set('notes',list.filter(i=>String(i.id)!==String(id)));diskDeleteItem('notes',id);activity('Deleted note: '+(x?.title||''));renderNotes();updateCounts();toast('Note deleted')});
function updateCounts(){const el=$('#projectCount');if(el)el.textContent=store.get('projects').length;const noteEl=$('#noteCount');if(noteEl)noteEl.textContent=store.get('notes').length;const list=store.get('snippets');const snippetOnly=list.filter(x=>snippetSource(x)==='snippet').length,componentOnly=list.filter(x=>snippetSource(x)==='component').length;const snipEl=$('#snippetCount');if(snipEl)snipEl.textContent=snippetOnly;const sideSnip=$('#sidebarSnippetCount'),sideComp=$('#sidebarComponentCount');if(sideSnip)sideSnip.textContent=snippetOnly;if(sideComp)sideComp.textContent=componentOnly}
/* --- Daily Bonus + Rank ----------------------------------------------------
   Points are no longer earned passively by every click — that lived in the
   navbar as a running counter and it wasn't the intent. Instead, once per
   day the person can claim a Daily Bonus (streaks make it worth a bit more
   on consecutive days). The accumulated total maps to a Rank, shown next to
   the profile avatar rather than as a raw point count in the navbar. */
/* --- XP / Points / Rank game layer -----------------------------------
   Every meaningful action in the workspace (running code, saving a
   snippet, starting a project, completing a beginner milestone, passing
   an exam...) earns XP through awardPoints(). XP accumulates into a
   Rank via RANKS below, which is the game's "level" ladder. A once-daily
   login bonus (with a streak multiplier) also feeds the same pool. */
function todayKey(){return new Date().toISOString().slice(0,10)}
function yesterdayKey(){return new Date(Date.now()-86400000).toISOString().slice(0,10)}
/* --- Points now live in the database --------------------------------
   The `points` table (database/points-migration.sql) is the source of
   truth for XP/rank/streak, scoped to the account (see save-data.php).
   index.php reads that row and renders it into window.SERVER_POINTS, so
   the very first paint already reflects the database rather than an
   empty/stale localStorage cache — the same pattern already used for
   window.SERVER_EXPERIENCE_LEVEL. localStorage still holds the working
   copy for instant UI updates, exactly like it does for projects,
   snippets and notes; every change is mirrored back to the database
   through pointsSyncAward()/claimDailyBonus() below. */
const SERVER_POINTS=(typeof window!=='undefined'&&window.SERVER_POINTS)?window.SERVER_POINTS:null;
if(SERVER_POINTS){store.set('points',{total:SERVER_POINTS.total||0,lastClaimDate:SERVER_POINTS.lastClaimDate||null,streak:SERVER_POINTS.streak||0})}
function getPointsState(){
  return store.get('points',{total:0,lastClaimDate:null,streak:0});
}
function canClaimDailyBonus(){return getPointsState().lastClaimDate!==todayKey()}
/* XP earned since this tab was opened — NOT the account's lifetime total.
   Shown on the dashboard leaderboard as "+N XP this session". Deliberately
   sessionStorage (not localStorage) so it genuinely resets when the tab or
   browser closes, the way "this session" reads; still user-scoped in case
   a shared browser switches accounts without closing the tab. Only ever
   grows here - a negative award (there are none today, but awardPoints
   supports them) shouldn't reduce what the session already earned. */
function getSessionXp(){return parseInt(sessionStorage.getItem(userScopedKey('sessionXP'))||'0',10)||0}
function addSessionXp(amount){if(!(amount>0))return;sessionStorage.setItem(userScopedKey('sessionXP'),String(getSessionXp()+amount))}
/* Fire-and-forget mirror of one XP award into the `points` table — same
   pattern as diskSaveItem() for projects/snippets/notes: the local copy
   already updated for instant feedback, this just keeps the account's
   database row in sync. */
function pointsSyncAward(amount){
  if(!CSRF_TOKEN||!amount)return;
  fetch(DISK_ENDPOINT+'?action=award-points',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount,csrf:CSRF_TOKEN})}).catch(()=>{});
}
function dailyBonusAmount(streak){return Math.min(10+(Math.max(streak,1)-1)*2,30)}
/* Extra "final benefits" reward stacked on top of the daily amount every
   time a run of claims completes a 7-day week (day 7, 14, 21...) — shown
   in the dashboard's 7-Day Streak calendar as the crowned final day.
   Mirrored server-side in weeklyFinalBonus() in save-data.php. */
const FINAL_STREAK_BONUS=15;
function weeklyFinalBonus(streak){return streak>0&&streak%7===0?FINAL_STREAK_BONUS:0}
/* --- Rank ladder: developer career tiers, each with 5 sub-levels ------
   Five career tiers (Junior Developer through Principal Engineer), each
   split into sub-levels V through I — V is the tier's entry level, I is
   the last stop before promotion into the next tier (same convention as
   competitive-ranking ladders). A single unleveled prestige rank sits on
   top once the whole ladder is cleared. Numeric thresholds are generated
   below so every tier/sub-level pair has a distinct XP floor; nothing
   else in the file needs to know the shape of this table — getRank() and
   getRankProgress() just walk it like a flat list. */
const ROMAN=['','I','II','III','IV','V'];
const CAREER_TIERS=[
  {label:'Junior Developer',start:0,span:40,icon:'bx-code-alt',cls:'rank-junior'},
  {label:'Developer',start:40,span:80,icon:'bx-terminal',cls:'rank-developer'},
  {label:'Senior Developer',start:120,span:160,icon:'bx-code-curly',cls:'rank-senior'},
  {label:'Staff Engineer',start:280,span:240,icon:'bx-server',cls:'rank-staff'},
  {label:'Principal Engineer',start:520,span:380,icon:'bx-crown',cls:'rank-principal'}
];
const PRESTIGE_START=900;
const RANKS=(function(){
  const out=[];
  CAREER_TIERS.forEach(function(tier){
    const step=tier.span/5;
    for(let sub=5;sub>=1;sub--){
      const idx=5-sub;
      out.push({
        min:tier.start+idx*step,
        tierLabel:tier.label,
        sub:sub,
        label:tier.label+' '+ROMAN[sub],
        icon:tier.icon,
        cls:tier.cls
      });
    }
  });
  out.push({min:PRESTIGE_START,tierLabel:'Distinguished Engineer',sub:null,label:'Distinguished Engineer',icon:'bx-crown',cls:'rank-distinguished'});
  return out;
})();
function getRank(total){let r=RANKS[0];for(const t of RANKS){if(total>=t.min)r=t}return r}
function getRankProgress(total){
  const rank=getRank(total),idx=RANKS.indexOf(rank),next=RANKS[idx+1];
  if(!next)return{rank,next:null,pct:100,toNext:0};
  const span=next.min-rank.min;
  const pct=Math.max(0,Math.min(100,Math.round(((total-rank.min)/span)*100)));
  return{rank,next,pct,toNext:Math.max(0,next.min-total)};
}
/* Central XP award. Every gamified action should route through this so
   the activity feed, XP bars and rank-up celebration all stay in sync. */
function awardPoints(amount,reason){
  if(!amount)return;
  const before=getPointsState();
  const beforeRank=getRank(before.total);
  before.total=Math.max(0,before.total+amount);
  store.set('points',before);
  addSessionXp(amount);
  pointsSyncAward(amount);
  activity(reason+' ('+(amount>0?'+':'')+amount+' XP)');
  renderPoints();
  const afterRank=getRank(before.total);
  if(amount>0){
    setTimeout(()=>queueRankUps(beforeRank,afterRank,before.total),380);
  }
}
function rankSubBadge(rank){return rank.sub?'<span class="rank-sub-badge '+rank.cls+'">'+ROMAN[rank.sub]+'</span>':''}
/* Rank-up modal queue -------------------------------------------------
   A single XP award (or daily claim) can cross more than one rank at
   once — e.g. a big admin correction jumping from Junior Developer V
   straight to Developer II. Rather than announcing only the final rank
   and silently skipping the ones in between, every rank crossed gets
   its own "RANK UP" popup, shown one after another as each is
   dismissed, so nothing in the ladder goes uncelebrated. */
let rankUpQueue=[];
let rankUpTotal=0;
let rankUpBatchSize=0;
let rankUpShownCount=0;
function queueRankUps(beforeRank,afterRank,total){
  const fromIdx=RANKS.indexOf(beforeRank),toIdx=RANKS.indexOf(afterRank);
  if(toIdx<=fromIdx)return;
  rankUpTotal=total;
  const wasEmpty=rankUpQueue.length===0;
  if(wasEmpty){rankUpBatchSize=0;rankUpShownCount=0}
  for(let i=fromIdx+1;i<=toIdx;i++){rankUpQueue.push(RANKS[i]);rankUpBatchSize++}
  if(wasEmpty)advanceRankUpQueue();
}
function advanceRankUpQueue(){
  if(!rankUpQueue.length)return;
  rankUpShownCount++;
  showRankUpModal(rankUpQueue[0],rankUpTotal);
}
/* A short, tasteful confetti burst around the rank badge — pure CSS/JS,
   reusing the same .confetti-piece/@confettiPop primitive already used
   for the exam-pass celebration, just anchored to the badge instead of
   the score ring. Pieces remove themselves once the animation ends. */
function launchRankUpConfetti(container){
  if(!container)return;
  const colors=['#f2c94c','#6fcf97','#56ccf2','#bb6bd9','#f2994a'];
  for(let i=0;i<26;i++){
    const p=document.createElement('span');
    p.className='confetti-piece';
    p.style.background=colors[i%colors.length];
    p.style.left=(30+Math.random()*40)+'%';
    p.style.setProperty('--x',Math.round(Math.random()*220-110)+'px');
    p.style.setProperty('--r',Math.round(Math.random()*360)+'deg');
    p.style.setProperty('--d',(700+Math.random()*500)+'ms');
    container.appendChild(p);
    setTimeout(()=>p.remove(),1300);
  }
}
function showRankUpModal(rank,total){
  const more=rankUpQueue.length>1;
  const posLabel=rankUpBatchSize>1?('<div class="rankup-queue-pos">Rank '+rankUpShownCount+' of '+rankUpBatchSize+'</div>'):'';
  const sparkAngles=[0,60,120,180,240,300];
  const sparksHtml=sparkAngles.map((a,i)=>'<span class="rankup-spark" style="--rot:'+a+'deg;animation-delay:'+(.45+i*.05)+'s"></span>').join('');
  openModal(`<div class="rankup-modal">
    <div class="rankup-badge-wrap">
      <span class="rankup-halo ${rank.cls}"></span>
      <span class="rankup-halo rankup-halo-2 ${rank.cls}"></span>
      ${sparksHtml}
      <div class="rankup-badge ${rank.cls}"><i class="bx ${rank.icon}"></i></div>
      ${rank.sub?'<span class="rankup-sub-chip '+rank.cls+'">'+ROMAN[rank.sub]+'</span>':''}
    </div>
    <span class="eyebrow rankup-in-1">RANK UP</span>
    ${posLabel}
    <h2 id="modalTitle" class="rankup-in-2">You reached ${escapeHtml(rank.tierLabel)} ${rank.sub?ROMAN[rank.sub]:''}!</h2>
    <p class="modal-subtitle rankup-in-3">You now have <b>${total} XP</b>. Keep building, saving and running code to level up again.</p>
    <div class="modal-footer rankup-in-4"><button class="primary-btn" data-rankup-next><i class="bx bx-party"></i> ${more?'Next':'Nice!'}</button></div>
  </div>`,'modal-compact');
  const wrap=modalBody?.querySelector('.rankup-badge-wrap');
  if(wrap)setTimeout(()=>launchRankUpConfetti(wrap),150);
}
/* Applies today's claim purely locally — used when there's no session to
   check against the database (shouldn't normally happen on this page) or
   the request to claim-daily-bonus couldn't reach the server at all. */
function claimDailyBonusLocal(){
  const s=getPointsState();
  if(s.lastClaimDate===todayKey()){toast('Already claimed today — come back tomorrow!');return}
  s.streak=s.lastClaimDate===yesterdayKey()?(s.streak||0)+1:1;
  const final=weeklyFinalBonus(s.streak),bonus=dailyBonusAmount(s.streak)+final;
  s.lastClaimDate=todayKey();
  store.set('points',s);
  awardPoints(bonus,'Claimed daily bonus (streak '+s.streak+'d)'+(final?' + Day 7 final bonus':''));
  toast(final?('Week complete! Final bonus claimed: +'+bonus+' XP!'):('Daily bonus claimed: +'+bonus+' XP!'));
}
/* The daily claim is decided by the `points` row in the database, not by
   localStorage — that's what stops it from being re-claimed just by
   clearing local storage or switching browsers. */
function claimDailyBonus(){
  const s=getPointsState();
  if(s.lastClaimDate===todayKey()){toast('Already claimed today — come back tomorrow!');return}
  if(!CSRF_TOKEN){claimDailyBonusLocal();return}
  const btn=$('#claimDailyBonusBtn');if(btn)btn.disabled=true;
  fetch(DISK_ENDPOINT+'?action=claim-daily-bonus',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({csrf:CSRF_TOKEN})})
    .then(r=>r.json())
    .then(res=>{
      if(res&&res.ok){
        const beforeRank=getRank(getPointsState().total);
        store.set('points',{total:res.points.total,lastClaimDate:res.points.lastClaimDate,streak:res.points.streak});
        activity('Claimed daily bonus (streak '+res.points.streak+'d) ('+(res.amount>0?'+':'')+res.amount+' XP)');
        renderPoints();
        const afterRank=getRank(res.points.total);
        setTimeout(()=>queueRankUps(beforeRank,afterRank,res.points.total),380);
        toast(res.isFinalDay?('Week complete! Final bonus claimed: +'+res.amount+' XP!'):('Daily bonus claimed: +'+res.amount+' XP!'));
      }else{
        store.set('points',{total:res&&res.points?res.points.total:getPointsState().total,lastClaimDate:res&&res.points?res.points.lastClaimDate:getPointsState().lastClaimDate,streak:res&&res.points?res.points.streak:getPointsState().streak});
        renderPoints();
        toast((res&&res.error)||'Could not claim right now — try again.');
      }
    })
    .catch(()=>claimDailyBonusLocal());
}
function renderPoints(){
  const s=getPointsState(),rank=getRank(s.total),claimable=canClaimDailyBonus(),prog=getRankProgress(s.total);
  const rankText=$('#accountRankText');
  if(rankText)rankText.innerHTML='<i class="bx '+rank.icon+'"></i> <b>'+rank.tierLabel+'</b> '+rankSubBadge(rank)+' <span class="muted">· '+s.total+' XP</span>';
  const RANK_CLASSES='rank-junior rank-developer rank-senior rank-staff rank-principal rank-distinguished';
  const avatarRing=$('#accountAvatarRing');
  if(avatarRing){avatarRing.classList.remove(...RANK_CLASSES.split(' '));avatarRing.classList.add(rank.cls)}
  const avatarBadge=$('#accountAvatarBadge');
  if(avatarBadge)avatarBadge.innerHTML='<i class="bx '+rank.icon+'"></i>';
  const menuBtn=$('#accountMenuBtn');
  if(menuBtn){menuBtn.classList.remove(...RANK_CLASSES.split(' '));menuBtn.classList.add(rank.cls)}
  const xpFill=$('#xpBarFill');if(xpFill)xpFill.style.width=prog.pct+'%';
  const xpLabel=$('#xpBarLabel');if(xpLabel)xpLabel.textContent=prog.next?(prog.toNext+' XP to '+prog.next.label):'Max rank reached';
  const claimBtn=$('#claimDailyBonusBtn');
  if(claimBtn){
    claimBtn.disabled=!claimable;
    if(claimable){
      const previewStreak=s.lastClaimDate===yesterdayKey()?(s.streak||0)+1:1;
      claimBtn.innerHTML='<i class="bx bx-gift"></i> Claim Daily Bonus (+'+dailyBonusAmount(previewStreak)+')';
    }else{
      claimBtn.innerHTML='<i class="bx bx-check-circle"></i> Claimed today · Streak '+(s.streak||0)+'d';
    }
  }
  const rankVal=$('#pointsRankVal');if(rankVal)rankVal.innerHTML='<i class="bx '+rank.icon+'"></i> '+rank.tierLabel+' '+rankSubBadge(rank);
  const totalEl=$('#pointsTotalVal');if(totalEl)totalEl.textContent=s.total;
  document.querySelectorAll('#dashRankIcon').forEach(function(el){el.className='bx '+rank.icon});
  document.querySelectorAll('#dashRankLabel').forEach(function(el){el.innerHTML=escapeHtml(rank.tierLabel)+' '+rankSubBadge(rank)});
  document.querySelectorAll('#dashXpFill').forEach(function(el){el.style.width=prog.pct+'%'});
  const dashSubText=prog.next?(s.total+' / '+prog.next.min+' XP · '+prog.toNext+' XP to '+prog.next.label):(s.total+' XP · Max rank reached');
  document.querySelectorAll('#dashXpLabel').forEach(function(el){el.textContent=dashSubText});
  renderStreakWeek();
  renderXpLeaderboard();
}
/* Dashboard "Leaderboard" panel: top 10 accounts by lifetime XP, plus a
   "you" summary row (your own rank/total, which may not appear in that
   top 10) and the session-XP pill. Server-driven (see the 'leaderboard'
   action in save-data.php) since ranking across every account can't be
   known from this browser's own localStorage alone. No-ops on any page
   that doesn't have the panel, same guard style as renderStreakWeek(). */
function xpLeaderboardAvatar(name,total){
  const initial=name?String(name).trim().charAt(0).toUpperCase():'?';
  return {initial,cls:getRank(total||0).cls};
}
function renderXpLeaderboard(){
  const list=$('#xpLeaderboardList');
  if(!list||!CSRF_TOKEN)return;
  fetch(DISK_ENDPOINT+'?action=leaderboard')
    .then(r=>r.json())
    .then(res=>{
      if(!res||!res.ok){list.innerHTML='<li class="empty">Could not load the leaderboard.</li>';return}
      const top=res.top||[];
      list.innerHTML=top.length?top.map(function(row,i){
        const pos=i+1,av=xpLeaderboardAvatar(row.name,row.total),rank=getRank(row.total||0);
        return '<li class="xp-leaderboard-row'+(row.isYou?' is-you':'')+'">'
          +'<span class="xp-leaderboard-pos'+(pos<=3?' pos-'+pos:'')+'">#'+pos+'</span>'
          +'<span class="avatar xp-leaderboard-avatar '+av.cls+'">'+escapeHtml(av.initial)+'</span>'
          +'<span class="xp-leaderboard-name">'+escapeHtml(row.name)+(row.isYou?' <span class="muted">(you)</span>':'')+'</span>'
          +'<span class="xp-leaderboard-rank" title="'+escapeHtml(rank.tierLabel)+'"><i class="bx '+rank.icon+'"></i><span class="xp-leaderboard-rank-label">'+escapeHtml(rank.tierLabel)+'</span></span>'
          +'<span class="xp-leaderboard-xp">'+row.total+' XP</span>'
        +'</li>';
      }).join(''):'<li class="empty">No one has earned XP yet \u2014 be the first!</li>';
      const you=res.you||{name:'You',total:0,rank:null},youAv=xpLeaderboardAvatar(you.name,you.total);
      const posEl=$('#xpLeaderboardYouPos');if(posEl)posEl.textContent=you.rank?('#'+you.rank):'#\u2014';
      const avEl=$('#xpLeaderboardYouAvatar');if(avEl){avEl.textContent=youAv.initial;avEl.className='avatar xp-leaderboard-avatar '+youAv.cls}
      const nameEl=$('#xpLeaderboardYouName');if(nameEl)nameEl.textContent=you.name||'You';
      const xpEl=$('#xpLeaderboardYouXp');if(xpEl)xpEl.textContent=you.total+' XP';
      renderSessionXpPill();
    })
    .catch(()=>{list.innerHTML='<li class="empty">Could not load the leaderboard.</li>'});
}
function renderSessionXpPill(){
  const el=$('#xpSessionPill');
  if(el)el.innerHTML='<i class="bx bxs-bolt"></i> +'+getSessionXp()+' XP this session';
}
/* Drives the dashboard's 7-Day Streak calendar. The raw streak counter
   keeps climbing forever (it's what dailyBonusAmount() scales off of),
   but the calendar always shows it as a repeating Mon-Sun-style 7-day
   week: cycleDay is just where the current streak lands inside that
   week, and weekStartStreak lets each cell preview the real XP it
   would pay out (which keeps drifting up as the raw streak grows). */
function renderStreakWeek(){
  const grids=document.querySelectorAll('.streak-week-grid');
  if(!grids.length)return;
  const s=getPointsState(),claimable=canClaimDailyBonus();
  const effectiveStreak=claimable?(s.lastClaimDate===yesterdayKey()?(s.streak||0)+1:1):Math.max(1,s.streak||0);
  const cycleDay=((effectiveStreak-1)%7)+1;
  const weekStartStreak=Math.max(1,effectiveStreak-cycleDay+1);
  grids.forEach(function(grid){
    grid.querySelectorAll('.streak-day').forEach(function(cell){
      const day=parseInt(cell.getAttribute('data-streak-day'),10),isFinal=day===7;
      const dayStreak=weekStartStreak+(day-1);
      const dayBonus=dailyBonusAmount(dayStreak)+(isFinal?FINAL_STREAK_BONUS:0);
      const xpEl=cell.querySelector('.streak-day-xp');if(xpEl)xpEl.textContent='+'+dayBonus+' XP';
      cell.classList.remove('claimed','current','locked');
      let state;
      if(day<cycleDay||(day===cycleDay&&!claimable)){state='claimed'}
      else if(day===cycleDay&&claimable){state='current'}
      else{state='locked'}
      cell.classList.add(state);
      const iconEl=cell.querySelector('.streak-day-icon .bx');
      if(iconEl){
        if(state==='claimed')iconEl.className='bx bx-check-circle';
        else if(state==='current')iconEl.className='bx '+(isFinal?'bx-crown':'bx-gift')+' streak-icon-pulse';
        else iconEl.className='bx '+(isFinal?'bx-crown':'bx-lock-alt');
      }
    });
  });
  const dayLabel=document.querySelector('#streakDayLabel');
  if(dayLabel)dayLabel.innerHTML='<i class="bx bxs-flame"></i> Day '+cycleDay+' of 7'+((s.streak||0)>=7?(' · '+(s.streak||0)+'d streak'):'');
  const streakBtn=$('#streakClaimBtn');
  if(streakBtn){
    streakBtn.disabled=!claimable;
    if(claimable){
      const bonus=dailyBonusAmount(effectiveStreak)+weeklyFinalBonus(effectiveStreak);
      streakBtn.innerHTML=cycleDay===7?('<i class="bx bx-crown"></i> Claim Day 7 Final Bonus (+'+bonus+')'):('<i class="bx bx-gift"></i> Claim Daily Bonus (+'+bonus+')');
    }else{
      streakBtn.innerHTML='<i class="bx bx-check-circle"></i> Claimed today · Streak '+(s.streak||0)+'d';
    }
  }
}
$('#claimDailyBonusBtn')?.addEventListener('click',claimDailyBonus);
$('#streakClaimBtn')?.addEventListener('click',claimDailyBonus);
const GS_KEY='gsProgress';
const GS_LABELS={viewedSnippet:'Looked at a snippet',ranCode:'Ran code in the Playground',savedSnippet:'Saved your own snippet',createdProject:'Started your first project'};
function getGsProgress(){try{return JSON.parse(localStorage.getItem(userScopedKey(GS_KEY))||'{}')}catch(e){return{}}}
function markGs(step){
  const p=getGsProgress();if(p[step])return;
  p[step]=true;localStorage.setItem(userScopedKey(GS_KEY),JSON.stringify(p));renderGettingStarted();
  awardPoints(2,'Milestone: '+(GS_LABELS[step]||step));
  if(Object.keys(GS_LABELS).every(k=>p[k])&&!localStorage.getItem(userScopedKey('gsAllDoneBonus'))){
    localStorage.setItem(userScopedKey('gsAllDoneBonus'),'true');
    awardPoints(5,'Completed the beginner journey');
  }
}
function renderGettingStarted(){const wrap=$('#gsSteps');if(!wrap)return;const p=getGsProgress();let done=0;wrap.querySelectorAll('.gs-step').forEach(li=>{const key=li.dataset.gs;const isDone=!!p[key];li.classList.toggle('done',isDone);if(isDone)done++});const label=$('#gsProgressLabel');if(label)label.innerHTML='<i class="bx bx-check-circle"></i> '+done+' of 4 done'}
ensureSampleSnippets();renderProjects();renderSnippets();renderNotes();renderActivity();updateCounts();renderGettingStarted();renderStarterRanking();renderPlaygroundLeaderboard();renderPoints();
const tabs=$$('.tab');
const DEFAULT_HTML=`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <main class="demo">
    <span class="eyebrow">DEV DESK</span>
    <h1>Hello A-DevTools</h1>
    <p>Edit HTML, CSS and JavaScript, then press Run.</p>
    <button id="demoButton">Test interaction</button>
  </main>
</body>
</html>`;
const DEFAULT_CSS=`:root{font-family:Inter,system-ui,sans-serif;color:#15171a}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f5f6f8}
.demo{width:min(520px,calc(100% - 40px));padding:32px;background:white;border:1px solid #e3e6ea;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.08)}
.eyebrow{font-size:11px;font-weight:800;letter-spacing:.12em;color:#68707a}
h1{margin:8px 0;font-size:38px;letter-spacing:-.04em}
p{color:#68707a;line-height:1.6}
button{border:0;border-radius:10px;padding:11px 16px;background:#15171a;color:#fff;font-weight:700;cursor:pointer}
button:hover{transform:translateY(-1px)}`;
const DEFAULT_JS=`document.getElementById('demoButton')?.addEventListener('click',()=>{
  document.getElementById('demoButton').textContent='It works!';
});`;

// Guarantees any HTML rendered in the preview (and in the "Open" tab, which is
// what a real phone browser loads) behaves like a normal responsive page:
// adds a viewport meta tag + a couple of safe defaults when the user's own
// markup does not already include them. This is what keeps the mobile view
// from rendering "zoomed out" like a desktop page (the classic no-viewport
// mobile browser fallback that produces the letterboxed look with colored
// bars on the sides).
function ensureResponsiveDoc(htmlStr){
  var meta='<meta name="viewport" content="width=device-width, initial-scale=1">';
  var baseStyle='<style>html{-webkit-text-size-adjust:100%}img,video,canvas,svg,table{max-width:100%}body{overflow-x:hidden}</style>';
  if(/<meta[^>]+viewport/i.test(htmlStr)) return htmlStr;
  if(/<head[^>]*>/i.test(htmlStr)) return htmlStr.replace(/<head[^>]*>/i,function(m){return m+meta+baseStyle});
  if(/<html[^>]*>/i.test(htmlStr)) return htmlStr.replace(/<html[^>]*>/i,function(m){return m+'<head>'+meta+baseStyle+'</head>'});
  return meta+baseStyle+htmlStr;
}

var cmHtml=null,cmCss=null,cmJs=null,wrapEnabled=true;
function setEditorDirty(text){const el=$('#editorDirty');if(el)el.textContent=text}
function activeTabName(){return document.querySelector('.tab.active')?.dataset.tab||'html'}
function activeCm(){const t=activeTabName();return t==='css'?cmCss:t==='js'?cmJs:cmHtml}
function updateCharCount(){const cm=activeCm(),el=$('#charCount');if(el&&cm)el.textContent=cm.getValue().length+' chars'}

function setActiveFileTab(tab){
  const dot=$('#fileDot');if(dot)dot.className='file-dot '+tab;
}
function updateTabIndicators(){
  const map={html:cmHtml,css:cmCss,js:cmJs};
  tabs.forEach(t=>{
    const cm=map[t.dataset.tab];
    t.classList.toggle('has-code',!!(cm&&cm.getValue().trim().length));
  });
}
/* Splits a single combined HTML+CSS+JS string (the format every starter
   template and saved snippet uses) back into its three parts so the
   Playground's HTML / CSS / JavaScript tabs are always populated
   correctly instead of dumping everything into the HTML tab. */
function splitCombinedCode(raw){
  let html=String(raw==null?'':raw);
  let css='',js='';
  html=html.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi,(m,inner)=>{css+=(css?'\n\n':'')+inner.trim();return '';});
  html=html.replace(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi,(m,inner)=>{js+=(js?'\n\n':'')+inner.trim();return '';});
  html=html.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  return {html,css,js};
}
/* Shared beautifier (used both by the Format button and automatically
   whenever a snippet/starter is loaded) so code is always shown as
   properly indented multi-line source instead of one long minified
   line that has to wrap mid-word. */
function beautify(kind,code){
  if(!code)return code;
  try{
    if(kind==='html'&&typeof html_beautify==='function')return html_beautify(code,{indent_size:2,wrap_line_length:0});
    if(kind==='css'&&typeof css_beautify==='function')return css_beautify(code,{indent_size:2});
    if(kind==='js'&&typeof js_beautify==='function')return js_beautify(code,{indent_size:2,space_in_empty_paren:true});
  }catch(e){/* fall through and show the code as-is */}
  return code;
}
/* Unicode-safe base64 round-trip, used to hand preview code to
   mountCodeEditor() via a data attribute without fighting HTML escaping
   of quotes/angle-brackets in the source. */
function b64EncodeUnicode(str){try{return btoa(unescape(encodeURIComponent(str||'')))}catch(e){return ''}}
function b64DecodeUnicode(str){try{return decodeURIComponent(escape(atob(str||'')))}catch(e){return ''}}
/* Turns one preview panel (built by buildCodePreviewMarkup) into a live,
   read-only CodeMirror editor — the same library, theme and settings as
   the Code Playground — instead of a plain <pre> block. Mounted lazily
   (only when a panel actually becomes visible) since CodeMirror can't
   size itself correctly inside a display:none element. */
function mountCodeEditor(el){
  if(!el||el.dataset.mounted==='1')return;
  const code=b64DecodeUnicode(el.dataset.codeB64||'');
  el.dataset.mounted='1';
  if(typeof CodeMirror==='undefined'){el.textContent=code;return}
  el._cm=CodeMirror(el,{
    value:code,
    mode:el.dataset.cmMode||'htmlmixed',
    theme:cmThemeName(),
    lineNumbers:true,
    lineWrapping:true,
    readOnly:true,
    matchBrackets:true,
    tabSize:2,
    indentUnit:2,
    viewportMargin:Infinity
  });
}
/* Builds a read-only, tabbed HTML/CSS/JavaScript code preview (used in the
   Snippets "Preview" modal and the UI Components "View code" modal)
   instead of one long unformatted blob — mirrors the Playground's three
   tabs, and now its editor too, so a combined snippet is easy to read. */
function buildCodePreviewMarkup(rawCode,sizeClass){
  const {html,css,js}=splitCombinedCode(rawCode);
  const parts=[
    {key:'html',label:'HTML',mode:'htmlmixed',code:beautify('html',html)},
    {key:'css',label:'CSS',mode:'css',code:beautify('css',css)},
    {key:'js',label:'JavaScript',mode:'javascript',code:beautify('js',js)}
  ].filter(p=>p.code&&p.code.trim().length);
  if(!parts.length)parts.push({key:'html',label:'HTML',mode:'htmlmixed',code:''});
  const tabsHtml=parts.length>1?`<div class="preview-code-tabs" role="tablist">${parts.map((p,i)=>`<button class="preview-code-tab${i===0?' active':''}" type="button" data-preview-tab="${p.key}">${p.label}</button>`).join('')}</div>`:'';
  const panelsHtml=parts.map((p,i)=>`<div class="code-mini-editor${sizeClass?' '+sizeClass:''} preview-code-panel${i===0?' active':''}" data-preview-panel="${p.key}" data-cm-mode="${p.mode}" data-code-b64="${b64EncodeUnicode(p.code)}"></div>`).join('');
  return `<div class="preview-code-frame">${tabsHtml}${panelsHtml}</div>`;
}

function initEditors(){
  const htmlEl=$('#htmlCode');
  if(!htmlEl||typeof CodeMirror==='undefined')return;
  const common={lineNumbers:true,lineWrapping:true,theme:cmThemeName(),tabSize:2,indentUnit:2,matchBrackets:true,autoCloseBrackets:true,styleActiveLine:true};
  cmHtml=CodeMirror.fromTextArea(htmlEl,Object.assign({},common,{mode:'htmlmixed'}));
  cmCss=CodeMirror.fromTextArea($('#cssCode'),Object.assign({},common,{mode:'css'}));
  cmJs=CodeMirror.fromTextArea($('#jsCode'),Object.assign({},common,{mode:'javascript'}));
  [cmCss,cmJs].forEach(cm=>cm.getWrapperElement().classList.add('hidden'));
  [cmHtml,cmCss,cmJs].forEach(cm=>cm.on('change',()=>{updateCharCount();setEditorDirty('Unsaved changes');updateTabIndicators()}));
  updateCharCount();
  updateTabIndicators();
}
initEditors();

tabs.forEach(t=>t.onclick=()=>{
  tabs.forEach(x=>x.classList.remove('active'));
  t.classList.add('active');
  const tabName=t.dataset.tab;
  setActiveFileTab(tabName);
  if(cmHtml){
    [cmHtml,cmCss,cmJs].forEach(cm=>cm.getWrapperElement().classList.add('hidden'));
    const target=tabName==='css'?cmCss:tabName==='js'?cmJs:cmHtml;
    target.getWrapperElement().classList.remove('hidden');
    /* refresh on the next animation frame (not a bare setTimeout) so the
       editor measures itself right before paint - this is what stops the
       visible "shuffle"/jump when a tab that was hidden becomes visible */
    requestAnimationFrame(()=>{target.refresh();target.focus()});
    updateCharCount();
  }else{
    $$('.code-editor').forEach(x=>x.classList.add('hidden'));
    $('#'+tabName+'Code')?.classList.remove('hidden');
  }
});

function loadPlaygroundPayload(){
  const raw=sessionStorage.getItem('adevtoolsPlayground');
  if(!raw)return false;
  sessionStorage.removeItem('adevtoolsPlayground');
  const title=sessionStorage.getItem('adevtoolsPlaygroundTitle')||'Snippet';
  sessionStorage.removeItem('adevtoolsPlaygroundTitle');
  let payload=null;try{payload=JSON.parse(raw)}catch(e){payload=null}
  if(!payload||typeof payload.code!=='string')return false;
  if(!cmHtml)return false;
  const {html,css,js}=splitCombinedCode(payload.code);
  cmHtml.setValue(beautify('html',html));
  cmCss.setValue(beautify('css',css));
  cmJs.setValue(beautify('js',js));
  tabs.forEach(x=>x.classList.remove('active'));
  document.querySelector('.tab[data-tab="html"]')?.classList.add('active');
  setActiveFileTab('html');
  [cmHtml,cmCss,cmJs].forEach(cm=>cm.getWrapperElement().classList.add('hidden'));
  cmHtml.getWrapperElement().classList.remove('hidden');
  requestAnimationFrame(()=>cmHtml.refresh());
  const titleEl=$('#editorTitle');if(titleEl)titleEl.textContent=title;
  setEditorDirty('Loaded from '+(payload.lang||'Snippets'));
  updateCharCount();
  updateTabIndicators();
  toast('Loaded "'+title+'" into the Playground — check the CSS and JavaScript tabs too');
  return true;
}
loadPlaygroundPayload();

/* --- XP is only ever awarded for a genuine "edit, then run" cycle ---
   Previously runCode() unconditionally called awardPoints(), and runCode()
   itself was also invoked automatically once whenever the Playground page
   loaded (see the bare `runCode()` call below). Since navigating to the
   Playground from another tab/page is a full page load in this app, that
   auto-run silently handed out 5 XP every single time — even with zero
   changes to the code. Fixed by: (1) the initial/automatic run and the
   Reset button's run never award XP (award=false), and (2) a manual Run
   only awards XP if the code actually differs from the last code that was
   already rewarded, so repeatedly clicking Run on unchanged code, or just
   switching tabs and coming back, no longer farms XP. */
let lastAwardedPlaygroundCode=(cmHtml?cmHtml.getValue():($('#htmlCode')?.value||''))+'\u0000'+(cmCss?cmCss.getValue():($('#cssCode')?.value||''))+'\u0000'+(cmJs?cmJs.getValue():($('#jsCode')?.value||''));
function runCode(award){
  const h=cmHtml?cmHtml.getValue():($('#htmlCode')?.value||'');
  const c=cmCss?cmCss.getValue():($('#cssCode')?.value||'');
  const j=cmJs?cmJs.getValue():($('#jsCode')?.value||'');
  const frame=$('#preview');if(!frame)return;
  const doc=ensureResponsiveDoc(`${h}<style>${c}</style><script>${j.replace(/<\/script>/gi,'<\\/script>')}<\/script>`);
  frame.srcdoc=doc;
  if(award){
    const snapshot=h+'\u0000'+c+'\u0000'+j;
    if(snapshot!==lastAwardedPlaygroundCode){
      awardPoints(5,'Ran code playground');markGs('ranCode');
      lastAwardedPlaygroundCode=snapshot;
    }
  }
  const statusEl=$('#runStatus');if(statusEl){statusEl.classList.add('running');statusEl.innerHTML='<i></i> Running…';setTimeout(()=>{statusEl.classList.remove('running');statusEl.innerHTML='<i></i> Updated'},480)}
}
$('#runCode')?.addEventListener('click',()=>runCode(true));runCode(false);
$('#openPreview')?.addEventListener('click',()=>{const src=$('#preview')?.srcdoc;if(!src)return;const w=window.open('about:blank','_blank');if(w){w.document.open();w.document.write(src);w.document.close()}});

const previewStage=$('#previewStage'),previewMeta=$('#previewMeta');
const deviceMeta={desktop:'Desktop · full width',tablet:'Tablet · 820 × 1180',mobile:'Mobile · 390 × 844'};
const deviceFrameDims={tablet:{w:820,h:1180},mobile:{w:390,h:844}};
function fitDeviceFrame(){
  const frame=$('#preview'),shell=$('#deviceFrame'),bar=$('#deviceFrameBar');
  if(!frame||!shell||!previewStage)return;
  const device=previewStage.getAttribute('data-device')||'desktop';
  const dims=deviceFrameDims[device];
  const barH=bar?bar.offsetHeight:0;
  if(!dims){
    shell.style.width='100%';shell.style.height='100%';
    frame.style.width='100%';frame.style.height='100%';frame.style.transform='';
    return;
  }
  const cs=getComputedStyle(previewStage);
  const padX=parseFloat(cs.paddingLeft||0)+parseFloat(cs.paddingRight||0);
  const padY=parseFloat(cs.paddingTop||0)+parseFloat(cs.paddingBottom||0);
  const availW=Math.max(0,previewStage.clientWidth-padX);
  const availH=Math.max(0,previewStage.clientHeight-padY-barH);
  const scale=Math.min(1,availW/dims.w,availH/dims.h)||1;
  // The wrapper is sized to the actual on-screen (scaled) footprint, so the
  // grid centers a box that matches what's really visible — the oversized
  // iframe lives inside it as an absolutely-positioned, scaled layer that
  // does not affect the wrapper's own layout size.
  const scs=getComputedStyle(shell);
  const bx=parseFloat(scs.borderLeftWidth||0)+parseFloat(scs.borderRightWidth||0);
  const by=parseFloat(scs.borderTopWidth||0)+parseFloat(scs.borderBottomWidth||0);
  shell.style.width=Math.round(dims.w*scale+bx)+'px';
  shell.style.height=Math.round(dims.h*scale+barH+by)+'px';
  frame.style.width=dims.w+'px';
  frame.style.height=dims.h+'px';
  frame.style.transformOrigin='top left';
  frame.style.transform='scale('+scale+')';
}
$$('.device-btn').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.device-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});
  btn.classList.add('active');btn.setAttribute('aria-pressed','true');
  const device=btn.dataset.device||'desktop';
  previewStage?.setAttribute('data-device',device);
  if(previewMeta)previewMeta.textContent=deviceMeta[device]||deviceMeta.desktop;
  fitDeviceFrame();
}));
let deviceFrameResizeTimer;
window.addEventListener('resize',()=>{clearTimeout(deviceFrameResizeTimer);deviceFrameResizeTimer=setTimeout(fitDeviceFrame,150)});
fitDeviceFrame();

$('#resetCode')?.addEventListener('click',()=>{
  if(!confirm('Reset all three editors back to the starting example? Your current changes will be lost.'))return;
  if(cmHtml){cmHtml.setValue(DEFAULT_HTML);cmCss.setValue(DEFAULT_CSS);cmJs.setValue(DEFAULT_JS)}
  tabs.forEach(x=>x.classList.remove('active'));
  document.querySelector('.tab[data-tab="html"]')?.classList.add('active');
  setActiveFileTab('html');
  if(cmHtml){
    [cmHtml,cmCss,cmJs].forEach(cm=>cm.getWrapperElement().classList.add('hidden'));
    cmHtml.getWrapperElement().classList.remove('hidden');
    requestAnimationFrame(()=>cmHtml.refresh());
  }
  const titleEl=$('#editorTitle');if(titleEl)titleEl.textContent='index.html';
  setEditorDirty('Saved locally');
  updateCharCount();
  updateTabIndicators();
  runCode(false);
  lastAwardedPlaygroundCode=DEFAULT_HTML+'\u0000'+DEFAULT_CSS+'\u0000'+DEFAULT_JS;
  toast('Playground reset');
});
$('#clearEditor')?.addEventListener('click',()=>{
  const cm=activeCm();if(!cm||!cm.getValue().trim())return;
  if(!confirm('Clear the code in this tab?'))return;
  cm.setValue('');updateCharCount();setEditorDirty('Unsaved changes');updateTabIndicators();
});
$('#formatCode')?.addEventListener('click',()=>{
  const cm=activeCm();if(!cm)return;
  const tab=activeTabName();
  const out=beautify(tab,cm.getValue());
  cm.setValue(out);updateCharCount();setEditorDirty('Formatted');updateTabIndicators();toast('Code formatted');
});
$('#downloadCode')?.addEventListener('click',()=>{
  const h=cmHtml?cmHtml.getValue():'',c=cmCss?cmCss.getValue():'',j=cmJs?cmJs.getValue():'';
  const doc=`${h}\n<style>\n${c}\n</style>\n<script>\n${j}\n<\/script>`;
  const blob=new Blob([doc],{type:'text/html'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='playground.html';document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast('Downloaded playground.html');
});
$('#wrapToggle')?.addEventListener('click',e=>{
  wrapEnabled=!wrapEnabled;
  const btn=e.currentTarget;
  btn.classList.toggle('active',wrapEnabled);
  btn.setAttribute('aria-pressed',String(wrapEnabled));
  [cmHtml,cmCss,cmJs].forEach(cm=>cm&&cm.setOption('lineWrapping',wrapEnabled));
  toast(wrapEnabled?'Line wrap on':'Line wrap off');
});
/* "Command Palette" isn't a separate popup — it's a shortcut that jumps
   focus straight into the top search bar (search projects/snippets/notes,
   or the saved-library search on those pages). On narrow screens the top
   search bar is hidden in favor of the mobile search icon/panel, so jump
   there instead when that's the case, or Ctrl+K / clicking the button
   would silently do nothing. */
function openCommandPalette(){
  const desktopSearch=$('#globalSearch');
  if(desktopSearch && desktopSearch.offsetParent!==null){desktopSearch.focus();return}
  $('#mobileSearchToggle')?.click();
}
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommandPalette()}});
$('#quickCommand')?.addEventListener('click',openCommandPalette);
$('#globalSearch')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();if(location.search.includes('page=saved-snippets')){const local=$('#savedSnippetsSearch');if(local){local.value=q;renderSavedSnippets();return}}if(location.search.includes('page=saved-components')){const local=$('#savedComponentsSearch');if(local){local.value=q;renderSavedComponents();return}}document.querySelectorAll('.project-card,.snippet-card,.note-card,.quick-card').forEach(x=>x.style.display=!q||x.textContent.toLowerCase().includes(q)?'':'none')});

/* components.js runs in its own scope and needs these to save components
   into the Snippets library (and to mirror that save to disk) — without
   this, clicking "Save" on a UI Component throws "store is not defined"
   and silently does nothing. */
window.store=store;
window.diskSaveItem=diskSaveItem;
window.toast=toast;
window.activity=activity;
window.awardPoints=awardPoints;
window.savePlaygroundPayload=savePlaygroundPayload;
window.buildCodePreviewMarkup=buildCodePreviewMarkup;
/* Points/rank/formatting helpers — needed by viewProfileForm() and
   friends in the later "Accessibility + beginner-friendly additions"
   IIFE, which runs in its own scope and otherwise can't see functions
   declared up here. */
window.getPointsState=getPointsState;
window.canClaimDailyBonus=canClaimDailyBonus;
window.getRank=getRank;
window.getRankProgress=getRankProgress;
window.rankSubBadge=rankSubBadge;
window.escapeHtml=escapeHtml;
window.escapeAttr=escapeAttr;
window.userScopedKey=userScopedKey;
})();

/* Beginner guide interactions */
(function(){
  const tips={
    1:'Open the HTML tab and change the text inside a heading, paragraph, or button. HTML controls what appears on the page.',
    2:'Open CSS and change a simple value such as a background, padding, font-size, or border-radius. CSS controls how the page looks.',
    3:'Open JavaScript and change the button action. JavaScript controls what happens after a user clicks, types, or interacts.',
    4:'Press Run my code. The right side is your result. If the result is wrong, change one small thing and run again.'
  };
  const tip=document.getElementById('playgroundTip');
  document.querySelectorAll('.guide-step[data-step]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.guide-step[data-step]').forEach(x=>x.classList.remove('active'));
    btn.classList.add('active');
    if(tip) tip.innerHTML='<i class="bx bx-bulb"></i><div><strong>Try this:</strong> '+tips[btn.dataset.step]+'</div>';
    const tab=btn.dataset.step==='1'?'html':btn.dataset.step==='2'?'css':btn.dataset.step==='3'?'js':null;
    if(tab) document.querySelector('.tab[data-tab="'+tab+'"]')?.click();
  }));
  document.querySelectorAll('.guide-toggle').forEach(btn=>btn.addEventListener('click',()=>{
    const target=document.getElementById(btn.dataset.target); if(!target)return;
    const hidden=target.hidden; target.hidden=!hidden;
    btn.innerHTML=hidden?'<i class="bx bx-chevron-up"></i> Hide guide':'<i class="bx bx-chevron-down"></i> Show guide';
  }));
})();

/* Accessibility + beginner-friendly additions */
(function(){
  const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
  /* This IIFE runs as its own scope, separate from the DISK_ENDPOINT/CSRF_TOKEN
     declared near the top of the file — redeclare them here so the disk-sync
     calls below (set-expertise, logout) don't throw a ReferenceError. */
  const DISK_ENDPOINT='save-data.php';
  const CSRF_TOKEN=typeof window!=='undefined'&&window.CSRF_TOKEN?window.CSRF_TOKEN:null;

  /* --- Mobile search toggle (topbar search is hidden below 650px) --- */
  const panel=$('#mobileSearchPanel');
  $('#mobileSearchToggle')?.addEventListener('click',()=>{
    if(!panel)return; panel.hidden=false;
    setTimeout(()=>$('#globalSearchMobile')?.focus(),10);
  });
  $('#mobileSearchClose')?.addEventListener('click',()=>{if(panel)panel.hidden=true});
  $('#globalSearchMobile')?.addEventListener('input',e=>{
    const main=$('#globalSearch');
    if(main){main.value=e.target.value;main.dispatchEvent(new Event('input',{bubbles:true}))}
  });

  /* --- First-run guided tour + Help --- */
  function tourHtml(){
    return `<h2 id="modalTitle">Welcome to A-DevTools</h2><p class="modal-subtitle">A quick 4-step path if this is your first time here. You can replay this anytime from Settings.</p>
    <ol class="tour-steps">
      <li><i class="bx bx-code-block"></i><div><b>1. Open Snippets</b><small>Browse ready-made starters and preview what they do before touching any code.</small></div></li>
      <li><i class="bx bx-code-alt"></i><div><b>2. Run code in the Playground</b><small>Send a starter to the Playground, change one small thing, and press "Run my code".</small></div></li>
      <li><i class="bx bx-save"></i><div><b>3. Save what you make</b><small>Turn your changes into a snippet you can reuse in future projects.</small></div></li>
      <li><i class="bx bx-folder-open"></i><div><b>4. Track a Project</b><small>Give your work a name in Projects so you can keep building on it.</small></div></li>
    </ol>
    <div class="tour-footer-note"><i class="bx bx-info-circle"></i> Your progress through these steps is shown on the Dashboard.</div>
    <div class="modal-footer"><button class="ghost-btn" data-close-modal>Maybe later</button><button class="primary-btn" id="tourStart"><i class="bx bx-right-arrow-alt"></i> Start with Snippets</button></div>`;
  }
  function openTour(){
    openModal(tourHtml());
    $('#tourStart')?.addEventListener('click',()=>{location.href='?page=snippets'});
  }
  $('#helpBtn')?.addEventListener('click',openTour);
  $('#replayTour')?.addEventListener('click',openTour);
  $('#quickTour')?.addEventListener('click',openTour);

  /* --- First-visit experience level picker --- */
  /* Asking "how experienced are you" up front lets the rest of the UI (guided
     tips, the playground guide steps, and the welcome tour) tailor itself to
     the visitor instead of showing the same beginner hand-holding to everyone. */
  const EXPERIENCE_LEVELS=[
    {key:'beginner',label:'Beginner',icon:'bx-leaf',desc:"Just starting out with web development. We'll walk you through everything step-by-step, starting with a friendly welcome tour."},
    {key:'intermediate',label:'Intermediate',icon:'bx-trending-up',desc:'Comfortable with the fundamentals and ready to build. Pass a quick one-question check to unlock this title and keep bite-sized tips within reach.'},
    {key:'professional',label:'Professional',icon:'bx-medal',desc:'A seasoned developer who knows the ropes. Pass a quick one-question check to unlock this title and enjoy a clean, distraction-free workspace.'}
  ];
  function levelNeedsExam(level){return level==='intermediate'||level==='professional'}
  function examAlreadyPassed(level){return localStorage.getItem(userScopedKey('examPassed_'+level))==='true'}
  function experienceHtml(selected){
    return `<h2 id="modalTitle">How experienced are you?</h2><p class="modal-subtitle">Pick the option that fits best. This decides how much guidance A-DevTools shows you — you can change it anytime in Settings. Use the arrow keys to browse, Enter to pick.</p>
    <div class="experience-choices" role="radiogroup" aria-label="Experience level">${EXPERIENCE_LEVELS.map(l=>{
      const isCurrent=selected===l.key;
      const earned=levelNeedsExam(l.key)&&examAlreadyPassed(l.key);
      let chip='';
      if(isCurrent) chip='<span class="card-chip chip-current"><i class="bx bx-check"></i>Current</span>';
      else if(earned) chip='<span class="card-chip chip-earned"><i class="bx bx-medal"></i>Earned</span>';
      else if(levelNeedsExam(l.key)) chip='<span class="card-chip chip-locked"><i class="bx bx-lock-alt"></i>Quick check</span>';
      return `<button type="button" role="radio" class="experience-card${isCurrent?' selected':''}" data-level="${l.key}" aria-pressed="${isCurrent}" aria-checked="${isCurrent}"><div class="card-top"><i class="bx ${l.icon}"></i>${chip}</div><b>${l.label}</b><span>${l.desc}</span></button>`;
    }).join('')}</div>
    <div class="modal-footer"><button class="primary-btn" id="experienceContinue"${selected?'':' disabled'}><i class="bx bx-check"></i> Continue</button></div>`;
  }
  function experienceLabel(level){return EXPERIENCE_LEVELS.find(l=>l.key===level)?.label||'Not set'}
  /* --- Journey trail shown in Settings: beginner -> intermediate -> professional --- */
  function renderLevelTrail(level){
    const order=['beginner','intermediate','professional'];
    const curIdx=order.indexOf(level);
    $$('#levelTrail .level-trail-step').forEach((el,i)=>{
      el.classList.toggle('done',i<=curIdx);
      el.classList.toggle('current',i===curIdx);
    });
    $$('#levelTrail .level-trail-line').forEach((el,i)=>{el.classList.toggle('done',i<curIdx)});
  }
  function applyExperienceLevel(level,animate,onSettled){
    document.documentElement.setAttribute('data-experience',level);
    localStorage.setItem('experienceLevel',level);
    document.cookie='experienceLevel='+encodeURIComponent(level)+'; path=/; max-age=31536000; samesite=lax';
    const badge=$('#experienceBadge'); if(badge) badge.textContent=experienceLabel(level);
    const btnLabel=$('#experienceBtnLabel'); if(btnLabel) btnLabel.textContent=experienceLabel(level);
    const btnIcon=$('#experienceBtnIcon');
    if(btnIcon) btnIcon.className='bx '+(EXPERIENCE_LEVELS.find(l=>l.key===level)?.icon||'bx-user-voice');
    renderLevelTrail(level);
    const steps=$('#playgroundGuideSteps'), toggle=$('.guide-toggle[data-target="playgroundGuideSteps"]');
    if(steps && toggle){
      const collapse=level==='professional';
      steps.hidden=collapse;
      toggle.innerHTML=collapse?'<i class="bx bx-chevron-down"></i> Show guide':'<i class="bx bx-chevron-up"></i> Hide guide';
    }
    if(animate){
      const btn=$('#experienceBtn');
      if(btn){btn.classList.remove('level-pulse');void btn.offsetWidth;btn.classList.add('level-pulse')}
    }
    /* Previously this fetch had a silent .catch(()=>{}) — if the save to
       the server failed (session expired, network hiccup, etc.) the UI
       still cheerfully said "Experience set to X" with no indication
       anything went wrong, even though the choice hadn't actually been
       persisted server-side. Now it reports success/failure explicitly,
       and (see openExperiencePicker below) the page no longer reloads
       until this settles, so the message actually has time to be seen
       instead of being wiped out by the reload. */
    fetch(DISK_ENDPOINT+'?action=set-expertise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level,csrf:CSRF_TOKEN})})
      .then(r=>r.json().catch(()=>null))
      .then(res=>{
        const ok=!!(res&&res.ok!==false);
        if(!ok){
          toast((res&&res.error)||'Saved on this device, but couldn\u2019t sync to your account \u2014 try again later.');
        } else if(animate){
          toast('Experience set to '+experienceLabel(level));
        }
        if(typeof onSettled==='function')onSettled(ok);
      })
      .catch(()=>{
        toast('Saved on this device, but couldn\u2019t reach the server to sync it.');
        if(typeof onSettled==='function')onSettled(false);
      });
  }
  /* --- Level-up exam: Intermediate and Professional must be earned --- */
  /* Beginner is free to pick. Moving up to Intermediate or Professional asks
     a short general-AI-knowledge check first; the title only "sticks" once
     passed. A level earned once is remembered locally so it is never re-quizzed. */
  const EXAMS={
    intermediate:{label:'Intermediate',passPct:70,questions:[
      {q:'Who develops Claude Code?',options:['OpenAI','Anthropic','Google DeepMind','Microsoft'],a:1},
      {q:'Which company develops ChatGPT?',options:['Anthropic','Meta','OpenAI','Amazon'],a:2},
      {q:'What does "LLM" stand for in AI?',options:['Large Language Model','Long Logic Machine','Linear Learning Method','Local Language Module'],a:0}
    ]},
    professional:{label:'Professional',passPct:70,questions:[
      {q:'Who develops Claude Code?',options:['OpenAI','Anthropic','Google DeepMind','Microsoft'],a:1},
      {q:'Which company develops the Gemini model family?',options:['OpenAI','Anthropic','Google DeepMind','xAI'],a:2},
      {q:'Which family of AI models does Codex belong to, and who develops it?',options:['OpenAI','Anthropic','Alibaba','Meta'],a:0},
      {q:'Which Chinese tech company develops the Qwen AI model family?',options:['Tencent','Baidu','Alibaba','ByteDance'],a:2},
      {q:'What technique is widely credited with enabling modern LLMs, introduced in the 2017 paper "Attention Is All You Need"?',options:['Convolutional networks','The Transformer architecture','Decision trees','Recurrent memory cells'],a:1}
    ]}
  };
  let examSession=null;
  function examQuestionCard(){
    const cfg=EXAMS[examSession.level],i=examSession.qIndex,total=cfg.questions.length,q=cfg.questions[i];
    const picked=examSession.answers[i];const pct=Math.round((i/total)*100);const letters=['A','B','C','D','E','F'];
    return `<h2 id="modalTitle">${cfg.label} Exam</h2><p class="modal-subtitle">Pass with ${cfg.passPct}% or higher to earn the ${cfg.label} title. You can change your answer before moving on.</p>
    <div class="exam-progress"><div class="exam-progress-bar"><div class="exam-progress-fill" style="width:${pct}%"></div></div><span class="exam-progress-count">Question ${i+1} of ${total}</span></div>
    <div class="exam-question">${q.q}</div>
    <div class="exam-options">${q.options.map((opt,idx)=>`<button type="button" class="exam-option${picked===idx?' selected':''}" data-opt="${idx}" aria-pressed="${picked===idx}"><span class="opt-letter">${letters[idx]}</span><span>${opt}</span></button>`).join('')}</div>
    <div class="exam-kbd-hint"><i class="bx bxs-keyboard"></i> Press 1\u2013${q.options.length} to answer \u00b7 Enter for next</div>
    <div class="modal-footer"><button class="ghost-btn" id="examBack"><i class="bx bx-chevron-left"></i> ${i===0?'Cancel':'Back'}</button><button class="primary-btn" id="examNext"${picked==null?' disabled':''}>${i===total-1?'Finish exam':'Next question'} <i class="bx bx-chevron-right"></i></button></div>`;
  }
  function renderExamQuestion(){
    openModal(examQuestionCard());
    $$('.exam-option').forEach(btn=>btn.addEventListener('click',()=>{examSession.answers[examSession.qIndex]=Number(btn.getAttribute('data-opt'));renderExamQuestion()}));
    $('#examNext')?.addEventListener('click',()=>{
      const cfg=EXAMS[examSession.level];
      if(examSession.qIndex<cfg.questions.length-1){examSession.qIndex++;renderExamQuestion()} else {gradeExam()}
    });
    $('#examBack')?.addEventListener('click',()=>{
      if(examSession.qIndex===0){const onBack=examSession.onBack;examSession=null;onBack()}
      else {examSession.qIndex--;renderExamQuestion()}
    });
  }
  function gradeExam(){
    openModal(`<h2 id="modalTitle">Grading your exam\u2026</h2><div class="spinner-wrap"><div class="spinner-ring"></div><p>Checking your answers</p></div>`);
    setTimeout(()=>{
      const cfg=EXAMS[examSession.level];let correct=0;
      cfg.questions.forEach((q,idx)=>{if(examSession.answers[idx]===q.a)correct++});
      const total=cfg.questions.length,pct=Math.round((correct/total)*100),passed=pct>=cfg.passPct;
      /* Passing this quick check only unlocks the Intermediate/Professional
         *title* — it's an onboarding/UI preference, not a coding
         accomplishment, so it deliberately does NOT award XP (that used to
         call awardPoints(50, ...) here, which let people farm XP just by
         retaking this 1-3 question quiz). */
      if(passed){localStorage.setItem(userScopedKey('examPassed_'+examSession.level),'true')}
      renderExamResult(passed,correct,total,pct);
    },950);
  }
  function renderExamResult(passed,correct,total,pct){
    const cfg=EXAMS[examSession.level];
    openModal(`<div class="score-ring" style="--pct:0;--ring-color:${passed?'var(--success)':'var(--danger)'}"><div class="score-ring-label"><strong id="scoreNum">0%</strong><span>Score</span></div></div>
    <h2 class="exam-result-title" id="modalTitle">${passed?'You passed!':'Not quite there yet'}</h2>
    <p class="exam-result-sub">${correct} of ${total} correct on the ${cfg.label} exam${passed?'':' \u2014 '+cfg.passPct+'% is needed to pass'}</p>
    ${passed?`<div class="exam-badge-earned"><i class="bx bx-medal"></i> ${cfg.label} title unlocked</div>`:`<p class="exam-result-sub">Review the basics and try again whenever you\u2019re ready.</p>`}
    <div class="modal-footer">${passed?`<button class="ghost-btn" data-close-modal>Not now</button><button class="primary-btn" id="examContinue"><i class="bx bx-check"></i> Continue as ${cfg.label}</button>`:`<button class="ghost-btn" id="examChooseOther"><i class="bx bx-arrow-back"></i> Choose another level</button><button class="primary-btn" id="examRetry"><i class="bx bx-refresh"></i> Retry exam</button>`}</div>`);
    requestAnimationFrame(()=>{
      const ring=$('.score-ring'),num=$('#scoreNum');
      if(ring) ring.style.setProperty('--pct',pct);
      if(num){let cur=0;const step=Math.max(1,Math.round(pct/24));const t=setInterval(()=>{cur=Math.min(pct,cur+step);num.textContent=cur+'%';if(cur>=pct)clearInterval(t)},20)}
      if(passed && ring) setTimeout(()=>launchConfetti(ring),350);
    });
    $('#examContinue')?.addEventListener('click',()=>{const onPass=examSession.onPass;examSession=null;onPass()});
    $('#examRetry')?.addEventListener('click',()=>{examSession.qIndex=0;examSession.answers=[];renderExamQuestion()});
    $('#examChooseOther')?.addEventListener('click',()=>{const onBack=examSession.onBack;examSession=null;onBack()});
  }
  function startExam(level,onPass,onBack){examSession={level,qIndex:0,answers:[],onPass,onBack};renderExamQuestion()}
  /* Keyboard shortcuts during the exam: number keys pick an answer, Enter
     advances, Backspace goes back \u2014 lets a confident test-taker fly through
     without reaching for the mouse. */
  document.addEventListener('keydown',e=>{
    if(!examSession || !modal || !modal.classList.contains('show'))return;
    if(e.key>='1'&&e.key<='6'){
      const opt=$$('.exam-option')[Number(e.key)-1];
      if(opt){e.preventDefault();opt.click()}
    } else if(e.key==='Enter'){
      const next=$('#examNext');
      if(next && !next.disabled){e.preventDefault();next.click()}
    } else if(e.key==='Backspace'){
      const back=$('#examBack');
      if(back && document.activeElement?.tagName!=='INPUT'){e.preventDefault();back.click()}
    }
  });
  /* A short, tasteful confetti burst to celebrate passing \u2014 pure CSS/JS,
     no external dependency. Pieces remove themselves after the animation. */
  function launchConfetti(container){
    if(!container)return;
    const colors=['#f2c94c','#6fcf97','#56ccf2','#bb6bd9','#f2994a'];
    for(let i=0;i<22;i++){
      const p=document.createElement('span');
      p.className='confetti-piece';
      p.style.background=colors[i%colors.length];
      p.style.left=(38+Math.random()*24)+'%';
      p.style.setProperty('--x',Math.round(Math.random()*180-90)+'px');
      p.style.setProperty('--r',Math.round(Math.random()*340)+'deg');
      p.style.setProperty('--d',(650+Math.random()*450)+'ms');
      container.appendChild(p);
      setTimeout(()=>p.remove(),1200);
    }
  }

  /* --- Confirm-before-change modal --- */
  /* Shown only when an existing level is being switched to a different one
     (not on the very first pick, where there's nothing to confirm yet). */
  function experienceChangeConfirmHtml(fromLabel,toLabel){
    return `<h2 id="modalTitle">Change experience level?</h2>
    <p class="modal-subtitle">You're switching from <b>${fromLabel}</b> to <b>${toLabel}</b>. This changes how much guidance and which tips are shown across your workspace.</p>
    <div class="modal-footer"><button type="button" class="ghost-btn" data-exp-cancel><i class="bx bx-chevron-left"></i> Cancel</button><button type="button" class="primary-btn" data-exp-confirm><i class="bx bx-check"></i> Yes, change it</button></div>`;
  }

  function openExperiencePicker(onDone){
    let chosen=localStorage.getItem('experienceLevel')||null;
    openModal(experienceHtml(chosen));
    const cont=$('#experienceContinue');
    const choices=$('.experience-choices');
    $$('.experience-card').forEach(card=>card.addEventListener('click',()=>{
      chosen=card.getAttribute('data-level');
      $$('.experience-card').forEach(c=>{
        const isSel=c===card;
        c.classList.toggle('selected',isSel);
        c.setAttribute('aria-pressed',isSel?'true':'false');
        c.setAttribute('aria-checked',isSel?'true':'false');
      });
      if(cont) cont.disabled=false;
    }));
    /* Arrow-key roaming across cards, so the whole picker works without a mouse */
    choices?.addEventListener('keydown',e=>{
      if(!['ArrowRight','ArrowLeft','ArrowDown','ArrowUp'].includes(e.key))return;
      e.preventDefault();
      const cards=$$('.experience-card');
      const idx=cards.indexOf(document.activeElement);
      if(idx===-1){cards[0]?.focus();return}
      const dir=(e.key==='ArrowRight'||e.key==='ArrowDown')?1:-1;
      cards[(idx+dir+cards.length)%cards.length].focus();
    });
    cont?.addEventListener('click',()=>{
      if(!chosen)return;
      const currentLevel=localStorage.getItem('experienceLevel');
      const changed=chosen!==currentLevel;
      const proceed=()=>{
        const finish=()=>{
          closeModal();
          applyExperienceLevel(chosen,changed,(ok)=>{
            if(typeof onDone==='function'){
              onDone(chosen);
            } else if(changed){
              /* The Dashboard content AND the sidebar (Guided Tour quick tool,
                 "Local workspace · <level>" label) are rendered server-side per
                 level, so reload to actually show the page that matches the new
                 choice everywhere, not just update the badge text. Wait for the
                 save to settle first — reloading immediately used to cut off
                 the success/failure toast before it could ever be seen; on
                 failure we also wait a bit longer so there's time to read it. */
              setTimeout(()=>location.reload(),ok?150:1800);
            }
          });
        };
        if(levelNeedsExam(chosen) && !examAlreadyPassed(chosen)){
          startExam(chosen,finish,()=>openExperiencePicker(onDone));
        } else {
          finish();
        }
      };
      if(changed && currentLevel){
        openModal(experienceChangeConfirmHtml(experienceLabel(currentLevel),experienceLabel(chosen)));
        window.__expConfirmHandler=proceed;
        window.__expCancelHandler=()=>openExperiencePicker(onDone);
      } else {
        proceed();
      }
    });
  }
  $('#changeExperienceBtn')?.addEventListener('click',()=>openExperiencePicker());
  $('#experienceBtn')?.addEventListener('click',()=>openExperiencePicker());
  $('#levelTrail')?.addEventListener('click',e=>{
    if(e.target.closest('.level-trail-step')) openExperiencePicker();
  });

  /* The server value (database for logged-in accounts, falling back to the
     cookie) is authoritative — it's what survives a cleared localStorage,
     a browser switch, or a partial "clear site data". Reconcile it into
     localStorage before anything below reads that as the source of truth,
     so the Settings badge/topbar pill/sidebar label can never disagree. */
  const serverLevel=(typeof window!=='undefined'&&window.SERVER_EXPERIENCE_LEVEL)?window.SERVER_EXPERIENCE_LEVEL:null;
  const localLevel=localStorage.getItem('experienceLevel');
  const savedLevel=serverLevel||localLevel||null;
  if(savedLevel && savedLevel!==localLevel){ localStorage.setItem('experienceLevel',savedLevel) }
  if(savedLevel){
    applyExperienceLevel(savedLevel);
    if(!localStorage.getItem('tourSeen')){
      localStorage.setItem('tourSeen','true');
      if(savedLevel==='beginner') setTimeout(openTour,400);
    }
  } else {
    setTimeout(()=>{
      openExperiencePicker(level=>{
        localStorage.setItem('tourSeen','true');
        if(level==='beginner'){
          setTimeout(openTour,250);
        } else {
          location.reload();
        }
      });
    },400);
  }

  /* --- Modal focus trap + return focus to the element that opened it --- */
  const modal=$('#modal');
  let lastFocused=null;
  const origOpen=window.openModal;
  if(modal){
    document.addEventListener('click',e=>{
      const opener=e.target.closest('button,a');
      if(opener && !modal.contains(opener)) lastFocused=opener;
    }, true);
    modal.addEventListener('keydown',e=>{
      if(e.key!=='Tab')return;
      const focusable=$$('#modal button, #modal input, #modal select, #modal textarea, #modal a[href]').filter(el=>!el.disabled && el.offsetParent!==null);
      if(!focusable.length)return;
      const first=focusable[0], last=focusable[focusable.length-1];
      if(e.shiftKey && document.activeElement===first){e.preventDefault();last.focus()}
      else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first.focus()}
    });
    const observer=new MutationObserver(()=>{
      if(!modal.classList.contains('show') && lastFocused){lastFocused.focus();lastFocused=null}
    });
    observer.observe(modal,{attributes:true,attributeFilter:['class']});
  }

  /* --- View Profile modal (account dropdown) ----------------------------
     Read-only profile summary — avatar/rank/XP/stats/join date — with an
     "Edit Profile" action inside that swaps in the actual edit form below,
     so people see their account before jumping into editing it. */
  function viewProfileForm(){
    const nameEl=$('.account-dropdown-name'),emailEl=$('.account-dropdown-email');
    const curName=nameEl?nameEl.textContent.trim():'',curEmail=emailEl?emailEl.textContent.trim():'';
    const initial=curName?curName.trim().charAt(0).toUpperCase():'?';
    const s=getPointsState(),rank=getRank(s.total),prog=getRankProgress(s.total);
    const joined=window.CURRENT_USER_JOINED_AT?new Date(String(window.CURRENT_USER_JOINED_AT).replace(' ','T')):null;
    const joinedLabel=(joined&&!isNaN(joined))?joined.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'}):'—';
    const counts={projects:store.get('projects').length,snippets:store.get('snippets').filter(x=>snippetSource(x)==='snippet').length,components:store.get('snippets').filter(x=>snippetSource(x)==='component').length,notes:store.get('notes').length};
    openModal(`<div class="profile-view">
      <div class="profile-view-avatar account-avatar-ring ${rank.cls}"><span class="account-avatar-initial">${escapeHtml(initial)}</span><span class="account-avatar-badge"><i class="bx ${rank.icon}"></i></span></div>
      <h2 class="profile-view-name">${escapeHtml(curName)}</h2>
      <p class="muted profile-view-email">${escapeHtml(curEmail)}</p>
      <div class="account-rank-row profile-view-rank"><i class="bx ${rank.icon}"></i> <b>${escapeHtml(rank.tierLabel)}</b> ${rankSubBadge(rank)} <span class="muted">· ${s.total} XP</span></div>
      <div class="xp-bar"><div class="xp-bar-fill" style="width:${prog.pct}%"></div></div>
      <div class="xp-bar-label">${prog.next?(prog.toNext+' XP to '+escapeHtml(prog.next.label)):'Max rank reached'}</div>
      <div class="profile-stats">
        <div class="profile-stat"><strong>${counts.projects}</strong><span>Projects</span></div>
        <div class="profile-stat"><strong>${counts.snippets}</strong><span>Snippets</span></div>
        <div class="profile-stat"><strong>${counts.components}</strong><span>Components</span></div>
        <div class="profile-stat"><strong>${counts.notes}</strong><span>Notes</span></div>
      </div>
      <p class="muted profile-view-joined"><i class="bx bx-calendar"></i> Member since ${escapeHtml(joinedLabel)}</p>
      <div class="modal-footer"><button class="ghost-btn" data-close-modal><i class="bx bx-x"></i> Close</button><button class="primary-btn" id="goEditProfileBtn"><i class="bx bx-pencil"></i> Edit Profile</button></div>
    </div>`,'modal-compact');
    const goEditBtn=$('#goEditProfileBtn');
    if(goEditBtn)goEditBtn.onclick=()=>editProfileForm();
  }

  /* --- Edit Profile modal (opened from View Profile) --------------------- */
  function editProfileForm(){
    const nameEl=$('.account-dropdown-name'),emailEl=$('.account-dropdown-email');
    const curName=nameEl?nameEl.textContent.trim():'',curEmail=emailEl?emailEl.textContent.trim():'';
    openModal(`<h2>Edit Profile</h2><p class="modal-subtitle">Update your account name, email, or password.</p>
      <label>Name<input id="epName" class="input" value="${escapeAttr(curName)}" placeholder="Your name"></label>
      <label>Email<input id="epEmail" class="input" type="email" value="${escapeAttr(curEmail)}" placeholder="you@example.com"></label>
      <p class="muted" style="margin:0 0 8px">Leave the password fields blank to keep your current password.</p>
      <label>Current password<input id="epCurPass" class="input" type="password" placeholder="Only needed to change your password" autocomplete="current-password"></label>
      <label>New password<input id="epNewPass" class="input" type="password" placeholder="At least 6 characters" autocomplete="new-password"></label>
      <div class="modal-footer"><button class="ghost-btn" data-close-modal><i class="bx bx-x"></i> Cancel</button><button class="primary-btn" id="saveProfileBtn"><i class="bx bx-save"></i> Save Changes</button></div>`);
    const saveBtn=$('#saveProfileBtn');
    saveBtn.onclick=()=>{
      const name=$('#epName').value.trim(),email=$('#epEmail').value.trim();
      const currentPassword=$('#epCurPass').value,newPassword=$('#epNewPass').value;
      if(!name||!email){toast('Name and email cannot be empty.');return}
      if(newPassword&&newPassword.length<6){toast('New password needs to be at least 6 characters.');return}
      if(newPassword&&!currentPassword){toast('Enter your current password to set a new one.');return}
      saveBtn.disabled=true;saveBtn.innerHTML='<i class="bx bx-loader-alt bx-spin"></i> Saving...';
      fetch('auth.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update-profile',name,email,currentPassword,newPassword,csrf:CSRF_TOKEN})})
        .then(r=>r.json())
        .then(res=>{
          if(res&&res.ok){
            if(nameEl)nameEl.textContent=res.user.name;
            if(emailEl)emailEl.textContent=res.user.email;
            closeModal();
            toast('Profile updated');
          }else{
            saveBtn.disabled=false;saveBtn.innerHTML='<i class="bx bx-save"></i> Save Changes';
            toast((res&&res.error)||'Could not update profile — try again.');
          }
        })
        .catch(()=>{saveBtn.disabled=false;saveBtn.innerHTML='<i class="bx bx-save"></i> Save Changes';toast('Could not reach the server — try again.')});
    };
  }

  /* --- Account menu (topbar avatar) + log out --- */
  const accountBtn=$('#accountMenuBtn'), accountDropdown=$('#accountDropdown');
  if(accountBtn && accountDropdown){
    const closeAccountMenu=()=>{accountDropdown.hidden=true;accountBtn.setAttribute('aria-expanded','false')};
    accountBtn.addEventListener('click',e=>{
      e.stopPropagation();
      const willOpen=accountDropdown.hidden;
      closeAccountMenu();
      if(willOpen){accountDropdown.hidden=false;accountBtn.setAttribute('aria-expanded','true')}
    });
    document.addEventListener('click',e=>{
      if(!accountDropdown.hidden && !e.target.closest('#accountMenu')) closeAccountMenu();
    });
    document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeAccountMenu(); });
  }
  const viewProfileBtn=$('#viewProfileBtn');
  if(viewProfileBtn){
    viewProfileBtn.addEventListener('click',()=>{
      if(accountDropdown){accountDropdown.hidden=true;accountBtn?.setAttribute('aria-expanded','false')}
      viewProfileForm();
    });
  }
  const logoutBtn=$('#logoutBtn');
  if(logoutBtn){
    logoutBtn.addEventListener('click',()=>{
      logoutBtn.disabled=true;
      fetch('auth.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout',csrf:CSRF_TOKEN})})
        .then(()=>{ window.location.href='?page=landing'; })
        .catch(()=>{ window.location.href='?page=landing'; });
    });
  }
})();
