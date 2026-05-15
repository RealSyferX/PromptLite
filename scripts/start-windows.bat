@echo off
setlocal

cd /d "%~dp0.."
set "ROOT=%CD%"
set "PROMPTLITE_PYTHON_EXE=%ROOT%\backend\.venv\Scripts\python.exe"

if exist ".env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    if not "%%A"=="" if not defined %%A set "%%A=%%B"
  )
)

if "%PROMPTLITE_PYTHON_PORT%"=="" set "PROMPTLITE_PYTHON_PORT=7861"
if "%PROMPTLITE_NODE_PORT%"=="" set "PROMPTLITE_NODE_PORT=1234"
if "%PROMPTLITE_PYTHON_HOST%"=="" set "PROMPTLITE_PYTHON_HOST=127.0.0.1"
if "%PROMPTLITE_NODE_HOST%"=="" set "PROMPTLITE_NODE_HOST=127.0.0.1"
if "%PROMPTLITE_PYTHON_BACKEND_URL%"=="" set "PROMPTLITE_PYTHON_BACKEND_URL=http://127.0.0.1:%PROMPTLITE_PYTHON_PORT%"

echo.
echo Starting PromptLite...
echo.

if not exist "%PROMPTLITE_PYTHON_EXE%" (
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
  start "PromptLite Python Backend" /D "%ROOT%" cmd /k ""%PROMPTLITE_PYTHON_EXE%" -m uvicorn backend.main:app --host %PROMPTLITE_PYTHON_HOST% --port %PROMPTLITE_PYTHON_PORT%"
) else (
  echo Python backend already running on port %PROMPTLITE_PYTHON_PORT%.
)

timeout /t 3 /nobreak >nul

powershell -NoProfile -Command "if (Get-NetTCPConnection -LocalPort %PROMPTLITE_NODE_PORT% -State Listen -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }"
if errorlevel 1 (
  start "PromptLite Node Server" /D "%ROOT%" cmd /k "set PROMPTLITE_NODE_PORT=%PROMPTLITE_NODE_PORT%&& set PROMPTLITE_NODE_HOST=%PROMPTLITE_NODE_HOST%&& set PROMPTLITE_PYTHON_BACKEND_URL=%PROMPTLITE_PYTHON_BACKEND_URL%&& set PROMPTLITE_PUBLIC_URL=%PROMPTLITE_PUBLIC_URL%&& npm start"
) else (
  echo Node UI already running on port %PROMPTLITE_NODE_PORT%.
)

timeout /t 2 /nobreak >nul

if "%PROMPTLITE_PUBLIC_URL%"=="" (
  start "" "http://localhost:%PROMPTLITE_NODE_PORT%"
) else (
  start "" "%PROMPTLITE_PUBLIC_URL%"
)

echo PromptLite is starting.
echo UI listen:      http://%PROMPTLITE_NODE_HOST%:%PROMPTLITE_NODE_PORT%
echo Backend listen: http://%PROMPTLITE_PYTHON_HOST%:%PROMPTLITE_PYTHON_PORT%
if not "%PROMPTLITE_PUBLIC_URL%"=="" echo Public URL:     %PROMPTLITE_PUBLIC_URL%
echo.
exit /b 0
