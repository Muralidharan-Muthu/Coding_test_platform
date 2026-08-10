#!/bin/bash

echo "Installing dependencies for Coding Platform..."

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[Backend] Setting up..."
cd backend || exit 1
if [ ! -d "venv" ]; then
  echo "[Backend] Creating virtual environment..."
  python -m venv venv
fi

# Activate venv (Git Bash on Windows uses Scripts/)
source venv/Scripts/activate

echo "[Backend] Installing dependencies..."
pip install -r requirements.txt
cd ..

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[Frontend] Setting up..."
cd frontend || exit 1
if [ ! -d "node_modules" ]; then
  echo "[Frontend] Installing dependencies..."
  npm install
fi
cd ..

echo "Installation complete!"
