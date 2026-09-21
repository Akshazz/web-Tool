/* =========================================================================
   A-Code Playground — PHP Sample page · basic PHP samples
   -------------------------------------------------------------------------
   Everyday PHP, grouped by category (Basics, Strings, Arrays, Functions,
   OOP, Data, Forms). Each card shows the code's real output in a terminal
   panel; "Playground" opens the code in the PHP Playground so it can be
   edited and run. Nothing here needs a database.

   The CRUD samples are in components-php.js. components.js merges both
   lists into the PHP Sample page (?page=php-sample).
   ========================================================================= */
(function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m];
    });
  }

  /* Terminal-style preview of a sample's output. */
  function term(out, h) {
    return '<style>*{box-sizing:border-box}body{padding:18px}' +
      '.lbl{display:flex;justify-content:space-between;margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}' +
      'pre{margin:0;padding:12px 14px;border-radius:12px;background:#101112;color:#e6e6e6;' +
      'font:12px/1.65 ui-monospace,SFMono-Regular,Consolas,monospace;overflow:auto;white-space:pre;max-height:' + (h - 66) + 'px}</style>' +
      '<div class="lbl"><span>Output</span><span>PHP</span></div><pre>' + esc(out) + '</pre>';
  }

  function sample(id, name, cat, desc, code, out) {
    var lines = out.replace(/\n$/, '').split('\n').length;
    var h = Math.max(190, Math.min(360, 104 + Math.round(lines * 19.8)));
    return { id: id, name: name, cat: cat, lang: 'PHP', h: h, desc: desc, code: code, preview: term(out, h) };
  }

  window.PHP_BASIC_SAMPLES = [
    sample("php-vars", "Variables & data types", "Basics",
      "Every type PHP has, how to check it with get_debug_type(), constants and casting.",
      String.raw`<?php
// Variables start with $. PHP picks the type from the value.
$name    = 'Ada';           // string
$age     = 36;              // int
$price   = 19.99;           // float
$active  = true;            // bool
$tags    = ['php', 'sql'];  // array
$nothing = null;            // null

foreach (compact('name', 'age', 'price', 'active', 'tags', 'nothing') as $var => $value) {
    echo str_pad('$' . $var, 10), get_debug_type($value), "\n";
}

// Double-quoted strings can hold variables.
echo "\n{$name} is {$age} years old.\n";

// Constants never change.
const APP_NAME = 'A-Code Playground';
echo 'Welcome to ', APP_NAME, "\n";

// Convert between types on purpose.
var_dump((int) '42abc', (float) '3.14', (bool) '0', (string) 12);
`,
      "$name     string\n$age      int\n$price    float\n$active   bool\n$tags     array\n$nothing  null\n\nAda is 36 years old.\nWelcome to A-Code Playground\nint(42)\nfloat(3.14)\nbool(false)\nstring(2) \"12\"\n"),
    sample("php-conditions", "Conditions: if, match, ??", "Basics",
      "if / elseif, the PHP 8 match expression, the ternary and the null coalescing operator.",
      String.raw`<?php
$score = 82;

if ($score >= 90) {
    $grade = 'A';
} elseif ($score >= 75) {
    $grade = 'B';
} else {
    $grade = 'C';
}
echo "Score {$score} -> grade {$grade}\n";

// match compares strictly and returns a value (PHP 8+).
$label = match (true) {
    $score >= 90 => 'Excellent',
    $score >= 75 => 'Good',
    default      => 'Keep practising',
};
echo "Label: {$label}\n";

// Ternary and ?? keep small decisions on one line.
$status   = $score >= 50 ? 'pass' : 'fail';
$username = $_GET['user'] ?? 'guest';    // default when the key is missing
echo "Status: {$status}, user: {$username}\n";

// == converts types, === does not.
var_dump('5' == 5, '5' === 5);
`,
      "Score 82 -> grade B\nLabel: Good\nStatus: pass, user: guest\nbool(true)\nbool(false)\n"),
    sample("php-loops", "Loops: for, while, foreach", "Basics",
      "The three loops you use every day, plus break and continue.",
      String.raw`<?php
// for: when you know how many times.
for ($i = 1; $i <= 3; $i++) {
    echo "Round {$i}\n";
}

// while: until a condition changes.
$n = 1;
while ($n < 100) {
    $n *= 3;
}
echo "First power of 3 over 100: {$n}\n";

// foreach: the everyday way to walk an array.
$projects = ['Todo App' => 'Laravel', 'Invoice Tool' => 'Symfony'];
foreach ($projects as $name => $framework) {
    echo "- {$name} uses {$framework}\n";
}

// break and continue control the loop.
foreach (range(1, 10) as $number) {
    if ($number % 2 === 0) {
        continue;            // skip even numbers
    }
    if ($number > 7) {
        break;               // stop early
    }
    echo $number, ' ';
}
echo "\n";
`,
      "Round 1\nRound 2\nRound 3\nFirst power of 3 over 100: 243\n- Todo App uses Laravel\n- Invoice Tool uses Symfony\n1 3 5 7 \n"),
    sample("php-errors", "Errors: try / catch / finally", "Basics",
      "Throw your own exceptions, catch PHP errors, and run cleanup code with finally.",
      String.raw`<?php
function divide(int $a, int $b): float
{
    if ($b === 0) {
        throw new InvalidArgumentException('Cannot divide by zero.');
    }
    return $a / $b;
}

foreach ([[10, 4], [5, 0]] as [$a, $b]) {
    try {
        $result = divide($a, $b);            // throws before anything is printed
        echo "{$a} / {$b} = {$result}\n";
    } catch (InvalidArgumentException $e) {
        echo 'Problem: ', $e->getMessage(), "\n";
    } finally {
        echo "(done)\n";          // always runs
    }
}

// PHP's own failures are exceptions too (Error, TypeError, ...).
try {
    echo intdiv(1, 0);
} catch (DivisionByZeroError $e) {
    echo 'Caught: ', $e->getMessage(), "\n";
}
`,
      "10 / 4 = 2.5\n(done)\nProblem: Cannot divide by zero.\n(done)\nCaught: Division by zero\n"),
    sample("php-strings", "String functions", "Strings",
      "Trim, search, replace, slice, split and join: the string toolbox.",
      String.raw`<?php
$text = '  Hello, PHP World!  ';

echo trim($text), "\n";
echo strlen(trim($text)), " characters\n";
echo strtoupper('php'), ' / ', ucfirst('php'), ' / ', ucwords('learn php fast'), "\n";
echo str_replace('World', 'Developer', trim($text)), "\n";
echo substr('A-Code Playground', 2, 3), "\n";

var_dump(str_contains('A-Code Playground', 'Play'), str_starts_with('A-Code Playground', 'A-'));
echo 'Position of P: ', strpos('A-Code Playground', 'P'), "\n";      // 0-based

print_r(explode(',', 'php,sql,js'));
echo implode(' | ', ['php', 'sql', 'js']), "\n";
echo str_pad('7', 3, '0', STR_PAD_LEFT), ' ', strrev('abc'), ' ', str_repeat('-', 5), "\n";

// strlen() counts bytes, so accented letters count double.
// On a server with the mbstring extension (XAMPP has it) use mb_strlen() for characters.
echo strlen('café'), " bytes for 4 letters\n";
`,
      "Hello, PHP World!\n17 characters\nPHP / Php / Learn Php Fast\nHello, PHP Developer!\nCod\nbool(true)\nbool(true)\nPosition of P: 7\nArray\n(\n    [0] => php\n    [1] => sql\n    [2] => js\n)\nphp | sql | js\n007 cba -----\n5 bytes for 4 letters\n"),
    sample("php-format", "Format text & numbers", "Strings",
      "number_format, printf / sprintf padding, and heredoc for multi-line text.",
      String.raw`<?php
$price = 1234.5;
echo number_format($price), "\n";                  // 1,235
echo number_format($price, 2), "\n";               // 1,234.50
echo number_format($price, 2, ',', '.'), "\n";     // 1.234,50

printf("%s scored %d points (%.1f%%)\n", 'Ada', 42, 87.456);
echo sprintf('%05d', 42), ' ', sprintf('%08.3f', 3.14159), "\n";
echo sprintf('%-10s|%10s|', 'left', 'right'), "\n";

// Heredoc: multi-line text with variables inside.
$user = 'Ada';
echo <<<TEXT
Hello {$user},
Your order total is PHP {$price}.
TEXT;
echo "\n";
`,
      "1,235\n1,234.50\n1.234,50\nAda scored 42 points (87.5%)\n00042 0003.142\nleft      |     right|\nHello Ada,\nYour order total is PHP 1234.5.\n"),
    sample("php-regex", "Regular expressions", "Strings",
      "preg_match, capture groups, preg_match_all, replace with a callback, and split.",
      String.raw`<?php
$email = 'ada@example.com';
echo preg_match('/^[\w.+-]+@[\w-]+\.[\w.]+$/', $email) ? "Valid email\n" : "Invalid email\n";

// Capture groups.
if (preg_match('/(\d{4})-(\d{2})-(\d{2})/', 'Due 2026-03-15', $m)) {
    echo "Year {$m[1]}, month {$m[2]}, day {$m[3]}\n";
}

// Find every match.
preg_match_all('/#(\w+)/', 'Learning #php and #sql today', $found);
print_r($found[1]);

// Replace with a callback.
echo preg_replace_callback('/\d+/', fn($x) => $x[0] * 2, 'Buy 3 apples and 12 pears'), "\n";

// Split on a pattern.
print_r(preg_split('/[\s,]+/', 'php, sql  js'));
`,
      "Valid email\nYear 2026, month 03, day 15\nArray\n(\n    [0] => php\n    [1] => sql\n)\nBuy 6 apples and 24 pears\nArray\n(\n    [0] => php\n    [1] => sql\n    [2] => js\n)\n"),
    sample("php-arrays", "Array basics & sorting", "Arrays",
      "Add, find, sort, slice and de-duplicate, including sorting rows by a field.",
      String.raw`<?php
$langs = ['php', 'sql', 'js'];
$langs[] = 'css';                        // append
array_unshift($langs, 'html');           // prepend
echo count($langs), ' items, first: ', $langs[0], ', last: ', end($langs), "\n";

echo in_array('sql', $langs, true) ? "sql is in the list\n" : "missing\n";
echo 'Index of js: ', array_search('js', $langs), "\n";

sort($langs);                            // A-Z
echo implode(', ', $langs), "\n";
rsort($langs);                           // Z-A
echo implode(', ', $langs), "\n";

$people = [['name' => 'Sam', 'age' => 31], ['name' => 'Ada', 'age' => 36], ['name' => 'Lin', 'age' => 24]];
usort($people, fn($a, $b) => $a['age'] <=> $b['age']);      // youngest first
echo implode(', ', array_column($people, 'name')), "\n";

print_r(array_slice([10, 20, 30, 40], 1, 2));
print_r(array_unique([1, 2, 2, 3, 3, 3]));
`,
      "5 items, first: html, last: css\nsql is in the list\nIndex of js: 3\ncss, html, js, php, sql\nsql, php, js, html, css\nLin, Sam, Ada\nArray\n(\n    [0] => 20\n    [1] => 30\n)\nArray\n(\n    [0] => 1\n    [1] => 2\n    [3] => 3\n)\n"),
    sample("php-array-functional", "map, filter, reduce", "Arrays",
      "Transform, filter and total an array without writing a loop.",
      String.raw`<?php
$prices = [10, 25, 40, 5];

$withTax = array_map(fn($p) => round($p * 1.12, 2), $prices);
$big     = array_filter($prices, fn($p) => $p >= 10);
$total   = array_reduce($prices, fn($sum, $p) => $sum + $p, 0);

echo 'With tax: ', implode(', ', $withTax), "\n";
echo 'Big only: ', implode(', ', $big), "\n";
echo 'Total:    ', $total, ' (array_sum says ', array_sum($prices), ")\n";
echo 'Max/min:  ', max($prices), ' / ', min($prices), "\n";

// array_filter keeps the original keys. Re-index when you need 0, 1, 2...
print_r(array_values($big));

// With no callback, array_filter drops falsy values.
$stock   = ['apple' => 3, 'pear' => 0, 'plum' => 7];
$inStock = array_keys(array_filter($stock));
echo 'In stock: ', implode(', ', $inStock), "\n";
`,
      "With tax: 11.2, 28, 44.8, 5.6\nBig only: 10, 25, 40\nTotal:    80 (array_sum says 80)\nMax/min:  40 / 5\nArray\n(\n    [0] => 10\n    [1] => 25\n    [2] => 40\n)\nIn stock: apple, plum\n"),
    sample("php-array-group", "Group, count & merge", "Arrays",
      "Group rows by a key, count values, merge settings and check keys safely.",
      String.raw`<?php
$projects = [
    ['name' => 'Todo App',     'tech' => 'Laravel'],
    ['name' => 'Invoice Tool', 'tech' => 'Symfony'],
    ['name' => 'Blog Engine',  'tech' => 'Laravel'],
    ['name' => 'Chat App',     'tech' => 'Native PHP'],
    ['name' => 'Store',        'tech' => 'Laravel'],
];

// Group rows by a key.
$byTech = [];
foreach ($projects as $p) {
    $byTech[$p['tech']][] = $p['name'];
}
foreach ($byTech as $tech => $names) {
    echo str_pad($tech, 11), count($names), ': ', implode(', ', $names), "\n";
}

// Count values in one call.
$counts = array_count_values(array_column($projects, 'tech'));
arsort($counts);                          // biggest first, keeps keys
echo 'Most used: ', array_key_first($counts), "\n";

// Merge defaults with overrides, then check keys.
$settings = array_merge(['theme' => 'light', 'lang' => 'en'], ['theme' => 'dark']);
echo "theme={$settings['theme']} lang={$settings['lang']}\n";
var_dump(array_key_exists('lang', $settings), isset($settings['font']));
`,
      "Laravel    3: Todo App, Blog Engine, Store\nSymfony    1: Invoice Tool\nNative PHP 1: Chat App\nMost used: Laravel\ntheme=dark lang=en\nbool(true)\nbool(false)\n"),
    sample("php-functions", "Functions, types & named args", "Functions",
      "Default values, named arguments, variadics, multiple returns, references and type errors.",
      String.raw`<?php
function greet(string $name, string $greeting = 'Hello', bool $shout = false): string
{
    $text = "{$greeting}, {$name}!";
    return $shout ? strtoupper($text) : $text;
}

echo greet('Ada'), "\n";
echo greet('Ada', 'Welcome'), "\n";
echo greet(name: 'Ada', shout: true), "\n";       // named arguments (PHP 8+)

// Variadic: any number of arguments.
function total(int|float ...$numbers): int|float
{
    return array_sum($numbers);
}
echo total(1, 2, 3.5), "\n";

// Return several values as an array and unpack them.
function minMax(array $list): array
{
    return [min($list), max($list)];
}
[$low, $high] = minMax([4, 9, 2]);
echo "low={$low} high={$high}\n";

// By reference: the function changes the caller's variable.
function addOne(int &$n): void { $n++; }
$counter = 5;
addOne($counter);
echo "counter={$counter}\n";

// Nullable types, and what a wrong type does.
function shorten(?string $s): string { return $s === null ? '(none)' : substr($s, 0, 3); }
echo shorten(null), ' ', shorten('Developer'), "\n";
try {
    echo greet([]);
} catch (TypeError $e) {
    echo "TypeError caught\n";
}
`,
      "Hello, Ada!\nWelcome, Ada!\nHELLO, ADA!\n6.5\nlow=2 high=9\ncounter=6\n(none) Dev\nTypeError caught\n"),
    sample("php-closures", "Closures & arrow functions", "Functions",
      "Anonymous functions, use (), arrow functions, functions that return functions, callables.",
      String.raw`<?php
$taxRate = 0.12;

// A closure needs "use" to see outside variables.
$addTax = function (float $price) use ($taxRate): float {
    return round($price * (1 + $taxRate), 2);
};
echo $addTax(100), "\n";

// An arrow function captures outside variables automatically.
$double = fn($n) => $n * 2;
echo implode(', ', array_map($double, [1, 2, 3])), "\n";

// Functions can return functions.
function multiplier(int $factor): Closure
{
    return fn($n) => $n * $factor;
}
$triple = multiplier(3);
echo $triple(7), "\n";

// Pass a function as an argument.
function applyTwice(callable $fn, $value)
{
    return $fn($fn($value));
}
echo applyTwice('strrev', 'abc'), ' ', applyTwice($double, 5), "\n";
`,
      "112\n2, 4, 6\n21\nabc 20\n"),
    sample("php-recursion", "Recursion, static & memo", "Functions",
      "A function that calls itself, static variables, and caching results with ??=.",
      String.raw`<?php
function factorial(int $n): int
{
    return $n <= 1 ? 1 : $n * factorial($n - 1);
}
echo 'factorial(5) = ', factorial(5), "\n";

// Walk a nested array of any depth.
function flatten(array $items): array
{
    $flat = [];
    foreach ($items as $item) {
        $flat = array_merge($flat, is_array($item) ? flatten($item) : [$item]);
    }
    return $flat;
}
$menu = ['Home', ['Docs', ['Install', 'Usage']], 'Blog'];
echo implode(' > ', flatten($menu)), "\n";

// static keeps a value between calls.
function nextId(): int
{
    static $id = 0;
    return ++$id;
}
echo nextId(), nextId(), nextId(), "\n";

// Memoise a slow recursive function.
function fib(int $n, array &$memo = []): int
{
    if ($n < 2) {
        return $n;
    }
    return $memo[$n] ??= fib($n - 1, $memo) + fib($n - 2, $memo);
}
echo 'fib(30) = ', fib(30), "\n";
`,
      "factorial(5) = 120\nHome > Docs > Install > Usage > Blog\n123\nfib(30) = 832040\n"),
    sample("php-classes", "Classes & properties", "OOP",
      "Constructor promotion, readonly, method chaining and static factory methods.",
      String.raw`<?php
class Project
{
    private array $tasks = [];

    // Constructor promotion (PHP 8): declares and sets the properties.
    public function __construct(
        public readonly string $name,
        public string $tech = 'Native PHP',
    ) {}

    public function addTask(string $title): static
    {
        $this->tasks[] = $title;
        return $this;                        // lets calls chain
    }

    public function summary(): string
    {
        return sprintf('%s (%s): %d task(s)', $this->name, $this->tech, count($this->tasks));
    }

    public static function fromArray(array $row): static
    {
        return new static($row['name'], $row['tech'] ?? 'Native PHP');
    }
}

$p = new Project('Checkout redesign', 'Laravel');
$p->addTask('Wireframes')->addTask('Build form');
echo $p->summary(), "\n";

echo Project::fromArray(['name' => 'Todo App'])->summary(), "\n";

try {
    $p->name = 'Changed';                    // readonly: not allowed
} catch (Error $e) {
    echo 'Error: ', $e->getMessage(), "\n";
}
`,
      "Checkout redesign (Laravel): 2 task(s)\nTodo App (Native PHP): 0 task(s)\nError: Cannot modify readonly property Project::$name\n"),
    sample("php-inheritance", "Inheritance & interfaces", "OOP",
      "Abstract classes, interfaces, extends, parent:: and instanceof.",
      String.raw`<?php
interface Exportable
{
    public function export(): string;
}

abstract class Report implements Exportable
{
    public function __construct(protected string $title) {}

    abstract protected function body(): string;

    public function export(): string
    {
        return strtoupper($this->title) . "\n" . $this->body();
    }
}

class SalesReport extends Report
{
    protected function body(): string
    {
        return 'Sales are up 12%.';
    }
}

class BugReport extends Report
{
    public function __construct(private int $open)
    {
        parent::__construct('Bug report');
    }

    protected function body(): string
    {
        return "{$this->open} open bugs.";
    }
}

$reports = [new SalesReport('Q1 sales'), new BugReport(4)];
foreach ($reports as $report) {
    echo $report->export(), "\n\n";
}
var_dump($reports[0] instanceof Exportable);
`,
      "Q1 SALES\nSales are up 12%.\n\nBUG REPORT\n4 open bugs.\n\nbool(true)\n"),
    sample("php-enums-traits", "Enums & traits", "OOP",
      "Backed enums with methods, from() / tryFrom(), and sharing code with a trait.",
      String.raw`<?php
enum Status: string
{
    case Draft     = 'draft';
    case Published = 'published';

    public function label(): string
    {
        return ucfirst($this->value);
    }
}

echo Status::from('draft')->label(), "\n";
echo Status::tryFrom('archived')?->label() ?? 'unknown status', "\n";
echo implode(', ', array_map(fn(Status $s) => $s->name, Status::cases())), "\n";

// A trait shares methods between unrelated classes.
trait Timestamps
{
    public function stamp(): string
    {
        return static::class . ' created at ' . $this->createdAt;
    }
}

class Note
{
    use Timestamps;

    public function __construct(public string $createdAt = '2026-03-15') {}
}
echo (new Note())->stamp(), "\n";
`,
      "Draft\nunknown status\nDraft, Published\nNote created at 2026-03-15\n"),
    sample("php-json", "JSON encode & decode", "Data",
      "json_encode, pretty printing, json_decode as array or object, and handling bad JSON.",
      String.raw`<?php
$project = ['id' => 1, 'name' => 'Todo App', 'tags' => ['php', 'api'], 'active' => true, 'owner' => null];

$json = json_encode($project);
echo $json, "\n\n";
echo json_encode($project, JSON_PRETTY_PRINT), "\n\n";

$back = json_decode($json, true);               // true = associative array
echo $back['name'], ' has ', count($back['tags']), " tags\n";

$obj = json_decode($json);                      // without true = object
echo $obj->owner === null ? "owner is null\n" : "has owner\n";

// Always check for bad JSON.
json_decode('{name: "x"}', true);
echo json_last_error() === JSON_ERROR_NONE ? "ok\n" : 'JSON error: ' . json_last_error_msg() . "\n";

try {
    json_decode('{oops', false, 512, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    echo 'Exception: ', $e->getMessage(), "\n";
}
`,
      "{\"id\":1,\"name\":\"Todo App\",\"tags\":[\"php\",\"api\"],\"active\":true,\"owner\":null}\n\n{\n    \"id\": 1,\n    \"name\": \"Todo App\",\n    \"tags\": [\n        \"php\",\n        \"api\"\n    ],\n    \"active\": true,\n    \"owner\": null\n}\n\nTodo App has 2 tags\nowner is null\nJSON error: Syntax error\nException: Syntax error\n"),
    sample("php-dates", "Dates & time", "Data",
      "DateTimeImmutable, formatting, modify, diff, DatePeriod and timestamps.",
      String.raw`<?php
date_default_timezone_set('UTC');

$start = new DateTimeImmutable('2026-03-15 09:30');
echo $start->format('D, d M Y H:i'), "\n";
echo $start->format('Y-m-d'), ' | ', $start->format('l jS \o\f F'), "\n";

$due = $start->modify('+10 days');               // returns a new object
echo 'Due: ', $due->format('M j'), "\n";

$diff = $start->diff(new DateTimeImmutable('2026-04-01'));
echo "Days until April 1: {$diff->days}\n";

// Loop over a range of dates.
foreach (new DatePeriod($start, new DateInterval('P1D'), 3) as $day) {
    echo $day->format('D d'), '  ';
}
echo "\n";

// Timestamps and parsing.
echo date('Y-m-d', 86400 * 365), "\n";           // 1971-01-01
echo strtotime('2026-03-15 00:00:00 UTC'), "\n";
var_dump(DateTime::createFromFormat('d/m/Y', '31/12/2026') !== false);
`,
      "Sun, 15 Mar 2026 09:30\n2026-03-15 | Sunday 15th of March\nDue: Mar 25\nDays until April 1: 16\nSun 15  Mon 16  Tue 17  Wed 18  \n1971-01-01\n1773532800\nbool(true)\n"),
    sample("php-files", "Read & write files", "Data",
      "file_put_contents, file_get_contents, fopen loops, CSV and cleaning up.",
      String.raw`<?php
$file = sys_get_temp_dir() . '/acodeplayground-demo.txt';

file_put_contents($file, "first line\nsecond line\n");          // create / overwrite
file_put_contents($file, "third line\n", FILE_APPEND);          // add to the end

echo file_exists($file) ? "File exists\n" : "Missing\n";
echo 'Size: ', filesize($file), " bytes\n";
echo file_get_contents($file);

foreach (file($file, FILE_IGNORE_NEW_LINES) as $number => $line) {
    echo $number + 1, ': ', $line, "\n";
}

// Read a big file line by line without loading it all.
$handle = fopen($file, 'r');
while (($line = fgets($handle)) !== false) {
    echo strlen(trim($line)), ' ';
}
fclose($handle);
echo "\n";

// CSV out and back in.
$csv = fopen('php://memory', 'w+');
fputcsv($csv, ['name', 'tech'], ',', '"', '');
fputcsv($csv, ['Todo App', 'Laravel'], ',', '"', '');
rewind($csv);
while (($row = fgetcsv($csv, null, ',', '"', '')) !== false) {
    echo implode(' | ', $row), "\n";
}
fclose($csv);

unlink($file);
echo file_exists($file) ? "Still there\n" : "Deleted\n";
`,
      "File exists\nSize: 34 bytes\nfirst line\nsecond line\nthird line\n1: first line\n2: second line\n3: third line\n10 11 10 \nname | tech\nTodo App | Laravel\nDeleted\n"),
    sample("php-validate", "Validate form input", "Forms",
      "Trim, check and filter user input with filter_var and collect errors per field.",
      String.raw`<?php
// In a real page this is $_POST. A plain array behaves the same way.
$input = ['name' => '  Ada  ', 'email' => 'ada@example', 'age' => '17', 'website' => 'https://example.com'];

function validate(array $in): array
{
    $errors = [];

    $name = trim($in['name'] ?? '');
    if ($name === '' || strlen($name) > 50) {
        $errors['name'] = 'Name is required (max 50 characters).';
    }

    if (!filter_var($in['email'] ?? '', FILTER_VALIDATE_EMAIL)) {
        $errors['email'] = 'Enter a valid email address.';
    }

    $age = filter_var($in['age'] ?? '', FILTER_VALIDATE_INT, ['options' => ['min_range' => 18, 'max_range' => 120]]);
    if ($age === false) {
        $errors['age'] = 'Age must be a number from 18 to 120.';
    }

    if (!empty($in['website']) && !filter_var($in['website'], FILTER_VALIDATE_URL)) {
        $errors['website'] = 'Enter a full URL.';
    }

    return $errors;
}

foreach (validate($input) as $field => $message) {
    echo "{$field}: {$message}\n";
}

// Fix the input and try again.
$input['email'] = 'ada@example.com';
$input['age']   = '36';
echo validate($input) ? "Still has errors\n" : "Second try: all good\n";
`,
      "email: Enter a valid email address.\nage: Age must be a number from 18 to 120.\nSecond try: all good\n"),
    sample("php-escape", "Escape output & hash passwords", "Forms",
      "htmlspecialchars against XSS, urlencode, password_hash / password_verify.",
      String.raw`<?php
$comment = '<script>alert("hi")</script> Nice post & thanks';

// Never print user input raw into HTML.
echo htmlspecialchars($comment, ENT_QUOTES, 'UTF-8'), "\n\n";

function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}
echo '<p>' . e($comment) . "</p>\n";
echo '<a href="?q=' . urlencode('php & sql') . '">search</a>' . "\n\n";

// Passwords: store a hash, never the password.
$hash = password_hash('secret123', PASSWORD_DEFAULT);
echo strlen($hash) >= 60 ? "Hash created\n" : "Short hash\n";
var_dump(password_verify('secret123', $hash), password_verify('wrong', $hash));

// Cleaning values.
echo strip_tags('<b>Bold</b> text'), ' | ', (int) '12abc', "\n";
`,
      "&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt; Nice post &amp; thanks\n\n<p>&lt;script&gt;alert(&quot;hi&quot;)&lt;/script&gt; Nice post &amp; thanks</p>\n<a href=\"?q=php+%26+sql\">search</a>\n\nHash created\nbool(true)\nbool(false)\nBold text | 12\n")
  ];
})();
