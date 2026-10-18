@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Local
cd /d "%~dp0"

echo.
echo  Dungeon Knight : Endless Echo  -  local launch
echo  ------------------------------------------------------------
echo.

if not exist "index.html" (
  echo   [X] index.html not found.
  echo       Put this file inside the game folder and run it again.
  echo.
  pause
  exit /b 1
)

echo   Opening the game in your default browser ...
start "" "index.html"

echo.
echo   This window only launches your LOCAL browser copy.
echo   It closes by itself right after that - that is normal, not a crash.
echo.
echo   On a SERVER (no browser), use  服务器启动.bat  instead.
echo.
timeout /t 6 >nul 2>nul
