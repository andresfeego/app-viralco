#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ARTIFACTS_DIR="$ROOT_DIR/artifacts"
mkdir -p "$ARTIFACTS_DIR"

TARGET="$ARTIFACTS_DIR/ios-sim-$(date +%Y%m%d-%H%M%S).png"
xcrun simctl io booted screenshot "$TARGET" >/dev/null

echo "$TARGET"
