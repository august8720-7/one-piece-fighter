@echo off
cd /d "%~dp0"
node scripts\playLocal.mjs
if errorlevel 1 pause
