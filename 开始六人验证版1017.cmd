@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "& '%~dp0run-d1013.ps1' -Program powershell.exe -CommandArguments @('-NoProfile','-ExecutionPolicy','Bypass','-File','%~dp0scripts\startSixValidation1017.ps1')"
if errorlevel 1 pause
