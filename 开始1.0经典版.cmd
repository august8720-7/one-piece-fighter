@echo off
cd /d "%~dp0"
node scripts\playCandidate.mjs --release classic-1 --full
if errorlevel 1 pause
