---
mustflow_doc: skill.code-review
locale: ko
canonical: false
revision: 4
authority: procedure
lifecycle: mustflow-owned
name: code-review
description: 코드 변경 사항을 검토하거나, 변경 범위 및 검증 누락 여부를 확인해야 할 때 적용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.code-review
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# 코드 검토 (Code Review)

## 목적

변경 사항이 요청 범위에 부합하는지 확인하고, 동작상의 위험이나 검증 누락이 없는지 검토합니다.

## 적용 시나리오

- 코드 변경, diff 검토, 풀 리퀘스트(PR) 검토 또는 잠재적 회귀 위험 확인이 필요한 경우 적용합니다.
- 새로운 동작 구현보다 변경에 따른 위험 평가 및 누락 확인이 주된 목적인 경우 적용합니다.

## 적용하지 않는 경우

- 단순한 문구 수정, 번역 또는 서식 변경 작업만 포함된 경우 적용하지 않습니다.
- 검토할 변경 파일이나 diff가 없는 경우 적용하지 않습니다.

## 필요한 입력

- 수정된 파일 목록 또는 diff
- 사용자가 지정한 검토 기준
- `AGENTS.md`의 작업 규칙
- `.mustflow/docs/agent-workflow.md`의 공통 작업 정책
- `.mustflow/config/commands.toml`의 명령 의도 계약

## 사전 조건

- 작업이 사용 조건에 맞고 사용하지 않는 경우에는 해당하지 않습니다.
- 필요한 입력을 확보했거나, 빠진 입력을 추측하지 않고 보고할 수 있습니다.
- 현재 범위에 대해 더 높은 우선순위의 지침과 `.mustflow/config/commands.toml`을 확인했습니다.

## 허용 수정 범위

- 이 스킬, 사용자 요청, `.mustflow/skills/INDEX.md`의 맞는 경로가 설명하는 범위 안에서만 수정합니다.
- 명령 권한을 넓히거나, 프로젝트 사실을 지어내거나, 관련 없는 워크플로 파일을 변경하지 않습니다.

## 절차

1. 수정된 파일 목록을 검토합니다.
2. 요청 사항과 무관한 불필요한 변경 사항이 포함되었는지 확인합니다.
3. 공개 동작, 설정, 명령 및 문서에 미치는 영향을 분석합니다.
4. 테스트의 적절성을 검토합니다.
   - 새로운 기능에 대한 테스트가 누락되었는지 확인합니다.
   - 제거된 기능에 대한 불필요한 테스트가 남아있는지 확인합니다.
   - 새로운 위험을 검증하지 못하는 중복 테스트가 있는지 확인합니다.
   - 단언(assertion)이 근거 없이 약화되었는지 확인합니다.
   - 스냅샷 갱신에 타당한 근거가 있는지 확인합니다.
   - 기존 테스트로 인해 삭제된 동작이 의도치 않게 재도입될 위험이 있는지 확인합니다.
5. 필요한 테스트 또는 규칙 검사 의도가 `.mustflow/config/commands.toml`에 정의되어 있는지 확인하십시오.
6. 발견된 사항을 심각도순으로 기록하십시오.

## 사후 조건

- 명확한 근거, 실행한 명령 의도, 건너뛴 확인, 남은 위험을 포함해 예상 출력을 작성할 수 있습니다.
- 빠진 명령 의도, 알 수 없는 입력, 권한 충돌은 숨기지 않고 보고합니다.

## 검증

공유 명령 정책은 `.mustflow/docs/agent-workflow.md#명령-실행-정책`을 따릅니다.

관련 명령 의도:

- `test`
- `test_related`
- `test_audit`
- `lint`

각 의도는 `.mustflow/config/commands.toml`에서 확인하십시오.
`status = "configured"`가 아니면 실행하지 않고, 상태와 건너뛴 이유를 보고하십시오.
`lifecycle = "oneshot"`과 `run_policy = "agent_allowed"`가 아니면 검증 명령으로 실행하지 않습니다.
스킬 문서 내에 실제 셸 명령을 직접 작성하지 마십시오.

## 실패 대응

- 필요한 명령 의도가 `unknown`, `manual_only`, `disabled`이거나 없는 경우, 대체 명령을 임의로 추측하지 마십시오.
- 검증을 수행하지 못한 이유와 잔존 위험을 보고하십시오.
- 민감한 정보나 파괴적인 명령 위험이 식별되면 즉시 중단하고 확인된 내용을 보고하십시오.

## 출력 형식

- 작업 요약
- 심각도별 발견 사항
- 검토한 파일 목록
- 실행한 명령 의도
- 건너뛴 명령 의도 및 사유
- 테스트 적절성 검토 결과
- 잔존 위험
