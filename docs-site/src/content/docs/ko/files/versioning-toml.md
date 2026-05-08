---
title: versioning.toml
description: 저장소별 버전 기준 파일을 선언하는 선택 설정 파일입니다.
---

`.mustflow/config/versioning.toml`은 선택 파일입니다. 자동 탐지만으로 저장소의 실제 버전 기준 원본을 분명히 알기 어려울 때만 둡니다.

`mf init`은 이 파일을 기본 설치하지 않습니다.

## 기본 형태

```toml
schema_version = "1"

[[sources]]
path = "package.json"
kind = "package_manifest"
authority = "source"
description = "배포 패키지 버전."
```

## 필드

- `schema_version`: 파일 형식 버전입니다. `"1"`을 사용합니다.
- `sources`: 하나 이상의 버전 기준 원본 선언입니다.
- `sources.path`: mustflow 루트 안의 버전 파일 상대 경로입니다.
- `sources.kind`: `package_manifest`, `template_manifest`, `template_lock` 중 하나입니다.
- `sources.authority`: 이 파일이 버전을 직접 소유하면 `source`, 다른 기준을 따라가는 값이면 `derived`입니다.
- `sources.description`: 사람이 읽을 짧은 설명입니다. 선택 항목입니다.

## 동작

`mf version-sources`는 선언된 항목을 포함하고, JSON 출력에서는 `declared = true`로 표시합니다.

`mf check`는 파일이 있을 때 기본 형식을 검사합니다. `mf check --strict`는 선언된 기준 파일 경로가 실제로 존재하지 않는 경우도 보고합니다.

이 파일은 릴리스, 커밋, 태그, 푸시, 버전 판올림 권한을 주지 않습니다. 그런 작업은 여전히 사용자 직접 지시, 호스트 규칙, 설정된 명령 계약을 따릅니다.
