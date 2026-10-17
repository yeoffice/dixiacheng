@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Dedicated Server
cd /d "%~dp0"

echo.
echo  ============================================================
echo    Dungeon Knight : Endless Echo   -   Dedicated Server
echo  ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed.
  echo.
  echo       Install the LTS version from  https://nodejs.org
  echo       Then run this file again.
  echo.
  pause
  exit /b 1
)

if not exist "server\index.mjs" (
  echo   [X] server\index.mjs not found.
  echo.
  echo       The folder is incomplete. Extract the whole package again,
  echo       keeping the folder structure (js\, css\, server\ ...).
  echo.
  pause
  exit /b 1
)

for /f "delims=" %%v in ('node -v') do echo   Node.js: %%v
echo.
echo   Starting server on port 8080 ...
echo   Press Ctrl+C to stop.
echo.

node server\index.mjs

echo.
echo   Server stopped.
echo.
pause
