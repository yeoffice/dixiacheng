@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Dedicated Server
setlocal
set "LOG=%~dp0启动日志.txt"

call :run > "%LOG%" 2>&1

cls
type "%LOG%"
echo.
echo   ------------------------------------------------------------
echo    Log saved to: %LOG%
echo.
echo    If this window still closes instantly, open that file.
echo   ------------------------------------------------------------
echo.
pause
exit /b 0

:run
pushd "%~dp0" 2>nul
if errorlevel 1 (
  echo [X] Cannot enter this folder.
  echo     Copy the game folder to a local disk and try again.
  exit /b 1
)

echo ============================================================
echo   Dungeon Knight - Dedicated Server
echo ============================================================
echo.
echo Launcher: %CD%
echo.

rem ---------- locate the real game root ----------
if exist "server\index.mjs" goto :found

set "GAMEDIR="
for /d %%d in (*) do (
  if exist "%%d\server\index.mjs" set "GAMEDIR=%%d"
)
if defined GAMEDIR (
  pushd "%GAMEDIR%"
  goto :found
)

if exist "..\server\index.mjs" (
  pushd ..
  goto :found
)
if exist "..\..\server\index.mjs" (
  pushd ..\..
  goto :found
)

echo [X] server\index.mjs NOT found.
echo.
echo     This launcher is not next to the game files, and no game
echo     folder was found nearby.
echo.
echo     Either:
echo       1^) move this .bat into the folder that contains index.html
echo       2^) extract dungeon-knight.zip first
echo.
echo     Folders visible here:
dir /b /ad
exit /b 1

:found
echo Game root: %CD%
echo.

rem 端口被占通常意味着服务器已经在跑了
netstat -ano | findstr ":8080" | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
  echo [!] Port 8080 is already in use.
  echo.
  echo     The server may already be running. Open this in a browser:
  echo       http://localhost:8080/
  echo.
  echo     If that does not open the game, find and stop the old process:
  echo       netstat -ano ^| findstr :8080
  echo       taskkill /PID ^<pid^> /F
  echo.
  echo     Or start on another port:
  echo       set PORT=8081
  echo       node server\index.mjs
  echo.
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is NOT installed, or not in PATH.
  echo.
  echo     Install the LTS version from  https://nodejs.org
  echo     Keep "Add to PATH" checked during setup.
  echo.
  echo     Quick check: open cmd, type   node -v
  exit /b 1
)

for /f "delims=" %%v in ('node -v 2^>nul') do echo Node.js: %%v
echo.

if not exist "index.html" echo [!] index.html missing - page will not load.
echo Starting server on port 8080 ...
echo Press Ctrl+C to stop.
echo.

node server\index.mjs

echo.
echo Server stopped.
exit /b 0
