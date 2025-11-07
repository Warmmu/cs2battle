@echo off
chcp 65001 >nul 2>&1
cls

echo ========================================
echo   CS2 Battle System - Starting
echo ========================================
echo.

echo [Step 1/3] Checking Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found!
    echo.
    echo Please install Python 3.8 or higher:
    echo 1. Visit https://www.python.org/downloads/
    echo 2. Download and install Python
    echo 3. Make sure to check "Add Python to PATH"
    echo 4. Run this script again
    echo.
    pause
    exit /b 1
)
echo [OK] Python installed:
python --version
echo.

echo [Step 2/3] Setting up virtual environment...
cd /d "%~dp0backend_py"

if not exist "venv" (
    echo.
    echo Creating virtual environment...
    python -m venv venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        echo.
        cd /d "%~dp0"
        pause
        exit /b 1
    )
    echo [OK] Virtual environment created
)

echo Activating virtual environment...
call venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment!
    echo.
    cd /d "%~dp0"
    pause
    exit /b 1
)
echo [OK] Virtual environment activated
echo.

echo Installing/Updating dependencies...
pip install -r requirements.txt --quiet
if %errorlevel% neq 0 (
    echo [WARNING] Some packages failed to install
    echo Trying without cache...
    pip install -r requirements.txt --no-cache-dir
)
echo [OK] Dependencies ready
echo.

echo [Step 3/3] Starting server...
echo ========================================
echo   Server: http://localhost:3000
echo   API Docs: http://localhost:3000/docs
echo   Stop: Press Ctrl+C
echo ========================================
echo.

python main.py

cd /d "%~dp0"
pause
