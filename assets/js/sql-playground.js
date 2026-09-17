(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };

  var editor = $('#sqlCode');
  var resultsEl = $('#sqlResults');
  var runBtn = $('#sqlRun');
  var resetBtn = $('#sqlReset');
  var resetDbBtn = $('#sqlResetDb');
  var clearBtn = $('#sqlClearOutput');
  var sampleSelect = $('#sqlSampleSelect');
  var charCount = $('#sqlCharCount');
  var dirtyLabel = $('#sqlEditorDirty');
  var statusText = $('#sqlEngineStatusText');
  var statusDot = $('#sqlEngineStatus');
  var schemaEl = $('#sqlSchema');

  if (!editor || !runBtn) return; // not on this page

  var CURRENT_USER_ID = (typeof window !== 'undefined' && window.CURRENT_USER_ID) ? String(window.CURRENT_USER_ID) : 'guest';
  var STORAGE_KEY = 'u:' + CURRENT_USER_ID + ':sql-playground:code';

  // ------------------------------------------------------------------
  // Why SQLite under the hood
  // ------------------------------------------------------------------
  // A real MySQL *server* cannot run inside a browser tab — it is a
  // networked daemon, not something that compiles to WebAssembly and runs
  // client-side. So this playground executes your SQL against a private
  // SQLite database living inside the same PHP-WASM sandbox the PHP
  // playground already uses, and we teach that database to speak MySQL:
  //
  //   * MySQL-only functions (NOW, CONCAT, IF, DATE_FORMAT, YEAR, ...)
  //     are registered as real SQL functions below.
  //   * SHOW TABLES / DESCRIBE / SHOW COLUMNS are rewritten to their
  //     SQLite equivalents.
  //   * MySQL-only DDL noise (AUTO_INCREMENT, ENGINE=, DEFAULT CHARSET=)
  //     is stripped from CREATE TABLE so schema samples just work.
  //
  // Implementation note: this build of PHP-WASM ships the pdo_sqlite
  // driver (same one the PHP playground's getDb() uses) but not the
  // standalone SQLite3 class, so this talks to the database through
  // PDO (new PDO("sqlite:...") , ->query(), ->exec(),
  // ->sqliteCreateFunction()) rather than `new SQLite3(...)`.
  //
  // The result is that everyday MySQL — SELECT, JOIN, GROUP BY, HAVING,
  // subqueries, INSERT/UPDATE/DELETE, CREATE TABLE — runs unchanged. Very
  // MySQL-specific features (stored procedures, ENUM, user grants) will
  // not. Nothing here touches your real MySQL database in core/db.php.
  // ------------------------------------------------------------------

  var PHP_RUNNER = [
    '<?php',
    'if (!function_exists("play_db")) {',
    'function play_db($forceNew = false) {',
    '    static $db = null;',
    '    $file = "/tmp/sql-playground.sqlite";',
    '    if ($forceNew) { $db = null; if (file_exists($file)) { @unlink($file); } }',
    '    if ($db !== null) { return $db; }',
    '    $isNew = !file_exists($file);',
    '    $db = new PDO("sqlite:" . $file);',
    '    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);',
    '    $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);',
    '    $db->exec("PRAGMA foreign_keys = ON");',
    '    play_register_mysql_functions($db);',
    '    if ($isNew) { play_seed($db); }',
    '    return $db;',
    '}',
    '',
    '// MySQL functions that SQLite does not ship with.',
    'function play_register_mysql_functions($db) {',
    '    if (!method_exists($db, "sqliteCreateFunction")) { return; }',
    '    $db->sqliteCreateFunction("NOW", function () { return date("Y-m-d H:i:s"); }, 0);',
    '    $db->sqliteCreateFunction("CURDATE", function () { return date("Y-m-d"); }, 0);',
    '    $db->sqliteCreateFunction("CURTIME", function () { return date("H:i:s"); }, 0);',
    '    $db->sqliteCreateFunction("CONCAT", function () { $a = func_get_args(); foreach ($a as $v) { if ($v === null) { return null; } } return implode("", $a); });',
    '    $db->sqliteCreateFunction("CONCAT_WS", function () { $a = func_get_args(); $sep = array_shift($a); $out = array(); foreach ($a as $v) { if ($v !== null) { $out[] = $v; } } return implode($sep, $out); });',
    '    $db->sqliteCreateFunction("IF", function ($c, $t, $f) { return $c ? $t : $f; }, 3);',
    '    $db->sqliteCreateFunction("YEAR", function ($d) { return $d === null ? null : (int)date("Y", strtotime($d)); }, 1);',
    '    $db->sqliteCreateFunction("MONTH", function ($d) { return $d === null ? null : (int)date("n", strtotime($d)); }, 1);',
    '    $db->sqliteCreateFunction("DAY", function ($d) { return $d === null ? null : (int)date("j", strtotime($d)); }, 1);',
    '    $db->sqliteCreateFunction("MONTHNAME", function ($d) { return $d === null ? null : date("F", strtotime($d)); }, 1);',
    '    $db->sqliteCreateFunction("DATEDIFF", function ($a, $b) { return (int)floor((strtotime($a) - strtotime($b)) / 86400); }, 2);',
    '    $db->sqliteCreateFunction("DATE_FORMAT", function ($d, $f) {',
    '        if ($d === null) { return null; }',
    '        $map = array("%Y" => "Y", "%y" => "y", "%m" => "m", "%c" => "n", "%d" => "d", "%e" => "j", "%H" => "H", "%i" => "i", "%s" => "s", "%M" => "F", "%b" => "M", "%W" => "l", "%a" => "D", "%p" => "A");',
    '        $out = ""; $len = strlen($f); $ts = strtotime($d);',
    '        for ($i = 0; $i < $len; $i++) {',
    '            if ($f[$i] === "%" && $i + 1 < $len) { $tok = substr($f, $i, 2); $out .= isset($map[$tok]) ? date($map[$tok], $ts) : substr($tok, 1); $i++; }',
    '            else { $out .= $f[$i]; }',
    '        }',
    '        return $out;',
    '    }, 2);',
    '    $db->sqliteCreateFunction("LEFT", function ($s, $n) { return $s === null ? null : substr($s, 0, (int)$n); }, 2);',
    '    $db->sqliteCreateFunction("RIGHT", function ($s, $n) { return $s === null ? null : substr($s, -(int)$n); }, 2);',
    '    $db->sqliteCreateFunction("LOCATE", function ($n, $h) { $p = strpos($h, $n); return $p === false ? 0 : $p + 1; }, 2);',
    '    $db->sqliteCreateFunction("REPEAT", function ($s, $n) { return str_repeat($s, max(0, (int)$n)); }, 2);',
    '    $db->sqliteCreateFunction("RAND", function () { return mt_rand() / mt_getrandmax(); }, 0);',
    '    $db->sqliteCreateFunction("POW", function ($a, $b) { return pow($a, $b); }, 2);',
    '}',
    '',
    '// Seed a small, MySQL-shaped store schema.',
    'function play_seed($db) {',
    '    $db->exec("',
    '        CREATE TABLE customers (',
    '            id INTEGER PRIMARY KEY,',
    '            name TEXT NOT NULL,',
    '            email TEXT NOT NULL UNIQUE,',
    '            city TEXT,',
    '            country TEXT NOT NULL DEFAULT \'PH\',',
    '            created_at TEXT NOT NULL',
    '        )");',
    '    $db->exec("',
    '        CREATE TABLE products (',
    '            id INTEGER PRIMARY KEY,',
    '            name TEXT NOT NULL,',
    '            category TEXT NOT NULL,',
    '            price REAL NOT NULL,',
    '            stock INTEGER NOT NULL DEFAULT 0',
    '        )");',
    '    $db->exec("',
    '        CREATE TABLE orders (',
    '            id INTEGER PRIMARY KEY,',
    '            customer_id INTEGER NOT NULL REFERENCES customers(id),',
    '            order_date TEXT NOT NULL,',
    '            status TEXT NOT NULL DEFAULT \'pending\',',
    '            total REAL NOT NULL DEFAULT 0',
    '        )");',
    '    $db->exec("',
    '        CREATE TABLE order_items (',
    '            id INTEGER PRIMARY KEY,',
    '            order_id INTEGER NOT NULL REFERENCES orders(id),',
    '            product_id INTEGER NOT NULL REFERENCES products(id),',
    '            quantity INTEGER NOT NULL DEFAULT 1,',
    '            unit_price REAL NOT NULL',
    '        )");',
    '',
    '    $db->exec("INSERT INTO customers (id, name, email, city, country, created_at) VALUES',
    '        (1, \'Ana Reyes\',    \'ana@example.com\',   \'Quezon City\', \'PH\', \'2024-01-12\'),',
    '        (2, \'Ben Cruz\',     \'ben@example.com\',   \'Manila\',      \'PH\', \'2024-02-03\'),',
    '        (3, \'Carla Diaz\',   \'carla@example.com\', \'Cebu\',        \'PH\', \'2024-02-19\'),',
    '        (4, \'Diego Santos\', \'diego@example.com\', \'Davao\',       \'PH\', \'2024-03-08\'),',
    '        (5, \'Ella Tan\',     \'ella@example.com\',  \'Singapore\',   \'SG\', \'2024-03-22\'),',
    '        (6, \'Femi Okafor\',  \'femi@example.com\',  \'Lagos\',       \'NG\', \'2024-04-14\'),',
    '        (7, \'Grace Lim\',    \'grace@example.com\', \'Makati\',      \'PH\', \'2024-05-02\'),',
    '        (8, \'Hiro Tanaka\',  \'hiro@example.com\',  \'Tokyo\',       \'JP\', \'2024-05-27\')");',
    '',
    '    $db->exec("INSERT INTO products (id, name, category, price, stock) VALUES',
    '        (1,  \'Mechanical Keyboard\',      \'Peripherals\', 3499,  25),',
    '        (2,  \'Wireless Mouse\',           \'Peripherals\', 899,   60),',
    '        (3,  \'4K Monitor 27-inch\',       \'Displays\',    18999, 8),',
    '        (4,  \'Laptop Stand\',             \'Accessories\', 1299,  40),',
    '        (5,  \'USB-C Hub\',                \'Accessories\', 1799,  0),',
    '        (6,  \'Noise-cancelling Headset\', \'Audio\',       7499,  12),',
    '        (7,  \'Webcam 1080p\',             \'Video\',       2499,  18),',
    '        (8,  \'Desk Lamp\',                \'Accessories\', 999,   33),',
    '        (9,  \'SSD 1TB\',                  \'Storage\',     4599,  15),',
    '        (10, \'Ergonomic Chair\',          \'Furniture\',   12999, 5)");',
    '',
    '    $db->exec("INSERT INTO orders (id, customer_id, order_date, status, total) VALUES',
    '        (1,  1, \'2024-06-01\', \'paid\',      4398),',
    '        (2,  2, \'2024-06-03\', \'paid\',      18999),',
    '        (3,  1, \'2024-06-11\', \'pending\',   999),',
    '        (4,  3, \'2024-06-15\', \'paid\',      9797),',
    '        (5,  4, \'2024-06-18\', \'cancelled\', 1299),',
    '        (6,  5, \'2024-06-21\', \'paid\',      4599),',
    '        (7,  2, \'2024-07-02\', \'paid\',      2499),',
    '        (8,  6, \'2024-07-05\', \'pending\',   12999),',
    '        (9,  7, \'2024-07-09\', \'paid\',      6997),',
    '        (10, 1, \'2024-07-14\', \'paid\',      1799),',
    '        (11, 8, \'2024-07-20\', \'paid\',      3499),',
    '        (12, 3, \'2024-07-28\', \'refunded\',  899)");',
    '',
    '    $db->exec("INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES',
    '        (1, 1, 1, 3499), (1, 2, 1, 899),',
    '        (2, 3, 1, 18999),',
    '        (3, 8, 1, 999),',
    '        (4, 6, 1, 7499), (4, 4, 1, 1299), (4, 8, 1, 999),',
    '        (5, 4, 1, 1299),',
    '        (6, 9, 1, 4599),',
    '        (7, 7, 1, 2499),',
    '        (8, 10, 1, 12999),',
    '        (9, 1, 1, 3499), (9, 7, 1, 2499), (9, 8, 1, 999),',
    '        (10, 5, 1, 1799),',
    '        (11, 1, 1, 3499),',
    '        (12, 2, 1, 899)");',
    '}',
    '',
    '// Split a script into statements, ignoring semicolons inside strings/comments.',
    'function play_split($sql) {',
    '    $out = array(); $buf = ""; $len = strlen($sql); $q = null;',
    '    for ($i = 0; $i < $len; $i++) {',
    '        $ch = $sql[$i]; $next = $i + 1 < $len ? $sql[$i + 1] : "";',
    '        if ($q === null) {',
    '            if ($ch === "-" && $next === "-") { while ($i < $len && $sql[$i] !== "\\n") { $i++; } $buf .= "\\n"; continue; }',
    '            if ($ch === "#") { while ($i < $len && $sql[$i] !== "\\n") { $i++; } $buf .= "\\n"; continue; }',
    '            if ($ch === "/" && $next === "*") { $i += 2; while ($i < $len && !($sql[$i] === "*" && $i + 1 < $len && $sql[$i + 1] === "/")) { $i++; } $i++; continue; }',
    '            if ($ch === "\'" || $ch === "\\"" || $ch === "`") { $q = $ch; $buf .= $ch; continue; }',
    '            if ($ch === ";") { if (trim($buf) !== "") { $out[] = trim($buf); } $buf = ""; continue; }',
    '            $buf .= $ch; continue;',
    '        }',
    '        $buf .= $ch;',
    '        if ($ch === "\\\\") { if ($next !== "") { $buf .= $next; $i++; } continue; }',
    '        if ($ch === $q) { $q = null; }',
    '    }',
    '    if (trim($buf) !== "") { $out[] = trim($buf); }',
    '    return $out;',
    '}',
    '',
    '// Translate the MySQL-only statements SQLite does not understand.',
    'function play_translate($sql) {',
    '    $t = trim($sql);',
    '    if (preg_match("/^show\\\\s+tables/i", $t)) {',
    '        return "SELECT name AS Tables_in_playground FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name";',
    '    }',
    '    if (preg_match("/^(?:describe|desc|show\\\\s+columns\\\\s+from)\\\\s+`?([A-Za-z0-9_]+)`?/i", $t, $m)) {',
    '        return "SELECT name AS Field, type AS Type, CASE WHEN [notnull] = 1 THEN \'NO\' ELSE \'YES\' END AS [Null], CASE WHEN pk = 1 THEN \'PRI\' ELSE \'\' END AS [Key], dflt_value AS [Default] FROM pragma_table_info(\'" . $m[1] . "\')";',
    '    }',
    '    if (preg_match("/^create\\\\s+table/i", $t)) {',
    '        $t = preg_replace("/\\\\s+AUTO_INCREMENT\\\\s*(=\\\\s*\\\\d+)?/i", " ", $t);',
    '        $t = preg_replace("/\\\\s+(ENGINE|DEFAULT\\\\s+CHARSET|CHARACTER\\\\s+SET|COLLATE)\\\\s*=?\\\\s*[A-Za-z0-9_]+/i", " ", $t);',
    '        $t = preg_replace("/\\\\bUNSIGNED\\\\b/i", " ", $t);',
    '        $t = preg_replace("/\\\\bINT\\\\s*\\\\(\\\\s*\\\\d+\\\\s*\\\\)/i", "INTEGER", $t);',
    '    }',
    '    return $t;',
    '}',
    '',
    'function play_is_read($sql) {',
    '    return (bool)preg_match("/^\\\\s*(select|with|pragma|explain|values|show|describe|desc)\\\\b/i", $sql);',
    '}',
    '',
    '// Run one statement against the PDO/SQLite handle and normalize into our result shape.',
    'function play_run_one($db, $raw) {',
    '    $sql = play_translate($raw);',
    '    $started = microtime(true);',
    '    if (play_is_read($sql)) {',
    '        $stmt = $db->query($sql);',
    '        $cols = array();',
    '        $n = $stmt->columnCount();',
    '        for ($c = 0; $c < $n; $c++) { $meta = $stmt->getColumnMeta($c); $cols[] = $meta && isset($meta["name"]) ? $meta["name"] : ("col" . $c); }',
    '        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);',
    '        return array("kind" => "rows", "sql" => $raw, "columns" => $cols, "rows" => $rows, "ms" => round((microtime(true) - $started) * 1000, 2));',
    '    }',
    '    $affected = $db->exec($sql);',
    '    $insertId = $db->lastInsertId();',
    '    return array("kind" => "affected", "sql" => $raw, "affected" => (int)$affected, "insertId" => $insertId, "ms" => round((microtime(true) - $started) * 1000, 2));',
    '}',
    '} // end function_exists guard',
    '',
    '$payload = json_decode(base64_decode("__PAYLOAD__"), true);',
    '$results = array();',
    'try {',
    '    $db = play_db(!empty($payload["reset"]));',
    '    if (!empty($payload["reset"])) {',
    '        $results[] = array("kind" => "info", "sql" => "-- database reset", "message" => "Sample database rebuilt with fresh seed data.");',
    '    }',
    '    $statements = play_split(isset($payload["sql"]) ? $payload["sql"] : "");',
    '    foreach ($statements as $raw) {',
    '        try {',
    '            $results[] = play_run_one($db, $raw);',
    '        } catch (Exception $e) {',
    '            $results[] = array("kind" => "error", "sql" => $raw, "message" => $e->getMessage());',
    '        }',
    '    }',
    '    if (count($statements) === 0 && empty($payload["reset"])) {',
    '        $results[] = array("kind" => "info", "sql" => "", "message" => "No SQL statement to run. Type a query and press Run query.");',
    '    }',
    '    $schema = array();',
    '    $tablesRes = $db->query("SELECT name FROM sqlite_master WHERE type = \'table\' AND name NOT LIKE \'sqlite_%\' ORDER BY name");',
    '    foreach ($tablesRes->fetchAll(PDO::FETCH_ASSOC) as $t) {',
    '        $colsRes = $db->query("PRAGMA table_info(" . $t["name"] . ")");',
    '        $list = array();',
    '        foreach ($colsRes->fetchAll(PDO::FETCH_ASSOC) as $c) {',
    '            $list[] = array("name" => $c["name"], "type" => $c["type"] !== "" ? $c["type"] : "TEXT", "pk" => (int)$c["pk"]);',
    '        }',
    '        $count = (int)$db->query("SELECT COUNT(*) FROM " . $t["name"])->fetchColumn();',
    '        $schema[] = array("table" => $t["name"], "columns" => $list, "rows" => $count);',
    '    }',
    '} catch (Exception $e) {',
    '    $results[] = array("kind" => "error", "sql" => "", "message" => $e->getMessage());',
    '    $schema = array();',
    '}',
    'echo "@@SQL_JSON_START@@" . json_encode(array("results" => $results, "schema" => $schema)) . "@@SQL_JSON_END@@";'
  ].join('\n');

  // ---- Sample queries ----
  var SAMPLES = [
    {
      name: 'Start here — browse a table',
      code: [
        '-- Every row and column in the customers table.',
        '-- SELECT * means "all columns".',
        'SELECT * FROM customers;'
      ].join('\n')
    },
    {
      name: 'Pick columns + WHERE filter',
      code: [
        '-- Only the columns you need, only the rows that match.',
        'SELECT name, city, created_at',
        'FROM customers',
        'WHERE country = \'PH\';'
      ].join('\n')
    },
    {
      name: 'ORDER BY + LIMIT (top 5)',
      code: [
        '-- The 5 most expensive products, priciest first.',
        'SELECT name, category, price',
        'FROM products',
        'ORDER BY price DESC',
        'LIMIT 5;'
      ].join('\n')
    },
    {
      name: 'LIKE, IN and BETWEEN',
      code: [
        '-- Pattern match: names containing "Mo"',
        'SELECT name, price FROM products WHERE name LIKE \'%Mo%\';',
        '',
        '-- Match any value in a list',
        'SELECT name, category FROM products WHERE category IN (\'Audio\', \'Displays\');',
        '',
        '-- Inclusive range',
        'SELECT name, price FROM products WHERE price BETWEEN 1000 AND 5000 ORDER BY price;'
      ].join('\n')
    },
    {
      name: 'Aggregates — COUNT, SUM, AVG',
      code: [
        '-- One row of summary numbers over the whole orders table.',
        'SELECT',
        '  COUNT(*)        AS order_count,',
        '  SUM(total)      AS revenue,',
        '  ROUND(AVG(total), 2) AS average_order,',
        '  MIN(total)      AS smallest,',
        '  MAX(total)      AS largest',
        'FROM orders',
        'WHERE status = \'paid\';'
      ].join('\n')
    },
    {
      name: 'GROUP BY + HAVING',
      code: [
        '-- Revenue per category, but only categories above 5,000.',
        '-- WHERE filters rows; HAVING filters the grouped result.',
        'SELECT',
        '  p.category,',
        '  COUNT(oi.id)               AS items_sold,',
        '  SUM(oi.quantity * oi.unit_price) AS revenue',
        'FROM order_items oi',
        'JOIN products p ON p.id = oi.product_id',
        'GROUP BY p.category',
        'HAVING SUM(oi.quantity * oi.unit_price) > 5000',
        'ORDER BY revenue DESC;'
      ].join('\n')
    },
    {
      name: 'INNER JOIN two tables',
      code: [
        '-- Pull the customer name onto each order row.',
        'SELECT',
        '  o.id AS order_id,',
        '  c.name AS customer,',
        '  o.order_date,',
        '  o.status,',
        '  o.total',
        'FROM orders o',
        'INNER JOIN customers c ON c.id = o.customer_id',
        'ORDER BY o.order_date;'
      ].join('\n')
    },
    {
      name: 'LEFT JOIN — include the zeroes',
      code: [
        '-- Every customer, even those who never ordered.',
        '-- An INNER JOIN would silently drop them.',
        'SELECT',
        '  c.name,',
        '  COUNT(o.id)          AS orders_placed,',
        '  IFNULL(SUM(o.total), 0) AS lifetime_value',
        'FROM customers c',
        'LEFT JOIN orders o ON o.customer_id = c.id',
        'GROUP BY c.id, c.name',
        'ORDER BY lifetime_value DESC;'
      ].join('\n')
    },
    {
      name: 'Three-table join (order receipt)',
      code: [
        '-- Line items for one order, joined across three tables.',
        'SELECT',
        '  o.id            AS order_id,',
        '  c.name          AS customer,',
        '  p.name          AS product,',
        '  oi.quantity,',
        '  oi.unit_price,',
        '  oi.quantity * oi.unit_price AS line_total',
        'FROM order_items oi',
        'JOIN orders   o ON o.id = oi.order_id',
        'JOIN customers c ON c.id = o.customer_id',
        'JOIN products p ON p.id = oi.product_id',
        'WHERE o.id = 4;'
      ].join('\n')
    },
    {
      name: 'Subquery + CASE',
      code: [
        '-- Compare each product against the average price.',
        'SELECT',
        '  name,',
        '  price,',
        '  CASE',
        '    WHEN price > (SELECT AVG(price) FROM products) THEN \'above average\'',
        '    WHEN price = (SELECT AVG(price) FROM products) THEN \'exactly average\'',
        '    ELSE \'below average\'',
        '  END AS price_band,',
        '  CASE WHEN stock = 0 THEN \'out of stock\' ELSE \'in stock\' END AS availability',
        'FROM products',
        'ORDER BY price DESC;'
      ].join('\n')
    },
    {
      name: 'Date functions (MySQL style)',
      code: [
        '-- YEAR, MONTHNAME and DATE_FORMAT work just like MySQL here.',
        'SELECT',
        '  DATE_FORMAT(order_date, \'%M %e, %Y\') AS pretty_date,',
        '  YEAR(order_date)  AS yr,',
        '  MONTHNAME(order_date) AS month_name,',
        '  COUNT(*) AS orders,',
        '  SUM(total) AS revenue',
        'FROM orders',
        'GROUP BY YEAR(order_date), MONTH(order_date)',
        'ORDER BY yr, MONTH(order_date);'
      ].join('\n')
    },
    {
      name: 'INSERT a row',
      code: [
        '-- Add a customer, then read it back.',
        'INSERT INTO customers (name, email, city, country, created_at)',
        'VALUES (\'Ivy Navarro\', \'ivy@example.com\', \'Pasig\', \'PH\', \'2024-08-04\');',
        '',
        'SELECT * FROM customers ORDER BY id DESC LIMIT 3;'
      ].join('\n')
    },
    {
      name: 'UPDATE and DELETE (safely)',
      code: [
        '-- Always run the SELECT first so you know exactly what you will change.',
        'SELECT id, name, price FROM products WHERE category = \'Accessories\';',
        '',
        '-- Now apply a 10% price cut to that same set.',
        'UPDATE products',
        'SET price = ROUND(price * 0.9, 2)',
        'WHERE category = \'Accessories\';',
        '',
        'SELECT id, name, price FROM products WHERE category = \'Accessories\';',
        '',
        '-- DELETE takes a WHERE too. Without one, it empties the table.',
        'DELETE FROM order_items WHERE order_id = 12;',
        'SELECT COUNT(*) AS remaining_items FROM order_items;'
      ].join('\n')
    },
    {
      name: 'CREATE TABLE + constraints',
      code: [
        '-- MySQL DDL. AUTO_INCREMENT and ENGINE are accepted and ignored here.',
        'CREATE TABLE IF NOT EXISTS reviews (',
        '  id         INTEGER PRIMARY KEY AUTO_INCREMENT,',
        '  product_id INT NOT NULL,',
        '  rating     INT NOT NULL,',
        '  comment    VARCHAR(255),',
        '  created_at DATETIME',
        ') ENGINE=InnoDB;',
        '',
        'INSERT INTO reviews (product_id, rating, comment, created_at)',
        'VALUES (1, 5, \'Great keys, solid build.\', NOW()),',
        '       (1, 4, \'A little loud for an office.\', NOW()),',
        '       (6, 5, \'Blocks out everything.\', NOW());',
        '',
        'SELECT p.name, ROUND(AVG(r.rating), 2) AS avg_rating, COUNT(*) AS reviews',
        'FROM reviews r JOIN products p ON p.id = r.product_id',
        'GROUP BY p.id, p.name;'
      ].join('\n')
    },
    {
      name: 'Inspect the schema',
      code: [
        '-- Familiar MySQL introspection commands.',
        'SHOW TABLES;',
        '',
        'DESCRIBE orders;'
      ].join('\n')
    }
  ];

  // ---- Small helpers ----
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function toBase64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) { bin += String.fromCharCode(bytes[i]); }
    return btoa(bin);
  }
  function setEngineStatus(ok, text) {
    if (statusText) statusText.textContent = text;
    var dot = statusDot ? statusDot.querySelector('i') : null;
    if (dot) dot.style.background = ok ? '#22c55e' : '#f59e0b';
  }
  function updateCharCount() {
    if (charCount) charCount.textContent = editor.value.length + ' chars';
  }
  function setDirty(isDirty) {
    if (dirtyLabel) dirtyLabel.textContent = isDirty ? 'Unsaved — local only' : 'Local only';
  }
  function saveDraft() {
    try { localStorage.setItem(STORAGE_KEY, editor.value); } catch (e) {}
  }
  function loadDraft() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      if (v !== null && v !== '') { editor.value = v; return true; }
    } catch (e) {}
    return false;
  }

  // ---- Rendering ----
  function clearResults(message) {
    if (!resultsEl) return;
    resultsEl.innerHTML = '<div class="sql-placeholder">' + esc(message || 'Run a query to see your result set here…') + '</div>';
  }

  function renderResults(payload) {
    if (!resultsEl) return;
    var html = '';
    (payload.results || []).forEach(function (r) {
      html += '<section class="sql-result sql-result-' + r.kind + '">';
      if (r.sql) {
        html += '<header class="sql-result-head"><code>' + esc(r.sql.length > 160 ? r.sql.slice(0, 160) + '…' : r.sql) + '</code>';
        if (r.ms !== undefined) html += '<span class="sql-ms">' + r.ms + ' ms</span>';
        html += '</header>';
      }
      if (r.kind === 'rows') {
        if (!r.rows.length) {
          html += '<div class="sql-note"><i class="bx bx-info-circle"></i> 0 rows returned.</div>';
        } else {
          html += '<div class="sql-table-wrap"><table class="sql-table"><thead><tr>';
          r.columns.forEach(function (c) { html += '<th>' + esc(c) + '</th>'; });
          html += '</tr></thead><tbody>';
          r.rows.forEach(function (row) {
            html += '<tr>';
            r.columns.forEach(function (c) {
              var v = row[c];
              html += v === null || v === undefined
                ? '<td class="sql-null">NULL</td>'
                : '<td>' + esc(v) + '</td>';
            });
            html += '</tr>';
          });
          html += '</tbody></table></div>';
          html += '<div class="sql-note"><i class="bx bx-table"></i> ' + r.rows.length + ' row' + (r.rows.length === 1 ? '' : 's') + ' returned.</div>';
        }
      } else if (r.kind === 'affected') {
        html += '<div class="sql-note sql-ok"><i class="bx bx-check-circle"></i> OK — ' + r.affected + ' row' + (r.affected === 1 ? '' : 's') + ' affected.';
        if (r.insertId && r.insertId !== '0') html += ' Last insert id: <b>' + esc(r.insertId) + '</b>.';
        html += '</div>';
      } else if (r.kind === 'error') {
        html += '<div class="sql-note sql-err"><i class="bx bx-error-circle"></i> ' + esc(r.message) + '</div>';
      } else {
        html += '<div class="sql-note"><i class="bx bx-info-circle"></i> ' + esc(r.message) + '</div>';
      }
      html += '</section>';
    });
    resultsEl.innerHTML = html || '<div class="sql-placeholder">Nothing to show.</div>';
    resultsEl.scrollTop = 0;
    renderSchema(payload.schema || []);
  }

  function renderSchema(schema) {
    if (!schemaEl) return;
    if (!schema.length) { schemaEl.innerHTML = '<div class="muted">No tables.</div>'; return; }
    var html = '';
    schema.forEach(function (t) {
      html += '<details class="sql-schema-table" open><summary><i class="bx bx-table"></i> ' + esc(t.table) +
              ' <span class="sql-schema-count">' + t.rows + '</span></summary><ul>';
      t.columns.forEach(function (c) {
        html += '<li>' + (c.pk ? '<i class="bx bx-key"></i> ' : '') + '<b>' + esc(c.name) + '</b> <span>' + esc(c.type) + '</span></li>';
      });
      html += '</ul></details>';
    });
    schemaEl.innerHTML = html;
  }

  // ---- Engine ----
  var php = null, engineReady = false, buffer = '';

  async function loadEngine() {
    try {
      setEngineStatus(false, 'Loading engine…');
      var mod = await import('../vendor/php-wasm/PhpWeb.mjs');
      php = new mod.PhpWeb();
      php.addEventListener('output', function (e) { buffer += e.detail; });
      php.addEventListener('error', function (e) { buffer += e.detail; });
      php.addEventListener('ready', function () {
        engineReady = true;
        setEngineStatus(true, 'Database ready');
        runBtn.disabled = false;
        if (resetDbBtn) resetDbBtn.disabled = false;
        execute('SELECT 1;', false, true); // warm up + draw the schema panel
      });
    } catch (err) {
      setEngineStatus(false, 'Engine failed to load');
      clearResults('Could not load the SQL engine. Reload the page and try again.');
    }
  }

  async function execute(sql, reset, silent) {
    if (!engineReady || !php) return;
    runBtn.disabled = true;
    var original = runBtn.innerHTML;
    runBtn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Running…';
    buffer = '';
    try {
      var payload = toBase64(JSON.stringify({ sql: sql, reset: !!reset }));
      await php.run(PHP_RUNNER.replace('__PAYLOAD__', payload));
      var start = buffer.indexOf('@@SQL_JSON_START@@');
      var end = buffer.indexOf('@@SQL_JSON_END@@');
      if (start === -1 || end === -1) throw new Error(buffer || 'The engine returned no output.');
      var parsed = JSON.parse(buffer.slice(start + 18, end));
      if (silent) { renderSchema(parsed.schema || []); }
      else {
        renderResults(parsed);
        var bad = (parsed.results || []).some(function (r) { return r.kind === 'error'; });
        if (window.toast) window.toast(bad ? 'Query finished with an error' : 'Query ran successfully');
      }
    } catch (err) {
      if (!silent) {
        resultsEl.innerHTML = '<section class="sql-result sql-result-error"><div class="sql-note sql-err">' +
          '<i class="bx bx-error-circle"></i> ' + esc(String(err)) + '</div></section>';
      }
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = original;
    }
  }

  // ---- Wiring ----
  function populateSamples() {
    if (!sampleSelect) return;
    SAMPLES.forEach(function (s, i) {
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = s.name;
      sampleSelect.appendChild(opt);
    });
    sampleSelect.addEventListener('change', function () {
      var i = parseInt(sampleSelect.value, 10);
      if (isNaN(i) || !SAMPLES[i]) return;
      editor.value = SAMPLES[i].code;
      updateCharCount();
      setDirty(false);
      saveDraft();
    });
  }

  editor.addEventListener('input', function () { updateCharCount(); setDirty(true); saveDraft(); });

  // Ctrl/Cmd + Enter runs, like every SQL client.
  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runBtn.click(); }
  });

  runBtn.addEventListener('click', function () { execute(editor.value, false, false); });

  if (resetBtn) resetBtn.addEventListener('click', function () {
    var i = sampleSelect ? parseInt(sampleSelect.value, 10) : 0;
    editor.value = SAMPLES[isNaN(i) ? 0 : i].code;
    updateCharCount();
    setDirty(false);
    saveDraft();
  });

  if (resetDbBtn) resetDbBtn.addEventListener('click', function () {
    if (!confirm('Rebuild the sample database? Any rows you inserted or changed will be lost.')) return;
    execute('', true, false);
  });

  if (clearBtn) clearBtn.addEventListener('click', function () { clearResults(); });

  // ---- Init ----
  populateSamples();
  if (!loadDraft()) { editor.value = SAMPLES[0].code; }
  updateCharCount();
  setDirty(false);
  clearResults();
  if (resetDbBtn) resetDbBtn.disabled = true;
  loadEngine();
})();
