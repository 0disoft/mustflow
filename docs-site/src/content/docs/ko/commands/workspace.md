---
title: mf workspace
description: configured workspace root와 nested repository 계약을 읽기 전용으로 확인합니다.
---

`mf workspace status`는 configured workspace root와 발견된 nested repository를 확인합니다.
`mf workspace command-catalog`는 발견된 각 repository의 command intent 사용 가능 상태를 모읍니다.
`mf workspace verify --changed --plan-only`는 발견된 각 repository의 changed-file verification plan을 모읍니다.

명령을 실행하거나 파일을 수정하거나 원본 command string을 노출하지 않으며, 부모 저장소가 자식 저장소에 명령 권한을 부여하지도 않습니다. 발견된 각 저장소는 자기 `.mustflow/config/commands.toml`만 명령 권한으로 유지합니다.

## 예시

```sh
npx mf workspace status
npx mf workspace status --json
npx mf workspace command-catalog --json
npx mf workspace verify --changed --plan-only --json
```

## JSON 필드

```sh
npx mf workspace status --json
```

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `workspace status`입니다.
- `workspace` (`object`): `.mustflow/config/mustflow.toml`의 workspace scan 설정입니다.
- `policy` (`object`): 보고서가 읽기 전용이며 명령 권한을 부여하지 않는다는 점을 표시합니다.
- `repositories` (`object[]`): 발견된 nested git repository와 각 로컬 mustflow contract 상태입니다.
- `issues` (`string[]`): 읽기 전용 discovery 또는 parsing 문제입니다.

`mf workspace command-catalog --json`에서는 `command`가 항상 `workspace command-catalog`이며, 각 repository 항목에 intent 사용 가능 상태, `mf run <intent>` 진입점, 그리고 그 명령을 실행해야 하는 repository path가 들어갑니다.

`mf workspace verify --changed --plan-only --json`에서는 `command`가 항상 `workspace verify`이며, 각 repository 항목에 changed files, selected intents, gaps, 그리고 선택된 `mf run <intent>`를 실행해야 하는 repository path가 들어갑니다.

## 도움말과 종료 코드

```sh
npx mf workspace --help
```

- 종료 코드 `0`: workspace 상태를 확인했습니다.
- 종료 코드 `1`: 명령 입력이 잘못되었습니다.
