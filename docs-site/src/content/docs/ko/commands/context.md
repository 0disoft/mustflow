---
title: mf context
description: 현재 mustflow 루트의 에이전트 작업 맥락을 JSON으로 출력하는 명령입니다.
---

`mf context --json`은 에이전트가 작업을 시작할 때 필요한 현재 루트의 구조화된 맥락을 출력합니다.

이 명령은 파일을 수정하지 않습니다. 문서 전문을 대신 읽어주는 명령이 아니라, 어떤 파일과 명령 의도를 먼저 확인해야 하는지 알려주는 얇은 색인입니다.

## 포함하는 것

- 현재 mustflow 루트
- 설치 여부
- `manifest.lock.toml` 상태
- `mustflow.toml`의 기준 문서 위치
- `mustflow.toml`의 기능 표면
- 필수 읽기 순서와 파일 존재 여부
- 선택 읽기 순서와 파일 존재 여부
- 기준 문서와 선택 읽기 필드에 포함된 문맥 색인과 프로젝트 문맥 경로
- `commands.toml`의 명령 의도 상태 요약
- 에이전트가 실행 가능한 끝나는 명령 의도 목록
- 마지막 `mf run` 실행 영수증 요약
- 잠금 파일 기준 문제 목록

## 실행 영수증 요약

`latest_run`은 `.mustflow/state/runs/latest.json`의 일부 메타데이터만 보여줍니다.

표준 출력과 표준 오류의 끝부분은 포함하지 않습니다. 실행 출력이 필요하면 실행 영수증 파일을 명시적으로 열어 확인해야 합니다.

## 예시

```sh
npx mf context --json
```

## JSON 필드

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`number`): 출력 형식 판 번호입니다.
- `command` (`string`): 항상 `context`입니다.
- `mustflow_root` (`string`): 현재 명령을 실행한 mustflow 루트입니다.
- `installed` (`boolean`): `AGENTS.md`와 `.mustflow/`가 있는지 나타냅니다.
- `manifest_lock` (`string`): 잠금 파일 상태입니다. `present`, `missing`, `invalid` 중 하나입니다.
- `template` (`object | null`): 잠금 파일에 기록된 템플릿 식별자와 판 번호입니다.
- `authority` (`object`): 기준 문서 경로 모음입니다.
- `capabilities` (`object`): 현재 루트가 제공하는 에이전트 기능 표면입니다.
- `read_order` (`object[]`): 필수 읽기 파일과 존재 여부입니다.
- `optional_read_order` (`object[]`): 선택 읽기 파일과 존재 여부입니다.
- `command_contract` (`object`): 명령 의도 요약과 실행 가능한 의도 목록입니다.
- `latest_run` (`object`): 마지막 실행 영수증 요약입니다.
- `issues` (`string[]`): 잠금 파일 기준 문제 목록입니다.

반복 항목은 다음 필드를 가집니다.

- `read_order[].path` (`string`): 읽어야 할 상대 경로입니다.
- `read_order[].exists` (`boolean`): 해당 파일이 현재 루트에 있는지 나타냅니다.
- `command_contract.intents[].name` (`string`): 명령 의도 이름입니다.
- `command_contract.intents[].status` (`string`): 명령 의도 설정 상태입니다.
- `command_contract.intents[].lifecycle` (`string | null`): 명령이 끝나는 작업인지, 장기 실행 작업인지 나타냅니다.
- `command_contract.intents[].run_policy` (`string | null`): 에이전트 실행 허용 정책입니다.
- `command_contract.runnable_intents` (`string[]`): 에이전트가 `mf run <intent>`로 실행할 수 있는 의도 이름입니다.
- `latest_run.path` (`string`): 마지막 실행 영수증 파일 경로입니다.
- `latest_run.exists` (`boolean`): 마지막 실행 영수증 파일이 있는지 나타냅니다.
- `latest_run.valid` (`boolean | null`): 영수증을 읽을 수 있는 JSON 객체로 해석했는지 나타냅니다.
- `latest_run.status` (`string | null`): 마지막 실행 결과입니다.
- `latest_run.exit_code` (`number | null`): 마지막 실행의 프로세스 종료 코드입니다.

## 종료 코드

- `0`: 맥락을 읽고 출력했습니다.
- `1`: 알 수 없는 선택지를 받은 상태입니다.
