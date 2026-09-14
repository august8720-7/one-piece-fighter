@echo off
cd /d "%~dp0"
node scripts\playCandidate.mjs --release candidate-0913 --full
if errorlevel 1 pause
