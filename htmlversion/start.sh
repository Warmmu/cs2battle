#!/bin/bash

clear
echo "========================================"
echo "  CS2 Battle System - Starting"
echo "========================================"
echo ""

# 检查 Python
echo "[Step 1/3] Checking Python..."
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python not found!"
    echo ""
    echo "Please install Python 3.8 or higher:"
    echo "  Ubuntu/Debian: sudo apt install python3 python3-venv python3-pip"
    echo "  MacOS: brew install python3"
    echo ""
    exit 1
fi
echo "[OK] Python installed:"
python3 --version
echo ""

echo "[Step 2/3] Setting up virtual environment..."
cd "$(dirname "$0")/backend_py"

if [ ! -d "venv" ]; then
    echo ""
    echo "Creating virtual environment..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment!"
        echo ""
        exit 1
    fi
    echo "[OK] Virtual environment created"
fi

echo "Activating virtual environment..."
source venv/bin/activate
if [ $? -ne 0 ]; then
    echo "[ERROR] Failed to activate virtual environment!"
    echo ""
    exit 1
fi
echo "[OK] Virtual environment activated"
echo ""

echo "Installing/Updating dependencies..."
pip install -r requirements.txt --quiet
if [ $? -ne 0 ]; then
    echo "[WARNING] Some packages failed to install"
    echo "Trying without cache..."
    pip install -r requirements.txt --no-cache-dir
fi
echo "[OK] Dependencies ready"
echo ""

echo "[Step 3/3] Starting server..."
echo "========================================"
echo "  Server: http://localhost:3000"
echo "  API Docs: http://localhost:3000/docs"
echo "  Stop: Press Ctrl+C"
echo "========================================"
echo ""

python3 main.py
