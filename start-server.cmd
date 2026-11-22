@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem ==========================================================================
rem CARDMON - ONE-CLICK LOCAL SERVER STARTER (Windows)
rem Double-click this file to start the sync server and open the APK page.
rem Set CARDMON_PORT to use a different port (default: 8765).
rem ==========================================================================

set "PORT=%CARDMON_PORT%"
if "%PORT%"=="" set "PORT=8765"
set "HOST=0.0.0.0"

where node >nul 2>nul
if errorlevel 1 (
  echo Why: Node.js was not found on PATH.
  echo Fix: install Node.js 20 or newer from https://nodejs.org, then double-click again.
  pause
  exit /b 1
)

if "%CARDMON_LAUNCHER_DRY_RUN%"=="1" (
  echo [dry-run] cd /d "%CD%"
  echo [dry-run] start "CardMon Server" cmd /k "node server\index.js --port %PORT% --host %HOST%"
  echo [dry-run] start "" "http://localhost:%PORT%/apk"
  exit /b 0
)

echo Starting CardMon local sync server on port %PORT% ...
echo A server window will stay open with the phone (LAN) APK link.
start "CardMon Server" cmd /k "node server\index.js --port %PORT% --host %HOST%"
rem ping is used as a short delay because `timeout` needs an interactive console
ping -n 3 127.0.0.1 >nul 2>&1
if not "%CARDMON_LAUNCHER_NO_BROWSER%"=="1" (
  start "" "http://localhost:%PORT%/apk"
)
echo Done. Use the LAN address printed in the "CardMon Server" window on your phone.
endlocal
