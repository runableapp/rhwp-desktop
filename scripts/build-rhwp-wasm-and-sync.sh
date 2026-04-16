#!/usr/bin/env bash
set -euo pipefail

# Builds the `rhwp` WASM package (via Docker) and syncs the generated `pkg/` into this repo at `core/pkg/`.
#
# Run from this repo root:
#   ./scripts/build-rhwp-wasm-and-sync.sh
#
# Optional env overrides:
#   RHWP_DIR=/path/to/rhwp OUT_DIR=/path/to/hwp-editor/core/pkg ./scripts/build-rhwp-wasm-and-sync.sh

RHWP_DIR="${RHWP_DIR:-/home/keith/workspace/_someone_else/rhwp}"
OUT_DIR="${OUT_DIR:-/home/keith/workspace/hwp-editor/core/pkg}"

echo "[hwp-editor] building rhwp wasm in: ${RHWP_DIR}"

if [[ ! -f "${RHWP_DIR}/.env.docker" ]]; then
  if [[ -f "${RHWP_DIR}/.env.docker.example" ]]; then
    cp "${RHWP_DIR}/.env.docker.example" "${RHWP_DIR}/.env.docker"
  else
    echo "missing ${RHWP_DIR}/.env.docker and .env.docker.example" >&2
    exit 1
  fi
fi

docker compose --env-file "${RHWP_DIR}/.env.docker" -f "${RHWP_DIR}/docker-compose.yml" run --rm wasm

if [[ ! -d "${RHWP_DIR}/pkg" ]]; then
  echo "expected ${RHWP_DIR}/pkg after build" >&2
  exit 1
fi

mkdir -p "${OUT_DIR}"
rm -rf "${OUT_DIR:?}/"*
cp -R "${RHWP_DIR}/pkg/"* "${OUT_DIR}/"
echo "[hwp-editor] synced wasm pkg to: ${OUT_DIR}"

