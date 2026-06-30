#!/usr/bin/env bash
set -euo pipefail

# Pull latest rhwp upstream, build WASM, sync rhwp-studio UI, and apply desktop overlay.
#
# Run from repo root:
#   ./scripts/build-rhwp-wasm-and-sync.sh
#
# Environment overrides:
#   RHWP_DIR          Local rhwp clone (default: clone/update in .cache/rhwp-upstream)
#   RHWP_REPO         Git remote (default: https://github.com/edwardkim/rhwp.git)
#   RHWP_REF          Branch/tag/commit (default: main)
#   RHWP_BUILD_METHOD wasm-pack | docker | auto (default: auto)
#   RHWP_SKIP_FETCH=1 Skip git fetch/pull on RHWP_DIR
#   RHWP_SKIP_WASM=1  Skip WASM build (UI sync only)
#   RHWP_SKIP_UI=1    Skip UI sync (WASM only)
#   OUT_DIR           WASM vendor dir (default: core/pkg)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UI_DIR="${ROOT_DIR}/ui"
OVERLAY_DIR="${UI_DIR}/desktop-overlay"
OUT_DIR="${OUT_DIR:-${ROOT_DIR}/core/pkg}"
RHWP_REPO="${RHWP_REPO:-https://github.com/edwardkim/rhwp.git}"
RHWP_REF="${RHWP_REF:-main}"
RHWP_BUILD_METHOD="${RHWP_BUILD_METHOD:-auto}"

if [[ -n "${RHWP_DIR:-}" ]]; then
  RHWP_DIR="$(cd "${RHWP_DIR}" && pwd)"
else
  RHWP_DIR="${ROOT_DIR}/.cache/rhwp-upstream"
fi

log() { echo "[hwp-editor] $*"; }

sed_inplace() {
  local file=$1
  shift
  if [[ "$(uname -s)" == "Darwin" ]]; then
    sed -i '' "$@" "$file"
  else
    sed -i "$@" "$file"
  fi
}

# rhwp stores large test PDFs in Git LFS; we only need source for WASM/UI builds.
export GIT_LFS_SKIP_SMUDGE="${GIT_LFS_SKIP_SMUDGE:-1}"

git_rhwp() {
  git -C "${RHWP_DIR}" "$@"
}

repair_rhwp_checkout() {
  if git_rhwp rev-parse HEAD >/dev/null 2>&1 \
    && [[ -f "${RHWP_DIR}/Cargo.toml" ]] \
    && [[ -d "${RHWP_DIR}/rhwp-studio" ]]; then
    return 0
  fi

  log "repairing rhwp checkout (skipping Git LFS downloads)"
  git_rhwp lfs install --skip-smudge --local >/dev/null 2>&1 || true

  if git_rhwp rev-parse HEAD >/dev/null 2>&1; then
    GIT_LFS_SKIP_SMUDGE=1 git_rhwp reset --hard HEAD
    GIT_LFS_SKIP_SMUDGE=1 git_rhwp clean -fd
  elif git_rhwp rev-parse "origin/${RHWP_REF}" >/dev/null 2>&1; then
    GIT_LFS_SKIP_SMUDGE=1 git_rhwp checkout -f "origin/${RHWP_REF}"
  else
    GIT_LFS_SKIP_SMUDGE=1 git_rhwp checkout -f "${RHWP_REF}"
  fi

  if [[ ! -f "${RHWP_DIR}/Cargo.toml" ]] || [[ ! -d "${RHWP_DIR}/rhwp-studio" ]]; then
    echo "rhwp checkout incomplete — remove ${RHWP_DIR} and re-run this script" >&2
    return 1
  fi
}

ensure_rhwp_repo() {
  if [[ ! -d "${RHWP_DIR}/.git" ]]; then
    log "cloning rhwp (${RHWP_REF}) into ${RHWP_DIR} (Git LFS smudge skipped)"
    mkdir -p "$(dirname "${RHWP_DIR}")"
    GIT_LFS_SKIP_SMUDGE=1 git clone --filter=blob:none --branch "${RHWP_REF}" "${RHWP_REPO}" "${RHWP_DIR}" || {
      # Clone can succeed while checkout fails on LFS; repair if objects were received.
      if [[ -d "${RHWP_DIR}/.git" ]]; then
        repair_rhwp_checkout
      else
        return 1
      fi
    }
    repair_rhwp_checkout
    return
  fi

  if [[ "${RHWP_SKIP_FETCH:-0}" == "1" ]]; then
    log "using existing rhwp at ${RHWP_DIR} (fetch skipped)"
    repair_rhwp_checkout
    return
  fi

  log "updating rhwp at ${RHWP_DIR} (Git LFS smudge skipped)"
  git_rhwp lfs install --skip-smudge --local >/dev/null 2>&1 || true
  GIT_LFS_SKIP_SMUDGE=1 git_rhwp fetch origin "${RHWP_REF}" --tags
  if ! GIT_LFS_SKIP_SMUDGE=1 git_rhwp checkout -f "${RHWP_REF}"; then
    GIT_LFS_SKIP_SMUDGE=1 git_rhwp checkout -f "origin/${RHWP_REF}"
  fi
  GIT_LFS_SKIP_SMUDGE=1 git_rhwp pull --ff-only origin "${RHWP_REF}" || true
  repair_rhwp_checkout
}

