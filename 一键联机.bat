@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Co-op (same Wi-Fi)
setlocal

pushd "%~dp0" 2>nul
if errorlevel 1 (
  echo   [X] Cannot enter this folder. Copy it to a local disk.
  pause
  exit /b 1
)

rem ---------- locate the real game root ----------
if exist "server\index.mjs" goto :located
set "GAMEDIR="
for /d %%d in (*) do if exist "%%d\server\index.mjs" set "GAMEDIR=%%d"
if defined GAMEDIR ( pushd "%GAMEDIR%" & goto :located )
if exist "..\server\index.mjs" ( pushd .. & goto :located )
if exist "..\..\server\index.mjs" ( pushd ..\.. & goto :located )

echo.
echo   [X] server\index.mjs not found, and no game folder nearby.
echo       Move this .bat into the folder that contains index.html
echo       ^(next to js\, css\, server\^) and run it again.
echo.
pause
exit /b 1

:located
echo.
echo  ============================================================
echo    Dungeon Knight : Endless Echo   -   Co-op Server
echo  ============================================================
echo.
echo   Folder: %CD%
echo.

where node >nul 2>nul
if errorlevel 1 goto :no_node
goto :launch

:no_node
echo   [X] Node.js is not installed.
echo.
echo       Install the LTS version from  https://nodejs.org
echo       Then run this file again.
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
echo    Server with a public IP? Use  服务器启动.bat  instead.
echo   ------------------------------------------------------------
echo.
timeout /t 10 >nul 2>nul
popd
