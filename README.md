# rhwp-desktop (hwp-editor)

`rhwp` 프로젝트의 **WASM 코어 + rhwp-studio UI**를 기반으로 만든 **데스크톱(standalone) 프로그램**입니다.

웹 데모([`edwardkim.github.io/rhwp`](https://edwardkim.github.io/rhwp/))와 동일한 UI/기능을 목표로 하며, Electron으로 패키징합니다.

## rhwp 프로젝트
- 리포: https://github.com/edwardkim/rhwp
- 데모: https://edwardkim.github.io/rhwp

## 기반 프로젝트 / 버전

- **rhwp WASM 코어**: npm 패키지 `@rhwp/core` (버전은 `ui/package.json` 참고)
- **rhwp-studio UI**: `0.7.2` (소스 위치: `ui/`)

## 라이선스

Copyright (c) 2026 Runable.app

이 프로젝트는 `rhwp`와 동일하게 **MIT License**를 따릅니다(상속).  
라이선스 전문은 저장소 루트의 `LICENSE` 파일을 참고하세요.  
WASM 산출물은 npm 의존성(`@rhwp/core`)을 통해 포함되며, 해당 패키지의 라이선스/고지는 `node_modules/@rhwp/core/`를 참조하세요.

## 폴더 구조

- `ui/`: rhwp-studio (Vite)
- `core/pkg/`: (레거시) rhwp WASM 패키지 vendor 디렉토리 — 현재 UI는 npm `@rhwp/core`를 사용
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

### (레거시) WASM 코어(`core/pkg/`) 동기화가 필요한 경우

현재 기본 설정은 npm 의존성(`@rhwp/core`)을 사용하므로, 일반적으로 `core/pkg/` 동기화는 필요하지 않습니다.

다만 아래처럼 **vendor 방식**으로 운용하려면 `core/pkg/`를 다시 빌드/동기화하세요.

- npm 설치 없이 완전 오프라인 빌드가 필요해서 `core/pkg/`를 포함시키는 경우
- 특정 커밋/패치를 적용한 커스텀 `rhwp` WASM을 고정해서 배포하고 싶은 경우

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

