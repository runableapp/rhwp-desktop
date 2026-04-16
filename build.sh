#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[hwp-editor] build (ui + desktop) and create AppImage"
cd "${ROOT_DIR}/desktop"

# This builds UI + desktop, prepares icons, then outputs AppImage to desktop/release/
npm run dist:linux

echo "[hwp-editor] done"
echo "[hwp-editor] AppImage: desktop/release/*.AppImage"

