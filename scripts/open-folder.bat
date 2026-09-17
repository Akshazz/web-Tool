@echo off
rem Opens a folder in Windows Explorer.
rem Usage: open-folder.bat "C:\path\to\folder"
rem Called from save-data.php's "open-folder" action so launching Explorer
rem goes through a real script file instead of an inline shell command.
if "%~1"=="" exit /b 1
start "" explorer.exe "%~1"
exit /b 0
