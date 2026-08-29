#!/usr/bin/env bash
set -e

# ═══════════════════════════════════════════════════════════════
# APEX-X — One-shot setup + launch script (Linux / macOS)
# Installs dependencies only if missing, then starts all services.
# ═══════════════════════════════════════════════════════════════

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info()  { echo -e "${GREEN}[✔]${NC} $*"; }
warn()  { echo -e "${YELLOW}[→]${NC} $*"; }

echo "==================================================="
echo "  APEX-X — Setup & Launch"
echo "==================================================="
echo ""

# ── 1. Check system prerequisites ────────────────────────────
command -v python3 >/dev/null 2>&1 || { echo "❌ python3 not found. Install Python 3.10+ first."; exit 1; }
command -v node    >/dev/null 2>&1 || { echo "❌ node not found. Install Node.js 18+ first.";      exit 1; }
command -v npm     >/dev/null 2>&1 || { echo "❌ npm not found. Install Node.js 18+ first.";       exit 1; }

info "python3 $(python3 --version 2>&1 | awk '{print $2}')"
info "node    $(node --version)"
info "npm     $(npm --version)"
echo ""

# ── 2. Backend — Python venv + pip dependencies ─────────────
if [ ! -d "$BACKEND_DIR/venv" ]; then
    warn "Creating Python virtual environment..."
    python3 -m venv "$BACKEND_DIR/venv"
    info "venv created"
else
    info "venv already exists"
fi

source "$BACKEND_DIR/venv/bin/activate"

# Install pip deps if marker missing or requirements.txt changed
MARKER="$BACKEND_DIR/venv/.deps_installed"
if [ ! -f "$MARKER" ] || [ "$BACKEND_DIR/requirements.txt" -nt "$MARKER" ]; then
    warn "Installing backend Python dependencies..."
    pip install --upgrade pip -q
    pip install -r "$BACKEND_DIR/requirements.txt" -q
    touch "$MARKER"
    info "Backend dependencies installed"
else
    info "Backend dependencies up to date"
fi
echo ""

# ── 3. Frontend — npm dependencies ──────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    warn "Installing frontend npm dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
    info "Frontend dependencies installed"
else
    info "Frontend node_modules already exists"
fi
echo ""

# ── 4. Check .env ────────────────────────────────────────────
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "⚠️  No .env found! Copying from .env.example..."
    cp "$SCRIPT_DIR/.env.example" "$SCRIPT_DIR/.env"
    echo "   → Edit .env and replace CHANGE_ME values before production use."
fi
info ".env loaded"
echo ""

# ── 5. Kill old processes on ports 8080 & 3000 ──────────────
echo "Cleaning up ports 8080 and 3000..."
fuser -k 8080/tcp 2>/dev/null || true
fuser -k 3000/tcp 2>/dev/null || true
sleep 2

# ── 6. Launch services ──────────────────────────────────────
echo ""
echo "==================================================="
echo "  Launching APEX-X services..."
echo "==================================================="
echo ""

# Backend
info "Starting backend on :8080"
(cd "$BACKEND_DIR" && PYTHONPATH=.. uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload) &
BACKEND_PID=$!

# Frontend
info "Starting frontend on :3000"
(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

echo ""
info "Backend  PID: $BACKEND_PID"
info "Frontend PID: $FRONTEND_PID"
echo ""
echo "Press Ctrl+C to stop both services."

# Graceful shutdown
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; wait; echo 'Done.'; exit 0" INT TERM

wait
