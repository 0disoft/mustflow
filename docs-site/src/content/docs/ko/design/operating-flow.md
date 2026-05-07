---
title: 기본 운영 흐름
description: 사용자가 mustflow를 설치한 뒤 권장되는 mf 명령 실행 순서입니다.
---

mustflow의 기본 흐름은 파일을 많이 만들기보다 현재 루트가 에이전트에게 읽힐 준비가 되었는지 확인하는 데 맞춰져 있습니다.

## 설치 전 확인

처음에는 실제 쓰기 전에 설치 계획부터 확인합니다.

```sh
npx mf init --dry-run
```

기존 `AGENTS.md`나 `.mustflow/` 파일과 충돌할 수 있으므로, 먼저 어떤 파일이 생성될지 확인합니다.

## 초기화

계획이 맞으면 초기화를 진행합니다.

```sh
npx mf init --yes
```

이미 `AGENTS.md`가 있고 mustflow 관리 블록만 추가하면 될 때는 `--merge`를 사용합니다. 기존 파일 전체를 덮어써야 할 때만 `--force`를 사용합니다.

## 검증

초기화 후에는 워크플로 문서와 설정이 유효한지 검사합니다.

```sh
npx mf check
npx mf check --json
```

사람이 직접 확인할 때는 일반 출력을, 에이전트나 자동화가 판단할 때는 JSON 출력을 사용합니다.

## 상태 확인

설치 이후 파일이 바뀌었는지는 상태 명령으로 확인합니다.

```sh
npx mf status
npx mf status --json
```

`manifest.lock.toml`에 기록된 설치 당시 기준선과 현재 파일을 비교해 변경 파일과 누락 파일을 보여줍니다.

## 갱신 미리보기

새 mustflow 템플릿으로 갱신할 항목이 있는지는 쓰기 전에 미리 확인합니다.

```sh
npx mf update --dry-run
npx mf update --dry-run --json
```

계획이 안전하다면 템플릿 갱신을 명시적으로 적용합니다.

```sh
npx mf update --apply
```

`mf update --apply`는 설치 당시 기준선과 아직 같은 파일만 씁니다.
로컬 수정 파일이나 새 파일 충돌은 차단 항목으로 보고합니다.

## 탐색 지도 생성

에이전트가 현재 루트의 주요 파일을 빠르게 찾게 하려면 탐색 지도를 생성합니다.

```sh
npx mf map --write
```

작업 공간 루트에서 설정된 하위 저장소 진입점까지 보고 싶을 때만 다음 명령을 사용합니다.

```sh
npx mf map --write --include-nested
```

`REPO_MAP.md`는 전체 파일 목록이 아니라, 현재 mustflow 루트의 앵커 파일 지도입니다.
