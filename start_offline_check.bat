@echo off
echo Running automated offline check for Sunil Bhaiya Study Tracker...
echo (starts a local server + headless Chrome, then simulates Go Offline)
echo.
cd /d "%~dp0"
node tests\offline-check.js
if errorlevel 1 (
  echo.
  echo *** OFFLINE CHECK FAILED - see messages above. ***
  pause
  exit /b 1
)
echo.
echo *** OFFLINE CHECK PASSED - the app works from cache while offline. ***
pause
