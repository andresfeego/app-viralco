#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/.logs"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"
METRO_LOG="$LOG_DIR/metro.log"

mkdir -p "$LOG_DIR" "$ARTIFACTS_DIR"

is_metro_running() {
  curl -fsS "http://127.0.0.1:8081/status" 2>/dev/null | grep -q "packager-status:running"
}

start_metro_if_needed() {
  if is_metro_running; then
    echo "[ios_deploy] Metro already running on 127.0.0.1:8081"
    return
  fi

  "$ROOT_DIR/scripts/ios_metro_daemon.sh" start
}

capture_if_redbox() {
  local redbox_log redbox_hits
  redbox_log="$(xcrun simctl spawn booted log show --last 45s --style compact --predicate 'process == "kaptura" AND (eventMessage CONTAINS[c] "No script URL provided" OR eventMessage CONTAINS[c] "Unable to load script" OR eventMessage CONTAINS[c] "RCTFatal")' || true)"
  redbox_hits="$(printf '%s\n' "$redbox_log" | rg -n 'No script URL provided|Unable to load script|RCTFatal' || true)"

  if [[ -n "${redbox_hits// }" ]]; then
    local timestamp tmp_screenshot project_screenshot
    timestamp="$(date +%Y%m%d-%H%M%S)"
    tmp_screenshot="/tmp/ios-redbox-${timestamp}.png"
    project_screenshot="$ARTIFACTS_DIR/ios-redbox-${timestamp}.png"

    xcrun simctl io booted screenshot "$tmp_screenshot" >/dev/null
    if cp "$tmp_screenshot" "$project_screenshot" 2>/dev/null; then
    echo "[ios_deploy] Redbox detected. Screenshot saved: $project_screenshot"
    else
      echo "[ios_deploy] Redbox detected. Screenshot saved in temp path: $tmp_screenshot"
    fi
    echo "[ios_deploy] Relevant logs:"
    echo "$redbox_hits"
    return 1
  fi

  echo "[ios_deploy] No redbox bundle errors detected"
}

start_metro_if_needed

cd "$ROOT_DIR"
echo "[ios_deploy] Running app on iOS simulator..."
npx react-native run-ios --no-packager

capture_if_redbox
