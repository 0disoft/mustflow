---
title: mf workspace
description: 작업공간과 그 아래 Git 저장소의 Mustflow 준비 상태를 확인합니다.
---

`mf workspace status`는 설정된 작업공간과 그 아래에서 발견한 Git 저장소를 확인합니다.
`mf workspace command-catalog`는 저장소마다 사용할 수 있는 `intent`를 모아 보여줍니다.
`mf workspace verify --changed --plan-only`는 저장소마다 바뀐 파일에 필요한 검사를 모아 보여줍니다.

이 명령들은 다른 명령을 실행하거나 파일을 수정하지 않으며, 원본 명령 문자열도 보여주지 않습니다. 각 저장소에서 실행할 수 있는 명령은 그 저장소의 `.mustflow/config/commands.toml`이 정합니다.

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
- `workspace` (`object`): `.mustflow/config/mustflow.toml`의 작업공간 검색 설정입니다.
- `policy` (`object`): 보고서가 읽기 전용이며 명령 권한을 부여하지 않는다는 점을 표시합니다.
- `repositories` (`object[]`): 발견한 하위 Git 저장소와 각 저장소의 Mustflow 준비 상태입니다.
- `issues` (`string[]`): 저장소 검색이나 입력 해석 중 발견한 문제입니다.

`mf workspace command-catalog --json`에서는 `command`가 항상 `workspace command-catalog`이며, 각 저장소 항목에 `intent` 사용 가능 상태, `mf run <intent>` 호출 방법, 명령을 실행할 저장소 경로가 들어갑니다.

`mf workspace verify --changed --plan-only --json`에서는 `command`가 항상 `workspace verify`이며, 각 저장소 항목에 바뀐 파일, 선택된 `intent`, 빠진 검사, 명령을 실행할 저장소 경로가 들어갑니다.

## 도움말과 종료 코드

```sh
npx mf workspace --help
```

- 종료 코드 `0`: workspace 상태를 확인했습니다.
- 종료 코드 `1`: 명령 입력이 잘못되었습니다.
