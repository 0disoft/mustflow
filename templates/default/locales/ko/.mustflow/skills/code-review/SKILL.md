---
mustflow_doc: skill.code-review
locale: ko
canonical: false
revision: 4
name: code-review
description: 코드 변경을 검토하거나, 변경 범위와 테스트 누락 여부를 확인해야 할 때 사용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# Code Review

## 목적

변경이 요청 범위에 맞고, 동작 위험과 검증 누락이 없는지 확인합니다.

## 사용 조건

- 코드 변경, 차이점 검토, 풀 리퀘스트 검토, 회귀 위험 확인이 필요할 때 사용합니다.
- 구현보다 변경의 위험과 누락을 판단하는 일이 중심일 때 사용합니다.

## 사용하지 않는 경우

- 단순 문장 수정, 번역, 형식 정리만 요청받은 경우에는 사용하지 않습니다.
- 검토할 변경 파일이나 차이점이 전혀 없으면 사용하지 않습니다.

## 필요한 입력

- 변경 파일 목록이나 차이점
- 사용자 요청의 검토 기준
- `AGENTS.md`의 작업 규칙
- `.mustflow/docs/agent-workflow.md`의 공통 작업 정책
- `.mustflow/config/commands.toml`의 명령 의도 계약

## 절차

1. 변경 파일 목록을 확인합니다.
2. 요청과 무관한 변경이 섞였는지 확인합니다.
3. 공개 동작, 설정, 명령어, 문서에 영향이 있는지 확인합니다.
4. 테스트 관련성을 검토합니다.
   - 새 동작에 대한 테스트가 빠졌는지 확인합니다.
   - 제거된 동작을 검증하는 낡은 테스트가 남았는지 확인합니다.
   - 새 위험을 다루지 않는 중복 테스트가 있는지 확인합니다.
   - 단언이 이유 없이 약해졌는지 확인합니다.
   - 스냅샷 갱신에 근거가 있는지 확인합니다.
   - 오래된 테스트 때문에 삭제된 동작을 다시 구현하게 만들 위험이 있는지 확인합니다.
5. 필요한 테스트나 규칙 검사 의도가 `.mustflow/config/commands.toml`에 있는지 확인합니다.
6. 문제는 심각도순으로 기록합니다.

## 검증

공유 명령 정책은 `.mustflow/docs/agent-workflow.md#명령-실행-정책`을 따릅니다.

관련 명령 의도:

- `test`
- `test_related`
- `test_audit`
- `lint`

각 의도는 `.mustflow/config/commands.toml`에서 확인합니다.
`status = "configured"`가 아니면 실행하지 않고, 상태와 건너뛴 이유를 보고합니다.
`lifecycle = "oneshot"`과 `run_policy = "agent_allowed"`가 아니면 검증 명령으로 실행하지 않습니다.
스킬 문서에서 원시 셸 명령을 만들지 않습니다.

## 실패 대응

- 필요한 명령 의도가 `unknown`, `manual_only`, `disabled`이거나 없으면 대체 명령을 추측하지 않습니다.
- 검증을 실행하지 못한 이유와 남은 위험을 보고합니다.
- 비밀정보나 파괴적 명령 위험이 보이면 검토를 멈추고 확인한 내용을 보고합니다.

## 출력 형식

- 작업 요약
- 심각도순 발견 사항
- 검토한 파일
- 실행한 명령 의도
- 건너뛴 명령 의도와 이유
- 테스트 관련성 검토 내용
- 남은 위험
