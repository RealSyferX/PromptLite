@echo off
setlocal

cd /d "%~dp0.."

echo.
echo PromptLite setup
echo ================
echo.

call scripts\install-python-deps.bat
if errorlevel 1 (
  echo.
  echo Setup stopped while installing Python dependencies.
  exit /b 1
)

call scripts\install-node-deps.bat
if errorlevel 1 (
  echo.
  echo Setup stopped while installing Node.js dependencies.
  exit /b 1
)

echo.
echo Setup complete.
echo.
echo Next steps:
echo   1. Place a supported model folder in models\, or use the web UI downloader.
echo   2. Run scripts\start-windows.bat
echo   3. Open http://localhost:1234
echo.
exit /b 0
