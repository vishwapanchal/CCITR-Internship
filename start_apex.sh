#!/usr/bin/env bash
set -e

echo "==================================================="
echo "Starting APEX-X Backend and Frontend..."
echo "==================================================="

echo "Cleaning up ports 8080 and 3000..."
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true

# Give the system a second to release the ports
sleep 2

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Start Backend in background
echo "Starting backend..."
(cd "$SCRIPT_DIR/backend" && PYTHONPATH=.. uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload) &

# Start Frontend in background
echo "Starting frontend..."
(cd "$SCRIPT_DIR/frontend" && npm run dev) &

echo ""
echo "Both services launched! Press Ctrl+C to stop both."
wait
