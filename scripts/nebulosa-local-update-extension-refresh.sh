#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
EXT_DIR="${REPO_DIR}/apps/extension-nebulosa-control"

echo "=========================================="
echo " NEBULOSA — LOCAL UPDATE + EXTENSION REFRESH"
echo "=========================================="
echo

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "❌ Repo not found: $REPO_DIR"
  exit 1
fi

if [ ! -d "$EXT_DIR" ]; then
  echo "❌ Extension dir not found: $EXT_DIR"
  exit 1
fi

cd "$REPO_DIR"

echo "📍 Repo: $(pwd)"
echo
echo "1) Syncing latest main..."
git fetch origin
git checkout main
git pull origin main

echo
echo "2) Latest commits:"
git log --oneline -n 5

cd "$EXT_DIR"

echo
echo "3) Installing dependencies..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm install
else
  echo "❌ pnpm not found."
  echo "Install with: brew install pnpm"
  exit 1
fi

echo
echo "4) Building extension..."
if pnpm run client:build; then
  echo "✅ Build finished"
else
  echo "❌ Build failed"
  exit 1
fi

echo
echo "5) Build output check..."
echo "Current dir: $(pwd)"
echo
echo "--- ../dist ---"
ls -la ../dist 2>/dev/null || true
echo
echo "--- ../dist/public ---"
ls -la ../dist/public 2>/dev/null || true
echo
echo "--- ../dist/public/assets ---"
ls -la ../dist/public/assets 2>/dev/null || true

echo
echo "=========================================="
echo " MANUAL STEPS NOW"
echo "=========================================="
echo
echo "A. Open chrome://extensions"
echo "B. Turn ON Developer mode"
echo "C. Find Nebulosa Control"
echo "D. Click Reload"
echo
echo "If Reload doesn't work cleanly:"
echo "  1. Remove Nebulosa Control"
echo "  2. Click Load unpacked"
echo "  3. Select: ${EXT_DIR}"
echo
echo "Then:"
echo "  4. Close ALL Zoom tabs"
echo "  5. Open a fresh Zoom web-client link:"
echo "     https://zoom.us/wc/join/MEETING_ID?pwd=..."
echo
echo "IMPORTANT:"
echo "  - /wc/join is the browser version"
echo "  - waiting room is NOT a supported armed state"
echo "  - the extension now waits for real in-meeting readiness"
echo
echo "Optional debug once fully inside the meeting:"
echo "  window.__NEBULOSA_DEBUG = true"
echo
echo "Done."
