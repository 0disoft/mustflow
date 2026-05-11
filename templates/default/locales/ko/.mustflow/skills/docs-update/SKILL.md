---
mustflow_doc: skill.docs-update
locale: ko
canonical: false
revision: 3
authority: procedure
lifecycle: mustflow-owned
name: docs-update
description: AGENTS.md, mustflow 문서, 설정 문서를 수정하거나 동작 변경 사항을 문서에 반영해야 할 때 적용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docs-update
  command_intents:
    - docs_validate_fast
    - docs_validate
    - mustflow_check
---

# 문서 갱신 (Docs Update)

<!-- mustflow-section: purpose -->
## 목적

문서가 실제 저장소의 동작 및 설정과 일치하도록 유지합니다.

<!-- mustflow-section: use-when -->
## 적용 시나리오

- 에이전트 작업 규칙, 명령 의도, 스킬, mustflow 설정을 수정할 때 적용합니다.
- 동작 변경 사항에 맞춰 mustflow 문서 흐름을 함께 갱신해야 할 때 적용합니다.

<!-- mustflow-section: do-not-use-when -->
## 적용하지 않는 경우

- 사용자 프로젝트의 일반 `README.md`나 사용자용 문서만 수정하는 작업에는 기본적으로 적용하지 않습니다.
- 문서 변경 사항이 mustflow 작업 흐름과 무관한 경우 적용하지 않습니다.

<!-- mustflow-section: required-inputs -->
## 필요한 입력

- 변경하려는 문서 경로
- 관련 코드나 설정 변경 내용
- `AGENTS.md`의 작업 규칙
- `.mustflow/docs/agent-workflow.md`의 공통 작업 정책
- `.mustflow/config/commands.toml`의 `docs_validate` 또는 `mustflow_check` 의도

<!-- mustflow-section: preconditions -->
## 사전 조건

- 작업이 사용 조건에 맞고 사용하지 않는 경우에는 해당하지 않습니다.
- 필요한 입력을 확보했거나, 빠진 입력을 추측하지 않고 보고할 수 있습니다.
- 현재 범위에 대해 더 높은 우선순위의 지침과 `.mustflow/config/commands.toml`을 확인했습니다.

<!-- mustflow-section: allowed-edits -->
## 허용 수정 범위

- 이 스킬, 사용자 요청, `.mustflow/skills/INDEX.md`의 맞는 경로가 설명하는 범위 안에서만 수정합니다.
- 명령 권한을 넓히거나, 프로젝트 사실을 지어내거나, 관련 없는 워크플로 파일을 변경하지 않습니다.

<!-- mustflow-section: procedure -->
## 절차

1. 변경 사항이 사용자 동작, 에이전트 규칙, 명령 의도 또는 설정에 영향을 주는지 확인합니다.
2. 영향받는 기준 문서를 식별합니다.
3. 동일한 내용을 여러 곳에 중복 기록하지 않고, 기준 문서 한 곳에서 관리합니다.
4. 링크와 경로가 실제 파일과 일치하는지 확인합니다.
5. 실행하지 못한 문서 검증 의도가 있는 경우 그 이유를 기록합니다.

<!-- mustflow-section: postconditions -->
## 사후 조건

- 명확한 근거, 실행한 명령 의도, 건너뛴 확인, 남은 위험을 포함해 예상 출력을 작성할 수 있습니다.
- 빠진 명령 의도, 알 수 없는 입력, 권한 충돌은 숨기지 않고 보고합니다.

<!-- mustflow-section: verification -->
## 검증

공유 명령 정책은 `.mustflow/docs/agent-workflow.md#명령-실행-정책`을 따릅니다.

관련 명령 의도:

- `docs_validate`
- `mustflow_check`

각 의도는 `.mustflow/config/commands.toml`에서 확인하십시오.
`status = "configured"`가 아니면 실행하지 않고, 상태와 건너뛴 이유를 보고하십시오.
`lifecycle = "oneshot"`과 `run_policy = "agent_allowed"`가 아니면 검증 명령으로 실행하지 않습니다.
스킬 문서 내에 실제 셸 명령을 직접 작성하지 마십시오.

<!-- mustflow-section: failure-handling -->
## 실패 대응

- 문서와 설정 중 어느 쪽이 기준인지 불분명한 경우, `AGENTS.md`와 `mustflow.toml`을 우선 확인하십시오.
- 명령 의도가 실행 가능하지 않은 경우, 임의의 명령을 생성하지 말고 남은 검증 위험을 보고하십시오.
- 링크나 경로가 유효하지 않으나 확인 명령이 없는 경우, 수동으로 확인한 범위를 보고하십시오.

<!-- mustflow-section: output-format -->
## 출력 형식

- 작업 요약
- 갱신한 문서
- 기준 문서와 파생 문서의 관계
- 실행한 명령 의도
- 건너뛴 명령 의도와 이유
- 남은 문서 위험
