@echo off
setlocal EnableExtensions
cd /d "%~dp0"

rem ==========================================================================
rem CARDMON - CREATE A ONE-CLICK DESKTOP BUTTON (Windows)
rem Double-click once; a "CardMon Server" shortcut appears on the Desktop.
rem ==========================================================================

set "TARGET=%~dp0start-server.cmd"
set "WORKDIR=%~dp0"
set "LINK=%USERPROFILE%\Desktop\CardMon Server.lnk"

if "%CARDMON_LAUNCHER_DRY_RUN%"=="1" (
  echo [dry-run] create shortcut "%LINK%" -^> "%TARGET%"
  exit /b 0
)

powershell -NoProfile -Command "$w = New-Object -ComObject WScript.Shell; $s = $w.CreateShortcut($env:USERPROFILE + '\Desktop\CardMon Server.lnk'); $s.TargetPath = '%TARGET%'; $s.WorkingDirectory = '%WORKDIR%'; $s.Description = 'Start the CardMon local sync server and open the APK page'; $s.Save()"
if errorlevel 1 (
  echo Why: the desktop shortcut could not be created.
  echo Fix: run this file from a normal Windows user session and try again.
  pause
  exit /b 1
)

echo Desktop button created: %LINK%
echo Double-click it any time to start the server and open the APK page.
pause
endlocal
