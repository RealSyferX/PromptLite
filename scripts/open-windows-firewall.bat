@echo off
setlocal

if "%PROMPTLITE_NODE_PORT%"=="" set "PROMPTLITE_NODE_PORT=1234"

net session >nul 2>nul
if errorlevel 1 (
  echo Please run this script as Administrator.
  echo Right-click Command Prompt or PowerShell, choose Run as administrator, then run:
  echo scripts\open-windows-firewall.bat
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = [int]$env:PROMPTLITE_NODE_PORT; " ^
  "$ruleName = 'PromptLite UI ' + $port; " ^
  "if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) { " ^
  "  New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null; " ^
  "  Write-Host ('Opened Windows Firewall TCP port ' + $port + ' for PromptLite.'); " ^
  "} else { " ^
  "  Write-Host ('Windows Firewall rule already exists for TCP port ' + $port + '.'); " ^
  "}"
