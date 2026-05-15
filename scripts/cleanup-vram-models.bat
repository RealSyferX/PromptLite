@echo off
setlocal

set "PROJECT_ROOT=%~dp0.."
set "MODELS_DIR=%PROJECT_ROOT%\models"

echo Cleaning VRAM-heavy local model folders from:
echo %MODELS_DIR%
echo.
echo Close the PromptLite Python Backend window first if Windows says a file is in use.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$modelsDir = (Resolve-Path -LiteralPath '%MODELS_DIR%').Path; " ^
  "$heavyTerms = @('flux','sdxl','sd-xl','stable-diffusion-xl','stable_diffusion_xl','stable-cascade','ssd-1b','kandinsky','wuerstchen'); " ^
  "$removed = @(); " ^
  "Get-ChildItem -LiteralPath $modelsDir -Directory | ForEach-Object { " ^
  "  $folderName = $_.Name; " ^
  "  $name = $_.Name.ToLowerInvariant(); " ^
  "  $isHeavy = $false; " ^
  "  foreach ($term in $heavyTerms) { if ($name.Contains($term)) { $isHeavy = $true; break } } " ^
  "  if ($isHeavy) { " ^
  "    $target = (Resolve-Path -LiteralPath $_.FullName).Path; " ^
  "    if ($target.StartsWith($modelsDir + [System.IO.Path]::DirectorySeparatorChar, [System.StringComparison]::OrdinalIgnoreCase)) { " ^
  "      try { " ^
  "        Remove-Item -LiteralPath $target -Recurse -Force -ErrorAction Stop; " ^
  "        $removed += $folderName; " ^
  "      } catch { " ^
  "        Write-Warning ('Could not remove ' + $folderName + '. Close the PromptLite Python Backend window, then run this again. ' + $_.Exception.Message); " ^
  "      } " ^
  "    } " ^
  "  } " ^
  "}; " ^
  "if ($removed.Count -eq 0) { 'No VRAM-heavy local model folders found.' } else { 'Removed: ' + ($removed -join ', ') }"

echo.
pause
