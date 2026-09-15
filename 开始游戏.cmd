@echo off
cd /d "%~dp0"
node scripts\playCandidate.mjs --release candidate-0915 --full
if errorlevel 1 pause
