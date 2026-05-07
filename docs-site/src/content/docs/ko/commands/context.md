---
title: mf context
description: 현재 mustflow 루트의 작업 맥락 정보를 JSON으로 출력하는 명령입니다.
---

`mf context --json`은 에이전트가 작업 시작 전에 참고할 수 있는 구조화된 맥락 정보를 출력합니다.

이 명령은 파일을 수정하지 않습니다. 문서 본문을 대신 읽어주는 도구가 아니라, 에이전트가 먼저 확인해야 할 파일과 명령 의도를 짚어주는 간단한 색인 역할을 합니다.

## 포함 항목

- 현재 mustflow 루트 경로
- mustflow 설치 여부
- `manifest.lock.toml` 상태
- `mustflow.toml`에 정의된 기준 문서 위치
- `mustflow.toml`에 정의된 제공 기능 목록(Capabilities)
- 필수 읽기 순서 및 파일 존재 여부
- 선택 읽기 순서 및 파일 존재 여부
- 맥락 색인(Context Index) 및 프로젝트 맥락 경로
- `commands.toml` 내 명령 의도별 상태 요약
- 에이전트가 실행 가능한 단발성(Oneshot) 명령 의도 목록
- 마지막 `mf run` 실행 결과 기록 요약
- 매니페스트 잠금 파일 기준 이슈 목록

## 실행 결과 기록 요약

`latest_run` 섹션은 `.mustflow/state/runs/latest.json` 파일의 주요 메타데이터를 제공합니다.

보안과 가독성을 위해 표준 출력(stdout), 표준 오류(stderr) 본문은 포함하지 않습니다. 전체 실행 로그가 필요하면 실행 결과 파일을 직접 확인하세요.

## 예시

```sh
npx mf context --json
```

## JSON 필드

자동화 도구가 읽는 출력은 아래 필드를 사용합니다.

- `schema_version` (`number`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `context`입니다.
- `mustflow_root` (`string`): 명령이 실행된 mustflow 루트 경로입니다.
- `installed` (`boolean`): mustflow 설치 여부입니다.
- `manifest_lock` (`string`): 잠금 파일 상태 (`present`, `missing`, `invalid`).
- `template` (`object | null`): 사용된 템플릿의 식별자 및 버전 정보입니다.
- `authority` (`object`): 기준 문서 경로 정보입니다.
- `capabilities` (`object`): 에이전트가 사용할 수 있는 기능 목록입니다.
- `read_order` (`object[]`): 필수 읽기 파일 목록 및 존재 여부입니다.
- `optional_read_order` (`object[]`): 선택적 읽기 파일 목록 및 존재 여부입니다.
- `command_contract` (`object`): 명령 의도 요약 및 실행 가능한 의도 목록입니다.
- `latest_run` (`object`): 마지막 실행 결과 요약입니다.
- `issues` (`string[]`): 잠금 파일 기준 이슈 목록입니다.

배열 안 객체의 세부 필드는 다음과 같습니다.

- `read_order[].path` (`string`): 참조할 파일의 상대 경로입니다.
- `read_order[].exists` (`boolean`): 파일의 실제 존재 여부입니다.
- `command_contract.intents[].name` (`string`): 명령 의도 식별자입니다.
- `command_contract.intents[].status` (`string`): 명령 의도 구성 상태입니다.
- `command_contract.intents[].lifecycle` (`string | null`): 명령 생명주기(단발성 또는 장기 실행)입니다.
- `command_contract.intents[].run_policy` (`string | null`): 에이전트 실행 정책입니다.
- `command_contract.runnable_intents` (`string[]`): 에이전트가 즉시 실행 가능한 의도 목록입니다.
- `latest_run.path` (`string`): 실행 결과 기록 파일 경로입니다.
- `latest_run.exists` (`boolean`): 실행 결과 기록 파일 존재 여부입니다.
- `latest_run.valid` (`boolean | null`): 실행 기록 파일의 JSON 유효성 여부입니다.
- `latest_run.status` (`string | null`): 마지막 실행의 최종 상태입니다.
- `latest_run.exit_code` (`number | null`): 프로세스 종료 코드입니다.

## Help 및 종료 코드

- `0`: 문맥 정보를 성공적으로 출력했습니다.
- `1`: 유효하지 않은 옵션이 제공되었습니다.
