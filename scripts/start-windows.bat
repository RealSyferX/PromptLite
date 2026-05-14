@echo off
setlocal

cd /d "%~dp0.."
set "ROOT=%CD%"

if "%PROMPTLITE_PYTHON_PORT%"=="" set "PROMPTLITE_PYTHON_PORT=7861"
if "%PROMPTLITE_NODE_PORT%"=="" set "PROMPTLITE_NODE_PORT=1234"

echo.
echo Starting PromptLite...
echo.

if not exist "backend\.venv\Scripts\python.exe" (
  echo Python virtual environment was not found.
  echo Run scripts\setup.bat first.
  exit /b 1
)

if not exist "node_modules" (
  echo Node dependencies were not found.
  echo Run scripts\setup.bat first.
  exit /b 1
)

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PROMPTLITE_PYTHON_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  start "PromptLite Python Backend" /D "%ROOT%" cmd /k "call backend\.venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 127.0.0.1 --port %PROMPTLITE_PYTHON_PORT%"
) else (
  echo Python backend already running on port %PROMPTLITE_PYTHON_PORT%.
)

timeout /t 3 /nobreak >nul

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PROMPTLITE_NODE_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  start "PromptLite Node Server" /D "%ROOT%" cmd /k "set PROMPTLITE_NODE_PORT=%PROMPTLITE_NODE_PORT%&& npm start"
) else (
  echo Node UI already running on port %PROMPTLITE_NODE_PORT%.
)

timeout /t 2 /nobreak >nul

start "" "http://localhost:%PROMPTLITE_NODE_PORT%"

echo PromptLite is starting.
echo UI:      http://localhost:%PROMPTLITE_NODE_PORT%
echo Backend: http://127.0.0.1:%PROMPTLITE_PYTHON_PORT%
echo.
exit /b 0
