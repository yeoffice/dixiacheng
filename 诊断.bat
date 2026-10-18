@echo off
chcp 65001 >nul 2>nul
title Dungeon Knight - Diagnostics
setlocal
set "LOG=%~dp0诊断结果.txt"

call :run > "%LOG%" 2>&1

cls
type "%LOG%"
echo.
echo   ------------------------------------------------------------
echo    Saved to: %LOG%
echo    Copy that file back, or screenshot this window.
echo   ------------------------------------------------------------
echo.
pause
exit /b 0

:run
pushd "%~dp0" 2>nul
if errorlevel 1 (
  echo [X] Cannot enter this folder ^(network share?^).
  echo     Copy it to a local disk first.
  exit /b 1
)

echo ============================================================
echo    Dungeon Knight - Diagnostics
echo ============================================================
echo.

echo [1] Current folder
cd
echo.

echo [2] Files here
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

echo [5] Port 8080
netstat -ano | findstr ":8080"
echo   ^(empty = free^)
echo.

echo [6] IPv4 addresses
powershell -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.IPAddress -notlike '127.*'} | Select-Object -ExpandProperty IPAddress" 2>nul
echo.

echo [7] Firewall rules mentioning 8080
netsh advfirewall firewall show rule name=all | findstr /i "8080"
echo   ^(empty = no rule^)
echo.

echo [8] curl
where curl 2>nul
if errorlevel 1 echo   curl NOT found
echo.

echo [9] Windows version
ver
echo.

echo ============================================================
echo    End of report
echo ============================================================
exit /b 0
