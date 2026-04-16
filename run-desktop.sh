#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "[hwp-editor] build ui"
cd "${ROOT_DIR}/ui"
npm run build

echo "[hwp-editor] build desktop"
cd "${ROOT_DIR}/desktop"
npm run build

echo "[hwp-editor] launch electron"
node node_modules/electron/cli.js dist/main.js

