(function(){
'use strict';
const $=s=>document.querySelector(s), $$=s=>Array.from(document.querySelectorAll(s));
const store={get(k,d=[]){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}},set(k,v){localStorage.setItem(k,JSON.stringify(v))}};
const escapeHtml=s=>String(s==null?'':s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const escapeAttr=escapeHtml;
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>el.classList.remove('show'),1800)}
function activity(text){const a=store.get('activity');a.unshift({text,time:new Date().toLocaleString()});store.set('activity',a.slice(0,10));renderActivity()}
function renderActivity(){const el=$('#activityList');if(!el)return;const a=store.get('activity');el.innerHTML=a.length?a.map(x=>`<div class="activity"><b><i class="bx bx-history"></i></b><div>${escapeHtml(x.text)}<div class="muted">${escapeHtml(x.time)}</div></div></div>`).join(''):'<div class="empty">No activity yet.</div>'}
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
    if(card){card.hidden=false;const t=$('#saveStatusText');if(t)t.textContent='Saving projects, snippets and notes automatically to '+res.path+'.'}
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
    if(el)el.innerHTML=`<p class="muted"><span class="status-ok"><i class="bx bx-check-circle"></i> Connected.</span> Files are written to <code>${escapeHtml(res.path)}</code> on this computer${res.isCustom?' <span class="tag">custom location</span>':''}.</p><div class="disk-counts"><span><b>${c.projects||0}</b> projects</span><span><b>${c.snippets||0}</b> snippets</span><span><b>${c.notes||0}</b> notes</span></div><p class="muted">Last full backup: ${escapeHtml(last)}</p>`;
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
function setTheme(dark){document.body.classList.toggle('dark',!!dark);localStorage.setItem('theme',dark?'dark':'light');const c=$('#darkSetting');if(c)c.checked=!!dark;const ti=$('#themeToggle')?.querySelector('.bx');if(ti)ti.className='bx '+(dark?'bx-sun':'bx-moon')}
$('#themeToggle')?.addEventListener('click',()=>setTheme(!document.body.classList.contains('dark')));
setTheme(localStorage.getItem('theme')==='dark');
$('#darkSetting')?.addEventListener('change',e=>setTheme(e.target.checked));
$('#notificationBtn')?.addEventListener('click',()=>{location.href='?page=dashboard';toast('Activity is available on the Dashboard')});
const modal=$('#modal'),modalBody=$('#modalBody');
function openModal(html,title){if(!modal)return;modalBody.innerHTML=html;modal.classList.add('show');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open');setTimeout(()=>{const first=modal.querySelector('input,textarea,select,button:not(.modal-close)');first?.focus()},30)}
function closeModal(){if(!modal)return;modal.classList.remove('show');modal.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')}
/* Exposed globally: the first-run experience picker and tour live in a separate
   script block later in the file and call these by name. */
window.openModal=openModal;
window.closeModal=closeModal;
$('#modalClose')?.addEventListener('click',closeModal);modal?.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal?.classList.contains('show'))closeModal()});
function projectForm(editId){
  const p=store.get('projects'),item=editId?p.find(x=>String(x.id)===String(editId)):null;
  openModal(`<h2 id="modalTitle">${item?'Edit':'New'} Project</h2><p class="modal-subtitle">${item?'Update this local project reference.':'Create a local project reference for your workspace.'}</p><div class="form-grid"><label>Project name<input id="mName" class="input" value="${escapeAttr(item?.name||'')}" placeholder="e.g. Client Portal"></label><label>Technology<input id="mTech" class="input" value="${escapeAttr(item?.tech||'')}" placeholder="PHP, JavaScript, MySQL"></label><label class="full">Description<textarea id="mDesc" class="input" rows="5" placeholder="What are you building?">${escapeHtml(item?.desc||'')}</textarea></label></div><div class="modal-footer"><button class="ghost-btn" data-close-modal><i class="bx bx-x"></i> Cancel</button><button class="primary-btn" id="saveProject"><i class="bx bx-save"></i> ${item?'Update':'Save'} Project</button></div>`);
  $('#saveProject').onclick=()=>{const name=$('#mName').value.trim()||'Untitled Project',tech=$('#mTech').value.trim()||'Web',desc=$('#mDesc').value.trim();if(item){item.name=name;item.tech=tech;item.desc=desc;item.updatedAt=Date.now();store.set('projects',p);diskSaveItem('projects',item);activity('Updated project: '+name)}else{const newProject={id:Date.now(),name,tech,desc};p.unshift(newProject);store.set('projects',p);diskSaveItem('projects',newProject);activity('Created project: '+name);markGs('createdProject')}closeModal();renderProjects();updateCounts();toast(item?'Project updated on your local drive':'Project saved to your local drive')};
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
function runStarter(key){const t=starterTemplates[key];if(t)savePlaygroundPayload({code:t.code,lang:t.lang},t.title)}
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
  if(localStorage.getItem('samplesRemoved')==='true')return;
  const list=store.get('snippets');
  const kept=list.filter(x=>!String(x.id).startsWith('sample-'));
  if(kept.length!==list.length){
    store.set('snippets',kept);
    list.filter(x=>String(x.id).startsWith('sample-')).forEach(x=>diskDeleteItem('snippets',x.id));
  }
  localStorage.setItem('samplesRemoved','true');
}
function snippetForm(editId){
  const list=store.get('snippets'),item=editId?list.find(x=>String(x.id)===String(editId)):null;
  openModal(`<h2>${item?'Edit':'Add'} Snippet</h2><p class="modal-subtitle">Save reusable code and run it directly from your library.</p><div class="form-grid"><label>Title<input id="sTitle" class="input" value="${escapeAttr(item?.title||'')}" placeholder="Responsive card"></label><label>Language<select id="sLang" class="input"><option>HTML + CSS</option><option>HTML + JS</option><option>HTML + CSS + JS</option><option>CSS</option><option>JavaScript</option></select></label><label class="full">Code<textarea id="sCode" class="modal-code" rows="15" placeholder="Paste runnable code here">${escapeHtml(item?.code||'')}</textarea></label></div><div class="modal-footer"><button class="ghost-btn" data-close-modal><i class="bx bx-x"></i> Cancel</button><button class="primary-btn" id="saveSnippet"><i class="bx bx-save"></i> ${item?'Update':'Save'} Snippet</button></div>`);
  if(item)$('#sLang').value=item.lang;
  $('#saveSnippet').onclick=()=>{const title=$('#sTitle').value.trim()||'Untitled Snippet',lang=$('#sLang').value,code=$('#sCode').value;if(!code.trim()){toast('Add some code first');$('#sCode').focus();return}if(item){item.title=title;item.lang=lang;item.code=code;item.updatedAt=Date.now();store.set('snippets',list);diskSaveItem('snippets',item);activity('Updated snippet: '+title)}else{const newSnippet={id:Date.now(),title,lang,code,createdAt:Date.now()};list.unshift(newSnippet);store.set('snippets',list);diskSaveItem('snippets',newSnippet);activity('Saved snippet: '+title);markGs('savedSnippet')}closeModal();renderSnippets();updateCounts();toast(item?'Snippet updated':'Snippet saved to your local drive')};
}
$('#addSnippet')?.addEventListener('click',()=>snippetForm());

