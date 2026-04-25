#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
METRO_LOG="$LOG_DIR/metro.log"
METRO_PID_FILE="$LOG_DIR/metro.pid"

mkdir -p "$LOG_DIR"

is_running() {
  curl -fsS "http://127.0.0.1:8081/status" 2>/dev/null | grep -q "packager-status:running"
}

cleanup_stale_pid() {
  if [[ -f "$METRO_PID_FILE" ]]; then
    local pid
    pid="$(cat "$METRO_PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && ! kill -0 "$pid" 2>/dev/null; then
      rm -f "$METRO_PID_FILE"
    fi
  fi
}

start() {
  cleanup_stale_pid

  if is_running; then
    echo "metro: running"
    exit 0
  fi

  echo "metro: starting"
  nohup npx react-native start --host 127.0.0.1 --port 8081 --no-interactive >"$METRO_LOG" 2>&1 &
  local pid=$!
  disown "$pid" 2>/dev/null || true
  echo "$pid" > "$METRO_PID_FILE"

  for _ in $(seq 1 40); do
    if is_running; then
      echo "metro: ready"
      exit 0
    fi
    sleep 1
  done

  echo "metro: failed to start"
  tail -n 80 "$METRO_LOG" || true
  exit 1
}

stop() {
  local killed=0

  if [[ -f "$METRO_PID_FILE" ]]; then
    local pid
    pid="$(cat "$METRO_PID_FILE" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" || true
      killed=1
    fi
    rm -f "$METRO_PID_FILE"
  fi

  local pids
  pids="$(lsof -ti tcp:8081 -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    while IFS= read -r p; do
      [[ -n "$p" ]] || continue
      kill "$p" || true
      killed=1
    done <<< "$pids"
  fi

  if [[ "$killed" -eq 1 ]]; then
    echo "metro: stopped"
  else
    echo "metro: not running"
  fi
}

status() {
  if is_running; then
    echo "metro: running"
    exit 0
  fi

  echo "metro: stopped"
  exit 1
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  status)
    status
    ;;
  restart)
    stop
    start
    ;;
  *)
    echo "Usage: $0 {start|stop|status|restart}"
    exit 2
    ;;
esac
