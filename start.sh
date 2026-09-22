#!/bin/bash

echo "Starting Coding Platform (Backend + Frontend)..."

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[Backend] Starting Node.js Express server on port 8000..."
(
  cd backend
  npm run dev
) &
BACKEND_PID=$!

# ── Frontend ─────────────────────────────────────────────────────────────────
echo "[Frontend] Starting Vite dev server..."
(
  cd frontend
  npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are running!"
echo "   Backend  → http://localhost:8000"
echo "   Frontend → http://localhost:3005"
echo ""
echo "Press Ctrl+C to stop both servers."

# Wait for both processes and stop both if either exits or Ctrl+C is pressed
wait $BACKEND_PID $FRONTEND_PID
