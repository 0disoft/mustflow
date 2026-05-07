---
mustflow_doc: skill.docs-update
locale: ko
canonical: false
revision: 3
name: docs-update
description: AGENTS, mustflow 문서, 설정 문서를 수정하거나 동작 변경과 문서를 맞춰야 할 때 사용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - docs_validate
    - mustflow_check
---

# Docs Update

## 목적

문서가 실제 저장소 동작과 어긋나지 않게 유지합니다.

## 사용 조건

- 에이전트 작업 규칙, 명령 의도, 스킬, mustflow 설정을 수정할 때 사용합니다.
- 동작 변경에 맞춰 mustflow 문서 흐름을 함께 갱신해야 할 때 사용합니다.

## 사용하지 않는 경우

- 사용자 프로젝트의 일반 `README.md`나 사람용 문서만 자유롭게 고치는 작업에는 기본적으로 사용하지 않습니다.
- 문서 변경이 mustflow 작업 흐름과 무관하면 사용하지 않습니다.

## 필요한 입력

- 변경하려는 문서 경로
- 관련 코드나 설정 변경 내용
- `AGENTS.md`의 작업 규칙
- `.mustflow/docs/agent-workflow.md`의 공통 작업 정책
- `.mustflow/config/commands.toml`의 `docs_validate` 또는 `mustflow_check` 의도

## 절차

1. 변경이 사용자 동작, 에이전트 규칙, 명령 의도, 설정에 영향을 주는지 확인합니다.
2. 영향을 받는 기준 문서를 찾습니다.
3. 같은 내용을 여러 곳에 반복하지 않고 기준 문서 한 곳에 둡니다.
4. 링크와 경로가 실제 파일과 맞는지 확인합니다.
5. 실행하지 못한 문서 검증 의도가 있으면 이유를 기록합니다.

## 검증

공유 명령 정책은 `.mustflow/docs/agent-workflow.md#명령-실행-정책`을 따릅니다.

관련 명령 의도:

- `docs_validate`
- `mustflow_check`

각 의도는 `.mustflow/config/commands.toml`에서 확인합니다.
`status = "configured"`가 아니면 실행하지 않고, 상태와 건너뛴 이유를 보고합니다.
`lifecycle = "oneshot"`과 `run_policy = "agent_allowed"`가 아니면 검증 명령으로 실행하지 않습니다.
스킬 문서에서 원시 셸 명령을 만들지 않습니다.

## 실패 대응

- 문서와 설정 중 어느 쪽이 기준인지 불분명하면 `AGENTS.md`와 `mustflow.toml`을 우선 확인합니다.
- 명령 의도가 실행 가능하지 않으면 임의 명령을 만들지 않고 남은 검증 위험을 보고합니다.
- 링크나 경로가 깨졌지만 확인 명령이 없으면 수동 확인한 범위를 보고합니다.

## 출력 형식

- 작업 요약
- 갱신한 문서
- 기준 문서와 파생 문서의 관계
- 실행한 명령 의도
- 건너뛴 명령 의도와 이유
- 남은 문서 위험
