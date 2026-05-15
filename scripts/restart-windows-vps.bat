@echo off
setlocal

cd /d "%~dp0.."

if "%PROMPTLITE_NODE_PORT%"=="" set "PROMPTLITE_NODE_PORT=1234"
if "%PROMPTLITE_PYTHON_PORT%"=="" set "PROMPTLITE_PYTHON_PORT=7861"

echo.
echo Stopping existing PromptLite listeners on ports %PROMPTLITE_NODE_PORT% and %PROMPTLITE_PYTHON_PORT%...

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ports = @([int]$env:PROMPTLITE_NODE_PORT, [int]$env:PROMPTLITE_PYTHON_PORT); " ^
  "$listeners = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort }); " ^
  "foreach ($listener in $listeners) { " ^
  "  $process = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue; " ^
  "  if ($process -and $process.ProcessName -in @('node', 'python', 'py')) { " ^
  "    Write-Host ('Stopping ' + $process.ProcessName + ' PID ' + $process.Id + ' on port ' + $listener.LocalPort); " ^
  "    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue; " ^
  "  } else { " ^
  "    Write-Host ('Leaving non-PromptLite-looking listener PID ' + $listener.OwningProcess + ' on port ' + $listener.LocalPort); " ^
  "  } " ^
  "}"

timeout /t 2 /nobreak >nul

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = [int]$env:PROMPTLITE_NODE_PORT; " ^
  "$remaining = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue); " ^
  "if ($remaining.Count -gt 0) { " ^
  "  Write-Host ('Port ' + $port + ' is still in use. Close old PromptLite windows, run this as Administrator, or set PROMPTLITE_NODE_PORT to a free port.'); " ^
  "  $remaining | ForEach-Object { $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; [pscustomobject]@{ LocalAddress = $_.LocalAddress; LocalPort = $_.LocalPort; PID = $_.OwningProcess; Process = $process.ProcessName } } | Format-Table -AutoSize; " ^
  "  exit 1; " ^
  "}"
if errorlevel 1 exit /b 1

call "%~dp0start-windows-vps.bat" %*