build_wasm_docker() {
  if [[ ! -f "${RHWP_DIR}/.env.docker" ]]; then
    if [[ -f "${RHWP_DIR}/.env.docker.example" ]]; then
      cp "${RHWP_DIR}/.env.docker.example" "${RHWP_DIR}/.env.docker"
    else
      echo "missing ${RHWP_DIR}/.env.docker and .env.docker.example" >&2
      return 1
    fi
  fi
  docker compose --env-file "${RHWP_DIR}/.env.docker" \
    -f "${RHWP_DIR}/docker-compose.yml" run --rm wasm
}

build_wasm_pack() {
  if ! command -v wasm-pack >/dev/null 2>&1; then
    echo "wasm-pack not found; install from https://rustwasm.github.io/wasm-pack/installer/" >&2
    return 1
  fi
  (cd "${RHWP_DIR}" && wasm-pack build --target web --release)
}

build_wasm() {
  log "building rhwp WASM in ${RHWP_DIR}"
  local method="${RHWP_BUILD_METHOD}"

  if [[ "${method}" == "auto" ]]; then
    if command -v docker >/dev/null 2>&1 \
      && docker info >/dev/null 2>&1 \
      && [[ -f "${RHWP_DIR}/docker-compose.yml" ]]; then
      method="docker"
    else
      method="wasm-pack"
    fi
  fi

  case "${method}" in
    docker)
      build_wasm_docker
      ;;
    wasm-pack)
      build_wasm_pack
      ;;
    *)
      echo "unknown RHWP_BUILD_METHOD=${method}" >&2
      return 1
      ;;
  esac

  if [[ ! -d "${RHWP_DIR}/pkg" ]]; then
    echo "expected ${RHWP_DIR}/pkg after WASM build" >&2
    return 1
  fi

  (cd "${RHWP_DIR}" && bash scripts/prepare-npm.sh)

  mkdir -p "${OUT_DIR}"
  rm -rf "${OUT_DIR:?}/"*
  cp -R "${RHWP_DIR}/pkg/"* "${OUT_DIR}/"

  local version
  version="$(node -p "require('${OUT_DIR}/package.json').version")"
  log "synced @rhwp/core v${version} to ${OUT_DIR}"
}

sync_ui() {
  local studio_dir="${RHWP_DIR}/rhwp-studio"
  if [[ ! -d "${studio_dir}" ]]; then
    echo "missing ${studio_dir}" >&2
    return 1
  fi

  log "syncing rhwp-studio → ui/"
  rsync -a --delete \
    --exclude node_modules \
    --exclude dist \
    --exclude desktop-overlay \
    "${studio_dir}/" "${UI_DIR}/"

  if [[ ! -d "${OVERLAY_DIR}" ]]; then
    echo "missing desktop overlay at ${OVERLAY_DIR}" >&2
    return 1
  fi

  log "applying desktop overlay"
  rsync -a \
    --exclude patches \
    --exclude package.merge.json \
    --exclude README.md \
    "${OVERLAY_DIR}/" "${UI_DIR}/"

  node -e "
const fs = require('fs');
const outPath = process.argv[1];
const mergePath = process.argv[2];
const pkg = JSON.parse(fs.readFileSync(outPath, 'utf8'));
const merge = JSON.parse(fs.readFileSync(mergePath, 'utf8'));
pkg.dependencies = { ...(pkg.dependencies || {}), ...(merge.dependencies || {}) };
fs.writeFileSync(outPath, JSON.stringify(pkg, null, 2) + '\n');
" "${UI_DIR}/package.json" "${OVERLAY_DIR}/package.merge.json"

  while IFS= read -r -d '' file; do
    sed_inplace "$file" \
      -e "s|from '@wasm/rhwp.js'|from '@rhwp/core'|g" \
      -e "s|import('@wasm/rhwp.js')|import('@rhwp/core')|g"
  done < <(find "${UI_DIR}/src" -name '*.ts' -print0)

  if ! grep -q 'setupDesktopOpenHook' "${UI_DIR}/src/main.ts"; then
    patch -d "${UI_DIR}" -p1 < "${OVERLAY_DIR}/patches/main.ts.desktop.patch"
  fi

  if ! grep -q 'hwpDesktop' "${UI_DIR}/src/command/commands/file.ts"; then
    patch -d "${UI_DIR}" -p1 < "${OVERLAY_DIR}/patches/file.ts.desktop.patch"
  fi

  local ui_version wasm_version
  ui_version="$(node -p "require('${UI_DIR}/package.json').version")"
  wasm_version="$(node -p "require('${OUT_DIR}/package.json').version")"
  log "UI package version ${ui_version}, WASM ${wasm_version}"

  log "installing ui dependencies (@rhwp/core → core/pkg)"
  (cd "${UI_DIR}" && npm install)
}

main() {
  ensure_rhwp_repo

  if [[ "${RHWP_SKIP_WASM:-0}" != "1" ]]; then
    build_wasm
  elif [[ ! -f "${OUT_DIR}/package.json" ]]; then
    echo "RHWP_SKIP_WASM=1 but ${OUT_DIR}/package.json is missing" >&2
    exit 1
  fi

  if [[ "${RHWP_SKIP_UI:-0}" != "1" ]]; then
    sync_ui
  fi

  log "done — run ./run-desktop.sh or ./build.sh to build the desktop app"
}

main
