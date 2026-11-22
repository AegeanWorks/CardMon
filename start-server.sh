#!/usr/bin/env bash
# ==========================================================================
# CARDMON - ONE-CLICK LOCAL SERVER STARTER (macOS / Linux)
# Makes the script executable, then run it to start the sync server and open
# the APK page. Set CARDMON_PORT to use a different port (default: 8765).
# ==========================================================================
set -e

cd "$(dirname "$0")"
PORT="${CARDMON_PORT:-8765}"

if ! command -v node >/dev/null 2>&1; then
  echo "Why: Node.js was not found on PATH."
  echo "Fix: install Node.js 20 or newer, then run this script again."
  exit 1
fi

echo "Starting CardMon local sync server on port $PORT ..."
node server/index.js --port "$PORT" --host 0.0.0.0 &
SERVER_PID=$!

(
  sleep 2
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:$PORT/apk" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    open "http://localhost:$PORT/apk" >/dev/null 2>&1 || true
  fi
) &

trap 'kill "$SERVER_PID" 2>/dev/null || true' INT TERM
wait "$SERVER_PID"
