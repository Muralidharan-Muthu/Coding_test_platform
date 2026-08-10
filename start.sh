#!/bin/bash

echo "Starting Coding Platform (Backend and Frontend)..."

# Trap SIGINT (Ctrl+C) to gracefully stop both servers when exited
trap 'echo "Stopping servers..."; kill 0' SIGINT SIGTERM EXIT

# ── Backend ──────────────────────────────────────────────────────────────────
(
  echo "[Backend] Starting FastAPI server..."
  cd backend || exit 1
  # Activate venv (Git Bash on Windows uses Scripts/)
  source venv/Scripts/activate
  uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
) &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
(
  echo "[Frontend] Starting development server..."
  cd frontend || exit 1
  npm run dev
) &
FRONTEND_PID=$!

echo "Both servers are starting up. Press Ctrl+C to stop both."
echo "  Backend  PID: $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"

# Wait for both background processes
wait $BACKEND_PID $FRONTEND_PID
