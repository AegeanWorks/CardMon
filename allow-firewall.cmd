@echo off
setlocal EnableExtensions

rem ==========================================================================
rem CARDMON - ALLOW THE LOCAL SERVER THROUGH WINDOWS FIREWALL (one click)
rem Requests admin rights once and opens the configured TCP port on
rem private/domain networks so a phone on the same Wi-Fi can connect.
rem ==========================================================================

set "PORT=%~1"
if "%PORT%"=="" set "PORT=%CARDMON_PORT%"
if "%PORT%"=="" set "PORT=8765"
set "DPORT=%~2"
if "%DPORT%"=="" set "DPORT=%CARDMON_DISCOVERY_PORT%"
if "%DPORT%"=="" set "DPORT=8766"

if "%CARDMON_LAUNCHER_DRY_RUN%"=="1" (
  echo [dry-run] allow inbound TCP %PORT% and UDP %DPORT% on private/domain networks
  exit /b 0
)

net session >nul 2>&1
if errorlevel 1 (
  echo Requesting administrator permission to add the firewall rules...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '%PORT% %DPORT%' -Verb RunAs"
  exit /b 0
)

netsh advfirewall firewall delete rule name="CardMon Local Sync (%PORT%)" >nul 2>&1
netsh advfirewall firewall add rule name="CardMon Local Sync (%PORT%)" dir=in action=allow protocol=TCP localport=%PORT% profile=private,domain
netsh advfirewall firewall delete rule name="CardMon Discovery (%DPORT%)" >nul 2>&1
netsh advfirewall firewall add rule name="CardMon Discovery (%DPORT%)" dir=in action=allow protocol=UDP localport=%DPORT% profile=private,domain
if errorlevel 1 (
  echo Why: the firewall rules could not be added.
  echo Fix: run this file as Administrator and try again.
  pause
  exit /b 1
)

echo Firewall rules added: TCP %PORT% (sync/APK) and UDP %DPORT% (phone auto-discovery), private/domain networks.
echo Now double-click start-server.cmd and open the phone URL printed in its window.
pause
endlocal
