@echo off
setlocal

if "%PROMPTLITE_NODE_PORT%"=="" set "PROMPTLITE_NODE_PORT=1234"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$port = [int]$env:PROMPTLITE_NODE_PORT; " ^
  "Write-Host ''; " ^
  "Write-Host ('PromptLite Windows VPS diagnostics for TCP port ' + $port); " ^
  "Write-Host '================================================='; " ^
  "$listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue); " ^
  "if ($listeners.Count -eq 0) { " ^
  "  Write-Host 'FAIL: Nothing is listening on this port.' -ForegroundColor Red; " ^
  "  Write-Host 'Start PromptLite with: scripts\start-windows-vps.bat YOUR_SERVER_IP'; " ^
  "  exit 1; " ^
  "} " ^
  "Write-Host ''; Write-Host 'Listening sockets:'; " ^
  "$listeners | ForEach-Object { " ^
  "  $process = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue; " ^
  "  [pscustomobject]@{ LocalAddress = $_.LocalAddress; LocalPort = $_.LocalPort; PID = $_.OwningProcess; Process = $process.ProcessName } " ^
  "} | Format-Table -AutoSize; " ^
  "$publicListeners = @($listeners | Where-Object { $_.LocalAddress -in @('0.0.0.0', '::') }); " ^
  "$publicNodeListeners = @($publicListeners | Where-Object { (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName -eq 'node' }); " ^
  "if ($publicNodeListeners.Count -eq 0) { " ^
  "  Write-Host 'FAIL: PromptLite Node UI is not listening on all interfaces. Outside network cannot reach it.' -ForegroundColor Red; " ^
  "  Write-Host 'Close old PromptLite windows, then run: scripts\restart-windows-vps.bat YOUR_SERVER_IP'; " ^
  "} else { " ^
  "  Write-Host 'PASS: PromptLite Node UI is listening on all interfaces.' -ForegroundColor Green; " ^
  "} " ^
  "Write-Host ''; Write-Host 'Windows Firewall rules for this port:'; " ^
  "$rules = @(Get-NetFirewallPortFilter -ErrorAction SilentlyContinue | Where-Object { $_.Protocol -eq 'TCP' -and $_.LocalPort -eq [string]$port } | Get-NetFirewallRule -ErrorAction SilentlyContinue | Where-Object { $_.Enabled -eq 'True' -and $_.Direction -eq 'Inbound' -and $_.Action -eq 'Allow' }); " ^
  "if ($rules.Count -eq 0) { " ^
  "  Write-Host 'FAIL: No enabled inbound allow rule found in Windows Firewall.' -ForegroundColor Red; " ^
  "  Write-Host 'Run as Administrator: scripts\open-windows-firewall.bat'; " ^
  "} else { " ^
  "  $rules | Select-Object DisplayName, Enabled, Direction, Action | Format-Table -AutoSize; " ^
  "  Write-Host 'PASS: Windows Firewall has an inbound allow rule for this port.' -ForegroundColor Green; " ^
  "} " ^
  "Write-Host ''; " ^
  "Write-Host 'If both checks pass but outside still times out, open TCP port 1234 in your VPS provider firewall/security group.' -ForegroundColor Yellow; " ^
  "Write-Host 'For Azure: VM > Networking > Add inbound port rule > TCP > Destination port 1234 > Allow.'; " ^
  "Write-Host '';"
