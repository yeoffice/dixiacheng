@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Diagnostics
setlocal

pushd "%~dp0" 2>nul
if errorlevel 1 (
  echo   [X] Cannot enter this folder (network share?).
  echo       Copy it to a local disk first.
  pause
  exit /b 1
)

echo ============================================================
echo    Dungeon Knight - Diagnostics
echo ============================================================
echo.

echo [1] Current folder
cd
echo.

echo [2] Files in this folder
dir /b
echo.

echo [3] Node.js
where node 2>nul
node -v 2>nul
if errorlevel 1 echo   node NOT found
echo.

echo [4] Required entries
if exist "index.html" (echo   index.html         OK) else (echo   index.html         MISSING)
if exist "js\net.js" (echo   js\net.js          OK) else (echo   js\net.js          MISSING)
if exist "server\index.mjs" (echo   server\index.mjs   OK) else (echo   server\index.mjs   MISSING)
echo.

echo [5] Is port 8080 already in use?
netstat -ano | findstr ":8080"
echo   ^(nothing above = port is free^)
echo.

echo [6] IPv4 addresses of this machine
powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*'} | Select-Object -ExpandProperty IPAddress"
echo.

echo [7] Firewall rules mentioning 8080
netsh advfirewall firewall show rule name=all | findstr /i "8080"
echo   ^(nothing above = no rule, Windows Firewall may block incoming^)
echo.

echo [8] curl available?
where curl 2>nul
if errorlevel 1 echo   curl NOT found
echo.

echo ============================================================
echo    Copy everything above and send it back.
echo ============================================================
pause
popd
