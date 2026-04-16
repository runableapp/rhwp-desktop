# rhwp-desktop (hwp-editor)

`rhwp` 프로젝트의 **WASM 코어 + rhwp-studio UI**를 기반으로 만든 **데스크톱(standalone) 프로그램**입니다.

웹 데모([`edwardkim.github.io/rhwp`](https://edwardkim.github.io/rhwp/))와 동일한 UI/기능을 목표로 하며, Electron으로 패키징합니다.

## rhwp 프로젝트
- 리포: https://github.com/edwardkim/rhwp
- 데모: https://edwardkim.github.io/rhwp

## 기반 프로젝트 / 버전

- **rhwp WASM 코어**: `0.7.2` (동기화 위치: `core/pkg/`)
- **rhwp-studio UI**: `0.7.2` (소스 위치: `ui/`)

## 라이선스

Copyright (c) 2026 Runable.app

이 프로젝트는 `rhwp`와 동일하게 **MIT License**를 따릅니다(상속).  
라이선스 전문은 저장소 루트의 `LICENSE` 파일을 참고하세요.  
WASM 산출물 및 라이선스 고지는 `core/pkg/` 내 파일을 참조하세요.

## 폴더 구조

- `ui/`: rhwp-studio (Vite)
- `core/pkg/`: rhwp WASM 패키지(`rhwp_bg.wasm`, `rhwp.js`, `rhwp.d.ts` 등)
- `desktop/`: Electron 앱(파일 열기/저장 IPC 포함)
- `run-desktop.sh`: 빌드 후 Electron 실행 스크립트

## 실행

```bash
cd hwp-editor
./run-desktop.sh
```

## 빌드 (전체 + AppImage)

한 번에 UI/데스크톱을 빌드하고 Linux AppImage까지 생성합니다.

```bash
cd hwp-editor
./build.sh
```

결과 AppImage는 `desktop/release/` 아래에 생성됩니다.

### WASM 코어(`core/pkg/`) 동기화가 필요한 경우

`build.sh`는 `core/pkg/`에 이미 `rhwp` WASM 패키지(`rhwp_bg.wasm`, `rhwp.js`, `rhwp.d.ts` 등)가 준비되어 있다고 가정합니다. 아래 상황에서는 먼저 WASM 코어를 다시 빌드/동기화하세요.

- `core/pkg/`가 비어있거나 누락된 경우 (초기 설정/클린 상태)
- 외부 `rhwp` 체크아웃을 업데이트(브랜치/커밋 변경 포함)했고, 최신 WASM 코어를 반영하고 싶은 경우
- `rhwp` 코어를 수정했는데 데스크톱 앱이 이전 동작을 유지하는 등 `core/pkg/`가 stale로 의심되는 경우

동기화 스크립트는 **외부 `rhwp` 저장소**에서 Docker로 WASM을 빌드한 뒤, 생성된 `pkg/`를 이 저장소의 `core/pkg/`로 복사합니다.

```bash
cd hwp-editor
./scripts/build-rhwp-wasm-and-sync.sh
```

`rhwp` 저장소 경로를 바꾸려면 `RHWP_DIR`를 지정하세요.

```bash
RHWP_DIR=/path/to/rhwp ./scripts/build-rhwp-wasm-and-sync.sh
```

## Linux AppImage 빌드

```bash
cd hwp-editor/desktop
npm run dist:linux
```

결과물은 `desktop/release/` 아래에 생성됩니다.

