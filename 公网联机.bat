@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Public Co-op
setlocal

rem pushd 能处理网络共享路径（UNC），cd /d 不行
pushd "%~dp0" 2>nul
if errorlevel 1 (
  echo.
  echo   [X] Cannot enter this folder.
  echo       Copy the whole game folder to a local disk, e.g.  D:\dungeon
  echo       Network shares like \\server\share do not work here.
  echo.
  pause
  exit /b 1
)

echo.
echo  ============================================================
echo    Dungeon Knight : Endless Echo   -   Public Co-op
echo  ============================================================
echo.
echo   Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node

if not exist "server\index.mjs" goto :no_server

if not exist cloudflared.exe goto :need_tunnel
goto :launch

:no_node
echo   [X] Node.js is not installed.
echo.
echo       Install the LTS version from  https://nodejs.org
echo       Then run this file again.
echo.
pause
exit /b 1

:no_server
echo   [X] server\index.mjs not found in:
echo       %CD%
echo.
echo       The folder is incomplete. Extract the whole package again,
echo       keeping the structure:  index.html, js\, css\, server\
echo.
pause
exit /b 1

:need_tunnel
echo   First run: downloading cloudflared (~30 MB, one time only) ...
echo.
if exist "%SystemRoot%\System32\curl.exe" (
  "%SystemRoot%\System32\curl.exe" -L --fail --retry 2 --connect-timeout 20 -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
) else (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -Uri 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe' -OutFile 'cloudflared.exe' -UseBasicParsing -TimeoutSec 120 } catch { exit 1 }"
)
if not exist cloudflared.exe (
  echo.
  echo   [X] Download failed.
  echo.
  echo       Options:
  echo         1^) Check the server can reach github.com
  echo         2^) Download it on another machine and copy cloudflared.exe
  echo            into this folder, then run this file again
  echo         Download URL:
  echo         https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  echo.
  pause
  exit /b 1
)
echo   Download OK.
echo.

:launch
echo   Starting game server in a new window ...
start "Dungeon Knight Server" cmd /k "node server\index.mjs"
ping -n 3 127.0.0.1 >nul 2>nul

echo.
echo   ------------------------------------------------------------
echo    Waiting for a public link like:
echo      https://something-random.trycloudflare.com
echo.
echo    Send THAT link to your friends.
echo    Keep this window open while playing. Press Ctrl+C to stop.
echo   ------------------------------------------------------------
echo.

cloudflared.exe tunnel --url http://localhost:8080
set "CODE=%ERRORLEVEL%"

echo.
echo   Tunnel exited (code %CODE%).
echo   If it closed instantly, run  诊断.bat  and send the output back.
echo.
pause
popd
