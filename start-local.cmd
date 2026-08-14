@echo off
set "PROJECT_DIR=%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%PROJECT_DIR%start-local.ps1"
if errorlevel 1 pause
