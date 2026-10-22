@echo off
REM SHE SAFE AI - Frontend Launcher
REM This script adds Node.js to PATH so npm always works, then starts Expo.

set PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0"

echo Starting SHE SAFE AI frontend...
npm start

pause
