---
title: mf next
description: mustflow 루트의 다음 행동을 읽기 전용으로 안내합니다.
---

`mf next`는 현재 mustflow 루트를 확인하고 다음 안전한 행동을 출력합니다.

설치 상태, mustflow 검증 상태, 변경 파일, 검증 요구사항, 실행 가능한 configured intent, 명령 계약 구멍을 확인합니다. 명령을 실행하거나 파일을 수정하거나 명령 권한을 부여하지 않습니다.

변경 파일에 실행 가능한 configured 검증이 없으면 패키지 매니저 명령을 추측하지 않고 `mf onboard commands`와 verification-plan API를 안내합니다.

## 예시

```sh
npx mf next
npx mf next --json
```

## JSON 필드

```sh
npx mf next --json
```

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `next`입니다.
- `status` (`string`): `setup_required`, `blocked`, `idle`, `needs_verification`, `unavailable` 중 하나입니다.
- `policy` (`object`): 보고서가 읽기 전용이며 `.mustflow/config/commands.toml`이 명령 권한이라는 점을 표시합니다.
- `state` (`object`): 설치, 검증, 변경 파일, 선택된 intent, gap 요약입니다.
- `decision` (`object`): 안전하게 제안할 수 있는 명령을 포함한 주요 다음 행동입니다.
- `recommended_commands` (`string[]`): 확인, 설정, 검증을 위한 보조 mustflow 명령입니다.
- `gaps` (`object[]`): 실행 가능한 configured 명령이 덮지 못한 검증 요구사항입니다.

## 도움말과 종료 코드

```sh
npx mf next --help
```

- 종료 코드 `0`: 다음 행동을 확인했습니다.
- 종료 코드 `1`: 저장소 상태를 확인할 수 없어 다음 행동을 확인하지 못했습니다.
