@echo off
setlocal

cd /d "%~dp0.."
set "PROMPTLITE_PYTHON_EXE=%CD%\backend\.venv\Scripts\python.exe"

echo.
echo Installing PromptLite Python dependencies...
echo.

if not exist "backend\.venv\Scripts\python.exe" (
  echo Creating Python virtual environment at backend\.venv...
  where py >nul 2>nul
  if errorlevel 1 (
    python -m venv backend\.venv
  ) else (
    py -3 -m venv backend\.venv
  )

  if errorlevel 1 (
    echo Could not create the Python virtual environment. Install Python 3.10 or newer.
    exit /b 1
  )
)

if not exist "%PROMPTLITE_PYTHON_EXE%" (
  echo Could not find backend\.venv\Scripts\python.exe after creating the virtual environment.
  exit /b 1
)

"%PROMPTLITE_PYTHON_EXE%" -m pip install --upgrade pip
if errorlevel 1 (
  echo pip upgrade failed.
  exit /b 1
)

"%PROMPTLITE_PYTHON_EXE%" -m pip install -r backend\requirements.txt
if errorlevel 1 (
  echo Python dependency installation failed.
  exit /b 1
)

echo.
echo Python dependencies installed.
exit /b 0
