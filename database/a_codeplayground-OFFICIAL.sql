-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Sep 23, 2026 at 02:18 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `a_codeplayground`
--

-- --------------------------------------------------------

--
-- Table structure for table `gdrive_links`
--

CREATE TABLE `gdrive_links` (
  `user_id` varchar(32) NOT NULL,
  `google_email` varchar(255) DEFAULT NULL,
  `refresh_token_enc` text NOT NULL,
  `folder_id` varchar(128) DEFAULT NULL,
  `auto_sync` tinyint(1) NOT NULL DEFAULT 0,
  `last_sync_at` datetime DEFAULT NULL,
  `last_hash` varchar(64) DEFAULT NULL,
  `last_file` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `gdrive_links`
--

INSERT INTO `gdrive_links` (`user_id`, `google_email`, `refresh_token_enc`, `folder_id`, `auto_sync`, `last_sync_at`, `last_hash`, `last_file`, `created_at`) VALUES
('u_eefe9f2fe470ae4c', 'akshaz.masteh@gmail.com', 'QETxCxluiZSkfYSNHLveVbYEJoXvHVSqgLHHf6SLn5JvFDSSqSR5YfvS9+xDpd+aP3OsoaO0YJKDjW675tmmabuI2rYpxP8maZarDeLDOr7tSDS5NbO8p5Rxa6qBW4FZtWs2ZCN9bfab4QeHe5yer2uphnZRbHJ5nzCBPiMj8h0SXsI=', '1vj1GxjxwmAOOwwhDBjl8x7hYg2FHUOWP', 0, '2026-09-22 05:00:55', '4b8733b019c4e9756b5d66c4e7222f6f2b11133a6d2f099a4634c14b78ed463e', 'a-codeplayground-backup-2026-09-22_050053.json', '2026-09-22 02:30:16');

-- --------------------------------------------------------

--
-- Table structure for table `notes`
--

CREATE TABLE `notes` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` varchar(32) NOT NULL,
  `title` varchar(190) NOT NULL,
  `body` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notes`
--

INSERT INTO `notes` (`id`, `user_id`, `title`, `body`, `created_at`, `updated_at`) VALUES
(1789896388762, 'u_eefe9f2fe470ae4c', 'BEST WAY', 'we', '2026-09-20 17:26:28', '2026-09-20 17:26:28'),
(1789896912155, 'u_eefe9f2fe470ae4c', 'Untitled Note', 'ddadada\nd\na\nda\nd\nad\nadadadadada', '2026-09-20 17:35:12', '2026-09-20 17:35:12');

-- --------------------------------------------------------

--
-- Table structure for table `points`
--

CREATE TABLE `points` (
  `user_id` varchar(32) NOT NULL,
  `total` int(11) NOT NULL DEFAULT 0,
  `streak` int(11) NOT NULL DEFAULT 0,
  `last_claim_date` date DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `points`
--

INSERT INTO `points` (`user_id`, `total`, `streak`, `last_claim_date`, `updated_at`) VALUES
('u_eefe9f2fe470ae4c', 54, 4, '2026-09-23', '2026-09-23 07:43:41');

-- --------------------------------------------------------

--
-- Table structure for table `projects`
--

CREATE TABLE `projects` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` varchar(32) NOT NULL,
  `name` varchar(190) NOT NULL,
  `tech` varchar(190) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `projects`
--

INSERT INTO `projects` (`id`, `user_id`, `name`, `tech`, `description`, `created_at`, `updated_at`) VALUES
(1789517160686, 'u_eefe9f2fe470ae4c', 'TESTING DATA', 'Full Stock', 'Test', '2026-09-16 08:06:00', '2026-09-16 08:06:00');

-- --------------------------------------------------------

--
-- Table structure for table `snippets`
--

CREATE TABLE `snippets` (
  `id` varchar(64) NOT NULL,
  `user_id` varchar(32) NOT NULL,
  `title` varchar(190) NOT NULL,
  `lang` varchar(64) DEFAULT NULL,
  `code` longtext DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `snippets`
--

INSERT INTO `snippets` (`id`, `user_id`, `title`, `lang`, `code`, `created_at`, `updated_at`) VALUES
('component-button-group', 'u_eefe9f2fe470ae4c', 'Segmented control', 'HTML + CSS', '<style>\n:root{--bg:#f7f7f8;--surface:#fff;--surface2:#f2f3f4;--text:#111214;--muted:#6b7177;--border:#e3e5e8;--accent:#111214;--accent-ink:#fff;--danger:#c0392b;--success:#2d8a42;--radius:12px}\n*{box-sizing:border-box}body{margin:0;padding:22px;background:var(--bg);color:var(--text);font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}h1,h2,h3,p{margin:0 0 8px}\n</style>\n<div class=\"seg\" role=\"tablist\" aria-label=\"View\">\n  <span class=\"seg-ind\" aria-hidden=\"true\"></span>\n  <button role=\"tab\" aria-selected=\"true\">Grid</button>\n  <button role=\"tab\" aria-selected=\"false\">List</button>\n  <button role=\"tab\" aria-selected=\"false\">Table</button>\n</div>\n<style>\n.seg{position:relative;display:inline-flex;padding:4px;gap:2px;background:var(--surface2);\n  border:1px solid var(--border);border-radius:11px}\n.seg button{position:relative;z-index:2;border:0;background:transparent;color:var(--muted);\n  padding:8px 18px;border-radius:8px;font-weight:650;transition:color .15s ease}\n.seg button[aria-selected=\"true\"]{color:var(--text)}\n.seg-ind{position:absolute;z-index:1;top:4px;bottom:4px;border-radius:8px;background:var(--surface);\n  box-shadow:0 1px 3px rgba(0,0,0,.12);transition:transform .25s cubic-bezier(.22,.61,.36,1),width .25s}\n</style>\n<script>\n(function(){\n  var seg=document.querySelector(\".seg\"),ind=seg.querySelector(\".seg-ind\");\n  var tabs=[].slice.call(seg.querySelectorAll(\"button\"));\n  function move(el){ind.style.width=el.offsetWidth+\"px\";ind.style.transform=\"translateX(\"+(el.offsetLeft-4)+\"px)\"}\n  tabs.forEach(function(t){t.addEventListener(\"click\",function(){\n    tabs.forEach(function(x){x.setAttribute(\"aria-selected\",x===t)});move(t)})});\n  move(tabs[0]);\n})();\n</script>', '2026-09-16 08:05:26', '2026-09-16 08:05:26'),
('component-buttons', 'u_eefe9f2fe470ae4c', 'Buttons', 'HTML + CSS', '<style>\n:root{--bg:#f7f7f8;--surface:#fff;--surface2:#f2f3f4;--text:#111214;--muted:#6b7177;--border:#e3e5e8;--accent:#111214;--accent-ink:#fff;--danger:#c0392b;--success:#2d8a42;--radius:12px}\n*{box-sizing:border-box}body{margin:0;padding:22px;background:var(--bg);color:var(--text);font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,\"Segoe UI\",sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}h1,h2,h3,p{margin:0 0 8px}\n</style>\n<div class=\"row\">\n  <button class=\"btn primary\">Save changes</button>\n  <button class=\"btn\">Cancel</button>\n  <button class=\"btn danger\">Delete</button>\n  <button class=\"btn\" disabled>Unavailable</button>\n</div>\n<style>\n.row{display:flex;flex-wrap:wrap;gap:10px}\n.btn{display:inline-flex;align-items:center;gap:7px;padding:10px 15px;border-radius:9px;\n  border:1px solid var(--border);background:var(--surface);color:var(--text);font-weight:650;\n  transition:background .15s ease,border-color .15s ease,transform .06s ease}\n.btn:hover{background:var(--surface2)}\n.btn:active{transform:translateY(1px)}\n.btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}\n.btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}\n.btn.primary:hover{opacity:.9}\n.btn.danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 35%,var(--border))}\n.btn[disabled]{opacity:.45;cursor:not-allowed}\n</style>', '2026-09-16 08:05:20', '2026-09-21 08:33:57'),
('starter-dashboard', 'u_eefe9f2fe470ae4c', 'Admin Dashboard Layout', 'HTML + CSS', '<div class=\"demo-shell\"><header class=\"demo-nav\"><b>A-Code Playground</b><span>Dashboard · Projects · Settings</span></header><aside class=\"demo-side\"><b>Workspace</b><a class=\"active\">Dashboard</a><a>Projects</a><a>Snippets</a><a>Settings</a></aside><main class=\"demo-main\"><span class=\"eyebrow\">WORKSPACE</span><h1>Admin Dashboard</h1><p>Responsive starter layout.</p><div class=\"demo-stats\"><article><b>24</b><span>Projects</span></article><article><b>18</b><span>Snippets</span></article><article><b>92%</b><span>Progress</span></article></div></main></div>\n<style>\nbody{margin:0;background:#f4f6f8;font:14px system-ui;color:#15171a}.demo-shell{min-height:100vh}.demo-nav{height:58px;background:#fff;border-bottom:1px solid #e2e5e8;display:flex;align-items:center;padding:0 22px;gap:25px}.demo-nav span{color:#68707a}.demo-side{position:absolute;top:58px;bottom:0;width:190px;background:#fff;border-right:1px solid #e2e5e8;padding:20px}.demo-side a,.demo-side b{display:block;padding:10px;border-radius:8px}.demo-side b{font-size:11px;text-transform:uppercase;color:#8a9198}.demo-side .active{background:#f1f3f5;font-weight:700}.demo-main{margin-left:230px;padding:38px}.eyebrow{font-size:10px;font-weight:800;letter-spacing:.12em;color:#737b83}.demo-main h1{font-size:34px;margin:8px 0}.demo-main p{color:#68707a}.demo-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:28px}.demo-stats article{background:#fff;border:1px solid #e2e5e8;border-radius:14px;padding:20px}.demo-stats b{font-size:28px;display:block}.demo-stats span{color:#68707a}@media(max-width:700px){.demo-side{position:static;width:auto;border-right:0}.demo-main{margin:0}.demo-stats{grid-template-columns:1fr}}\n</style>', '2026-09-22 10:41:27', '2026-09-22 10:41:27'),
('starter-modal', 'u_eefe9f2fe470ae4c', 'JavaScript Modal Pattern', 'HTML + JS', '<button class=\"open\" onclick=\"openDialog()\">Open interactive modal</button><div id=\"dialog\" class=\"backdrop\" hidden><div class=\"dialog\" role=\"dialog\" aria-modal=\"true\"><button class=\"x\" onclick=\"closeDialog()\">×</button><span>CONFIRMATION</span><h2>Delete project?</h2><p>This is a working modal example. Try the buttons.</p><div><button onclick=\"closeDialog()\">Cancel</button><button class=\"danger\" onclick=\"closeDialog();document.getElementById(\'msg\').textContent=\'Action completed.\'\">Confirm</button></div></div></div><p id=\"msg\"></p><style>body{margin:0;min-height:100vh;display:grid;place-items:center;font:14px system-ui;background:#f4f6f8}.open,.dialog button{border:0;border-radius:9px;padding:11px 16px;background:#15171a;color:#fff;font-weight:700}.backdrop{position:fixed;inset:0;background:#0008;display:grid;place-items:center;padding:20px}.dialog{position:relative;width:min(430px,100%);background:#fff;border-radius:18px;padding:28px;box-shadow:0 25px 80px #0005}.dialog span{font-size:10px;font-weight:800;color:#68707a;letter-spacing:.1em}.dialog h2{margin:8px 0}.dialog p{color:#68707a;line-height:1.6}.dialog>div{display:flex;justify-content:flex-end;gap:8px}.dialog .danger{background:#c83b32}.x{position:absolute;right:12px;top:12px!important;padding:5px 10px!important;background:#eef0f2!important;color:#15171a!important}</style><script>function openDialog(){document.getElementById(\'dialog\').hidden=false}function closeDialog(){document.getElementById(\'dialog\').hidden=true}</script>', '2026-09-16 08:01:03', '2026-09-16 08:05:00'),
('starter-navbar', 'u_eefe9f2fe470ae4c', 'Responsive Navigation Pattern', 'HTML + CSS + JS', '<nav class=\"nav\" id=\"nav\"><b>DevTool</b><div class=\"links\"><a href=\"#\">Home</a><a href=\"#\">Projects</a><a href=\"#\">Docs</a></div><button onclick=\"toggleNav()\" aria-expanded=\"false\">Menu</button></nav><main><h1>Responsive navigation</h1><p>Resize the preview and use Menu to test the mobile state.</p></main><style>body{margin:0;font:14px system-ui;background:#f6f7f9;color:#15171a}.nav{height:62px;padding:0 25px;background:#fff;border-bottom:1px solid #e2e5e8;display:flex;align-items:center;gap:25px}.links{display:flex;gap:18px;margin-left:auto}.links a{text-decoration:none;color:#68707a}.nav button{display:none;border:0;background:#15171a;color:#fff;padding:9px 12px;border-radius:8px}main{max-width:800px;margin:90px auto;padding:20px}main p{color:#68707a}@media(max-width:600px){.nav button{display:block;margin-left:auto}.links{display:none}.nav.responsive{height:auto;min-height:62px;flex-wrap:wrap;padding-bottom:14px}.nav.responsive .links{display:flex;order:3;width:100%;flex-direction:column}}\n</style><script>function toggleNav(){const n=document.getElementById(\'nav\');n.classList.toggle(\'responsive\');document.querySelector(\'.nav button\').setAttribute(\'aria-expanded\',n.classList.contains(\'responsive\'))}</script>', '2026-09-16 08:05:05', '2026-09-16 08:05:05'),
('starter-table', 'u_40bb5953d803b247', 'Responsive Data Table', 'HTML + CSS', '<section class=\"table-wrap\"><div class=\"table-head\"><div><span>PROJECTS</span><h1>Recent work</h1></div><button>Export</button></div><div class=\"scroll\"><table><thead><tr><th>Project</th><th>Owner</th><th>Status</th><th>Updated</th></tr></thead><tbody><tr><td>Client Portal</td><td>Admin</td><td><em>Active</em></td><td>Today</td></tr><tr><td>Billing System</td><td>Team</td><td><em>Review</em></td><td>Yesterday</td></tr><tr><td>Landing Page</td><td>Design</td><td><em>Draft</em></td><td>2 days ago</td></tr></tbody></table></div></section><style>body{margin:0;background:#f5f6f8;font:13px system-ui;color:#15171a}.table-wrap{margin:30px auto;max-width:850px;background:#fff;border:1px solid #e1e5e9;border-radius:16px;overflow:hidden}.table-head{display:flex;justify-content:space-between;align-items:center;padding:22px;border-bottom:1px solid #e1e5e9}.table-head span{font-size:10px;font-weight:800;color:#68707a}.table-head h1{margin:4px 0 0;font-size:24px}.table-head button{border:0;background:#15171a;color:#fff;padding:10px 14px;border-radius:8px}.scroll{overflow:auto}table{width:100%;min-width:620px;border-collapse:collapse}th,td{text-align:left;padding:14px 20px;border-bottom:1px solid #edf0f2}th{font-size:10px;text-transform:uppercase;color:#68707a;background:#fafbfc}em{font-style:normal;border:1px solid #dce1e5;border-radius:20px;padding:4px 8px;font-size:11px}</style>', '2026-09-16 06:48:49', '2026-09-16 06:51:06'),
('starter-table', 'u_eefe9f2fe470ae4c', 'Responsive Data Table', 'HTML + CSS', '<section class=\"table-wrap\"><div class=\"table-head\"><div><span>PROJECTS</span><h1>Recent work</h1></div><button>Export</button></div><div class=\"scroll\"><table><thead><tr><th>Project</th><th>Owner</th><th>Status</th><th>Updated</th></tr></thead><tbody><tr><td>Client Portal</td><td>Admin</td><td><em>Active</em></td><td>Today</td></tr><tr><td>Billing System</td><td>Team</td><td><em>Review</em></td><td>Yesterday</td></tr><tr><td>Landing Page</td><td>Design</td><td><em>Draft</em></td><td>2 days ago</td></tr></tbody></table></div></section><style>body{margin:0;background:#f5f6f8;font:13px system-ui;color:#15171a}.table-wrap{margin:30px auto;max-width:850px;background:#fff;border:1px solid #e1e5e9;border-radius:16px;overflow:hidden}.table-head{display:flex;justify-content:space-between;align-items:center;padding:22px;border-bottom:1px solid #e1e5e9}.table-head span{font-size:10px;font-weight:800;color:#68707a}.table-head h1{margin:4px 0 0;font-size:24px}.table-head button{border:0;background:#15171a;color:#fff;padding:10px 14px;border-radius:8px}.scroll{overflow:auto}table{width:100%;min-width:620px;border-collapse:collapse}th,td{text-align:left;padding:14px 20px;border-bottom:1px solid #edf0f2}th{font-size:10px;text-transform:uppercase;color:#68707a;background:#fafbfc}em{font-style:normal;border:1px solid #dce1e5;border-radius:20px;padding:4px 8px;font-size:11px}</style>', '2026-09-16 08:04:44', '2026-09-16 08:05:31');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` varchar(32) NOT NULL,
  `name` varchar(190) NOT NULL,
  `first_name` varchar(80) DEFAULT NULL,
  `middle_name` varchar(80) DEFAULT NULL,
  `last_name` varchar(80) DEFAULT NULL,
  `username` varchar(30) DEFAULT NULL,
  `email` varchar(190) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `pending_password_hash` varchar(255) DEFAULT NULL,
  `password_change_code_hash` varchar(64) DEFAULT NULL,
  `password_change_code_expires` datetime DEFAULT NULL,
  `password_change_attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `password_change_requested_at` datetime DEFAULT NULL,
  `oauth_provider` varchar(20) DEFAULT NULL,
  `oauth_id` varchar(190) DEFAULT NULL,
  `expertise_level` enum('beginner','intermediate','professional') DEFAULT NULL,
  `expertise_set_at` datetime DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `joined_at` datetime NOT NULL DEFAULT current_timestamp(),
  `bio` varchar(280) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `address` varchar(190) DEFAULT NULL,
  `barangay` varchar(120) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `country` varchar(80) DEFAULT NULL,
  `hobbies` varchar(255) DEFAULT NULL,
  `skills` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `first_name`, `middle_name`, `last_name`, `username`, `email`, `password_hash`, `pending_password_hash`, `password_change_code_hash`, `password_change_code_expires`, `password_change_attempts`, `password_change_requested_at`, `oauth_provider`, `oauth_id`, `expertise_level`, `expertise_set_at`, `role`, `joined_at`, `bio`, `location`, `address`, `barangay`, `city`, `country`, `hobbies`, `skills`) VALUES
('u_40bb5953d803b247', 'sadmin1', 'sadmin1', NULL, '', NULL, 'haroldniegos01@gmail.com', '$2y$10$4wEnEQ3QLSgD3ojd8P/SCOpqm8PGD/5O.OmsOZbd.DenVUtDXFza6', NULL, NULL, NULL, 0, NULL, NULL, NULL, 'beginner', '2026-09-16 08:04:26', 'user', '2026-09-15 09:49:33', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('u_77c395878e11dbd2', 'harvey niegos', 'harvey', NULL, 'niegos', NULL, 'harveyniegos85@gmail.com', NULL, NULL, NULL, NULL, 0, NULL, 'google', '113517525225254490693', 'beginner', '2026-09-21 17:22:12', 'user', '2026-09-21 17:17:43', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
('u_eefe9f2fe470ae4c', 'Aron Niegos', 'Aron', NULL, 'Niegos', 'sadmin', 'akshaz.masteh@gmail.com', '$2y$10$rMCJHhtOdODZ88olnFlEKOKLtpMHifegYE4zTsWwV4tuCuaWdOaWS', NULL, NULL, NULL, 0, NULL, 'github', '92050792', 'beginner', '2026-09-23 08:14:33', 'admin', '2026-09-14 17:05:36', 'Just have a coffee!', 'Batasan Hills, Quezon City, Philippines', NULL, 'Batasan Hills', 'Quezon City', 'Philippines', 'Gaming, Music', '[{\"name\":\"HTML5 \\/ CSS3\",\"level\":\"intermediate\"},{\"name\":\"PHP\",\"level\":\"intermediate\"},{\"name\":\"JavaScript\",\"level\":\"intermediate\"},{\"name\":\"MySQL\",\"level\":\"intermediate\"}]');

-- --------------------------------------------------------

--
-- Table structure for table `xp_ledger`
--

CREATE TABLE `xp_ledger` (
  `user_id` varchar(32) NOT NULL,
  `action_key` varchar(96) NOT NULL,
  `xp` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `xp_ledger`
--

INSERT INTO `xp_ledger` (`user_id`, `action_key`, `xp`, `created_at`) VALUES
('u_eefe9f2fe470ae4c', 'copy-snippet:1jxorf5jnx1sv12y', 2, '2026-09-21 05:01:54'),
('u_eefe9f2fe470ae4c', 'delete:186m98e14f4c8eq', 2, '2026-09-21 04:52:40'),
('u_eefe9f2fe470ae4c', 'delete:1h4cw7j14icupbv', 2, '2026-09-21 04:52:39'),
('u_eefe9f2fe470ae4c', 'run-code:16iyqcnxt7on9th', 2, '2026-09-21 04:05:38'),
('u_eefe9f2fe470ae4c', 'run-code:1bv55q81oc987qtg', 2, '2026-09-21 04:05:21'),
('u_eefe9f2fe470ae4c', 'run-code:3hdj7wi5l070xl', 2, '2026-09-21 12:53:48'),
('u_eefe9f2fe470ae4c', 'run-code:d2w56xxavlphth', 2, '2026-09-21 04:05:13'),
('u_eefe9f2fe470ae4c', 'run-code:v8bd331hn9bjn16v', 2, '2026-09-22 01:59:39'),
('u_eefe9f2fe470ae4c', 'run-sql:1mwbso1hri7mh8i', 2, '2026-09-22 02:10:43'),
('u_eefe9f2fe470ae4c', 'run-sql:1rcguao158fde63d', 2, '2026-09-21 04:44:26'),
('u_eefe9f2fe470ae4c', 'run-starter:ggollo1xqzin67', 2, '2026-09-22 02:01:06'),
('u_eefe9f2fe470ae4c', 'snippet:1ivgp811k2u6zdg', 2, '2026-09-22 04:41:27');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `gdrive_links`
--
ALTER TABLE `gdrive_links`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `notes`
--
ALTER TABLE `notes`
  ADD PRIMARY KEY (`id`,`user_id`),
  ADD KEY `idx_notes_user` (`user_id`);

--
-- Indexes for table `points`
--
ALTER TABLE `points`
  ADD PRIMARY KEY (`user_id`);

--
-- Indexes for table `projects`
--
ALTER TABLE `projects`
  ADD PRIMARY KEY (`id`,`user_id`),
  ADD KEY `idx_projects_user` (`user_id`);

--
-- Indexes for table `snippets`
--
ALTER TABLE `snippets`
  ADD PRIMARY KEY (`id`,`user_id`),
  ADD KEY `idx_snippets_user` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_users_email` (`email`),
  ADD UNIQUE KEY `uniq_users_oauth` (`oauth_provider`,`oauth_id`),
  ADD UNIQUE KEY `users_username_unique` (`username`);

--
-- Indexes for table `xp_ledger`
--
ALTER TABLE `xp_ledger`
  ADD PRIMARY KEY (`user_id`,`action_key`),
  ADD KEY `idx_xp_ledger_user_time` (`user_id`,`created_at`);

--
-- Constraints for dumped tables
--

--
-- Constraints for table `notes`
--
ALTER TABLE `notes`
  ADD CONSTRAINT `fk_notes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `points`
--
ALTER TABLE `points`
  ADD CONSTRAINT `fk_points_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `projects`
--
ALTER TABLE `projects`
  ADD CONSTRAINT `fk_projects_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Constraints for table `snippets`
--
ALTER TABLE `snippets`
  ADD CONSTRAINT `fk_snippets_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
