@echo off
setlocal

cd /d "%~dp0.."

echo.
echo Installing PromptLite Node.js dependencies...
echo.

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Install Node.js 18 or newer, then run this script again.
  exit /b 1
)

npm install
if errorlevel 1 (
  echo Node.js dependency installation failed.
  exit /b 1
)

echo.
echo Node.js dependencies installed.
exit /b 0

