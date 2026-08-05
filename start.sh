#!/bin/bash

echo "Starting Coding Platform (Backend and Frontend)..."

# Trap SIGINT (Ctrl+C) to gracefully stop both servers when exited
trap 'echo "Stopping servers..."; kill 0' SIGINT

# Start Backend
(
  echo "[Backend] Starting setup..."
  cd backend || exit
  if [ ! -d "venv" ]; then
    echo "[Backend] Creating virtual environment..."
    python -m venv venv
  fi
  
  # Activate venv (Git Bash on Windows uses Scripts)
  source venv/Scripts/activate
  
  echo "[Backend] Installing dependencies..."
  pip install -r requirements.txt
  
  echo "[Backend] Starting FastAPI server..."
  uvicorn main:app --reload --host 127.0.0.1 --port 8001
) &

# Start Frontend
(
  echo "[Frontend] Starting setup..."
  cd frontend || exit
  if [ ! -d "node_modules" ]; then
    echo "[Frontend] Installing dependencies..."
    npm install
  fi
  
  echo "[Frontend] Starting development server..."
  npm run dev
) &

echo "Both servers are starting up. Press Ctrl+C to stop both."

# Wait for all background processes
wait
