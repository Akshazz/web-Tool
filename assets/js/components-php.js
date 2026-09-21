/* =========================================================================
   A-Code Playground — PHP Sample page · CRUD samples
   -------------------------------------------------------------------------
   Nine separate samples that show one database job each (Create, Read,
   Read one, Update, Delete, Search + pagination, Transaction, a full
   repository class, and a JSON endpoint). Every entry has:

     preview  a live mini demo (form + table + the SQL that would run),
              rendered in the same sandboxed iframe as the other cards
     code     the real PHP + SQL behind it (PDO, prepared statements)

   The PHP is written for the `projects` / `users` / `notes` tables that the
   PHP Playground's getDb() sandbox provides, so the "Playground" button runs
   it as-is. In your own app, getDb() comes from core/db.php.

   Loaded before components.js on ?page=php-sample, together with
   php-basics.js; components.js merges both lists into one catalog.
   ========================================================================= */
(function () {
  'use strict';

  /* ---- Shared preview styles (same look as the Buttons / Text field cards) ---- */
  var CSS = String.raw`
*{box-sizing:border-box}
body{padding:18px}
.pv{display:grid;gap:12px}
.lbl{display:block;font-weight:700;font-size:13px;margin:0 0 6px}
.inp,.sel{width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text)}
.inp:focus,.sel:focus{outline:2px solid var(--accent);outline-offset:1px}
.inp.err{border-color:var(--danger)}
.help{margin:6px 0 0;font-size:12.5px;color:var(--muted)}
.help.err{color:var(--danger)}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;gap:6px;padding:9px 14px;border-radius:9px;border:1px solid var(--border);
  background:var(--surface);color:var(--text);font-weight:650;transition:background .15s ease,transform .06s ease}
.btn:hover{background:var(--surface2)}.btn:active{transform:translateY(1px)}
.btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.btn.primary:hover{opacity:.9}
.btn.danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 35%,var(--border))}
.btn.sm{padding:4px 10px;font-size:12px;border-radius:8px}
.btn[disabled]{opacity:.45;cursor:not-allowed}
.sql{margin:0;padding:11px 13px;border-radius:12px;background:#101112;color:#e6e6e6;
  font:11.5px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:pre-wrap;word-break:break-word;min-height:56px}
.sql .k{color:#7cc4ff;font-weight:600}.sql .v{color:#f5c26b}.sql .c{color:#8a949c}
.sql .ok{color:#6fd39a}.sql .no{color:#f58f87}
.tw{border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--surface)}
.tbl{width:100%;border-collapse:collapse;font-size:12.5px}
.tbl th,.tbl td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--border)}
.tbl th{font-size:11px;letter-spacing:.05em;text-transform:uppercase;color:var(--muted);background:var(--surface2)}
.tbl tr:last-child td{border-bottom:0}
.tbl td.r{text-align:right;white-space:nowrap}
.tbl tr.new td{background:color-mix(in srgb,var(--success) 14%,transparent)}
.tbl tr.gone td{opacity:.35;text-decoration:line-through}
.msg{margin:0 0 8px;font-size:12.5px;font-weight:650}
.msg.ok{color:var(--success)}.msg.bad{color:var(--danger)}
.foot{margin:7px 0 0;font-size:12px;color:var(--muted)}
.kv{display:grid;grid-template-columns:90px 1fr;gap:4px 10px;padding:11px 13px;border:1px solid var(--border);
  border-radius:10px;background:var(--surface);font-size:12.5px;margin:0}
.kv dt{color:var(--muted)}.kv dd{margin:0;font-weight:650}
.seg{display:inline-flex;padding:3px;gap:2px;background:var(--surface2);border:1px solid var(--border);border-radius:10px}
.seg button{border:0;background:transparent;color:var(--muted);padding:6px 11px;border-radius:7px;font-weight:700;font-size:12px}
.seg button[aria-pressed="true"]{background:var(--surface);color:var(--text);box-shadow:0 1px 3px rgba(0,0,0,.12)}
.pill{display:inline-block;padding:2px 9px;border-radius:999px;font-size:12px;font-weight:750;
  background:color-mix(in srgb,var(--success) 16%,transparent);color:var(--success)}
.pill.bad{background:color-mix(in srgb,var(--danger) 16%,transparent);color:var(--danger)}
`;

  /* ---- Shared preview runtime: tiny in-memory "projects" table + helpers ---- */
  var KIT = String.raw`
var $=function(s){return document.querySelector(s)};
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})}
var USERS={u_demo1:'Ada Lovelace',u_demo2:'Sam Rivera'};
var DB=[
 {id:1,user_id:'u_demo1',name:'Playground Sample',tech:'Native PHP'},
 {id:2,user_id:'u_demo2',name:'Todo App',tech:'Laravel'},
 {id:3,user_id:'u_demo1',name:'Invoice Tool',tech:'Symfony'}
],NEXT=4;
var KW=/\b(SELECT|FROM|WHERE|INSERT INTO|VALUES|UPDATE|SET|DELETE FROM|ORDER BY|LIMIT|OFFSET|JOIN|ON|AND|LIKE|COUNT|LOWER|RETURNING|DESC|AS|BEGIN|COMMIT|ROLLBACK)\b/g;
function fmt(s){return esc(s).replace(KW,'<span class="k">$1</span>').replace(/(:[a-z_]+)/g,'<span class="v">$1</span>')}
function showSql(q,bound){$('#sql').innerHTML=fmt(q)+(bound?'\n<span class="c">-- '+esc(bound)+'</span>':'')}
function tbl(rows,cols,o){o=o||{};
  var h='<div class="tw"><table class="tbl"><thead><tr>'+cols.map(function(c){return '<th>'+c[1]+'</th>'}).join('')+(o.act?'<th></th>':'')+'</tr></thead><tbody>';
  if(!rows.length)h+='<tr><td colspan="'+(cols.length+(o.act?1:0))+'" style="color:var(--muted)">(0 rows)</td></tr>';
  rows.forEach(function(r){
    h+='<tr class="'+(o.cls?o.cls(r):'')+'">'+cols.map(function(c){return '<td>'+esc(r[c[0]])+'</td>'}).join('')+(o.act?'<td class="r">'+o.act(r)+'</td>':'')+'</tr>';
  });
  return h+'</tbody></table></div>';
}
`;

  function demo(body, script) {
    return '<style>' + CSS + '</style>' + body + '<script>' + KIT + script + '<\/script>';
  }

  var C = [];

  /* ======================================================================
     1. CREATE
     ====================================================================== */
  C.push({
    id: 'php-crud-create', name: 'Create a row (INSERT)', cat: 'CRUD', lang: 'PHP', h: 460,
    desc: 'Validated form to prepared INSERT. Submit an empty name to see the error state, no query is sent.',
    preview: demo(String.raw`
<div class="pv">
  <div>
    <label class="lbl" for="n">Project name</label>
    <input id="n" class="inp" placeholder="Checkout redesign" autocomplete="off">
    <p id="h" class="help">Shown in your workspace sidebar.</p>
  </div>
  <div class="row">
    <select id="t" class="sel" style="flex:1;min-width:130px"><option>Native PHP</option><option>Laravel</option><option>Symfony</option></select>
    <button id="go" class="btn primary">Add project</button>
  </div>
  <pre id="sql" class="sql"></pre>
  <div id="out"></div>
</div>`, String.raw`
var INS="INSERT INTO projects (user_id, name, tech)\nVALUES (:user_id, :name, :tech)\nRETURNING id;";
function draw(newId,msg,bad){
  $('#out').innerHTML=(msg?'<p class="msg '+(bad?'bad':'ok')+'">'+esc(msg)+'</p>':'')+
   tbl(DB.slice(-2),[['id','ID'],['name','Name'],['tech','Framework']],{cls:function(r){return r.id===newId?'new':''}});
}
function add(){
  var n=$('#n').value.trim(),t=$('#t').value,h=$('#h');
  if(!n){
    $('#n').classList.add('err');h.className='help err';h.textContent='Project name is required.';
    showSql('-- validation failed in PHP: no query was run');draw(0,'Nothing saved',true);return;
  }
  $('#n').classList.remove('err');h.className='help';h.textContent='Shown in your workspace sidebar.';
  var row={id:NEXT++,user_id:'u_demo1',name:n,tech:t};DB.push(row);
  showSql(INS,":user_id='u_demo1'  :name='"+n+"'  :tech='"+t+"'");
  draw(row.id,'Created project #'+row.id);$('#n').value='';
}
$('#go').onclick=add;$('#n').onkeydown=function(e){if(e.key==='Enter')add()};
showSql(INS,'waiting for a submit');draw(0,'');
`),
    code: String.raw`<?php
// CREATE: add a project with a prepared INSERT.
// In your app:  require_once __DIR__ . '/core/db.php';
// (The PHP Playground already provides getDb() with sample tables.)

function createProject(PDO $pdo, string $userId, string $name, string $tech): int
{
    $name = trim($name);
    if ($name === '') {
        throw new InvalidArgumentException('Project name is required.');
    }

    $sql  = 'INSERT INTO projects (user_id, name, tech) VALUES (:user_id, :name, :tech)';
    $isPg = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql';
    if ($isPg) {
        $sql .= ' RETURNING id';   // PostgreSQL (the playground sandbox) hands the new id back
    }

    $stmt = $pdo->prepare($sql);   // placeholders keep user input out of the SQL text
    $stmt->execute([':user_id' => $userId, ':name' => $name, ':tech' => $tech]);

    // MySQL / MariaDB use lastInsertId() instead of RETURNING.
    return $isPg ? (int) $stmt->fetchColumn() : (int) $pdo->lastInsertId();
}

$pdo = getDb();

try {
    $id = createProject($pdo, 'u_demo1', 'Checkout redesign', 'Native PHP');
    echo "Created project #{$id}\n";
} catch (InvalidArgumentException $e) {
    echo 'Not saved: ', $e->getMessage(), "\n";
}

// Try it with an empty name to see the validation branch:
try {
    createProject($pdo, 'u_demo1', '   ', 'Native PHP');
} catch (InvalidArgumentException $e) {
    echo 'Not saved: ', $e->getMessage(), "\n";
}

$row = $pdo->query('SELECT id, name, tech FROM projects ORDER BY id DESC LIMIT 1')->fetch();
echo "Newest row: #{$row['id']} {$row['name']} ({$row['tech']})\n";
`
  });

  /* ======================================================================
     2. READ (list)
     ====================================================================== */
  C.push({
    id: 'php-crud-read', name: 'Read a list (SELECT)', cat: 'CRUD', lang: 'PHP', h: 460,
    desc: 'SELECT with a JOIN, an optional WHERE and ORDER BY. Change the owner and watch the query change.',
    preview: demo(String.raw`
<div class="pv">
  <div>
    <label class="lbl" for="o">Owner</label>
    <select id="o" class="sel"><option value="">Everyone</option><option value="u_demo1">Ada Lovelace</option><option value="u_demo2">Sam Rivera</option></select>
  </div>
  <pre id="sql" class="sql"></pre>
  <div id="out"></div>
</div>`, String.raw`
function run(){
  var u=$('#o').value;
  var q="SELECT p.id, p.name, p.tech, u.name AS owner\n  FROM projects p\n  JOIN users u ON u.id = p.user_id\n"+(u?" WHERE p.user_id = :user_id\n":"")+" ORDER BY p.id DESC;";
  showSql(q,u?":user_id='"+u+"'":'');
  var rows=DB.filter(function(r){return !u||r.user_id===u}).slice().reverse().map(function(r){
    return {id:r.id,name:r.name,tech:r.tech,owner:USERS[r.user_id]};
  });
  $('#out').innerHTML=tbl(rows,[['id','ID'],['name','Name'],['tech','Framework'],['owner','Owner']])+'<p class="foot">'+rows.length+' row(s)</p>';
}
$('#o').onchange=run;run();
`),
    code: String.raw`<?php
// READ: list rows with a prepared SELECT (JOIN + WHERE + ORDER BY).
$pdo = getDb();

$stmt = $pdo->prepare(
    'SELECT p.id, p.name, p.tech, u.name AS owner
       FROM projects p
       JOIN users u ON u.id = p.user_id
      WHERE p.user_id = :user_id
      ORDER BY p.id DESC'
);
$stmt->execute([':user_id' => 'u_demo1']);   // e.g. the logged-in user's id
$projects = $stmt->fetchAll();

if (!$projects) {
    echo "No projects yet.\n";
}

foreach ($projects as $p) {
    printf("#%d  %-20s  %-12s  owner: %s\n", $p['id'], $p['name'], $p['tech'], $p['owner']);
}
echo count($projects), " row(s)\n";
`
  });

  /* ======================================================================
     3. READ ONE
     ====================================================================== */
  C.push({
    id: 'php-crud-read-one', name: 'Read one row by ID', cat: 'CRUD', lang: 'PHP', h: 385,
    desc: 'Fetch a single row by primary key and handle the "not found" case. Try ID 999.',
    preview: demo(String.raw`
<div class="pv">
  <div>
    <label class="lbl" for="i">Project ID</label>
    <div class="row" style="flex-wrap:nowrap"><input id="i" class="inp" type="number" min="1" value="2"><button id="go" class="btn primary">Find</button></div>
    <p class="help">Try 1, 2, 3 or 999.</p>
  </div>
  <pre id="sql" class="sql"></pre>
  <div id="out"></div>
</div>`, String.raw`
function find(){
  var id=parseInt($('#i').value,10)||0;
  showSql("SELECT id, name, tech, description\n  FROM projects\n WHERE id = :id;",":id="+id);
  var r=DB.filter(function(x){return x.id===id})[0];
  $('#out').innerHTML=r
   ?'<dl class="kv"><dt>id</dt><dd>'+r.id+'</dd><dt>name</dt><dd>'+esc(r.name)+'</dd><dt>tech</dt><dd>'+esc(r.tech)+'</dd><dt>owner</dt><dd>'+esc(USERS[r.user_id])+'</dd></dl>'
   :'<p class="msg bad">No row returned. fetch() gave false, so answer with a 404.</p>';
}
$('#go').onclick=find;$('#i').onkeydown=function(e){if(e.key==='Enter')find()};find();
`),
    code: String.raw`<?php
// READ ONE: fetch a single row by primary key.
function findProject(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, name, tech, description FROM projects WHERE id = :id');
    $stmt->execute([':id' => $id]);

    $row = $stmt->fetch();
    return $row === false ? null : $row;   // fetch() returns false when nothing matches
}

$pdo = getDb();

foreach ([1, 999] as $id) {
    $project = findProject($pdo, $id);

    if ($project === null) {
        echo "Project #{$id}: not found (respond with a 404)\n";
        continue;
    }

    echo "Project #{$id}: {$project['name']} - {$project['tech']}\n";
}
`
  });

  /* ======================================================================
     4. UPDATE
     ====================================================================== */
  C.push({
    id: 'php-crud-update', name: 'Update a row (UPDATE)', cat: 'CRUD', lang: 'PHP', h: 490,
    desc: 'Pick a row, edit it, save. UPDATE always carries a WHERE, and the affected-row count says whether anything changed.',
    preview: demo(String.raw`
<div class="pv">
  <div id="list"></div>
  <div id="form" hidden>
    <label class="lbl" for="n">Project name</label>
    <input id="n" class="inp" autocomplete="off">
    <div class="row" style="margin-top:8px">
      <select id="t" class="sel" style="flex:1;min-width:120px"><option>Native PHP</option><option>Laravel</option><option>Symfony</option></select>
      <button id="save" class="btn primary">Save changes</button>
      <button id="cancel" class="btn">Cancel</button>
    </div>
  </div>
  <pre id="sql" class="sql"></pre>
  <div id="msg"></div>
</div>`, String.raw`
var editing=0,flash=0;
function list(){
  $('#list').innerHTML=tbl(DB,[['id','ID'],['name','Name'],['tech','Framework']],{
    act:function(r){return '<button class="btn sm" data-e="'+r.id+'">Edit</button>'},
    cls:function(r){return r.id===flash?'new':''}
  });
}
$('#list').onclick=function(e){
  var b=e.target.closest('[data-e]');if(!b)return;
  editing=+b.dataset.e;var r=DB.filter(function(x){return x.id===editing})[0];
  $('#n').value=r.name;$('#t').value=r.tech;$('#form').hidden=false;$('#msg').innerHTML='';
  showSql("-- editing #"+editing+": nothing has been sent yet");$('#n').focus();
};
$('#cancel').onclick=function(){$('#form').hidden=true;editing=0;showSql("-- cancelled: no query was run")};
$('#save').onclick=function(){
  var n=$('#n').value.trim();if(!n){$('#n').classList.add('err');return}
  $('#n').classList.remove('err');
  var r=DB.filter(function(x){return x.id===editing})[0];r.name=n;r.tech=$('#t').value;flash=editing;
  showSql("UPDATE projects\n   SET name = :name, tech = :tech\n WHERE id = :id;",":name='"+n+"'  :tech='"+r.tech+"'  :id="+editing);
  $('#msg').innerHTML='<p class="msg ok">1 row affected, project #'+editing+' updated</p>';
  $('#form').hidden=true;list();
};
showSql("-- click Edit on a row");list();
`),
    code: String.raw`<?php
// UPDATE: change a row, then check how many rows were affected.

/**
 * Runs a write and returns how many rows it changed.
 * MySQL / MariaDB report that through rowCount(). The playground's Postgres
 * sandbox doesn't, so there the statement ends in RETURNING id instead.
 */
function affected(PDO $pdo, string $sql, array $params): int
{
    $isPg = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql';
    $stmt = $pdo->prepare($isPg ? $sql . ' RETURNING id' : $sql);
    $stmt->execute($params);

    return $isPg ? count($stmt->fetchAll()) : $stmt->rowCount();
}

function updateProject(PDO $pdo, int $id, string $name, string $tech): bool
{
    // No WHERE would rewrite EVERY row, so the WHERE is not optional.
    // (MySQL reports 0 affected rows when the new values equal the old ones.)
    return affected(
        $pdo,
        'UPDATE projects SET name = :name, tech = :tech WHERE id = :id',
        [':name' => trim($name), ':tech' => $tech, ':id' => $id]
    ) > 0;
}

$pdo = getDb();

$before = $pdo->query('SELECT name, tech FROM projects WHERE id = 1')->fetch();
if (!$before) {
    exit("Row #1 is missing, run the Create sample first.\n");
}
echo "Before: {$before['name']} ({$before['tech']})\n";

echo updateProject($pdo, 1, 'Checkout redesign', 'Laravel') ? "Updated #1\n" : "No such project #1\n";
echo updateProject($pdo, 999, 'Ghost', 'None')              ? "Updated #999\n" : "No such project #999\n";

$after = $pdo->query('SELECT name, tech FROM projects WHERE id = 1')->fetch();
echo "After:  {$after['name']} ({$after['tech']})\n";
`
  });

  /* ======================================================================
     5. DELETE
     ====================================================================== */
  C.push({
    id: 'php-crud-delete', name: 'Delete a row (DELETE)', cat: 'CRUD', lang: 'PHP', h: 350,
    desc: 'Two-step confirm, then DELETE scoped by id AND owner so nobody removes someone else\'s row.',
    preview: demo(String.raw`
<div class="pv">
  <div id="list"></div>
  <pre id="sql" class="sql"></pre>
  <div class="row"><span id="msg" class="msg ok" style="margin:0;flex:1"></span><button id="reset" class="btn sm">Restore rows</button></div>
</div>`, String.raw`
var SEED=JSON.stringify(DB),armed=0,gone=0;
function list(){
  $('#list').innerHTML=tbl(DB,[['id','ID'],['name','Name'],['tech','Framework']],{
    act:function(r){return armed===r.id
      ?'<button class="btn sm danger" data-d="'+r.id+'">Sure? Delete</button>'
      :'<button class="btn sm" data-a="'+r.id+'">Delete</button>'}
  });
}
$('#list').onclick=function(e){
  var a=e.target.closest('[data-a]'),d=e.target.closest('[data-d]');
  if(a){armed=+a.dataset.a;$('#msg').textContent='';showSql("-- confirm first: nothing has been sent yet");list();return}
  if(d){
    var id=+d.dataset.d,r=DB.filter(function(x){return x.id===id})[0];
    DB=DB.filter(function(x){return x.id!==id});armed=0;
    showSql("DELETE FROM projects\n WHERE id = :id AND user_id = :user_id;",":id="+id+"  :user_id='"+r.user_id+"'");
    $('#msg').className='msg ok';$('#msg').textContent='1 row affected, project #'+id+' deleted';list();
  }
};
$('#reset').onclick=function(){DB=JSON.parse(SEED);armed=0;$('#msg').textContent='';showSql("-- rows restored (demo only)");list()};
showSql("-- click Delete on a row");list();
`),
    code: String.raw`<?php
// DELETE: always pair DELETE with a WHERE, and check who owns the row.

/**
 * Runs a write and returns how many rows it changed.
 * MySQL / MariaDB report that through rowCount(). The playground's Postgres
 * sandbox doesn't, so there the statement ends in RETURNING id instead.
 */
function affected(PDO $pdo, string $sql, array $params): int
{
    $isPg = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql';
    $stmt = $pdo->prepare($isPg ? $sql . ' RETURNING id' : $sql);
    $stmt->execute($params);

    return $isPg ? count($stmt->fetchAll()) : $stmt->rowCount();
}

function deleteProject(PDO $pdo, int $id, string $userId): bool
{
    return affected(
        $pdo,
        'DELETE FROM projects WHERE id = :id AND user_id = :user_id',
        [':id' => $id, ':user_id' => $userId]
    ) === 1;
}

$pdo = getDb();

// A throw-away row, so this sample can be run again and again.
$pdo->prepare('INSERT INTO projects (user_id, name, tech) VALUES (?, ?, ?)')
    ->execute(['u_demo1', 'Scratch project', 'PHP']);
$id = (int) $pdo->query("SELECT MAX(id) FROM projects WHERE name = 'Scratch project'")->fetchColumn();

echo 'Wrong owner: ', deleteProject($pdo, $id, 'u_demo2') ? 'deleted' : 'blocked', "\n";
echo 'Right owner: ', deleteProject($pdo, $id, 'u_demo1') ? 'deleted' : 'blocked', "\n";

$check = $pdo->prepare('SELECT COUNT(*) FROM projects WHERE id = ?');
$check->execute([$id]);
echo 'Rows left with that id: ', $check->fetchColumn(), "\n";
`
  });

  /* ======================================================================
     6. SEARCH + PAGINATION
     ====================================================================== */
  C.push({
    id: 'php-crud-search', name: 'Search + pagination', cat: 'CRUD', lang: 'PHP', h: 500,
    desc: 'LIKE filter, LIMIT / OFFSET and a total count. Type in the box or use the pager.',
    preview: demo(String.raw`
<div class="pv">
  <div>
    <label class="lbl" for="q">Search projects</label>
    <input id="q" class="inp" placeholder="app" value="app" autocomplete="off">
  </div>
  <pre id="sql" class="sql"></pre>
  <div id="out"></div>
  <div class="row" style="justify-content:space-between"><span id="info" class="foot" style="margin:0"></span>
    <span class="row"><button id="prev" class="btn sm">Prev</button><button id="next" class="btn sm">Next</button></span></div>
</div>`, String.raw`
DB=[[1,'Playground Sample'],[2,'Todo App'],[3,'Invoice Tool'],[4,'App Store Clone'],[5,'Blog Engine'],[6,'Mobile App API'],[7,'Chat App'],[8,'Recipe Book'],[9,'Weather App']]
 .map(function(a){return {id:a[0],name:a[1],tech:'Native PHP',user_id:'u_demo1'}});
var page=1,PER=3;
function run(){
  var q=$('#q').value.trim().toLowerCase();
  var m=DB.filter(function(r){return r.name.toLowerCase().indexOf(q)>-1});
  var pages=Math.max(1,Math.ceil(m.length/PER));if(page>pages)page=pages;if(page<1)page=1;
  var off=(page-1)*PER;
  showSql("SELECT COUNT(*) FROM projects\n WHERE LOWER(name) LIKE LOWER(:q);\n\nSELECT id, name, tech FROM projects\n WHERE LOWER(name) LIKE LOWER(:q)\n ORDER BY id\n LIMIT :limit OFFSET :offset;",":q='%"+q+"%'  :limit="+PER+"  :offset="+off);
  $('#out').innerHTML=tbl(m.slice(off,off+PER),[['id','ID'],['name','Name']]);
  $('#info').textContent=m.length+' match(es), page '+page+' of '+pages;
  $('#prev').disabled=page<=1;$('#next').disabled=page>=pages;
}
$('#q').oninput=function(){page=1;run()};
$('#prev').onclick=function(){page--;run()};$('#next').onclick=function(){page++;run()};run();
`),
    code: String.raw`<?php
// READ (search + pagination): LIKE filter, LIMIT/OFFSET and a total count.
$pdo = getDb();

$q       = trim($_GET['q'] ?? 'app');                 // the search box
$page    = max(1, (int) ($_GET['page'] ?? 1));        // ?page=2
$perPage = 5;
$offset  = ($page - 1) * $perPage;

// Escape % and _ so users can't turn their search into a wildcard scan.
$like = '%' . addcslashes($q, '%_\\') . '%';

$count = $pdo->prepare('SELECT COUNT(*) FROM projects WHERE LOWER(name) LIKE LOWER(:q)');
$count->execute([':q' => $like]);
$total = (int) $count->fetchColumn();
$pages = max(1, (int) ceil($total / $perPage));

$stmt = $pdo->prepare(
    'SELECT id, name, tech
       FROM projects
      WHERE LOWER(name) LIKE LOWER(:q)
      ORDER BY id
      LIMIT :limit OFFSET :offset'
);
$stmt->bindValue(':q', $like);
$stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);    // LIMIT/OFFSET must be integers
$stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
$stmt->execute();

echo "Search \"{$q}\": {$total} match(es), page {$page} of {$pages}\n";
foreach ($stmt as $row) {
    echo "  #{$row['id']} {$row['name']}\n";
}
`
  });

  /* ======================================================================
     7. TRANSACTION
     ====================================================================== */
  C.push({
    id: 'php-crud-transaction', name: 'Transaction (all or nothing)', cat: 'CRUD', lang: 'PHP', h: 330,
    desc: 'Two INSERTs that must succeed together. The bad batch fails half way and ROLLBACK undoes the first one.',
    preview: demo(String.raw`
<div class="pv">
  <div class="row">
    <button id="good" class="btn primary">Save good batch</button>
    <button id="bad" class="btn danger">Save bad batch</button>
  </div>
  <pre id="sql" class="sql"></pre>
  <div class="tw"><table class="tbl"><tbody>
    <tr><td>projects in table</td><td class="r" id="cp"></td></tr>
    <tr><td>notes in table</td><td class="r" id="cn"></td></tr>
  </tbody></table></div>
</div>`, String.raw`
var P=2,N=1;
function counts(){$('#cp').textContent=P;$('#cn').textContent=N}
$('#good').onclick=function(){
  P++;N++;
  $('#sql').innerHTML=fmt("BEGIN;\nINSERT INTO projects (user_id, name, tech) VALUES (...);\nINSERT INTO notes (user_id, title, body) VALUES (...);")+'\n<span class="ok">COMMIT;  -- both rows saved</span>';
  counts();
};
$('#bad').onclick=function(){
  $('#sql').innerHTML=fmt("BEGIN;\nINSERT INTO projects (user_id, name, tech) VALUES (...);")+'\n<span class="no">-- PHP throws: note title is required</span>\n<span class="no">ROLLBACK;  -- the project insert is undone</span>';
  counts();
};
counts();$('#sql').innerHTML='<span class="c">-- pick a batch</span>';
`),
    code: String.raw`<?php
// TRANSACTION: several writes that must all succeed, or none of them.
//
// Note: PDO's beginTransaction() / commit() are the usual way. The playground's
// WASM driver can't commit them, so this uses plain BEGIN / COMMIT / ROLLBACK
// statements, which behave the same on MySQL, MariaDB and PostgreSQL.
function createProjectWithNote(PDO $pdo, string $userId, string $name, string $noteTitle): void
{
    $pdo->exec('BEGIN');

    try {
        $pdo->prepare('INSERT INTO projects (user_id, name, tech) VALUES (?, ?, ?)')
            ->execute([$userId, $name, 'PHP']);

        if ($noteTitle === '') {
            throw new RuntimeException('Note title is required.');   // jumps to the rollback
        }

        $pdo->prepare('INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)')
            ->execute([$userId, $noteTitle, 'Created together with the project.']);

        $pdo->exec('COMMIT');      // both rows become permanent together
    } catch (Throwable $e) {
        $pdo->exec('ROLLBACK');    // ...or neither does
        throw $e;
    }
}

$pdo    = getDb();
$before = (int) $pdo->query('SELECT COUNT(*) FROM projects')->fetchColumn();

foreach ([['Good batch', 'Kickoff notes'], ['Bad batch', '']] as [$name, $note]) {
    try {
        createProjectWithNote($pdo, 'u_demo1', $name, $note);
        echo "{$name}: committed\n";
    } catch (Throwable $e) {
        echo "{$name}: rolled back ({$e->getMessage()})\n";
    }
}

$after = (int) $pdo->query('SELECT COUNT(*) FROM projects')->fetchColumn();
echo 'Net change: ', $after - $before, " project(s), only the good batch was kept\n";
`
  });

  /* ======================================================================
     8. FULL CRUD (repository class)
     ====================================================================== */
  C.push({
    id: 'php-crud-full', name: 'Full CRUD repository', cat: 'CRUD', lang: 'PHP', h: 350,
    desc: 'One small class with one method per SQL statement. Click through Create, Read, Update, Delete.',
    preview: demo(String.raw`
<div class="pv">
  <div class="seg" role="group" aria-label="Operation">
    <button data-op="create">Create</button><button data-op="read">Read</button><button data-op="update">Update</button><button data-op="delete">Delete</button>
  </div>
  <pre id="sql" class="sql"></pre>
  <div id="out"></div>
</div>`, String.raw`
DB=[{id:1,user_id:'u_demo1',name:'Playground Sample',tech:'Native PHP'}];
var mine=0,edited=false;
function draw(msg,cls){
  $('#out').innerHTML=(msg?'<p class="msg ok">'+esc(msg)+'</p>':'')+tbl(DB,[['id','ID'],['name','Name'],['tech','Framework']],{cls:function(r){return r.id===cls?'new':''}});
  [].forEach.call(document.querySelectorAll('[data-op]'),function(b){
    var o=b.dataset.op;b.disabled=(o==='create'&&mine)||((o==='update'||o==='delete'||o==='read')&&!mine);
    b.style.opacity=b.disabled?.4:1;
  });
}
document.querySelector('.seg').onclick=function(e){
  var b=e.target.closest('[data-op]');if(!b||b.disabled)return;var op=b.dataset.op;
  [].forEach.call(document.querySelectorAll('[data-op]'),function(x){x.setAttribute('aria-pressed',x===b)});
  if(op==='create'){
    mine=NEXT++;DB.push({id:mine,user_id:'u_demo1',name:'CRUD demo',tech:'PHP'});edited=false;
    showSql("INSERT INTO projects (user_id, name, tech)\nVALUES (:user_id, :name, :tech)\nRETURNING id;",":name='CRUD demo'");draw('$repo->create() returned #'+mine,mine);
  }else if(op==='read'){
    showSql("SELECT id, name, tech, description\n  FROM projects\n WHERE id = :id;",":id="+mine);draw('$repo->find('+mine+') returned 1 row',mine);
  }else if(op==='update'){
    var r=DB.filter(function(x){return x.id===mine})[0];r.name='CRUD demo (edited)';r.tech='Laravel';
    showSql("UPDATE projects\n   SET name = :name, tech = :tech\n WHERE id = :id;",":name='CRUD demo (edited)'  :id="+mine);draw('$repo->update() returned true',mine);
  }else{
    var gone=mine;DB=DB.filter(function(x){return x.id!==gone});mine=0;
    showSql("DELETE FROM projects\n WHERE id = :id;",":id="+gone);draw('$repo->delete() returned true');
  }
};
showSql("-- start with Create");draw('');
`),
    code: String.raw`<?php
// FULL CRUD: one small repository class, one method per SQL statement.
final class ProjectRepository
{
    public function __construct(private PDO $pdo) {}

    /** CREATE: returns the new id. */
    public function create(string $userId, string $name, string $tech): int
    {
        $sql  = 'INSERT INTO projects (user_id, name, tech) VALUES (:user_id, :name, :tech)';
        $isPg = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql';

        $stmt = $this->pdo->prepare($isPg ? $sql . ' RETURNING id' : $sql);
        $stmt->execute([':user_id' => $userId, ':name' => $name, ':tech' => $tech]);

        return $isPg ? (int) $stmt->fetchColumn() : (int) $this->pdo->lastInsertId();
    }

    /** READ ONE: the row, or null. */
    public function find(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT id, name, tech FROM projects WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    /** READ MANY: every project a user owns. */
    public function all(string $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT id, name, tech FROM projects WHERE user_id = :user_id ORDER BY id');
        $stmt->execute([':user_id' => $userId]);
        return $stmt->fetchAll();
    }

    /** UPDATE: true when a row matched. */
    public function update(int $id, string $name, string $tech): bool
    {
        return $this->affected(
            'UPDATE projects SET name = :name, tech = :tech WHERE id = :id',
            [':name' => $name, ':tech' => $tech, ':id' => $id]
        ) > 0;
    }

    /** DELETE: true when a row was removed. */
    public function delete(int $id): bool
    {
        return $this->affected('DELETE FROM projects WHERE id = :id', [':id' => $id]) > 0;
    }

    /**
     * Rows changed by a write. MySQL / MariaDB answer with rowCount(); the
     * playground's Postgres sandbox doesn't, so there we use RETURNING id.
     */
    private function affected(string $sql, array $params): int
    {
        $isPg = $this->pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql';
        $stmt = $this->pdo->prepare($isPg ? $sql . ' RETURNING id' : $sql);
        $stmt->execute($params);

        return $isPg ? count($stmt->fetchAll()) : $stmt->rowCount();
    }
}

$repo = new ProjectRepository(getDb());

$id = $repo->create('u_demo1', 'CRUD demo', 'PHP');
echo "CREATE -> #{$id}\n";

echo 'READ   -> ', $repo->find($id)['name'], "\n";

$repo->update($id, 'CRUD demo (edited)', 'Laravel');
echo 'UPDATE -> ', $repo->find($id)['name'], "\n";

echo 'LIST   -> ', count($repo->all('u_demo1')), " project(s) for u_demo1\n";

$repo->delete($id);
echo 'DELETE -> ', $repo->find($id) === null ? 'gone' : 'still there', "\n";
`
  });

  /* ======================================================================
     9. JSON ENDPOINT
     ====================================================================== */
  C.push({
    id: 'php-crud-api', name: 'CRUD JSON endpoint', cat: 'CRUD', lang: 'PHP', h: 400,
    desc: 'One handler that maps GET, POST, PUT and DELETE to the four queries and returns proper status codes.',
    preview: demo(String.raw`
<div class="pv">
  <div class="seg" role="group" aria-label="HTTP method" id="seg">
    <button data-m="GET" aria-pressed="true">GET</button><button data-m="POST" aria-pressed="false">POST</button><button data-m="PUT" aria-pressed="false">PUT</button><button data-m="DELETE" aria-pressed="false">DELETE</button>
  </div>
  <div class="row" style="flex-wrap:nowrap">
    <input id="i" class="inp" type="number" min="1" placeholder="id (optional)" style="flex:1">
    <button id="go" class="btn primary">Send</button>
  </div>
  <pre id="sql" class="sql"></pre>
  <div id="out"></div>
</div>`, String.raw`
var M='GET';
document.getElementById('seg').onclick=function(e){
  var b=e.target.closest('[data-m]');if(!b)return;M=b.dataset.m;
  [].forEach.call(this.querySelectorAll('button'),function(x){x.setAttribute('aria-pressed',x===b)});
  $('#i').disabled=M==='POST';if(M==='POST')$('#i').value='';
};
function reply(status,text,body,q){
  showSql(q||'-- no query ran','');
  $('#out').innerHTML='<p class="msg" style="margin:0 0 6px"><span class="pill'+(status>=400?' bad':'')+'">'+status+' '+text+'</span></p>'+
   '<pre class="sql" style="min-height:0">'+esc(body)+'</pre>';
}
$('#go').onclick=function(){
  var raw=$('#i').value,id=raw===''?null:parseInt(raw,10),row=DB.filter(function(x){return x.id===id})[0],pub=function(r){return {id:r.id,name:r.name,tech:r.tech}};
  var line=M+' /projects.php'+(id?'?id='+id:'');
  if(M==='GET'&&id===null)return reply(200,'OK',JSON.stringify(DB.map(pub)),line+'\nSELECT id, name, tech FROM projects ORDER BY id;');
  if(M==='GET')return row?reply(200,'OK',JSON.stringify(pub(row)),line+'\nSELECT id, name, tech FROM projects WHERE id = :id;'):reply(404,'Not Found','{"error":"Not found"}',line+'\nSELECT ... WHERE id = :id;  -- 0 rows');
  if(M==='POST'){var n={id:NEXT++,user_id:'u_demo1',name:'API project',tech:'PHP'};DB.push(n);return reply(201,'Created',JSON.stringify(pub(n)),line+'\nINSERT INTO projects (user_id, name, tech)\nVALUES (:user_id, :name, :tech);')}
  if(M==='PUT'){if(!row)return reply(404,'Not Found','{"error":"Not found"}',line+'\nUPDATE projects SET ... WHERE id = :id;  -- 0 rows');row.name='Renamed via API';return reply(200,'OK',JSON.stringify(pub(row)),line+'\nUPDATE projects\n   SET name = :name, tech = :tech\n WHERE id = :id;')}
  if(M==='DELETE'){if(!row)return reply(404,'Not Found','{"error":"Not found"}',line+'\nDELETE FROM projects WHERE id = :id;  -- 0 rows');DB=DB.filter(function(x){return x!==row});return reply(204,'No Content','(empty body)',line+'\nDELETE FROM projects WHERE id = :id;')}
};
showSql('-- choose a method and press Send');
`),
    code: String.raw`<?php
// CRUD JSON ENDPOINT: one handler, four queries, correct status codes.

/**
 * Runs a write and returns how many rows it changed.
 * MySQL / MariaDB report that through rowCount(). The playground's Postgres
 * sandbox doesn't, so there the statement ends in RETURNING id instead.
 */
function affected(PDO $pdo, string $sql, array $params): int
{
    $isPg = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql';
    $stmt = $pdo->prepare($isPg ? $sql . ' RETURNING id' : $sql);
    $stmt->execute($params);

    return $isPg ? count($stmt->fetchAll()) : $stmt->rowCount();
}

function handleProjects(PDO $pdo, string $method, ?int $id, array $body): array
{
    switch ($method) {
        case 'GET':                                       // READ
            if ($id === null) {
                return [200, $pdo->query('SELECT id, name, tech FROM projects ORDER BY id LIMIT 20')->fetchAll()];
            }
            $stmt = $pdo->prepare('SELECT id, name, tech FROM projects WHERE id = ?');
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            return $row ? [200, $row] : [404, ['error' => 'Not found']];

        case 'POST':                                      // CREATE
            $name = trim((string) ($body['name'] ?? ''));
            if ($name === '') {
                return [422, ['error' => 'Name is required']];
            }
            $isPg = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME) === 'pgsql';
            $stmt = $pdo->prepare('INSERT INTO projects (user_id, name, tech) VALUES (?, ?, ?)' . ($isPg ? ' RETURNING id' : ''));
            $stmt->execute(['u_demo1', $name, (string) ($body['tech'] ?? 'PHP')]);   // use the logged-in user's id
            $newId = $isPg ? (int) $stmt->fetchColumn() : (int) $pdo->lastInsertId();
            return [201, ['id' => $newId, 'name' => $name]];

        case 'PUT':                                       // UPDATE
            if ($id === null) {
                return [400, ['error' => 'id is required']];
            }
            $changed = affected(
                $pdo,
                'UPDATE projects SET name = ?, tech = ? WHERE id = ?',
                [trim((string) ($body['name'] ?? '')), (string) ($body['tech'] ?? 'PHP'), $id]
            );
            return $changed > 0 ? [200, ['id' => $id]] : [404, ['error' => 'Not found']];

        case 'DELETE':                                    // DELETE
            if ($id === null) {
                return [400, ['error' => 'id is required']];
            }
            return affected($pdo, 'DELETE FROM projects WHERE id = ?', [$id]) > 0
                ? [204, []]
                : [404, ['error' => 'Not found']];

        default:
            return [405, ['error' => 'Method not allowed']];
    }
}

// --- Demo: fake four requests so this runs inside the playground ---
$pdo = getDb();
$requests = [
    ['POST',   null, ['name' => 'API project', 'tech' => 'PHP']],
    ['GET',    1,    []],
    ['PUT',    1,    ['name' => 'Renamed via API', 'tech' => 'Laravel']],
    ['DELETE', 999,  []],
    ['PATCH',  1,    []],
];

foreach ($requests as [$method, $id, $body]) {
    [$status, $payload] = handleProjects($pdo, $method, $id, $body);
    echo str_pad($method . ' ' . ($id ?? '/'), 12), '-> ', $status, '  ', json_encode($payload), "\n";
}

// In a real endpoint file, replace the demo with:
//
//   header('Content-Type: application/json; charset=utf-8');
//   $id   = isset($_GET['id']) ? (int) $_GET['id'] : null;
//   $body = json_decode(file_get_contents('php://input'), true) ?? [];
//   [$status, $payload] = handleProjects(getDb(), $_SERVER['REQUEST_METHOD'], $id, $body);
//   http_response_code($status);
//   echo $status === 204 ? '' : json_encode($payload);
`
  });

  window.PHP_CRUD_COMPONENTS = C;
})();
