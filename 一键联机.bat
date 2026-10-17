@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Co-op (same Wi-Fi)
cd /d "%~dp0"

echo.
echo  ============================================================
echo    Dungeon Knight : Endless Echo   -   Co-op Server
echo  ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo   [X] Node.js is not installed.
  echo.
  echo       Install the LTS version from:
  echo         https://nodejs.org
  echo.
  echo       After installing, run this file again.
  echo.
  pause
  exit /b 1
)

echo   Starting server in a new window ...
start "Dungeon Knight Server" cmd /k "node server\index.mjs"

ping -n 3 127.0.0.1 >nul 2>nul
start "" http://localhost:8080/

echo.
echo   ------------------------------------------------------------
echo    The game should open in your browser now.
echo.
echo    Friends on the SAME Wi-Fi:
echo      1. Look at the other window, find the line:
echo           LAN : http://192.168.x.x:8080/
echo      2. Send that address to them.
echo      3. They open it, click  Lian Ji  (multiplayer), join.
echo.
echo    Keep the other window open while playing.
echo    Close it to stop the server.
echo   ------------------------------------------------------------
echo.
timeout /t 8 >nul 2>nul
