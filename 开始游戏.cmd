@echo off
cd /d "%~dp0"
node scripts\playCandidate.mjs --release candidate-crossover-0922 --full
if errorlevel 1 pause
