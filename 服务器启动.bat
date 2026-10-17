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
echo    If this window still closes instantly, open that file -
echo    it contains the exact reason.
echo.
echo    Fastest manual way:
echo      open cmd in this folder and type:   node server\index.mjs
echo   ------------------------------------------------------------
echo.
pause
exit /b 0

:run
pushd "%~dp0" 2>nul
if errorlevel 1 (
  echo [X] Cannot enter this folder.
  echo     Copy the game folder to a local disk, e.g. D:\dungeon
  echo     Network shares ^(\\server\share^) do not work here.
  exit /b 1
)

echo ============================================================
echo   Dungeon Knight - Dedicated Server
echo ============================================================
echo.
echo Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [X] Node.js is NOT installed, or not in PATH.
  echo.
  echo     Install the LTS version from  https://nodejs.org
  echo     Keep "Add to PATH" checked during setup.
  echo     Then run this file again.
  echo.
  echo     Quick check: open cmd, type   node -v
  exit /b 1
)

for /f "delims=" %%v in ('node -v 2^>nul') do echo Node.js: %%v
echo.

if not exist "server\index.mjs" (
  echo [X] server\index.mjs NOT found in:
  echo     %CD%
  echo.
  echo     The folder is incomplete. Extract the whole package again,
  echo     keeping the structure: index.html, js\, css\, server\
  exit /b 1
)

if not exist "index.html" (
  echo [!] index.html not found - the server will still run,
  echo     but the web page will not load.
  echo.
)

echo Starting server on port 8080 ...
echo Press Ctrl+C to stop.
echo.

node server\index.mjs

echo.
echo Server stopped.
exit /b 0
