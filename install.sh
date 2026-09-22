#!/bin/bash

echo "Installing dependencies for Coding Platform..."

# ── Backend ──────────────────────────────────────────────────────────────────
echo "[Backend] Setting up Node.js server..."
cd backend || exit 1
echo "[Backend] Installing dependencies..."
npm install
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
