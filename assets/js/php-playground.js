(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };

  var editor = $('#phpCode');
  var consoleEl = $('#phpConsole');
  var runBtn = $('#phpRun');
  var resetBtn = $('#phpReset');
  var clearOutputBtn = $('#phpClearOutput');
  var sampleSelect = $('#phpSampleSelect');
  var charCount = $('#phpCharCount');
  var dirtyLabel = $('#phpEditorDirty');
  var statusWrap = $('#phpEngineStatus');
  var statusText = $('#phpEngineStatusText');
  var outputDot = $('#phpOutputDot');

  if (!editor || !runBtn) return; // not on this page

  // Same editor look as the rest of A-Code Playground: CodeMirror with
  // line numbers, PHP syntax highlighting and the shared light/dark theme,
  // instead of a plain textarea. Falls back to the plain textarea if the
  // CodeMirror CDN script didn't load.
  var cm = null;
  var programmatic = false;
  function themeName() {
    return window.cmThemeName ? window.cmThemeName() : (document.body.classList.contains('dark') ? 'material-darker' : 'neat');
  }
  if (typeof CodeMirror !== 'undefined') {
    cm = CodeMirror.fromTextArea(editor, {
      lineNumbers: true, lineWrapping: true, theme: themeName(), tabSize: 2, indentUnit: 2,
      matchBrackets: true, autoCloseBrackets: true, styleActiveLine: true, mode: 'application/x-httpd-php'
    });
    new MutationObserver(function () { cm.setOption('theme', themeName()); })
      .observe(document.body, { attributes: true, attributeFilter: ['class'] });
    cm.on('change', function () { if (programmatic) return; updateCharCount(); setDirty(true); saveDraft(); });
  }
  function getCode() { return cm ? cm.getValue() : editor.value; }
  function setCode(v) { programmatic = true; if (cm) cm.setValue(v); else editor.value = v; programmatic = false; }

  var CURRENT_USER_ID = (typeof window !== 'undefined' && window.CURRENT_USER_ID) ? String(window.CURRENT_USER_ID) : 'guest';
  var STORAGE_KEY = 'u:' + CURRENT_USER_ID + ':php-playground:code';
  var STORAGE_SAMPLE_KEY = 'u:' + CURRENT_USER_ID + ':php-playground:sample';

  // ---- Sandbox database (getDb()) ----
  // A tiny SQLite database that lives only inside this browser tab's PHP
  // WASM sandbox. It gives playground code a real getDb()/PDO to practice
  // full CRUD SQL against, without ever touching the site's real MySQL
  // database (core/db.php) or leaving the browser. It resets whenever the
  // engine is reloaded (e.g. page refresh).
  var DB_PRELUDE =
