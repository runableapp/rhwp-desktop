#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${ROOT_DIR}/build-resources/icon.png"
OUT_DIR="${ROOT_DIR}/build-resources/icon.iconset"
OUT_ICNS="${ROOT_DIR}/build-resources/icon.icns"

rm -rf "${OUT_DIR}"
mkdir -p "${OUT_DIR}"

declare -a sizes=(16 32 64 128 256 512)

for s in "${sizes[@]}"; do
  sips -z "${s}" "${s}" "${SRC}" --out "${OUT_DIR}/icon_${s}x${s}.png" >/dev/null
  sips -z "$((s*2))" "$((s*2))" "${SRC}" --out "${OUT_DIR}/icon_${s}x${s}@2x.png" >/dev/null
done

iconutil -c icns "${OUT_DIR}" -o "${OUT_ICNS}"
echo "[icons] wrote ${OUT_ICNS}"

