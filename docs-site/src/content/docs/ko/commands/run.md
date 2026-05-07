---
title: mf run
description: commands.toml에 선언된 끝나는 명령 의도를 실행하는 명령입니다.
---

`mf run <intent>`는 `.mustflow/config/commands.toml`에 선언된 명령 의도 중 안전하게 종료되어야 하는 명령만 실행합니다.

## 실행 조건

다음 조건을 모두 만족해야 합니다.

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds`가 양의 정수

조건을 만족하지 않으면 명령을 실행하지 않고 실패 이유를 출력합니다.

## 실행하지 않는 것

`mf run`은 다음 생명주기를 가진 의도를 실행하지 않습니다.

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

개발 서버, 감시 모드, 브라우저 UI, 백그라운드 프로세스는 끝나는 검증 명령으로 취급하지 않습니다.

## 예시

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## JSON 필드

명령을 실행하면 `.mustflow/state/runs/latest.json`에 마지막 실행 영수증을 씁니다.

`--json`을 붙이면 같은 영수증을 표준 출력으로도 내보냅니다. 이 출력은 자동화와
에이전트가 파싱하기 위한 값이며, 사람용 도움말 문구를 대신 파싱하지 않아도 됩니다.

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`number`): 실행 영수증 형식 판 번호입니다.
- `command` (`string`): 항상 `run`입니다.
- `intent` (`string`): 실행한 명령 의도 이름입니다.
- `status` (`string`): 실행 결과입니다. `passed`, `failed`, `timed_out`, `start_failed` 중 하나입니다.
- `timed_out` (`boolean`): 제한 시간을 넘겼는지 나타냅니다.
- `started_at` (`string`): 실행 시작 시각입니다.
- `finished_at` (`string`): 실행 종료 시각입니다.
- `duration_ms` (`number`): 실행 시간입니다.
- `cwd` (`string`): 실제 실행 디렉터리입니다.
- `lifecycle` (`string`): 실행 의도의 생명주기입니다.
- `run_policy` (`string`): 적용된 실행 허용 정책입니다.
- `mode` (`string`): 실행 방식입니다.
- `argv` (`string[]`): 실행한 명령과 인수입니다. 셸 실행 방식이 아닐 때 사용합니다.
- `cmd` (`string`): 실행한 셸 명령 문자열입니다. 셸 실행 방식일 때 사용합니다.
- `timeout_seconds` (`number`): 적용된 제한 시간입니다.
- `max_output_bytes` (`number`): 보존하는 출력 크기 상한입니다.
- `success_exit_codes` (`number[]`): 성공으로 취급하는 종료 코드 목록입니다.
- `exit_code` (`number | null`): 프로세스 종료 코드입니다.
- `signal` (`string | null`): 프로세스가 신호로 종료된 경우의 신호 이름입니다.
- `error` (`string | null`): 실행 시작 또는 실행 중 발생한 오류 설명입니다.
- `kill_method` (`string | null`): 시간 초과 뒤 프로세스를 종료한 방식입니다.
- `stdout` (`object`): 표준 출력 요약입니다.
- `stderr` (`object`): 표준 오류 요약입니다.
- `receipt_path` (`string`): 저장된 실행 영수증 파일 경로입니다.

출력 요약 객체는 다음 필드를 가집니다.

- `stdout.bytes` (`number`): 표준 출력 전체 바이트 수입니다.
- `stdout.truncated` (`boolean`): 상한 때문에 일부 출력만 보존했는지 나타냅니다.
- `stdout.tail` (`string`): 표준 출력의 끝부분입니다.
- `stderr.bytes` (`number`): 표준 오류 전체 바이트 수입니다.
- `stderr.truncated` (`boolean`): 상한 때문에 일부 출력만 보존했는지 나타냅니다.
- `stderr.tail` (`string`): 표준 오류의 끝부분입니다.

실행 영수증은 특정 시점의 실행 증거입니다. 명령 계약의 기준 원본은 계속
`.mustflow/config/commands.toml`입니다.

## 종료 코드

- `0`: 명령 의도가 허용된 종료 코드로 끝났습니다.
- `1`: 의도가 없거나, 실행 조건을 만족하지 않거나, 제한 시간을 넘겼거나, 명령이 실패했습니다.
