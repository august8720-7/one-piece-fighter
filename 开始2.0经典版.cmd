@echo off
cd /d "%~dp0"
node scripts\playCandidate.mjs --release classic-2 --full
if errorlevel 1 pause
