---
mustflow_doc: skill.test-maintenance
locale: ko
canonical: false
revision: 1
name: test-maintenance
description: 동작 변경, 버그 수정, 기능 제거, 스냅샷 변경 뒤 테스트를 추가·수정·삭제·점검해야 할 때 사용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - test_related
    - test_audit
    - snapshot_update
    - lint
    - build
---

# Test Maintenance

## 목적

테스트를 현재 의도된 동작 계약에 맞게 유지합니다.

## 사용 조건

- 새 동작, 버그 수정, 기능 제거, 공개 동작 변경을 테스트에 반영해야 할 때 사용합니다.
- 기존 테스트가 낡았거나, 중복되었거나, 삭제된 구현 세부사항에 묶여 있는지 확인해야 할 때 사용합니다.
- 스냅샷 출력이 바뀌었을 때 사용합니다.

## 사용하지 않는 경우

- 테스트가 아니라 문서나 설정 설명만 바꾸는 작업에는 사용하지 않습니다.
- 저장소의 테스트 정책이 `manual_only`이거나 `disabled`이면 자동으로 테스트 명령을 만들지 않습니다.

## 필요한 입력

- 검증하려는 동작 설명
- 관련 코드 경로
- 기존 테스트 위치
- `.mustflow/docs/agent-workflow.md`의 공통 작업 정책
- `.mustflow/config/commands.toml`의 `test` 의도
- `.mustflow/config/mustflow.toml`의 `[testing]` 정책

## 절차

1. 지금 존재해야 하는 동작 계약을 먼저 정의합니다.
2. 새 테스트를 추가하기 전에 기존 테스트를 검색합니다.
3. 영향받는 테스트를 분류합니다.
   - `active`: 현재 동작을 여전히 검증합니다.
   - `update_needed`: 현재 동작에 맞게 수정해야 합니다.
   - `obsolete_candidate`: 제거되었거나 무관해진 동작을 검증할 가능성이 있습니다.
   - `legacy_contract`: 호환성을 위해 의도적으로 남긴 예전 동작을 검증합니다.
   - `flaky_or_environmental`: 환경 문제로 실패했을 가능성이 있습니다.
4. 분류 결과에 따라 테스트를 추가, 수정, 삭제, 또는 후보로 보고합니다.
5. 오래된 테스트가 기대한다는 이유만으로 삭제된 기능을 다시 구현하지 않습니다.
6. 스냅샷 갱신은 명시적 승인과 `snapshot_update` 의도가 있을 때만 수행합니다.
7. 관련 테스트 의도를 `.mustflow/config/commands.toml`에서 찾아 실행합니다.

## 검증

공유 명령 정책은 `.mustflow/docs/agent-workflow.md#명령-실행-정책`을 따릅니다.

관련 명령 의도:

- `test`
- `test_related`
- `test_audit`
- `snapshot_update`는 명시적 승인과 설정이 있을 때만 사용합니다.
- `lint`
- `build`는 빌드 출력이나 통합 경계에 영향이 있을 때만 사용합니다.

각 의도는 `.mustflow/config/commands.toml`에서 확인합니다.
`status = "configured"`가 아니면 실행하지 않고, 상태와 건너뛴 이유를 보고합니다.
`lifecycle = "oneshot"`과 `run_policy = "agent_allowed"`가 아니면 검증 명령으로 실행하지 않습니다.
`test_watch`, `dev`, `start`, 브라우저 UI, 원시 개발 서버 명령은 검증 명령으로 사용하지 않습니다.
스킬 문서에서 원시 셸 명령을 만들지 않습니다.

## 실패 대응

- 테스트 명령 의도가 `unknown`이면 테스트를 추가한 뒤 실행하지 못한 이유를 보고합니다.
- 실패가 재현되면 가장 작은 실패 입력과 오류 메시지를 기록합니다.
- 검증을 통과시키기 위해서만 테스트를 삭제하거나 단언을 약화하지 않습니다.
- 낡은 테스트 후보인지 확실하지 않으면 삭제하지 말고 후보로 보고합니다.
- 테스트 실행이 외부 서비스나 로컬 권한에 의존하면 수동 확인 필요 사항으로 보고합니다.

## 출력 형식

- 작업 요약
- 검증하려는 동작 계약
- 추가한 테스트
- 수정한 테스트
- 삭제한 테스트와 이유
- 낡은 테스트 후보
- 실행한 명령 의도
- 건너뛴 명령 의도와 이유
- 남은 테스트 위험
