---
title: CLI 출력 계약
description: mf 명령이 도움말, 오류, 종료 코드를 어떤 형식으로 보여줘야 하는지 설명합니다.
---

`mf` 명령은 에이전트와 사람이 같은 출력을 보고 다음 행동을 결정할 수 있어야 합니다.

그래서 각 명령 도움말은 가능한 한 같은 순서를 따릅니다.

## 도움말 구성

모든 명령 도움말은 가능하면 다음 항목을 포함합니다.

- `Usage`: 실행 형식입니다.
- `Commands` 또는 `Topics`: 하위 명령 또는 도움말 주제입니다.
- `Options`: 지원하는 선택지입니다.
- `Examples`: 그대로 실행할 수 있는 예시입니다.
- `Exit codes`: 종료 코드의 의미입니다.

예를 들어 `mf check --help`는 검사 명령이 어떤 옵션을 받고, 성공과 실패를 어떤 종료 코드로 알리는지 보여줘야 합니다.

## mustflow 루트 찾기

`mf init`은 현재 폴더에 새 mustflow 문서 흐름을 설치합니다.

그 외 설치 후 명령은 현재 폴더에서 상위로 올라가며 가장 가까운 `.mustflow/` 표시를 찾습니다.
찾은 위치를 현재 mustflow 루트로 보고 파일을 읽거나 씁니다.

이 규칙은 다음 명령에 적용됩니다.

- `mf check`
- `mf status`
- `mf context`
- `mf update`
- `mf map`
- `mf help`
- `mf run`

예를 들어 사용자가 `src/feature/deep`에서 `mf check --strict`를 실행해도,
상위에 있는 `.mustflow/config/mustflow.toml`을 찾으면 그 위치를 기준으로 검사합니다.
`mf map --write`, `mf run <intent> --json`도 같은 루트에 `REPO_MAP.md`와
`.mustflow/state/runs/latest.json`을 씁니다.

## CLI 출력 언어

`--lang`은 CLI 고정 문구 언어를 고르는 전역 옵션입니다.
현재 값은 `en`, `ko`, `zh`, `es`, `fr`, `hi`입니다. `zh`, `es`, `fr`,
`hi` 카탈로그는 번역 전까지 영어 문구를 사용합니다.

```sh
mf --lang en help
mf --lang ko help
mf --lang zh help
mf --lang es help
mf --lang fr help
mf --lang hi help
```

`--lang`은 `mf init --locale`과 다릅니다. `--lang`은 터미널 도움말과 오류 안내 문구 언어를, `--locale`은 설치할 mustflow 문서 언어를 정합니다.

설치된 `.mustflow/` 파일에서 읽어오는 설명값은 자동 번역하지 않습니다. 예를 들어 `commands.toml`의 `description`은 파일에 적힌 그대로 보여주고, `명령어`, `선호값`, `경로` 같은 주변 레이블만 CLI 언어를 따릅니다.

## 오류 형식

사용자가 알 수 없는 명령이나 옵션을 입력하면 오류는 표준 문장으로 시작합니다.

```text
Error: Unknown option: --bad
Run `mf check --help` for usage.
```

한국어 출력에서는 같은 구조를 유지하되 고정 문구를 번역합니다.

```text
오류: Unknown option: --bad
사용법은 `mf check --help` 명령으로 확인하세요.
```

오류 이유는 `stderr`에 출력하고, 함께 참고할 사용법은 `stdout`에 출력할 수 있습니다. 자동화에서 구조화된 결과가 필요하면 `--json`을 지원하는 명령을 사용합니다.

## 종료 코드

- `0`: 요청한 정보 출력, 검사 성공, 계획 계산 성공처럼 명령이 정상적으로 끝난 상태입니다.
- `1`: 잘못된 입력, 검증 실패, 차단된 변경, 아직 지원하지 않는 동작처럼 사용자가 다음 행동을 해야 하는 상태입니다.

현재 CLI는 종료 코드를 크게 두 단계로만 나눕니다. 더 세분화된 코드는 자동화 사례가 충분히 쌓인 뒤 도입합니다.

## JSON 출력

`mf check`, `mf status`, `mf update --dry-run`은 `--json`을 지원합니다.

JSON 출력은 에이전트와 스크립트가 읽기 위한 인터페이스입니다. 사람이 읽는 도움말 문구를 파싱하지 말고 JSON 필드를 사용해야 합니다.
