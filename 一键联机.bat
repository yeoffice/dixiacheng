@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Co-op (same Wi-Fi)
setlocal

pushd "%~dp0" 2>nul
if errorlevel 1 (
  echo.
  echo   [X] Cannot enter this folder.
  echo       Copy the whole game folder to a local disk and run it there.
  echo       Network shares like \\server\share do not work here.
  echo.
  pause
  exit /b 1
)

echo.
echo  ============================================================
echo    Dungeon Knight : Endless Echo   -   Co-op Server
echo  ============================================================
echo.
echo   Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node
if not exist "server\index.mjs" goto :no_server
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
echo       The folder is incomplete. Extract the whole package again.
echo.
pause
exit /b 1

:launch
echo   Starting server in a new window ...
start "Dungeon Knight Server" cmd /k "node server\index.mjs"

ping -n 3 127.0.0.1 >nul 2>nul
start "" http://localhost:8080/ 2>nul

echo.
echo   ------------------------------------------------------------
echo    Friends on the SAME Wi-Fi:
echo      1. Look at the other window, find the line:
echo           LAN : http://192.168.x.x:8080/
echo      2. Send that address to them.
echo      3. They open it and click  multiplayer  to join.
echo.
echo    Running this on a SERVER with a public IP?
echo      Use  服务器启动.bat  instead - no tunnel needed.
echo      Then allow TCP 8080 in the firewall and cloud security group.
echo.
echo    Keep the other window open while playing.
echo   ------------------------------------------------------------
echo.
timeout /t 10 >nul 2>nul
popd
