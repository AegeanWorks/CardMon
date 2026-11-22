@echo off
setlocal EnableExtensions

rem ==========================================================================
rem CARDMON - CONNECTION DIAGNOSTIC
rem Double-click when the phone says "connection refused".
rem ==========================================================================

set "PORT=%CARDMON_PORT%"
if "%PORT%"=="" set "PORT=8765"

echo === CardMon connection check (port %PORT%) ===
echo.
echo Phone URLs for this PC:
powershell -NoProfile -Command "Get-NetIPConfiguration | Where-Object { $_.IPv4Address } | ForEach-Object { '  http://' + $_.IPv4Address.IPAddress + ':%PORT%/apk  (' + $_.InterfaceAlias + ')' }"
echo.

echo Listener on port %PORT%:
netstat -ano | findstr ":%PORT% " | findstr "LISTENING"
if errorlevel 1 (
  echo  [FAIL] Nothing is listening.
  echo  Why: the server is not running.
  echo  Fix: double-click start-server.cmd and keep its window open.
) else (
  echo  [OK] A process is listening on port %PORT%.
)
echo.

echo Local API test:
node -e "fetch('http://localhost:%PORT%/api/health').then(function(r){console.log('  [OK] health status',r.status)}).catch(function(e){console.log('  [FAIL]',e.message)})"
echo.

echo If the server is up but the phone still cannot connect:
echo  1. Double-click allow-firewall.cmd once (admin rights needed).
echo  2. Make sure the phone and this PC are on the same Wi-Fi / network
echo     (guest Wi-Fi and AP isolation block local connections).
echo  3. Use the LAN address above, not localhost, on the phone.
echo.
pause
endlocal
