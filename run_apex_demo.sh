#!/usr/bin/env bash
#
# APEX-X demo launcher for Ubuntu.
#
# Installs dependencies and runs the backend + frontend in the background for a
# local demo. Designed to be light by default: the core stack is SQLite + FastAPI
# + Next.js, no Docker/Postgres/Neo4j/Redis required (those services aren't used
# by the current codebase). Heavy optional pieces (Ollama LLM, apktool/jadx
# decompilers, adb tools) are opt-in via flags/env vars so this doesn't blow up
# a low-resource box by default.
#
# Usage:
#   ./run_apex_demo.sh start [--with-ollama] [--with-android-tools] [--pull-model]
#   ./run_apex_demo.sh stop
#   ./run_apex_demo.sh status
#   ./run_apex_demo.sh logs [backend|frontend]
#
# What "start" does:
#   1. Installs system packages (python3, venv, Node.js 20, default-jre) via apt.
#   2. Creates backend/venv and pip-installs backend/requirements.txt.
#   3. npm-installs the frontend and writes frontend/.env.local pointing at the
#      local backend (http://localhost:8080/api/v1).
#   4. Starts uvicorn (backend, port 8080) and next dev (frontend, port 3000) as
#      background processes, logging to logs/ and tracking PIDs in .pids/.
#
# Optional flags:
#   --with-android-tools   Installs android-tools-adb (needed for the physical-
#                           device pentest / dynamic analysis features).
#   --with-ollama           Installs Ollama (needed for Co-Pilot, PoC narratives,
#                           threat reasoning). Several GB — skip on tight disk.
#   --pull-model            With --with-ollama, also pulls the qwen3:8b model
#                           (~5GB download). Without it Ollama runs but has no
#                           model loaded, so LLM features stay degraded/off.
#
# Everything the app can run without (Ollama, apktool, jadx, adb) degrades
# gracefully — those engines log a warning and skip that step rather than crash.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/.pids"
BACKEND_PORT=8080
FRONTEND_PORT=3000

WITH_ANDROID_TOOLS=0
WITH_OLLAMA=0
PULL_MODEL=0
ACTION="${1:-start}"
shift || true

for arg in "$@"; do
  case "$arg" in
    --with-android-tools) WITH_ANDROID_TOOLS=1 ;;
    --with-ollama) WITH_OLLAMA=1 ;;
    --pull-model) PULL_MODEL=1 ;;
    *) echo "Unknown flag: $arg" >&2; exit 1 ;;
  esac
done

log()  { echo -e "\033[1;36m[apex-x]\033[0m $*"; }
warn() { echo -e "\033[1;33m[apex-x]\033[0m $*" >&2; }
err()  { echo -e "\033[1;31m[apex-x]\033[0m $*" >&2; }

mkdir -p "$LOG_DIR" "$PID_DIR"

# ── stop ─────────────────────────────────────────────────────────────
stop_service() {
  local name="$1"
  local pid_file="$PID_DIR/$name.pid"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      log "Stopping $name (pid $pid)..."
      kill "$pid" 2>/dev/null || true
      sleep 1
      kill -9 "$pid" 2>/dev/null || true
    fi
    rm -f "$pid_file"
  else
    log "$name is not running (no pid file)."
  fi
}

do_stop() {
  stop_service backend
  stop_service frontend
  log "Stopped."
}

# ── status ───────────────────────────────────────────────────────────
do_status() {
  for name in backend frontend; do
    local pid_file="$PID_DIR/$name.pid"
    if [[ -f "$pid_file" ]] && kill -0 "$(cat "$pid_file")" 2>/dev/null; then
      log "$name: RUNNING (pid $(cat "$pid_file"))"
    else
      log "$name: stopped"
    fi
  done
}

do_logs() {
  local which="${1:-}"
  if [[ "$which" == "backend" ]]; then
    tail -n 100 -f "$LOG_DIR/backend.log"
  elif [[ "$which" == "frontend" ]]; then
    tail -n 100 -f "$LOG_DIR/frontend.log"
  else
    tail -n 50 "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log"
  fi
}

# ── system packages ─────────────────────────────────────────────────
install_system_deps() {
  if ! command -v apt-get >/dev/null 2>&1; then
    err "This script targets Ubuntu/Debian (apt-get not found). Install dependencies manually and re-run with just 'start' skipped, or adapt this script."
    exit 1
  fi

  log "Installing system packages (requires sudo)..."
  sudo apt-get update -y
  sudo apt-get install -y \
    python3 python3-venv python3-pip \
    default-jre-headless \
    unzip curl git build-essential

  if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | sed 's/v//' | cut -d. -f1)" -lt 18 ]]; then
    log "Installing Node.js 20.x (NodeSource)..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
  else
    log "Node.js $(node -v) already installed, skipping."
  fi

  if [[ "$WITH_ANDROID_TOOLS" == "1" ]]; then
    log "Installing android-tools-adb (for pentest/dynamic analysis)..."
    sudo apt-get install -y android-tools-adb
  fi

  if [[ "$WITH_OLLAMA" == "1" ]]; then
    if ! command -v ollama >/dev/null 2>&1; then
      log "Installing Ollama (this may take a while)..."
      curl -fsSL https://ollama.com/install.sh | sh
    else
      log "Ollama already installed, skipping."
    fi
  fi
}

