@echo off
setlocal

cd /d "%~dp0.."

if "%PROMPTLITE_NODE_PORT%"=="" set "PROMPTLITE_NODE_PORT=1234"
if "%PROMPTLITE_PYTHON_PORT%"=="" set "PROMPTLITE_PYTHON_PORT=7861"

set "PROMPTLITE_NODE_HOST=0.0.0.0"
set "PROMPTLITE_PYTHON_HOST=127.0.0.1"
set "PROMPTLITE_PYTHON_BACKEND_URL=http://127.0.0.1:%PROMPTLITE_PYTHON_PORT%"

if not "%~1"=="" (
  set "PROMPTLITE_PUBLIC_URL=http://%~1:%PROMPTLITE_NODE_PORT%"
)

echo.
echo Starting PromptLite for Windows VPS...
echo UI listen:      http://0.0.0.0:%PROMPTLITE_NODE_PORT%
if not "%PROMPTLITE_PUBLIC_URL%"=="" echo Public URL:     %PROMPTLITE_PUBLIC_URL%
echo.
echo If the public URL does not open, allow TCP port %PROMPTLITE_NODE_PORT% in Windows Firewall and your VPS provider firewall.
echo.

call "%~dp0start-windows.bat"
