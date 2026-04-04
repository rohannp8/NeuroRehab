@echo off
REM NeuroRehab Backend Startup Script for Windows
REM Starts the FastAPI server with proper error handling

echo ====================================================================
echo 🚀 NeuroRehab Backend Startup Script (Windows)
echo ====================================================================
echo.

REM Navigate to backend directory
cd /d "%~dp0backend"

set "PYTHON_EXE=%cd%\venv\Scripts\python.exe"
set "PIP_EXE=%cd%\venv\Scripts\pip.exe"

if not exist "%PYTHON_EXE%" (
    echo ❌ Backend virtual environment not found at: %PYTHON_EXE%
    echo    Create it with: python -m venv backend\venv
    exit /b 1
)

echo 📂 Working directory: %cd%
echo.

REM Check if Python is available
"%PYTHON_EXE%" --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Backend Python interpreter is not available
    exit /b 1
)

for /f "tokens=*" %%i in ('"%PYTHON_EXE%" --version') do set PYTHON_VERSION=%%i
echo ✅ Python found: %PYTHON_VERSION%
echo.

REM Check if requirements.txt exists
if not exist "requirements.txt" (
    echo ⚠️  requirements.txt not found. Skipping dependency installation.
) else (
    echo 📦 Installing dependencies from requirements.txt...
    "%PIP_EXE%" install -r requirements.txt
    echo ✅ Dependencies installed
    echo.
)

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating with defaults...
    (
        echo GROQ_API_KEY=your_api_key_here
        echo PORT=8000
    ) > .env
)

echo 🔧 Environment configured
echo.

REM Start the backend server
echo 🎬 Starting NeuroRehab Backend Server...
echo    Listening on: http://localhost:8000
echo    WebSocket: ws://localhost:8000/ws/pose
echo.

"%PYTHON_EXE%" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