function copySnippet(id){const x=store.get('snippets').find(i=>String(i.id)===String(id));if(!x)return;const done=()=>{activity('Copied snippet: '+x.title);toast('Snippet copied')};if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(x.code).then(done).catch(()=>fallbackCopy(x.code,done));else fallbackCopy(x.code,done)}
function fallbackCopy(text,done){const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();try{document.execCommand('copy');done()}finally{ta.remove()}}
function deleteSnippet(id){const list=store.get('snippets'),x=list.find(i=>String(i.id)===String(id));if(!x)return;if(!confirm('Delete this snippet?'))return;store.set('snippets',list.filter(i=>String(i.id)!==String(id)));diskDeleteItem('snippets',id);activity('Deleted snippet: '+x.title);renderSnippets();updateCounts();toast('Snippet deleted')}
function previewSnippet(id){const x=store.get('snippets').find(i=>String(i.id)===String(id));if(!x)return;markGs('viewedSnippet');openModal(`<div class="modal-preview-head"><div><span class="section-kicker">${escapeHtml(x.lang)}</span><h2>${escapeHtml(x.title)}</h2></div><button class="primary-btn" data-run-snippet="${escapeAttr(x.id)}"><i class="bx bx-play"></i> Run in Playground</button></div>${buildCodePreviewMarkup(x.code)}<div class="modal-footer"><button class="ghost-btn" data-close-modal>Close</button><button class="primary-btn" data-copy-preview="${escapeAttr(x.id)}"><i class="bx bx-copy"></i> Copy code</button></div>`)}
function renderSnippets(){
  const el=$('#snippetGrid');if(!el)return;let list=store.get('snippets');
  const q=($('#snippetSearch')?.value||'').trim().toLowerCase(),filter=$('#snippetFilter')?.value||'all',sort=$('#snippetSort')?.value||'recent';
  let filtered=list.filter(x=>(filter==='all'||x.lang===filter)&&(!q||(x.title+' '+x.lang+' '+x.code).toLowerCase().includes(q)));
  if(sort==='name')filtered.sort((a,b)=>a.title.localeCompare(b.title));else if(sort==='language')filtered.sort((a,b)=>a.lang.localeCompare(b.lang)||a.title.localeCompare(b.title));else filtered.sort((a,b)=>(b.updatedAt||b.createdAt||0)-(a.updatedAt||a.createdAt||0));
  $('#savedSnippetCount').textContent=filtered.length;
  el.innerHTML=filtered.length?filtered.map(x=>`<article class="snippet-card"><div class="snippet-card-top"><div><span class="tag">${escapeHtml(x.lang)}</span><div class="card-title">${escapeHtml(x.title)}</div></div><span class="snippet-live"><i></i> Runnable</span></div><pre class="code-mini">${escapeHtml(x.code)}</pre><div class="card-actions"><div class="action-left"><button class="small-btn run-snippet" data-run-snippet="${escapeAttr(x.id)}"><i class="bx bx-play"></i> Run</button><button class="small-btn" data-copy-snippet="${escapeAttr(x.id)}"><i class="bx bx-copy"></i> Copy</button><button class="small-btn" data-preview-snippet="${escapeAttr(x.id)}"><i class="bx bx-show"></i> Preview</button></div><div class="action-right"><button class="small-btn" data-edit-snippet="${escapeAttr(x.id)}"><i class="bx bx-edit"></i></button><button class="small-btn" data-delete-snippet="${escapeAttr(x.id)}"><i class="bx bx-trash"></i></button></div></div></article>`).join(''):'<div class="empty">No snippets match the current filter.</div>';
}
$('#snippetGrid')?.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.runSnippet){const x=store.get('snippets').find(i=>String(i.id)===String(b.dataset.runSnippet));if(x)savePlaygroundPayload({code:x.code,lang:x.lang},x.title)}else if(b.dataset.copySnippet)copySnippet(b.dataset.copySnippet);else if(b.dataset.previewSnippet)previewSnippet(b.dataset.previewSnippet);else if(b.dataset.editSnippet)snippetForm(b.dataset.editSnippet);else if(b.dataset.deleteSnippet)deleteSnippet(b.dataset.deleteSnippet)});
['snippetSearch','snippetFilter','snippetSort'].forEach(id=>$('#'+id)?.addEventListener(id==='snippetSearch'?'input':'change',renderSnippets));
$$('.view-btn').forEach(btn=>btn.addEventListener('click',()=>{$$('.view-btn').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#snippetGrid')?.classList.toggle('snippet-list',btn.dataset.view==='list');localStorage.setItem('snippetView',btn.dataset.view)}));
if(localStorage.getItem('snippetView')==='list')$('.view-btn[data-view="list"]')?.click();
$$('.run-template').forEach(btn=>btn.addEventListener('click',()=>runStarter(btn.dataset.template)));
function saveStarterToLibrary(key){
  const t=starterTemplates[key];if(!t)return;
  const id='starter-'+key;
  const list=store.get('snippets');
  if(list.some(x=>String(x.id)===id)){toast(t.title+' is already in your snippets');return}
  const item={id,title:t.title,lang:t.lang,code:t.code,createdAt:Date.now()};
  list.unshift(item);
  store.set('snippets',list);
  diskSaveItem('snippets',item);
  activity('Saved starter: '+t.title);
  markGs('savedSnippet');
  renderSnippets();updateCounts();
  toast(t.title+' saved to Snippets');
}
$$('.save-template').forEach(btn=>btn.addEventListener('click',()=>saveStarterToLibrary(btn.dataset.template)));
$$('.preview-template').forEach(btn=>btn.addEventListener('click',()=>{const t=starterTemplates[btn.dataset.template];if(!t)return;markGs('viewedSnippet');openModal(`<div class="modal-preview-head"><div><span class="section-kicker">${escapeHtml(t.lang)}</span><h2>${escapeHtml(t.title)}</h2></div><button class="primary-btn" data-run-template="${escapeAttr(btn.dataset.template)}"><i class="bx bx-play"></i> Run in Playground</button></div>${buildCodePreviewMarkup(t.code,'preview-code-large')}`)}));
modal?.addEventListener('click',e=>{
  const close=e.target.closest('[data-close-modal]');if(close)closeModal();
  const expConfirm=e.target.closest('[data-exp-confirm]');if(expConfirm && typeof window.__expConfirmHandler==='function')window.__expConfirmHandler();
  const expCancel=e.target.closest('[data-exp-cancel]');if(expCancel && typeof window.__expCancelHandler==='function')window.__expCancelHandler();
  const run=e.target.closest('[data-run-template]');if(run)runStarter(run.dataset.runTemplate);
  const runSnippetBtn=e.target.closest('[data-run-snippet]');if(runSnippetBtn){const x=store.get('snippets').find(i=>String(i.id)===String(runSnippetBtn.dataset.runSnippet));if(x)savePlaygroundPayload({code:x.code,lang:x.lang},x.title)}
  const copyPrev=e.target.closest('[data-copy-preview]');if(copyPrev)copySnippet(copyPrev.dataset.copyPreview);
  const pTab=e.target.closest('[data-preview-tab]');
  if(pTab){
    const frame=pTab.closest('.preview-code-frame');if(!frame)return;
    frame.querySelectorAll('[data-preview-tab]').forEach(b=>b.classList.remove('active'));
    pTab.classList.add('active');
    const key=pTab.dataset.previewTab;
    frame.querySelectorAll('[data-preview-panel]').forEach(p=>p.classList.toggle('active',p.dataset.previewPanel===key));
  }
});
function noteForm(editId){
  const n=store.get('notes'),item=editId?n.find(x=>String(x.id)===String(editId)):null;
  openModal(`<h2>${item?'Edit':'New'} Note</h2><p class="modal-subtitle">${item?'Update this technical reference or decision.':'Capture a short technical reference or development decision.'}</p><label>Title<input id="nTitle" class="input" value="${escapeAttr(item?.title||'')}" placeholder="PHP routing notes"></label><label>Note<textarea id="nText" class="input" rows="8" placeholder="Write your development notes...">${escapeHtml(item?.text||'')}</textarea></label><div class="modal-footer"><button class="ghost-btn" data-close-modal><i class="bx bx-x"></i> Cancel</button><button class="primary-btn" id="saveNote"><i class="bx bx-save"></i> ${item?'Update':'Save'} Note</button></div>`);
  $('#saveNote').onclick=()=>{const title=$('#nTitle').value.trim()||'Untitled Note',text=$('#nText').value.trim();if(item){item.title=title;item.text=text;item.updatedAt=Date.now();store.set('notes',n);diskSaveItem('notes',item);activity('Updated note: '+title)}else{const newNote={id:Date.now(),title,text,createdAt:Date.now()};n.unshift(newNote);store.set('notes',n);diskSaveItem('notes',newNote);activity('Created note: '+title)}closeModal();renderNotes();updateCounts();toast(item?'Note updated on your local drive':'Note saved to your local drive')}
}
$('#addNote')?.addEventListener('click',()=>noteForm());
function renderNotes(){const el=$('#noteGrid');if(!el)return;const n=store.get('notes');el.innerHTML=n.length?n.map(x=>`<article class="note-card"><div class="card-title">${escapeHtml(x.title)}</div><p>${escapeHtml(x.text)}</p><div class="card-actions"><button class="small-btn" data-edit-note="${escapeAttr(x.id)}"><i class="bx bx-edit"></i> Edit</button><button class="small-btn" data-delete-note="${escapeAttr(x.id)}"><i class="bx bx-trash"></i> Delete</button></div></article>`).join(''):'<div class="empty">No notes yet.</div>'}
$('#noteGrid')?.addEventListener('click',e=>{const editBtn=e.target.closest('[data-edit-note]');if(editBtn){noteForm(editBtn.getAttribute('data-edit-note'));return}const b=e.target.closest('[data-delete-note]');if(!b)return;const id=b.dataset.deleteNote;const list=store.get('notes'),x=list.find(i=>String(i.id)===String(id));store.set('notes',list.filter(i=>String(i.id)!==String(id)));diskDeleteItem('notes',id);activity('Deleted note: '+(x?.title||''));renderNotes();updateCounts();toast('Note deleted')});
function updateCounts(){[['projectCount','projects'],['snippetCount','snippets'],['noteCount','notes']].forEach(([id,key])=>{const el=$('#'+id);if(el)el.textContent=store.get(key).length});const saved=$('#savedSnippetCount');if(saved)saved.textContent=store.get('snippets').length}
const GS_KEY='gsProgress';
function getGsProgress(){try{return JSON.parse(localStorage.getItem(GS_KEY)||'{}')}catch(e){return{}}}
function markGs(step){const p=getGsProgress();if(p[step])return;p[step]=true;localStorage.setItem(GS_KEY,JSON.stringify(p));renderGettingStarted()}
function renderGettingStarted(){const wrap=$('#gsSteps');if(!wrap)return;const p=getGsProgress();let done=0;wrap.querySelectorAll('.gs-step').forEach(li=>{const key=li.dataset.gs;const isDone=!!p[key];li.classList.toggle('done',isDone);if(isDone)done++});const label=$('#gsProgressLabel');if(label)label.innerHTML='<i class="bx bx-check-circle"></i> '+done+' of 4 done'}
ensureSampleSnippets();renderProjects();renderSnippets();renderNotes();renderActivity();updateCounts();renderGettingStarted();
const tabs=$$('.tab');
const DEFAULT_HTML=`<!doctype html>
<html>
<head><meta charset="utf-8"></head>
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

let cmHtml=null,cmCss=null,cmJs=null,wrapEnabled=true;
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
/* Builds a read-only, tabbed HTML/CSS/JavaScript code preview (used in the
   Snippets "Preview" modal) instead of one long unformatted blob — mirrors
   the Playground's three tabs so a combined snippet is easy to read. */
function buildCodePreviewMarkup(rawCode,sizeClass){
  const {html,css,js}=splitCombinedCode(rawCode);
  const parts=[
    {key:'html',label:'HTML',code:beautify('html',html)},
    {key:'css',label:'CSS',code:beautify('css',css)},
    {key:'js',label:'JavaScript',code:beautify('js',js)}
  ].filter(p=>p.code&&p.code.trim().length);
  if(!parts.length)parts.push({key:'html',label:'HTML',code:''});
  const tabsHtml=parts.length>1?`<div class="preview-code-tabs" role="tablist">${parts.map((p,i)=>`<button class="preview-code-tab${i===0?' active':''}" type="button" data-preview-tab="${p.key}">${p.label}</button>`).join('')}</div>`:'';
  const panelsHtml=parts.map((p,i)=>`<pre class="code-mini${sizeClass?' '+sizeClass:''} preview-code-panel${i===0?' active':''}" data-preview-panel="${p.key}">${escapeHtml(p.code)}</pre>`).join('');
  return `<div class="preview-code-frame">${tabsHtml}${panelsHtml}</div>`;
}

function initEditors(){
  const htmlEl=$('#htmlCode');
  if(!htmlEl||typeof CodeMirror==='undefined')return;
  const common={lineNumbers:true,lineWrapping:true,theme:'material-darker',tabSize:2,indentUnit:2,matchBrackets:true,autoCloseBrackets:true,styleActiveLine:true};
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

function runCode(){
  const h=cmHtml?cmHtml.getValue():($('#htmlCode')?.value||'');
  const c=cmCss?cmCss.getValue():($('#cssCode')?.value||'');
  const j=cmJs?cmJs.getValue():($('#jsCode')?.value||'');
  const frame=$('#preview');if(!frame)return;
  const doc=`${h}<style>${c}</style><script>${j.replace(/<\/script>/gi,'<\\/script>')}<\/script>`;
  frame.srcdoc=doc;
  activity('Ran code playground');markGs('ranCode');
  const statusEl=$('#runStatus');if(statusEl){statusEl.classList.add('running');statusEl.innerHTML='<i></i> Running…';setTimeout(()=>{statusEl.classList.remove('running');statusEl.innerHTML='<i></i> Up to date'},480)}
}
$('#runCode')?.addEventListener('click',runCode);runCode();
$('#openPreview')?.addEventListener('click',()=>{const src=$('#preview')?.srcdoc;if(!src)return;const w=window.open('about:blank','_blank');if(w){w.document.open();w.document.write(src);w.document.close()}});

const previewStage=$('#previewStage'),previewMeta=$('#previewMeta');
const deviceMeta={desktop:'Sandboxed iframe',tablet:'Tablet · 760px wide',mobile:'Mobile · 390px wide'};
$$('.device-btn').forEach(btn=>btn.addEventListener('click',()=>{
  $$('.device-btn').forEach(b=>{b.classList.remove('active');b.setAttribute('aria-pressed','false')});
  btn.classList.add('active');btn.setAttribute('aria-pressed','true');
  const device=btn.dataset.device||'desktop';
  previewStage?.setAttribute('data-device',device);
  if(previewMeta)previewMeta.textContent=deviceMeta[device]||deviceMeta.desktop;
}));

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
  runCode();
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
document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#globalSearch')?.focus()}});
$('#quickCommand')?.addEventListener('click',()=>$('#globalSearch')?.focus());
$('#globalSearch')?.addEventListener('input',e=>{const q=e.target.value.toLowerCase().trim();if(location.search.includes('page=snippets')){const local=$('#snippetSearch');if(local){local.value=q;renderSnippets();return}}document.querySelectorAll('.project-card,.snippet-card,.note-card,.quick-card').forEach(x=>x.style.display=!q||x.textContent.toLowerCase().includes(q)?'':'none')});
$('#clearData')?.addEventListener('click',()=>{if(confirm('Clear projects, snippets, notes and activity?')){['projects','snippets','notes','activity'].forEach(k=>localStorage.removeItem(k));location.reload()}});

/* components.js runs in its own scope and needs these to save components
   into the Snippets library (and to mirror that save to disk) — without
   this, clicking "Save" on a UI Component throws "store is not defined"
   and silently does nothing. */
window.store=store;
window.diskSaveItem=diskSaveItem;
window.toast=toast;
window.activity=activity;
window.savePlaygroundPayload=savePlaygroundPayload;
window.buildCodePreviewMarkup=buildCodePreviewMarkup;
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

  /* --- Text size control (A- / A+), persisted --- */
  const SIZE_STEPS=['base','lg','xl'];
  function applyTextSize(size){document.documentElement.setAttribute('data-text-size',size);localStorage.setItem('textSize',size)}
  applyTextSize(localStorage.getItem('textSize')||'base');
  function stepSize(dir){
    const current=localStorage.getItem('textSize')||'base';
    let idx=SIZE_STEPS.indexOf(current); if(idx<0)idx=0;
    idx=Math.min(SIZE_STEPS.length-1,Math.max(0,idx+dir));
    applyTextSize(SIZE_STEPS[idx]);
  }
  $('#textSizeUp')?.addEventListener('click',()=>stepSize(1));
  $('#textSizeDown')?.addEventListener('click',()=>stepSize(-1));
  $('#resetTextSize')?.addEventListener('click',()=>applyTextSize('base'));

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
      <li><i class="bx bx-file-code"></i><div><b>1. Open Snippets</b><small>Browse ready-made starters and preview what they do before touching any code.</small></div></li>
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
    {key:'beginner',label:'Beginner',icon:'bx-seedling',desc:"Just starting out with web development. We'll walk you through everything step-by-step, starting with a friendly welcome tour."},
    {key:'intermediate',label:'Intermediate',icon:'bx-trending-up',desc:'Comfortable with the fundamentals and ready to build. Pass a quick one-question check to unlock this title and keep bite-sized tips within reach.'},
    {key:'professional',label:'Professional',icon:'bx-medal',desc:'A seasoned developer who knows the ropes. Pass a quick one-question check to unlock this title and enjoy a clean, distraction-free workspace.'}
  ];
  function levelNeedsExam(level){return level==='intermediate'||level==='professional'}
  function examAlreadyPassed(level){return localStorage.getItem('examPassed_'+level)==='true'}
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
  function applyExperienceLevel(level,animate){
    document.documentElement.setAttribute('data-experience',level);
    localStorage.setItem('experienceLevel',level);
    document.cookie='experienceLevel='+encodeURIComponent(level)+'; path=/; max-age=31536000; samesite=lax';
    fetch(DISK_ENDPOINT+'?action=set-expertise',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level,csrf:CSRF_TOKEN})}).catch(()=>{});
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
      toast('Experience set to '+experienceLabel(level));
    }
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
    <div class="exam-kbd-hint"><i class="bx bx-keyboard"></i> Press 1\u2013${q.options.length} to answer \u00b7 Enter for next</div>
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
      if(passed) localStorage.setItem('examPassed_'+examSession.level,'true');
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
          applyExperienceLevel(chosen,changed);
          closeModal();
          if(typeof onDone==='function'){
            onDone(chosen);
          } else if(changed){
            /* The Dashboard content AND the sidebar (Guided Tour quick tool,
               "Local workspace · <level>" label) are rendered server-side per
               level, so reload to actually show the page that matches the new
               choice everywhere, not just update the badge text. */
            location.reload();
          }
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
