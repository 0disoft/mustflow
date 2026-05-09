---
title: mf version-sources
description: 감지된 패키지와 템플릿 버전 기준 원본을 확인하는 읽기 전용 명령입니다.
---

`mf version-sources`는 현재 mustflow 루트에서 패키지나 템플릿 버전 기준 원본으로 보이는 파일을 보고합니다. Go 모듈은 `v1.2.3` 같은 시맨틱 버전 릴리스 태그가 함께 있을 때만 `go.mod`를 기준 원본으로 보고합니다. 패키지 잠금 파일은 자동으로 버전 기준 원본으로 보지 않습니다. 저장소가 잠금 파일을 의도적으로 버전 기준 원본으로 쓸 때만 `.mustflow/config/versioning.toml`에 직접 선언합니다. 이 명령은 `.mustflow/config/versioning.toml`에 직접 선언한 기준 원본도 함께 읽습니다.

이 명령은 버전을 수정하거나 태그, 커밋, 푸시를 만들지 않습니다. 에이전트와 향후 대시보드 화면이 `mf check --strict`와 같은 버전 원본 탐지 결과를 확인할 수 있게 하는 읽기 전용 표면입니다.

## 출력

- `mustflow 루트`: 현재 mustflow 루트입니다.
- `버전 관리 선호값`: `[release.versioning]` 선호값이 켜져 있는지 나타냅니다.
- `기준 원본`: 감지되었거나 선언된 파일과 원본 종류입니다.

## 예시

```sh
npx mf version-sources
```

출력 예시는 다음과 같습니다.

```text
mustflow 버전 기준 원본
mustflow 루트: C:\path\to\repo
버전 관리 선호값: 켜짐

기준 원본
- package.json (package_manifest)
```

## JSON 필드

```sh
npx mf version-sources --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `version-sources`입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `versioning_enabled` (`boolean`): 버전 영향 선호값이 켜져 있는지 나타냅니다.
- `sources` (`object[]`): `path`, `kind`, 그리고 선택적인 `declared`, `authority`를 가진 버전 기준 원본 목록입니다.

## 도움말 및 종료 코드

```sh
npx mf version-sources --help
```

- 종료 코드 `0`: 버전 기준 원본을 확인하고 출력했습니다.
- 종료 코드 `1`: 알 수 없는 옵션이 제공되었습니다.
