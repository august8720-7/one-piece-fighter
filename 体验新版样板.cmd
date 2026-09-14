@echo off
cd /d "%~dp0"
node scripts\playCandidate.mjs --release candidate-0913
if errorlevel 1 pause