# ── backend setup ────────────────────────────────────────────────────
setup_backend() {
  log "Setting up backend virtualenv..."
  cd "$BACKEND_DIR"
  if [[ ! -d venv ]]; then
    python3 -m venv venv
  fi
  # shellcheck disable=SC1091
  source venv/bin/activate
  pip install --upgrade pip -q
  pip install -r requirements.txt -q
  deactivate

  if [[ ! -f .env ]]; then
    log "Writing backend/.env (SQLite, local dev defaults)..."
    local secret
    secret="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
    cat > .env <<EOF
SECRET_KEY=$secret
DATABASE_URL=sqlite:///./apex_x.db
ALLOWED_EMAIL_DOMAIN=@cyber.gov
EOF
  fi

  mkdir -p data/cases data/temp
  cd "$ROOT_DIR"
}

# ── frontend setup ───────────────────────────────────────────────────
setup_frontend() {
  log "Installing frontend dependencies (npm install)..."
  cd "$FRONTEND_DIR"
  npm install --no-audit --no-fund

  if [[ ! -f .env.local ]]; then
    log "Writing frontend/.env.local (pointing at local backend)..."
    cat > .env.local <<EOF
NEXT_PUBLIC_API_URL=http://localhost:$BACKEND_PORT/api/v1
EOF
  fi
  cd "$ROOT_DIR"
}

# ── start services ───────────────────────────────────────────────────
start_backend() {
  log "Starting backend (uvicorn) on port $BACKEND_PORT..."
  cd "$BACKEND_DIR"
  # shellcheck disable=SC1091
  source venv/bin/activate
  PYTHONPATH="$BACKEND_DIR/.." nohup venv/bin/uvicorn app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" \
    > "$LOG_DIR/backend.log" 2>&1 &
  echo $! > "$PID_DIR/backend.pid"
  deactivate
  cd "$ROOT_DIR"
}

start_frontend() {
  log "Starting frontend (next dev) on port $FRONTEND_PORT..."
  cd "$FRONTEND_DIR"
  nohup npm run dev -- --port "$FRONTEND_PORT" > "$LOG_DIR/frontend.log" 2>&1 &
  echo $! > "$PID_DIR/frontend.pid"
  cd "$ROOT_DIR"
}

wait_for_http() {
  local url="$1" name="$2" tries=30
  log "Waiting for $name to come up ($url)..."
  for _ in $(seq 1 "$tries"); do
    if curl -sf "$url" >/dev/null 2>&1; then
      log "$name is up."
      return 0
    fi
    sleep 2
  done
  warn "$name did not respond after $((tries * 2))s — check logs/$name.log"
}

pull_ollama_model() {
  if [[ "$WITH_OLLAMA" == "1" && "$PULL_MODEL" == "1" ]]; then
    log "Pulling Ollama model qwen3:8b (this is a large download)..."
    (ollama serve > "$LOG_DIR/ollama.log" 2>&1 &)
    sleep 3
    ollama pull qwen3:8b || warn "Model pull failed — Co-Pilot/PoC/threat-reasoning will run in degraded (no-LLM) mode."
  fi
}

do_start() {
  install_system_deps
  setup_backend
  setup_frontend
  pull_ollama_model

  stop_service backend
  stop_service frontend

  start_backend
  start_frontend

  wait_for_http "http://localhost:$BACKEND_PORT/health" backend
  wait_for_http "http://localhost:$FRONTEND_PORT" frontend

  echo
  log "APEX-X is running:"
  log "  Frontend: http://localhost:$FRONTEND_PORT"
  log "  Backend:  http://localhost:$BACKEND_PORT/api/v1  (docs at /docs)"
  log "  Logs:     $LOG_DIR/backend.log , $LOG_DIR/frontend.log"
  log "  Stop with: ./run_apex_demo.sh stop"
  if [[ "$WITH_OLLAMA" != "1" ]]; then
    log "Note: Ollama wasn't installed, so Co-Pilot/PoC narratives/threat reasoning run in degraded (template) mode. Re-run with --with-ollama --pull-model to enable them."
  fi
  if [[ "$WITH_ANDROID_TOOLS" != "1" ]]; then
    log "Note: android-tools-adb wasn't installed, so the manual pentest / physical-device feature is unavailable. Re-run with --with-android-tools to enable it."
  fi
}

case "$ACTION" in
  start) do_start ;;
  stop) do_stop ;;
  status) do_status ;;
  logs) do_logs "${1:-}" ;;
  *) echo "Usage: $0 {start|stop|status|logs [backend|frontend]} [--with-ollama] [--with-android-tools] [--pull-model]" >&2; exit 1 ;;
esac
