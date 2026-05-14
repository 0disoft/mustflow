---
title: mf handoff
description: 제한된 작업 항목과 인수인계 기록을 읽기 전용으로 검증합니다.
---

`mf handoff validate <path>`는 mustflow 루트 안의 JSON 기록을 검증합니다. 작업 항목을 만들거나, 인수인계 파일을 쓰거나, 에이전트를 시작하거나, 명령을 실행하거나, 해당 기록을 명령 권한으로 취급하지 않습니다.

이 명령은 선택적으로 운용하는 `.mustflow/work-items/` 또는 인수인계 파일이 재시작 지점 역할만 하도록 돕습니다. 유효한 기록은 작업 목표, 범위, 완료 기준, 출처, 검증 계획, 커버리지 상태, 남은 위험, 다음 재시작 지점을 담을 수 있습니다. 숨은 추론, 대화 전문, 원시 터미널 로그, 비밀값, 개인정보, 넓은 메모리 요약, 자율 작업자 상태, `.mustflow/config/commands.toml`을 우회하는 명령 필드는 담을 수 없습니다.

## 기록 형태

필수 필드:

- `schema_version`: 항상 `1`.
- `kind`: `work_item` 또는 `handoff`.
- `task_id`: 안정적인 작업 식별자.
- `goal`: 현재 목표.
- `scope`: 제한된 작업 범위.
- `acceptance_criteria`: 완료 판단 기준.
- `source_refs`: 저장소 파일, 이슈 링크, 기타 출처.
- `next_restart_point`: 다음 세션에서 이어갈 짧은 지점.

선택 필드:

- `non_goals`
- `changed_surfaces`
- `verification_plan`
- `coverage`
- `remaining_risks`

`verification_plan` 항목의 `status`는 `planned`, `run`, `skipped` 중 하나입니다. `skipped` 항목에는 `skip_reason`이 필요합니다. `receipt_path`는 `status: run` 항목에만 허용되므로 실행하지 않은 검증을 실행 완료처럼 표시할 수 없습니다.

## 예시

```sh
npx mf handoff validate .mustflow/work-items/MF-0001.json
npx mf handoff validate .mustflow/work-items/MF-0001.json --json
```

## JSON 필드

- `schema_version` (`string`): 출력 형식 버전.
- `command` (`string`): 항상 `handoff_validate`.
- `ok` (`boolean`): 차단 오류가 없는지 여부.
- `mustflow_root` (`string`): 해석된 mustflow 루트.
- `path` (`string`): 검증한 기록 경로.
- `record_kind` (`string | null`): `work_item`, `handoff`, 또는 유효하지 않을 때 `null`.
- `task_id` (`string | null`): 파싱된 작업 식별자.
- `summary` (`object`): 범위, 완료 기준, 출처, 검증 계획, 커버리지, 남은 위험 개수.
- `issues` (`object[]`): `severity`, `code`, `path`, `message`를 포함한 검증 문제.

## 종료 코드

- `0`: 기록이 유효합니다.
- `1`: 기록이 유효하지 않거나, mustflow 루트 밖에 있거나, 너무 크거나, 읽을 수 없거나, 올바른 JSON이 아닙니다.
