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
  var lineGutter = $('#sqlLineGutter');

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
    '    $dataSource = "sql-playground";', // becomes idb://sql-playground in the browser tab
    '    if ($db !== null && !$forceNew) { return $db; }',
    '    if ($db === null) {',
    '        if (!in_array("pgsql", PDO::getAvailableDrivers(), true)) {',
    '            throw new RuntimeException(',
    '                "No usable PDO driver is available in this PHP-WASM build. " .',
    '                "Available PDO drivers: " . (PDO::getAvailableDrivers() ? implode(", ", PDO::getAvailableDrivers()) : "(none)") . "."',
    '            );',
    '        }',
    '        $db = new PDO("pgsql:dbname=" . $dataSource);',
    '        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);',
    '        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);',
    '        play_register_mysql_functions($db);',
    '    }',
    '    // The data lives in IndexedDB and survives across page loads, so we CANNOT',
    '    // assume the schema needs (re)creating just because this is a fresh PHP run.',
    '    // The underlying pdo_pglite driver has no error handling around exec()-style',
    '    // statements: if CREATE TABLE hits an already-existing table, the JS promise',
    '    // rejects with nothing to catch it, and the whole engine hangs forever. So we',
    '    // check first, via a plain SELECT (which *does* have proper error handling),',
    '    // rather than ever letting a blind CREATE TABLE run against existing tables.',
    '    $exists = false;',
    '    try {',
    '        $chk = $db->query("SELECT 1 FROM information_schema.tables WHERE table_name = \'customers\'");',
    '        $exists = $chk && $chk->fetchColumn() !== false;',
    '    } catch (Throwable $e) { $exists = false; }',
    '    if ($forceNew && $exists) {',
    '        $db->exec("DROP TABLE IF EXISTS order_items CASCADE");',
    '        $db->exec("DROP TABLE IF EXISTS orders CASCADE");',
    '        $db->exec("DROP TABLE IF EXISTS products CASCADE");',
    '        $db->exec("DROP TABLE IF EXISTS customers CASCADE");',
    '        $exists = false;',
    '    }',
    '    if (!$exists) { play_seed($db); }',
    '    else { play_migrate($db); }',
    '    return $db;',
    '}',
    '',
    '// Self-healing schema migration for databases seeded by an older build of',
    '// this playground, back when total/price/unit_price were REAL instead of',
    '// NUMERIC(10,2). Postgres has round(numeric) and round(numeric,int) but no',
    '// round(double precision,int) overload, so any REAL column silently breaks',
    '// the very common "ROUND(AVG(x), 2)" pattern. Run through $db->query() (not',
    '// ->exec()) and wrapped in try/catch so a failure here is just reported,',
    '// never a wedged engine \u2014 same reasoning as the $exists check above.',
    'function play_migrate($db) {',
    '    try {',
    '        $db->query("',
    '            DO $$',
    '            DECLARE r RECORD;',
    '            BEGIN',
    '                FOR r IN',
    '                    SELECT table_name, column_name FROM information_schema.columns',
    '                    WHERE table_schema = \'public\'',
    '                      AND data_type IN (\'real\', \'double precision\')',
    '                      AND (table_name, column_name) IN (',
    '                          (\'orders\', \'total\'), (\'products\', \'price\'), (\'order_items\', \'unit_price\')',
    '                      )',
    '                LOOP',
    '                    EXECUTE format(',
    '                        \'ALTER TABLE %I ALTER COLUMN %I TYPE NUMERIC(10,2) USING %I::numeric(10,2)\',',
    '                        r.table_name, r.column_name, r.column_name',
    '                    );',
    '                END LOOP;',
    '            END;',
    '            $$;',
    '        ");',
    '    } catch (Throwable $e) { /* best effort \u2014 a manual Reset database still fixes it */ }',
    '}',
    '',

    '// MySQL-only functions Postgres does not ship with, registered as real',
    '// Postgres functions once per connection (CREATE OR REPLACE is idempotent,',
    '// so re-running this on every query is cheap and always safe).',
    '//',
    '// Earlier builds tried to register these with PDO::sqliteCreateFunction(),',
    '// which only exists on the sqlite PDO driver. This build\'s only driver is',
    '// "pgsql" (backed by PGlite/real Postgres), so that call silently no-opped',
    '// every time \u2014 none of these ever actually worked. Defining them as native',
    '// SQL/PLpgSQL functions instead means they run inside the same engine that',
    '// executes the query, so aggregates, GROUP BY, joins, etc. all compose with',
    '// them normally (a PHP callback shim could never support that).',
    'function play_register_mysql_functions($db) {',
    '    // IMPORTANT: pdo_pglite routes exec() through PGlite\'s extended query',
    '    // protocol, which accepts exactly ONE statement per call \u2014 feed it a',
    '    // semicolon-separated batch and it throws "cannot insert multiple',
    '    // commands into a prepared statement". Worse, the JS bridge for exec()',
    '    // does not catch that rejection, so it never reaches this PHP try/catch',
    '    // as a Throwable \u2014 it surfaces as an unhandled promise rejection in the',
    '    // console instead, and none of the functions below get registered. So',
    '    // each CREATE OR REPLACE FUNCTION is issued as its own exec() call.',
    '    $statements = [',
    '        "CREATE OR REPLACE FUNCTION ifnull(anyelement, anyelement) RETURNS anyelement AS $$ SELECT COALESCE($1, $2) $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION ifnull(integer, integer) RETURNS integer AS $$ SELECT COALESCE($1, $2) $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION ifnull(numeric, numeric) RETURNS numeric AS $$ SELECT COALESCE($1, $2) $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION ifnull(text, text) RETURNS text AS $$ SELECT COALESCE($1, $2) $$ LANGUAGE SQL IMMUTABLE",',
    '',
    '        // MySQL\'s IF(cond, then, else) as a value expression. Postgres can\'t',
    '        // resolve a single polymorphic overload against untyped string/number',
    '        // literals, so the two shapes actually used in practice are covered',
    '        // as concrete overloads; anything else, use a CASE expression instead.',
    '        "CREATE OR REPLACE FUNCTION \\"if\\"(boolean, text, text) RETURNS text AS $$ SELECT CASE WHEN $1 THEN $2 ELSE $3 END $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION \\"if\\"(boolean, numeric, numeric) RETURNS numeric AS $$ SELECT CASE WHEN $1 THEN $2 ELSE $3 END $$ LANGUAGE SQL IMMUTABLE",',
    '',
    '        "CREATE OR REPLACE FUNCTION curdate() RETURNS date AS $$ SELECT CURRENT_DATE $$ LANGUAGE SQL STABLE",',
    '        "CREATE OR REPLACE FUNCTION curtime() RETURNS time AS $$ SELECT CURRENT_TIME::time $$ LANGUAGE SQL STABLE",',
    '        "CREATE OR REPLACE FUNCTION pow(double precision, double precision) RETURNS double precision AS $$ SELECT POWER($1, $2) $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION rand() RETURNS double precision AS $$ SELECT random() $$ LANGUAGE SQL VOLATILE",',
    '',
    '        "CREATE OR REPLACE FUNCTION year(text) RETURNS integer AS $$ SELECT EXTRACT(YEAR FROM $1::timestamp)::integer $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION month(text) RETURNS integer AS $$ SELECT EXTRACT(MONTH FROM $1::timestamp)::integer $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION day(text) RETURNS integer AS $$ SELECT EXTRACT(DAY FROM $1::timestamp)::integer $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION monthname(text) RETURNS text AS $$ SELECT TRIM(TO_CHAR($1::timestamp, \'FMMonth\')) $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION datediff(text, text) RETURNS integer AS $$ SELECT ($1::date - $2::date)::integer $$ LANGUAGE SQL IMMUTABLE",',
    '',
    '        "CREATE OR REPLACE FUNCTION locate(text, text) RETURNS integer AS $$ SELECT POSITION($1 IN $2)::integer $$ LANGUAGE SQL IMMUTABLE",',
    '        "CREATE OR REPLACE FUNCTION locate(text, text, integer) RETURNS integer AS $$',
    '            SELECT CASE WHEN POSITION($1 IN substr($2, $3)) = 0 THEN 0',
    '                        ELSE POSITION($1 IN substr($2, $3)) + $3 - 1 END',
    '        $$ LANGUAGE SQL IMMUTABLE",',
    '',
    '        // LEFT(), RIGHT(), REPEAT(), CONCAT(), CONCAT_WS() and NOW() are all',
    '        // already native Postgres functions with matching MySQL semantics, so',
    '        // they need no shim here \u2014 they just work.',
    '',
    '        "CREATE OR REPLACE FUNCTION date_format(text, text) RETURNS text AS $$',
    '        DECLARE',
    '            ts timestamp := $1::timestamp;',
    '            fmt text := $2;',
    '            out_str text := \'\';',
    '            i int := 1;',
    '            len int := length(fmt);',
    '            tok text;',
    '        BEGIN',
    '            IF $1 IS NULL THEN RETURN NULL; END IF;',
    '            WHILE i <= len LOOP',
    '                IF substr(fmt, i, 1) = \'%\' AND i < len THEN',
    '                    tok := substr(fmt, i, 2);',
    '                    out_str := out_str || CASE tok',
    '                        WHEN \'%Y\' THEN to_char(ts, \'YYYY\')',
    '                        WHEN \'%y\' THEN to_char(ts, \'YY\')',
    '                        WHEN \'%m\' THEN to_char(ts, \'MM\')',
    '                        WHEN \'%c\' THEN to_char(ts, \'FMMM\')',
    '                        WHEN \'%d\' THEN to_char(ts, \'DD\')',
    '                        WHEN \'%e\' THEN to_char(ts, \'FMDD\')',
    '                        WHEN \'%H\' THEN to_char(ts, \'HH24\')',
    '                        WHEN \'%i\' THEN to_char(ts, \'MI\')',
    '                        WHEN \'%s\' THEN to_char(ts, \'SS\')',
    '                        WHEN \'%M\' THEN trim(to_char(ts, \'FMMonth\'))',
    '                        WHEN \'%b\' THEN to_char(ts, \'Mon\')',
    '                        WHEN \'%W\' THEN trim(to_char(ts, \'FMDay\'))',
    '                        WHEN \'%a\' THEN to_char(ts, \'Dy\')',
    '                        WHEN \'%p\' THEN to_char(ts, \'AM\')',
    '                        ELSE substr(tok, 2, 1)',
    '                    END;',
    '                    i := i + 2;',
    '                ELSE',
    '                    out_str := out_str || substr(fmt, i, 1);',
    '                    i := i + 1;',
    '                END IF;',
    '            END LOOP;',
    '            RETURN out_str;',
    '        END;',
    '        $$ LANGUAGE plpgsql IMMUTABLE",',
    '    ];',
    '    foreach ($statements as $stmt) {',
    '        try {',
    '            $db->exec($stmt);',
    '        } catch (Throwable $e) { /* best effort \u2014 native Postgres functions (NOW, CONCAT, LEFT, RIGHT, REPEAT...) still work without these */ }',
    '    }',
    '}',
    '',
    '// Seed a small, MySQL-shaped store schema.',
    'function play_seed($db) {',
    '    $db->exec("',
    '        CREATE TABLE IF NOT EXISTS customers (',
    '            id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,',
    '            name TEXT NOT NULL,',
    '            email TEXT NOT NULL UNIQUE,',
    '            city TEXT,',
    '            country TEXT NOT NULL DEFAULT \'PH\',',
    '            created_at TEXT NOT NULL',
    '        )");',
    '    $db->exec("',
    '        CREATE TABLE IF NOT EXISTS products (',
    '            id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,',
    '            name TEXT NOT NULL,',
    '            category TEXT NOT NULL,',
    '            price NUMERIC(10,2) NOT NULL,',
    '            stock INTEGER NOT NULL DEFAULT 0',
    '        )");',
    '    $db->exec("',
    '        CREATE TABLE IF NOT EXISTS orders (',
    '            id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,',
    '            customer_id INTEGER NOT NULL REFERENCES customers(id),',
    '            order_date TEXT NOT NULL,',
    '            status TEXT NOT NULL DEFAULT \'pending\',',
    '            total NUMERIC(10,2) NOT NULL DEFAULT 0',
    '        )");',
    '    $db->exec("',
    '        CREATE TABLE IF NOT EXISTS order_items (',
    '            id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,',
    '            order_id INTEGER NOT NULL REFERENCES orders(id),',
    '            product_id INTEGER NOT NULL REFERENCES products(id),',
    '            quantity INTEGER NOT NULL DEFAULT 1,',
    '            unit_price NUMERIC(10,2) NOT NULL',
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
    '        (8, \'Hiro Tanaka\',  \'hiro@example.com\',  \'Tokyo\',       \'JP\', \'2024-05-27\') ON CONFLICT (id) DO NOTHING");',
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
    '        (10, \'Ergonomic Chair\',          \'Furniture\',   12999, 5) ON CONFLICT (id) DO NOTHING");',
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
    '        (12, 3, \'2024-07-28\', \'refunded\',  899) ON CONFLICT (id) DO NOTHING");',
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
    '',
    '    // Seed inserts above set explicit ids without going through the',
    '    // identity sequences, so the sequences themselves never advance.',
    '    // Sync each one past the seeded max, or the next id-omitted INSERT',
    '    // would try id=1 again and collide.',
    '    $db->exec("SELECT setval(pg_get_serial_sequence(\'customers\', \'id\'), COALESCE((SELECT MAX(id) FROM customers), 1))");',
    '    $db->exec("SELECT setval(pg_get_serial_sequence(\'products\', \'id\'), COALESCE((SELECT MAX(id) FROM products), 1))");',
    '    $db->exec("SELECT setval(pg_get_serial_sequence(\'orders\', \'id\'), COALESCE((SELECT MAX(id) FROM orders), 1))");',
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
    '// pragma_table_info-equivalent lookup against Postgres system catalogs',
    '// (this build\'s only PDO driver is "pgsql", backed by PGlite/real Postgres,',
    '// not SQLite, so sqlite_master/PRAGMA are gone \u2014 untested against a live', 
    '// PGlite connection).',
    'function play_columns_sql($table) {',
    '    return "SELECT c.column_name AS name, c.data_type AS type, " .',
    '        "CASE WHEN c.is_nullable = \'NO\' THEN 1 ELSE 0 END AS \\"notnull\\", " .',
    '        "CASE WHEN pk.column_name IS NOT NULL THEN 1 ELSE 0 END AS pk, " .',
    '        "c.column_default AS dflt_value " .',
    '        "FROM information_schema.columns c " .',
    '        "LEFT JOIN (SELECT kcu.column_name FROM information_schema.table_constraints tc " .',
    '        "    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name " .',
    '        "    WHERE tc.constraint_type = \'PRIMARY KEY\' AND tc.table_name = \'" . $table . "\') pk ON pk.column_name = c.column_name " .',
    '        "WHERE c.table_schema = \'public\' AND c.table_name = \'" . $table . "\' ORDER BY c.ordinal_position";',
    '}',
    '',
    '// Translate the MySQL-only statements Postgres does not understand.',
    'function play_translate($sql) {',
    '    $t = trim($sql);',
    '    if (preg_match("/^show\\\\s+tables/i", $t)) {',
    '        return "SELECT tablename AS \\"Tables_in_playground\\" FROM pg_catalog.pg_tables WHERE schemaname = \'public\' ORDER BY tablename";',
    '    }',
    '    if (preg_match("/^(?:describe|desc|show\\\\s+columns\\\\s+from)\\\\s+`?([A-Za-z0-9_]+)`?/i", $t, $m)) {',
    '        $cols = play_columns_sql($m[1]);',
    '        return "SELECT name AS \\"Field\\", type AS \\"Type\\", CASE WHEN \\"notnull\\" = 1 THEN \'NO\' ELSE \'YES\' END AS \\"Null\\", CASE WHEN pk = 1 THEN \'PRI\' ELSE \'\' END AS \\"Key\\", dflt_value AS \\"Default\\" FROM (" . $cols . ") t";',
    '    }',
    '    if (preg_match("/^create\\\\s+table/i", $t)) {',
    '        // AUTO_INCREMENT has no Postgres keyword equivalent \\u2014 the closest is an',
    '        // identity column, so translate it into one instead of just deleting it',
    '        // (deleting it left the column with no way to auto-generate a value at',
    '        // all, so any INSERT that didn\'t specify that column would fail).',
    '        $t = preg_replace("/\\\\s+AUTO_INCREMENT\\\\s*(=\\\\s*\\\\d+)?/i", " GENERATED BY DEFAULT AS IDENTITY", $t);',
    '        $t = preg_replace("/\\\\s+(ENGINE|DEFAULT\\\\s+CHARSET|CHARACTER\\\\s+SET|COLLATE)\\\\s*=?\\\\s*[A-Za-z0-9_]+/i", " ", $t);',
    '        $t = preg_replace("/\\\\bUNSIGNED\\\\b/i", " ", $t);',
    '        $t = preg_replace("/\\\\bINT\\\\s*\\\\(\\\\s*\\\\d+\\\\s*\\\\)/i", "INTEGER", $t);',
    '        // MySQL types Postgres does not have: DATETIME (-> TIMESTAMP), and the',
    '        // narrower integer widths (-> their closest Postgres equivalent). Any',
    '        // display-width argument on those, e.g. TINYINT(1), is meaningless in',
    '        // Postgres and gets dropped along the way.',
    '        $t = preg_replace("/\\\\bDATETIME\\\\b/i", "TIMESTAMP", $t);',
    '        $t = preg_replace("/\\\\bTINYINT\\\\s*(\\\\(\\\\s*\\\\d+\\\\s*\\\\))?/i", "SMALLINT", $t);',
    '        $t = preg_replace("/\\\\bMEDIUMINT\\\\s*(\\\\(\\\\s*\\\\d+\\\\s*\\\\))?/i", "INTEGER", $t);',
    '        $t = preg_replace("/\\\\b(SMALLINT|BIGINT)\\\\s*\\\\(\\\\s*\\\\d+\\\\s*\\\\)/i", "$1", $t);',
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
    '        // NOTE: PDOStatement::getColumnMeta() is unusable here. The pdo_pglite',
    '        // driver in this WASM build stubs pdo_pglite_stmt_col_meta as a bare',
    '        // console.log() with no return value, so the native side ends up',
    '        // dereferencing an invalid pointer and crashes with "RuntimeError:',
    '        // memory access out of bounds" on every column of every SELECT.',
    '        // Derive column names from the fetched rows instead — that path',
    '        // never touches the broken shim.',
    '        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);',
    '        $cols = $rows ? array_keys($rows[0]) : array();',
    '        if (!$cols) {',
    '            $n = $stmt->columnCount();',
    '            for ($c = 0; $c < $n; $c++) { $cols[] = "col" . $c; }',
    '        }',
    '        return array("kind" => "rows", "sql" => $raw, "columns" => $cols, "rows" => $rows, "ms" => round((microtime(true) - $started) * 1000, 2));',
    '    }',
    '    // Deliberately $db->query(), not $db->exec(), even for INSERT/UPDATE/DELETE.',
    '    // The pdo_pglite exec() bridge has no error handling at all (see the',
    '    // existence-check workaround above for CREATE TABLE): when the underlying',
    '    // PGlite call rejects — a unique-constraint violation, an FK violation, any',
    '    // DB-level error — that rejection has nothing to catch it on the JS side, so',
    '    // it surfaces as an uncaught promise rejection and the whole engine wedges.',
    '    // query() goes through PGlite\'s normal statement path, which *does* propagate',
    '    // failures back as a catchable PDOException, so a bad INSERT/UPDATE/DELETE',
    '    // becomes an ordinary reported error instead of a frozen tab.',
    '    $stmt = $db->query($sql);',
    '    $affected = $stmt ? $stmt->rowCount() : 0;',
    '    // lastInsertId() calls into the same kind of unreliable pdo_pglite shim as',
    '    // getColumnMeta() above (it runs SELECT LASTVAL() but often fails to report',
    '    // it back) — catch locally so a broken id lookup never masks an INSERT that',
    '    // already committed successfully.',
    '    try { $insertId = $db->lastInsertId(); } catch (Exception $e) { $insertId = \'\'; }',
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
    '    $tablesRes = $db->query("SELECT tablename AS name FROM pg_catalog.pg_tables WHERE schemaname = \'public\' ORDER BY tablename");',
    '    foreach ($tablesRes->fetchAll(PDO::FETCH_ASSOC) as $t) {',
    '        $colsRes = $db->query(play_columns_sql($t["name"]));',
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
      group: 'Basics',
      name: 'Start here — browse a table',
      code: [
        '-- Every row and column in the customers table.',
        '-- SELECT * means "all columns".',
        'SELECT * FROM customers;'
      ].join('\n')
    },
    {
      group: 'Basics',
      name: 'Pick columns + WHERE filter',
      code: [
        '-- Only the columns you need, only the rows that match.',
        'SELECT name, city, created_at',
        'FROM customers',
        'WHERE country = \'PH\';'
      ].join('\n')
    },
    {
      group: 'Basics',
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
      group: 'Basics',
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
      group: 'Aggregation & joins',
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
      group: 'Aggregation & joins',
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
      group: 'Aggregation & joins',
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
      group: 'Aggregation & joins',
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
      group: 'Aggregation & joins',
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
      group: 'Functions & expressions',
      name: 'Subquery + CASE + IF()',
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
        '  IF(stock = 0, \'out of stock\', \'in stock\') AS availability',
        'FROM products',
        'ORDER BY price DESC;'
      ].join('\n')
    },
    {
      group: 'Functions & expressions',
      name: 'Date functions (MySQL style)',
      code: [
        '-- YEAR, MONTHNAME and DATE_FORMAT work just like MySQL here.',
        'SELECT',
        '  order_date,',
        '  DATE_FORMAT(order_date, \'%M %e, %Y\') AS pretty_date,',
        '  YEAR(order_date)      AS yr,',
        '  MONTHNAME(order_date) AS month_name',
        'FROM orders',
        'ORDER BY order_date',
        'LIMIT 5;',
        '',
        '-- Aggregating by month: group by the raw column (YEAR/MONTH give the',
        '-- same grouping), then format the label from an aggregate of it.',
        'SELECT',
        '  DATE_FORMAT(MIN(order_date), \'%M %Y\') AS month,',
        '  COUNT(*)   AS orders,',
        '  SUM(total) AS revenue',
        'FROM orders',
        'GROUP BY YEAR(order_date), MONTH(order_date)',
        'ORDER BY MIN(order_date);'
      ].join('\n')
    },
    {
      group: 'Functions & expressions',
      name: 'String functions',
      code: [
        '-- UPPER/LOWER, LENGTH, SUBSTRING, CONCAT, LOCATE, REPEAT and LEFT/RIGHT',
        '-- all work just like MySQL here (most are native Postgres functions —',
        '-- only LOCATE is one this playground adds for MySQL compatibility).',
        'SELECT',
        '  name,',
        '  UPPER(name)                AS shout,',
        '  LOWER(category)            AS category_lower,',
        '  LENGTH(name)                AS name_length,',
        '  LEFT(name, 3)                AS first_3,',
        '  CONCAT(name, \' (\', category, \')\') AS label,',
        '  LOCATE(\'o\', name)          AS first_o_at',
        'FROM products',
        'ORDER BY name',
        'LIMIT 5;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'Window functions — ranking',
      code: [
        '-- RANK() OVER (PARTITION BY ... ORDER BY ...): rank each product',
        '-- against only the other products in its own category.',
        'SELECT',
        '  category,',
        '  name,',
        '  price,',
        '  RANK() OVER (PARTITION BY category ORDER BY price DESC) AS price_rank',
        'FROM products',
        'ORDER BY category, price_rank;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'Window functions — running total',
      code: [
        '-- SUM() OVER (ORDER BY ...) turns a plain aggregate into a running',
        '-- total, without collapsing the rows the way GROUP BY would.',
        'SELECT',
        '  order_date,',
        '  total,',
        '  SUM(total) OVER (ORDER BY order_date, id) AS running_total',
        'FROM orders',
        'WHERE status = \'paid\'',
        'ORDER BY order_date, id;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'Window functions — compare to previous row',
      code: [
        '-- LAG() reaches back to the previous row in the same ordering,',
        '-- handy for period-over-period change without a self-join.',
        'SELECT',
        '  order_date,',
        '  total,',
        '  total - LAG(total) OVER (ORDER BY order_date, id) AS change_from_prev',
        'FROM orders',
        'WHERE status = \'paid\'',
        'ORDER BY order_date, id;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'CTE (WITH) — named subqueries',
      code: [
        '-- WITH gives a subquery a name you can reference like a table,',
        '-- so the main query reads top-to-bottom instead of nesting inward.',
        'WITH category_totals AS (',
        '  SELECT p.category, SUM(oi.quantity * oi.unit_price) AS revenue',
        '  FROM order_items oi',
        '  JOIN products p ON p.id = oi.product_id',
        '  GROUP BY p.category',
        ')',
        'SELECT',
        '  category,',
        '  revenue,',
        '  ROUND(100.0 * revenue / SUM(revenue) OVER (), 1) AS pct_of_total',
        'FROM category_totals',
        'ORDER BY revenue DESC;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'Multiple CTEs chained together',
      code: [
        '-- Each WITH clause can build on the one before it — useful for',
        '-- breaking a big question into readable, testable steps.',
        'WITH paid_orders AS (',
        '  SELECT * FROM orders WHERE status = \'paid\'',
        '),',
        'customer_totals AS (',
        '  SELECT customer_id, SUM(total) AS spent',
        '  FROM paid_orders',
        '  GROUP BY customer_id',
        ')',
        'SELECT c.name, ct.spent',
        'FROM customer_totals ct',
        'JOIN customers c ON c.id = ct.customer_id',
        'ORDER BY ct.spent DESC;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'EXISTS / NOT EXISTS',
      code: [
        '-- EXISTS stops at the first match, which usually makes it faster',
        '-- than an equivalent IN (...) subquery for "has at least one" checks.',
        '-- Customers who have at least one paid order:',
        'SELECT name FROM customers c',
        'WHERE EXISTS (',
        '  SELECT 1 FROM orders o WHERE o.customer_id = c.id AND o.status = \'paid\'',
        ')',
        'ORDER BY name;',
        '',
        '-- Customers who have never ordered anything at all:',
        'SELECT name FROM customers c',
        'WHERE NOT EXISTS (',
        '  SELECT 1 FROM orders o WHERE o.customer_id = c.id',
        ')',
        'ORDER BY name;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'Correlated subquery in SELECT',
      code: [
        '-- A subquery that references the outer row (c.id) runs once per',
        '-- outer row — handy for a per-row count without a GROUP BY/JOIN.',
        'SELECT',
        '  c.name,',
        '  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count',
        'FROM customers c',
        'ORDER BY order_count DESC, c.name;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'UNION — stack two result sets',
      code: [
        '-- UNION ALL stacks rows from different queries as long as the',
        '-- column lists line up. Plain UNION would also drop duplicate rows.',
        'SELECT name, \'out of stock product\' AS note FROM products WHERE stock = 0',
        'UNION ALL',
        'SELECT name, \'customer outside PH\' AS note FROM customers WHERE country != \'PH\'',
        'ORDER BY note, name;'
      ].join('\n')
    },
    {
      group: 'Advanced SQL',
      name: 'Self-join — pair up rows in the same table',
      code: [
        '-- Joining a table to itself, here to list every pair of products',
        '-- that share a category without repeating a pair in both orders.',
        'SELECT',
        '  a.name AS product_a,',
        '  b.name AS product_b,',
        '  a.category',
        'FROM products a',
        'JOIN products b ON a.category = b.category AND a.id < b.id',
        'ORDER BY a.category;'
      ].join('\n')
    },
    {
      group: 'Changing data',
      name: 'INSERT a row',
      code: [
        '-- Add a customer, then read it back.',
        '-- ON CONFLICT DO NOTHING makes this safe to run more than once: the',
        '-- sample data lives in IndexedDB and survives page reloads, so running',
        '-- this a second time would otherwise hit the UNIQUE constraint on email.',
        'INSERT INTO customers (name, email, city, country, created_at)',
        'VALUES (\'Ivy Navarro\', \'ivy@example.com\', \'Pasig\', \'PH\', \'2024-08-04\')',
        'ON CONFLICT (email) DO NOTHING;',
        '',
        'SELECT * FROM customers ORDER BY id DESC LIMIT 3;'
      ].join('\n')
    },
    {
      group: 'Changing data',
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
      group: 'Changing data',
      name: 'Transactions — BEGIN / ROLLBACK / COMMIT',
      code: [
        '-- Each statement here runs in order against the same connection, so',
        '-- BEGIN/ROLLBACK behave exactly like a real MySQL/Postgres session:',
        '-- everything in between is undone the moment ROLLBACK runs.',
        'BEGIN;',
        '',
        'UPDATE products SET stock = stock - 1 WHERE id = 1;',
        'SELECT id, name, stock FROM products WHERE id = 1;',
        '',
        '-- Change this to COMMIT to keep the change instead of undoing it.',
        'ROLLBACK;',
        '',
        'SELECT id, name, stock FROM products WHERE id = 1;'
      ].join('\n')
    },
    {
      group: 'Changing data',
      name: 'CREATE TABLE + constraints',
      code: [
        '-- MySQL DDL. AUTO_INCREMENT, ENGINE, DATETIME and narrower integer',
        '-- types (TINYINT, MEDIUMINT, ...) are all accepted and translated here.',
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
      group: 'Schema',
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
  function updateLineNumbers() {
    if (!lineGutter) return;
    var lineCount = editor.value.split('\n').length;
    var out = '';
    for (var i = 1; i <= lineCount; i++) { out += i + '\n'; }
    lineGutter.textContent = out;
  }
  function syncGutterScroll() {
    if (lineGutter) lineGutter.scrollTop = editor.scrollTop;
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
        html += '<header class="sql-result-head"><code>' + esc(r.sql) + '</code>';
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
    resultsEl.scrollLeft = 0;
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
  var IDB_NAME = 'sql-playground'; // matches idb://sql-playground below
  var ENGINE_LOAD_TIMEOUT_MS = 20000;
  var QUERY_TIMEOUT_MS = 20000;

  // The pgsql PDO driver stores its data in IndexedDB (idb://sql-playground).
  // The vendored PGlite build never registers an `onblocked` handler on that
  // IndexedDB open request, so if another tab/window has an older connection
  // to the same database still open, the open request just sits there
  // forever — no error, no timeout, nothing. That shows up here as "Running…"
  // (or "Loading engine…") that never finishes. We can't patch PGlite's
  // internals, so instead we race every engine operation against a timeout
  // and, on timeout, offer to clear the stuck IndexedDB database ourselves.
  function withTimeout(promise, ms, label) {
    var timer;
    var timeout = new Promise(function (_, reject) {
      timer = setTimeout(function () {
        reject(new Error(
          label + ' timed out after ' + Math.round(ms / 1000) + 's. This usually means the ' +
          'engine\'s IndexedDB storage ("' + IDB_NAME + '") is stuck — most often because ' +
          'another tab or window with this same page is still open.'
        ));
      }, ms);
    });
    return Promise.race([promise, timeout]).finally(function () { clearTimeout(timer); });
  }

  function clearStuckDatabase() {
    return new Promise(function (resolve, reject) {
      if (!('indexedDB' in window)) { resolve(); return; }
      var req = indexedDB.deleteDatabase(IDB_NAME);
      req.onsuccess = function () { resolve(); };
      req.onerror = function () { reject(req.error || new Error('Could not delete the stored database.')); };
      // deleteDatabase can itself be blocked by other open connections;
      // don't hang here either — just proceed, the reload below will retry.
      req.onblocked = function () { resolve(); };
    });
  }

  function renderTimeoutMessage(err) {
    if (!resultsEl) return;
    resultsEl.innerHTML =
      '<div class="sql-placeholder">' +
      '<div>' + esc(String(err && err.message ? err.message : err)) + '</div>' +
      '<div style="margin-top:10px">' +
      '<button type="button" id="sqlClearStuckDb" class="btn"><i class="bx bx-trash"></i> Close other tabs with this page open, or click to clear the stored database and reload</button>' +
      '</div></div>';
    var btn = document.getElementById('sqlClearStuckDb');
    if (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = 'Clearing…';
        clearStuckDatabase().then(function () {
          location.reload();
        }).catch(function (e) {
          console.error('[sql-playground] failed to clear stuck database:', e);
          btn.disabled = false;
          btn.textContent = 'Failed to clear — try closing other tabs manually, then reload.';
        });
      });
    }
  }

  async function loadEngine() {
    try {
      setEngineStatus(false, 'Loading engine…');
      // This build's PHP-WASM only has a "pgsql" PDO driver, and that driver
      // is backed by PGlite (WASM Postgres) rather than a real Postgres
      // server. The C driver expects the actual PGlite JS class to be
      // injected as a constructor arg. PGlite is vendored locally under
      // assets/vendor/pglite (instead of importing it from a CDN at
      // runtime) so the playground still works offline, behind a strict
      // Content-Security-Policy, or when the CDN is blocked/unreachable.
      var pgliteMod = await import('../vendor/pglite/index.js');
      var mod = await import('../vendor/php-wasm/PhpWeb.mjs');
      php = new mod.PhpWeb({ PGlite: pgliteMod.PGlite });
      php.addEventListener('output', function (e) { buffer += e.detail; });
      php.addEventListener('error', function (e) { buffer += e.detail; });

      var readyPromise = new Promise(function (resolve) {
        php.addEventListener('ready', resolve);
      });
      await withTimeout(readyPromise, ENGINE_LOAD_TIMEOUT_MS, 'Loading the engine');

      engineReady = true;
      setEngineStatus(true, 'Database ready');
      runBtn.disabled = false;
      if (resetDbBtn) resetDbBtn.disabled = false;
      execute('SELECT 1;', false, true); // warm up + draw the schema panel
    } catch (err) {
      // Surface the real reason instead of a generic message — this is the
      // difference between "reload and hope" and actually being able to fix it.
      console.error('[sql-playground] engine failed to load:', err);
      setEngineStatus(false, 'Engine failed to load');
      if (/timed out/.test(err && err.message)) {
        renderTimeoutMessage(err);
      } else {
        var detail = (err && (err.message || String(err))) || 'Unknown error';
        clearResults(
          'Could not load the SQL engine: ' + detail + '. ' +
          'Open the browser console (F12) for the full error. Common causes: the page ' +
          'was opened over file:// instead of http(s)://, or a browser extension / network ' +
          'policy is blocking WebAssembly or module scripts.'
        );
      }
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
      await withTimeout(php.run(PHP_RUNNER.replace('__PAYLOAD__', payload)), QUERY_TIMEOUT_MS, 'The query');
      var start = buffer.indexOf('@@SQL_JSON_START@@');
      var end = buffer.indexOf('@@SQL_JSON_END@@');
      if (start === -1 || end === -1) throw new Error(buffer || 'The engine returned no output.');
      var parsed = JSON.parse(buffer.slice(start + 18, end));
      if (silent) { renderSchema(parsed.schema || []); }
      else {
        renderResults(parsed);
        var bad = (parsed.results || []).some(function (r) { return r.kind === 'error'; });
        if (window.toast) window.toast(bad ? 'Query finished with an error' : 'Query ran successfully');
        /* Same rule as every other action: only a query that ran cleanly and
           hasn't already been rewarded earns XP (flat, once per distinct query). */
        if (!bad && !reset && window.awardOnce) window.awardOnce('run-sql', sql, 'Ran SQL query');
      }
    } catch (err) {
      console.error('[sql-playground] query failed:', err);
      if (!silent) {
        if (/timed out/.test(err && err.message)) {
          renderTimeoutMessage(err);
        } else {
          resultsEl.innerHTML = '<section class="sql-result sql-result-error"><div class="sql-note sql-err">' +
            '<i class="bx bx-error-circle"></i> ' + esc(String(err)) + '</div></section>';
        }
      }
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = original;
    }
  }

  // ---- Wiring ----
  function populateSamples() {
    if (!sampleSelect) return;
    var groups = {};
    var order = [];
    SAMPLES.forEach(function (s, i) {
      var g = s.group || 'Samples';
      if (!groups[g]) { groups[g] = document.createElement('optgroup'); groups[g].label = g; order.push(g); }
      var opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = s.name;
      groups[g].appendChild(opt);
    });
    order.forEach(function (g) { sampleSelect.appendChild(groups[g]); });
    sampleSelect.addEventListener('change', function () {
      var i = parseInt(sampleSelect.value, 10);
      if (isNaN(i) || !SAMPLES[i]) return;
      editor.value = SAMPLES[i].code;
      updateCharCount();
      updateLineNumbers();
      setDirty(false);
      saveDraft();
    });
  }

  editor.addEventListener('input', function () { updateCharCount(); updateLineNumbers(); setDirty(true); saveDraft(); });
  editor.addEventListener('scroll', syncGutterScroll);

  // Ctrl/Cmd + Enter runs, like every SQL client.
  editor.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); runBtn.click(); }
  });

  runBtn.addEventListener('click', function () { execute(editor.value, false, false); });

  if (resetBtn) resetBtn.addEventListener('click', function () {
    var i = sampleSelect ? parseInt(sampleSelect.value, 10) : 0;
    editor.value = SAMPLES[isNaN(i) ? 0 : i].code;
    updateCharCount();
    updateLineNumbers();
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
  updateLineNumbers();
  setDirty(false);
  clearResults();
  if (resetDbBtn) resetDbBtn.disabled = true;

  // The combined Playground page loads this engine only when SQL is first used.
  if (window.ADEV_LAZY_ENGINES) {
    document.addEventListener('adev:start-sql', function () { loadEngine(); }, { once: true });
  } else {
    loadEngine();
  }
})();
