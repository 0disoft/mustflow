---
title: mf upgrade
description: 패키지 버전을 확인하고 설치된 mustflow 워크플로우 파일을 안전하게 갱신하는 명령입니다.
---

`mf upgrade`는 mustflow 패키지를 갱신한 뒤 프로젝트 안에서 실행하는 단일 갱신 명령입니다.

먼저 현재 CLI 패키지가 npm 최신 버전인지 확인합니다. 패키지가 최신이면 `mf update --apply`와 같은 안전 정책으로 프로젝트 안의 mustflow 파일 갱신을 시도합니다.

이 명령은 패키지를 설치하지 않습니다. 패키지 관리자 업데이트는 저장소 파일 갱신과 권한 성격이 다르므로 mustflow 바깥 단계로 남깁니다.

## 일반 흐름

```sh
bun add -g mustflow@latest
mf upgrade
```

mustflow를 설치할 때 쓴 패키지 관리자로 먼저 mustflow 패키지를 갱신한 뒤, mustflow가 설치된 각 프로젝트 폴더에서 `mf upgrade`를 실행하세요. 설치된 패키지가 뒤처져 있으면 `mf upgrade`는 npm, Bun, pnpm, Yarn, Deno용 업데이트 명령을 출력하고 프로젝트 파일을 건드리기 전에 멈춥니다.

## 안전 규칙

`mf upgrade`는 번들 템플릿 갱신 계획에 차단 항목이 없을 때만 프로젝트 파일을 씁니다.

- `Blocked local changes`가 `0`이어야 합니다.
- `Manual review`가 `0`이어야 합니다.
- 템플릿 매니페스트에 있는 `update`, `create` 항목만 쓸 수 있습니다.
- 기존 파일을 교체하기 전 `.mustflow/backups/<timestamp>/` 아래에 백업을 만듭니다.

npm에 더 새 mustflow 패키지가 있으면 `mf upgrade`는 프로젝트 파일을 건드리기 전에 멈추고 패키지 관리자별 업데이트 명령을 출력합니다. 패키지를 먼저 갱신한 뒤 다시 `mf upgrade`를 실행하세요.

## 드라이런

```sh
mf upgrade --dry-run
```

`--dry-run`은 패키지 상태를 확인하고 프로젝트 갱신 계획만 출력합니다. 파일은 쓰지 않습니다.

적용 전에 제한된 차이 미리보기가 필요하면 `mf update --dry-run --diff`를 사용하세요.

## 종료 코드

- `0`: 패키지가 최신이고 프로젝트 갱신 확인이 완료되었습니다.
- `1`: 패키지 업데이트가 필요하거나, 프로젝트 갱신 차단 항목이 있거나, 입력이 잘못되었습니다.
