@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Co-op (public link)
cd /d "%~dp0"

echo.
echo  ============================================================
echo    Dungeon Knight : Endless Echo   -   Public Co-op
echo  ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed.
  echo       Install the LTS version from  https://nodejs.org
  pause
  exit /b 1
)

if not exist cloudflared.exe (
  echo   First run: downloading cloudflared (~30 MB, one time) ...
  echo.
  curl -L --fail --retry 2 -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe
  if errorlevel 1 (
    echo.
    echo   [X] Download failed. Check your internet and try again.
    pause
    exit /b 1
  )
  echo.
  echo   Download OK.
  echo.
)

echo   Starting game server ...
start "Dungeon Knight Server" cmd /c "node server\index.mjs"
ping -n 3 127.0.0.1 >nul 2>nul

echo.
echo   ------------------------------------------------------------
echo    A public link will appear below in a few seconds.
echo.
echo    It looks like:
echo      https://something-random.trycloudflare.com
echo.
echo    Send THAT link to your friends - anyone, anywhere.
echo    Keep this window open while playing.
echo    Press Ctrl+C to stop.
echo   ------------------------------------------------------------
echo.

cloudflared.exe tunnel --url http://localhost:8080

echo.
echo   Tunnel closed. Press any key to exit.
pause >nul