'<?php\n' +
'/**\n' +
' * Sandbox-only getDb(): returns a PDO connection to a SQLite database\n' +
' * that exists solely inside this browser tab. It mirrors the shape of\n' +
' * the real app\'s tables so you can practice real SQL, but it is a\n' +
' * throw-away copy seeded with sample data \u2014 nothing here reaches the\n' +
' * live MySQL database.\n' +
' */\n' +
'if (!function_exists("getDb")) {\n' +
'function getDb() {\n' +
'    static $pdo = null;\n' +
'    if ($pdo !== null) {\n' +
'        return $pdo;\n' +
'    }\n' +
'\n' +
'    $dataSource = "playground";\n' +
'    $isNew = true;\n' +
'\n' +
'    if (!in_array("pgsql", PDO::getAvailableDrivers(), true)) {\n' +
'        throw new RuntimeException(\n' +
'            "No usable PDO driver is available in this PHP-WASM build. " .\n' +
'            "Available PDO drivers: " . (PDO::getAvailableDrivers() ? implode(", ", PDO::getAvailableDrivers()) : "(none)") . "."\n' +
'        );\n' +
'    }\n' +
'\n' +
'    $pdo = new PDO("pgsql:dbname=" . $dataSource);\n' +
'    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);\n' +
'    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);\n' +
'\n' +
'    // The sandbox database survives page reloads, so only create and seed it once.\n' +
'    if ($pdo->query("SELECT to_regclass(\'public.users\')")->fetchColumn()) {\n' +
'        $isNew = false;\n' +
'    }\n' +
'\n' +
'    if ($isNew) {\n' +
'        $pdo->exec("\n' +
'            CREATE TABLE users (\n' +
'                id TEXT PRIMARY KEY,\n' +
'                name TEXT NOT NULL,\n' +
'                email TEXT NOT NULL UNIQUE,\n' +
'                role TEXT NOT NULL DEFAULT \'user\',\n' +
'                joined_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP\n' +
'            )\n' +
'        ");\n' +
'        $pdo->exec("\n' +
'            CREATE TABLE projects (\n' +
'                id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n' +
'                user_id TEXT NOT NULL,\n' +
'                name TEXT NOT NULL,\n' +
'                tech TEXT,\n' +
'                description TEXT,\n' +
'                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n' +
'                FOREIGN KEY (user_id) REFERENCES users(id)\n' +
'            )\n' +
'        ");\n' +
'        $pdo->exec("\n' +
'            CREATE TABLE notes (\n' +
'                id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,\n' +
'                user_id TEXT NOT NULL,\n' +
'                title TEXT NOT NULL,\n' +
'                body TEXT,\n' +
'                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,\n' +
'                FOREIGN KEY (user_id) REFERENCES users(id)\n' +
'            )\n' +
'        ");\n' +
'\n' +
'        $pdo->exec("INSERT INTO users (id, name, email, role) VALUES\n' +
'            (\'u_demo1\', \'Ada Lovelace\', \'ada@example.test\', \'admin\'),\n' +
'            (\'u_demo2\', \'Sam Rivera\', \'sam@example.test\', \'user\')");\n' +
'\n' +
'        $pdo->exec("INSERT INTO projects (user_id, name, tech, description) VALUES\n' +
'            (\'u_demo1\', \'Playground Sample\', \'PHP + SQLite\', \'A demo row to query against\'),\n' +
'            (\'u_demo2\', \'Todo App\', \'PHP + MySQL\', \'Another demo row\')");\n' +
'\n' +
'        $pdo->exec("INSERT INTO notes (user_id, title, body) VALUES\n' +
'            (\'u_demo1\', \'Welcome\', \'Try: SELECT * FROM notes;\')");\n' +
'    }\n' +
'\n' +
'    return $pdo;\n' +
'}\n' +
'}\n' +
'\n' +
'if (!function_exists("printRows")) {\n' +
'/** Print a PDO result set (array of assoc rows) as a simple text table. */\n' +
'function printRows($rows) {\n' +
'    if (!$rows) {\n' +
'        echo "(0 rows)\\n";\n' +
'        return;\n' +
'    }\n' +
'    $cols = array_keys($rows[0]);\n' +
'    echo implode(" | ", $cols) . "\\n";\n' +
'    echo str_repeat("-", 40) . "\\n";\n' +
'    foreach ($rows as $row) {\n' +
'        echo implode(" | ", array_map("strval", $row)) . "\\n";\n' +
'    }\n' +
'    echo count($rows) . " row(s)\\n";\n' +
'}\n' +
'}\n';

  // Strips a single leading "<?php" tag from user code so it can be
  // appended after DB_PRELUDE inside one PHP run (avoids two separate
  // open/close tag pairs, which would otherwise emit a stray blank line
  // of HTML output between them).
  function stripOpenTag(code) {
    return code.replace(/^\s*<\?php\s?/, '');
  }

  var SAMPLES = [
    {
      name: 'Hello, world!',
      code:
'<?php\n' +
'// Your first PHP program\n' +
'echo "Hello, world!\\n";\n' +
'echo "Welcome to the PHP playground.\\n";\n'
    },
    {
      name: 'Variables & types',
      code:
'<?php\n' +
'$name = "Ada";\n' +
'$age = 30;\n' +
'$height = 1.68;\n' +
'$isDeveloper = true;\n' +
'\n' +
'echo "Name: " . $name . "\\n";\n' +
'echo "Age: " . $age . "\\n";\n' +
'echo "Height: " . $height . "m\\n";\n' +
'echo "Developer? " . ($isDeveloper ? "Yes" : "No") . "\\n";\n' +
'\n' +
'var_dump($age);\n'
    },
    {
      name: 'If / else',
      code:
'<?php\n' +
'$score = 82;\n' +
'\n' +
'if ($score >= 90) {\n' +
'    echo "Grade: A\\n";\n' +
'} elseif ($score >= 80) {\n' +
'    echo "Grade: B\\n";\n' +
'} elseif ($score >= 70) {\n' +
'    echo "Grade: C\\n";\n' +
'} else {\n' +
'    echo "Grade: F\\n";\n' +
'}\n'
    },
    {
      name: 'Loops',
      code:
'<?php\n' +
'echo "Counting with for:\\n";\n' +
'for ($i = 1; $i <= 5; $i++) {\n' +
'    echo $i . " ";\n' +
'}\n' +
'echo "\\n\\nCounting with while:\\n";\n' +
'\n' +
'$n = 5;\n' +
'while ($n > 0) {\n' +
'    echo $n . " ";\n' +
'    $n--;\n' +
'}\n' +
'echo "\\n";\n'
    },
    {
      name: 'Arrays',
      code:
'<?php\n' +
'$fruits = ["apple", "banana", "cherry"];\n' +
'\n' +
'echo "Fruits:\\n";\n' +
'foreach ($fruits as $index => $fruit) {\n' +
'    echo ($index + 1) . ". " . $fruit . "\\n";\n' +
'}\n' +
'\n' +
'$fruits[] = "date";\n' +
'echo "\\nAfter adding one: " . implode(", ", $fruits) . "\\n";\n' +
'echo "Total fruits: " . count($fruits) . "\\n";\n' +
'\n' +
'$prices = ["apple" => 0.5, "banana" => 0.3, "cherry" => 2.0];\n' +
'echo "\\nPrice of banana: $" . $prices["banana"] . "\\n";\n'
    },
    {
      name: 'Functions',
      code:
'<?php\n' +
'function greet($name, $timeOfDay = "day") {\n' +
'    return "Good " . $timeOfDay . ", " . $name . "!";\n' +
'}\n' +
'\n' +
'echo greet("Sam") . "\\n";\n' +
'echo greet("Priya", "morning") . "\\n";\n' +
'\n' +
'function add(...$numbers) {\n' +
'    return array_sum($numbers);\n' +
'}\n' +
'\n' +
'echo "Sum: " . add(2, 4, 6, 8) . "\\n";\n'
    },
    {
      name: 'String functions',
      code:
'<?php\n' +
'$text = "  Hello, PHP World!  ";\n' +
'\n' +
'echo "Trimmed: \'" . trim($text) . "\'\\n";\n' +
'echo "Uppercase: " . strtoupper($text) . "\\n";\n' +
'echo "Lowercase: " . strtolower($text) . "\\n";\n' +
'echo "Length: " . strlen(trim($text)) . "\\n";\n' +
'echo "Replaced: " . str_replace("PHP", "Beautiful PHP", $text) . "\\n";\n' +
'echo "Reversed: " . strrev("playground") . "\\n";\n' +
'\n' +
'$parts = explode(", ", "red, green, blue");\n' +
'print_r($parts);\n'
    },
    {
      name: 'Classes & objects',
      code:
'<?php\n' +
'class Animal {\n' +
'    public string $name;\n' +
'    protected string $sound;\n' +
'\n' +
'    public function __construct(string $name, string $sound) {\n' +
'        $this->name = $name;\n' +
'        $this->sound = $sound;\n' +
'    }\n' +
'\n' +
'    public function speak(): string {\n' +
'        return $this->name . " says " . $this->sound;\n' +
'    }\n' +
'}\n' +
'\n' +
'class Dog extends Animal {\n' +
'    public function __construct(string $name) {\n' +
'        parent::__construct($name, "Woof!");\n' +
'    }\n' +
'}\n' +
'\n' +
'$pets = [new Dog("Rex"), new Animal("Cat", "Meow!")];\n' +
'\n' +
'foreach ($pets as $pet) {\n' +
'    echo $pet->speak() . "\\n";\n' +
'}\n'
    },
    {
      name: 'Recursion',
      code:
'<?php\n' +
'function factorial($n) {\n' +
'    return $n <= 1 ? 1 : $n * factorial($n - 1);\n' +
'}\n' +
'\n' +
'for ($i = 1; $i <= 6; $i++) {\n' +
'    echo "$i! = " . factorial($i) . "\\n";\n' +
'}\n' +
'\n' +
'function fibonacci($n) {\n' +
'    if ($n <= 1) return $n;\n' +
'    return fibonacci($n - 1) + fibonacci($n - 2);\n' +
'}\n' +
'\n' +
'echo "\\nFirst 10 Fibonacci numbers:\\n";\n' +
'for ($i = 0; $i < 10; $i++) {\n' +
'    echo fibonacci($i) . " ";\n' +
'}\n' +
'echo "\\n";\n'
    },
    {
      name: 'Sorting',
      code:
'<?php\n' +
'$numbers = [5, 2, 9, 1, 7, 3];\n' +
'\n' +
'sort($numbers);\n' +
'echo "Ascending: " . implode(", ", $numbers) . "\\n";\n' +
'\n' +
'rsort($numbers);\n' +
'echo "Descending: " . implode(", ", $numbers) . "\\n";\n' +
'\n' +
'$people = [\n' +
'    ["name" => "Ben", "age" => 32],\n' +
'    ["name" => "Ana", "age" => 25],\n' +
'    ["name" => "Cid", "age" => 41],\n' +
'];\n' +
'\n' +
'usort($people, function ($a, $b) {\n' +
'    return $a["age"] <=> $b["age"];\n' +
'});\n' +
'\n' +
'echo "\\nSorted by age:\\n";\n' +
'foreach ($people as $p) {\n' +
'    echo $p["name"] . " (" . $p["age"] . ")\\n";\n' +
'}\n'
    },
    {
      name: 'Closures & arrow fns',
      code:
'<?php\n' +
'$multiplier = 3;\n' +
'\n' +
'$multiply = function ($n) use ($multiplier) {\n' +
'    return $n * $multiplier;\n' +
'};\n' +
'\n' +
'echo "5 x 3 = " . $multiply(5) . "\\n";\n' +
'\n' +
'$square = fn($n) => $n * $n;\n' +
'echo "Square of 7 = " . $square(7) . "\\n";\n' +
'\n' +
'$numbers = [1, 2, 3, 4, 5];\n' +
'$squared = array_map(fn($n) => $n * $n, $numbers);\n' +
'echo "Squared list: " . implode(", ", $squared) . "\\n";\n' +
'\n' +
'$evens = array_filter($numbers, fn($n) => $n % 2 === 0);\n' +
'echo "Evens: " . implode(", ", $evens) . "\\n";\n'
    },
    {
      name: 'Date & time',
      code:
'<?php\n' +
'$now = new DateTime();\n' +
'echo "Right now: " . $now->format("Y-m-d H:i:s") . "\\n";\n' +
'\n' +
'$future = clone $now;\n' +
'$future->modify("+30 days");\n' +
'echo "30 days from now: " . $future->format("Y-m-d") . "\\n";\n' +
'\n' +
'$diff = $now->diff($future);\n' +
'echo "Difference: " . $diff->days . " days\\n";\n'
    },
    {
      name: 'JSON',
      code:
'<?php\n' +
'$data = [\n' +
'    "name" => "A-Code Playground",\n' +
'    "version" => 2,\n' +
'    "tags" => ["php", "playground", "learning"],\n' +
'];\n' +
'\n' +
'$json = json_encode($data, JSON_PRETTY_PRINT);\n' +
'echo "Encoded JSON:\\n" . $json . "\\n\\n";\n' +
'\n' +
'$decoded = json_decode($json, true);\n' +
'echo "Decoded name: " . $decoded["name"] . "\\n";\n' +
'echo "First tag: " . $decoded["tags"][0] . "\\n";\n'
    },
    {
      name: 'CRUD (Create/Read/Update/Delete)',
      code:
'<?php\n' +
'// A classic CRUD example using an in-memory array as a mini "database".\n' +
'// (This playground runs in an isolated sandbox and cannot reach MySQL,\n' +
'// so we simulate a table with an array here. The same function shapes\n' +
'// apply when you swap them for real SQL queries with PDO or mysqli.)\n' +
'\n' +
'$notes = [];   // our in-memory "table"\n' +
'$nextId = 1;   // simulates an auto-increment primary key\n' +
'\n' +
'function createNote(&$notes, &$nextId, $text) {\n' +
'    $id = $nextId++;\n' +
'    $notes[$id] = ["id" => $id, "text" => $text];\n' +
'    return $notes[$id];\n' +
'}\n' +
'\n' +
'function readNote($notes, $id) {\n' +
'    return $notes[$id] ?? null;\n' +
'}\n' +
'\n' +
'function updateNote(&$notes, $id, $text) {\n' +
'    if (!isset($notes[$id])) return false;\n' +
'    $notes[$id]["text"] = $text;\n' +
'    return true;\n' +
'}\n' +
'\n' +
'function deleteNote(&$notes, $id) {\n' +
'    if (!isset($notes[$id])) return false;\n' +
'    unset($notes[$id]);\n' +
'    return true;\n' +
'}\n' +
'\n' +
'function listNotes($notes) {\n' +
'    if (empty($notes)) {\n' +
'        echo "(no notes)\\n";\n' +
'        return;\n' +
'    }\n' +
'    foreach ($notes as $note) {\n' +
'        echo "#" . $note["id"] . ": " . $note["text"] . "\\n";\n' +
'    }\n' +
'}\n' +
'\n' +
'// CREATE\n' +
'createNote($notes, $nextId, "Buy groceries");\n' +
'createNote($notes, $nextId, "Finish PHP playground");\n' +
'createNote($notes, $nextId, "Read a book");\n' +
'\n' +
'echo "All notes:\\n";\n' +
'listNotes($notes);\n' +
'\n' +
'// READ\n' +
'echo "\\nReading note #2:\\n";\n' +
'$note = readNote($notes, 2);\n' +
'echo $note ? $note["text"] . "\\n" : "Not found\\n";\n' +
'\n' +
'// UPDATE\n' +
'updateNote($notes, 2, "Finish PHP playground (done!)");\n' +
'echo "\\nAfter update:\\n";\n' +
'listNotes($notes);\n' +
'\n' +
'// DELETE\n' +
'deleteNote($notes, 1);\n' +
'echo "\\nAfter deleting note #1:\\n";\n' +
'listNotes($notes);\n'
    },
    {
      name: 'SQL playground (getDb())',
      code:
'<?php\n' +
'// This playground gives you a real PDO connection via getDb() so you\n' +
'// can practice actual SQL. It talks to a private SQLite database that\n' +
'// lives only in this browser tab (seeded with sample users/projects/\n' +
'// notes) \u2014 it is NOT the site\'s real MySQL database, so feel free to\n' +
'// INSERT, UPDATE, or DELETE freely.\n' +
'\n' +
'$db = getDb();\n' +
'\n' +
'echo "All users:\\n";\n' +
'printRows($db->query("SELECT id, name, email, role FROM users")->fetchAll());\n' +
'\n' +
'// INSERT\n' +
'$stmt = $db->prepare("INSERT INTO notes (user_id, title, body) VALUES (:uid, :title, :body)");\n' +
'$stmt->execute([":uid" => "u_demo2", ":title" => "Test note", ":body" => "Inserted from the playground"]);\n' +
'\n' +
'// SELECT with a JOIN\n' +
'echo "\\nNotes with author names:\\n";\n' +
'printRows($db->query("\n' +
'    SELECT notes.id, notes.title, users.name AS author\n' +
'    FROM notes\n' +
'    JOIN users ON users.id = notes.user_id\n' +
'    ORDER BY notes.id\n' +
'")->fetchAll());\n' +
'\n' +
'// UPDATE\n' +
'$db->prepare("UPDATE notes SET title = :t WHERE title = \'Test note\'")\n' +
'   ->execute([":t" => "Test note (edited)"]);\n' +
'\n' +
'// DELETE\n' +
'$db->exec("DELETE FROM notes WHERE title = \'Welcome\'");\n' +
'\n' +
'echo "\\nFinal notes table:\\n";\n' +
'printRows($db->query("SELECT id, user_id, title FROM notes")->fetchAll());\n'
    },
    {
      name: 'Full page: SQL + PHP + HTML/CSS/JS',
      code:
'<?php\n' +
'// One file, every layer: SQL -> PHP -> HTML + CSS + JavaScript.\n' +
'// Press Run, then use the "Page" view to see it rendered.\n' +
'// (The "Console" view shows the raw output instead.)\n' +
'\n' +
'$pdo      = getDb();\n' +
'$projects = $pdo->query(\n' +
'    \'SELECT p.id, p.name, p.tech, u.name AS owner\n' +
'       FROM projects p\n' +
'       JOIN users u ON u.id = p.user_id\n' +
'      ORDER BY p.id\'\n' +
')->fetchAll();\n' +
'\n' +
'if (!function_exists(\'e\')) {\n' +
'    function e($value) { return htmlspecialchars((string) $value, ENT_QUOTES, \'UTF-8\'); }\n' +
'}\n' +
'?>\n' +
'<!doctype html>\n' +
'<html>\n' +
'<head>\n' +
'  <meta charset="utf-8">\n' +
'  <style>\n' +
'    body { font-family: system-ui, sans-serif; margin: 0; padding: 24px; background: #f5f6f8; color: #15171a; }\n' +
'    h1 { margin: 0 0 4px; font-size: 26px; }\n' +
'    p { margin: 0 0 16px; color: #68707a; }\n' +
'    input { width: 240px; margin-bottom: 12px; padding: 9px 12px; border: 1px solid #d5d9de; border-radius: 9px; }\n' +
'    table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; }\n' +
'    th, td { padding: 10px 14px; text-align: left; border-bottom: 1px solid #e3e6ea; }\n' +
'    th { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: #68707a; }\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <h1>Projects (<?= count($projects) ?>)</h1>\n' +
'  <p>Rows come from SQL through PDO, the table is built by PHP, and the filter box is JavaScript.</p>\n' +
'  <input id="filter" placeholder="Filter by name...">\n' +
'  <table>\n' +
'    <thead><tr><th>ID</th><th>Name</th><th>Framework</th><th>Owner</th></tr></thead>\n' +
'    <tbody>\n' +
'    <?php foreach ($projects as $p): ?>\n' +
'      <tr><td><?= e($p[\'id\']) ?></td><td><?= e($p[\'name\']) ?></td><td><?= e($p[\'tech\']) ?></td><td><?= e($p[\'owner\']) ?></td></tr>\n' +
'    <?php endforeach; ?>\n' +
'    </tbody>\n' +
'  </table>\n' +
'  <script>\n' +
'    document.getElementById(\'filter\').addEventListener(\'input\', function (event) {\n' +
'      var q = event.target.value.toLowerCase();\n' +
'      document.querySelectorAll(\'tbody tr\').forEach(function (row) {\n' +
'        row.style.display = row.textContent.toLowerCase().includes(q) ? \'\' : \'none\';\n' +
'      });\n' +
'    });\n' +
'  </script>\n' +
'</body>\n' +
'</html>\n'
    }
  ];

  function populateSamples() {
    if (!sampleSelect) return;
    sampleSelect.innerHTML = '';
    SAMPLES.forEach(function (sample, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = sample.name;
      sampleSelect.appendChild(opt);
    });
  }

  function saveDraft(sampleIndex) {
    try {
      localStorage.setItem(STORAGE_KEY, getCode());
      if (sampleIndex !== undefined) localStorage.setItem(STORAGE_SAMPLE_KEY, String(sampleIndex));
    } catch (e) { /* storage unavailable */ }
  }

  function loadDraft() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      var savedSample = localStorage.getItem(STORAGE_SAMPLE_KEY);
      var sampleIndex = savedSample !== null ? (parseInt(savedSample, 10) || 0) : 0;
      if (sampleSelect) sampleSelect.value = String(sampleIndex);
      if (saved !== null) {
        setCode(saved);
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  function updateCharCount() {
    if (charCount) charCount.textContent = getCode().length + ' chars';
  }

  function setDirty(isDirty) {
    if (!dirtyLabel) return;
    dirtyLabel.textContent = isDirty ? 'Unsaved changes' : 'Local only';
  }

  // Plain-textarea fallback only (CodeMirror handles Tab-to-indent and
  // change tracking itself via the cm.on('change', ...) listener above).
  if (!cm) {
    editor.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        var start = editor.selectionStart;
        var end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 4;
      }
    });
    editor.addEventListener('input', function () {
      updateCharCount();
      setDirty(true);
      saveDraft();
    });
  }

  if (sampleSelect) {
    sampleSelect.addEventListener('change', function () {
      var i = parseInt(sampleSelect.value, 10) || 0;
      setCode(SAMPLES[i].code);
      updateCharCount();
      setDirty(false);
      saveDraft(i);
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      var i = sampleSelect ? (parseInt(sampleSelect.value, 10) || 0) : 0;
      setCode(SAMPLES[i].code);
      updateCharCount();
      setDirty(false);
      saveDraft(i);
      if (window.toast) window.toast('Reset to sample');
    });
  }

  function clearOutput() {
    if (!consoleEl) return;
    consoleEl.innerHTML = '<span class="php-console-placeholder">Run your code to see the output here…</span>';
  }

  if (clearOutputBtn) clearOutputBtn.addEventListener('click', clearOutput);

  function appendOutput(text, isError) {
    if (!consoleEl) return;
    var placeholder = consoleEl.querySelector('.php-console-placeholder');
    if (placeholder) consoleEl.innerHTML = '';
    var span = document.createElement('span');
    if (isError) span.className = 'err-line';
    span.textContent = text;
    consoleEl.appendChild(span);
    if (/Cannot redeclare/.test(text)) {
      var hint = document.createElement('span');
      hint.className = 'err-line';
      hint.textContent = 'Tip: the engine keeps functions and classes between runs. Reload this page to run code that declares them again.\n';
      consoleEl.appendChild(hint);
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  // ---- Load the PHP WASM engine ----
  var php = null;
  var engineReady = false;

  function setEngineStatus(ready, label) {
    if (statusWrap) {
      var dot = statusWrap.querySelector('i');
      if (dot) {
        dot.classList.remove('engine-loading');
        dot.style.background = ready ? '' : '#dc2626';
      }
    }
    if (statusText) statusText.textContent = label;
  }

  async function loadEngine() {
    try {
      // This build's only usable PDO driver ("pgsql") is backed by PGlite
      // (WASM Postgres); the driver requires the actual PGlite class to be
      // injected as a constructor arg. PGlite is vendored locally under
      // assets/vendor/pglite so this still works offline, behind a strict
      // Content-Security-Policy, or when a CDN is blocked/unreachable.
      var pgliteMod = await import('../vendor/pglite/index.js');
      var mod = await import('../vendor/php-wasm/PhpWeb.mjs');
      var PhpWeb = mod.PhpWeb;
      php = new PhpWeb({ PGlite: pgliteMod.PGlite });

      // php-wasm already delivers each line with its own newline, so the
      // console appends stdout as-is (adding another "\n" double-spaced it).
      php.addEventListener('output', function (event) {
        appendOutput(event.detail, false);
        document.dispatchEvent(new CustomEvent('adev:php-output', { detail: { text: event.detail } }));
      });
      php.addEventListener('error', function (event) {
        var msg = /\n$/.test(event.detail) ? event.detail : event.detail + '\n';
        appendOutput(msg, true);
      });
      php.addEventListener('ready', function () {
        engineReady = true;
        setEngineStatus(true, 'PHP engine ready');
        runBtn.disabled = false;
      });
    } catch (err) {
      console.error('[php-playground] engine failed to load:', err);
      setEngineStatus(false, 'Engine failed to load');
      var detail = (err && (err.message || String(err))) || 'Unknown error';
      appendOutput('Could not load the PHP engine: ' + detail + '\nOpen the browser console (F12) for the full error.\n', true);
    }
  }

  runBtn.addEventListener('click', async function () {
    if (!engineReady || !php) return;
    runBtn.disabled = true;
    var originalHtml = runBtn.innerHTML;
    runBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Running…';
    var placeholder = consoleEl ? consoleEl.querySelector('.php-console-placeholder') : null;
    if (placeholder) consoleEl.innerHTML = '';
    var marker = document.createElement('div');
    marker.className = 'run-marker';
    marker.textContent = '— run started —';
    if (consoleEl) consoleEl.appendChild(marker);
    document.dispatchEvent(new CustomEvent('adev:php-run'));
    try {
      var fullCode = DB_PRELUDE + stripOpenTag(getCode());
      await php.run(fullCode);
      if (window.toast) window.toast('Code ran successfully');
    } catch (err) {
      appendOutput(String(err) + '\n', true);
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = originalHtml;
      document.dispatchEvent(new CustomEvent('adev:php-done'));
    }
  });

  // ---- Init ----
  populateSamples();
  var hadDraft = loadDraft();
  if (!hadDraft) {
    setCode(SAMPLES[0].code);
  }

  // Code handed over from the UI Components / Snippets pages ("Playground" button).
  try {
    var handoff = sessionStorage.getItem('acodeplaygroundPhpPayload');
    if (handoff) {
      var payload = JSON.parse(handoff);
      var handoffTitle = sessionStorage.getItem('acodeplaygroundPhpPayloadTitle') || 'Snippet';
      sessionStorage.removeItem('acodeplaygroundPhpPayload');
      sessionStorage.removeItem('acodeplaygroundPhpPayloadTitle');
      if (payload && typeof payload.code === 'string') {
        setCode(payload.code);
        saveDraft();
        if (window.toast) window.toast('Loaded "' + handoffTitle + '" into the PHP Playground. Press Run.');
      }
    }
  } catch (e) { /* ignore a bad payload */ }
  updateCharCount();
  setDirty(false);

  // The combined Playground page loads this engine only when PHP is first used.
  if (window.ADEV_LAZY_ENGINES) {
    document.addEventListener('adev:start-php', function () { loadEngine(); }, { once: true });
  } else {
    loadEngine();
  }
})();
