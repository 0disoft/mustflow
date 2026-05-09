---
mustflow_doc: skill.test-maintenance
locale: ko
canonical: false
revision: 1
authority: procedure
lifecycle: mustflow-owned
name: test-maintenance
description: 동작 변경, 버그 수정, API 변경, 스냅샷 갱신 또는 호환성 변경 후 테스트를 추가, 수정, 삭제 또는 점검해야 할 때 적용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.test-maintenance
  command_intents:
    - test
    - test_related
    - test_audit
    - snapshot_update
    - lint
    - build
---

# Test Maintenance

<!-- mustflow-section: purpose -->
## 목적

테스트를 현재 정의된 동작 계약(Behavior Contract)에 맞게 유지합니다.

<!-- mustflow-section: use-when -->
## 적용 시나리오

- 새 동작이 추가, 변경, 제거 또는 폐기(deprecated)되었을 때 적용합니다.
- 버그 수정에 따른 회귀 테스트(Regression Test)가 필요할 때 적용합니다.
- 기존 테스트가 낡았거나, 중복되었거나, 삭제된 구현 세부 사항에 의존하고 있는지 확인해야 할 때 적용합니다.
- 스냅샷 출력이 변경되었을 때 적용합니다.

<!-- mustflow-section: do-not-use-when -->
## 적용하지 않는 경우

- 작업 내용이 단순한 문구 수정, 번역 또는 서식 변경인 경우 사용하지 않습니다.
- 저장소에 설정된 테스트 의도가 없으며, 사용자가 테스트 추가를 요청하지 않은 경우 사용하지 않습니다.

<!-- mustflow-section: required-inputs -->
## 필요한 입력

- 검증하려는 동작 설명
- 관련 코드 경로
- 기존 테스트 위치
- `.mustflow/docs/agent-workflow.md`의 공통 작업 정책
- `.mustflow/config/commands.toml`의 `test` 의도
- `.mustflow/config/mustflow.toml`의 `[testing]` 정책

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

1. 현재 기대되는 동작 계약을 정의합니다.
2. 새 테스트를 추가하기 전에 기존 테스트를 검색합니다.
3. 영향받는 테스트를 분류합니다.
   - `active`: 현재 동작을 여전히 검증함
   - `update_needed`: 현재 동작에 맞게 수정 필요
   - `obsolete_candidate`: 제거되었거나 무관해진 동작을 검증할 가능성이 있음
   - `legacy_contract`: 호환성을 위해 의도적으로 유지된 이전 동작을 검증함
   - `flaky_or_environmental`: 환경 문제로 인해 실패했을 가능성이 있음
4. 분류 결과에 따라 테스트를 추가, 수정, 삭제 또는 후보로 보고합니다.
5. 오래된 테스트가 기대한다는 이유만으로 삭제된 기능을 다시 구현하지 마십시오.
6. 스냅샷 갱신은 명시적 승인과 `snapshot_update` 의도가 설정된 경우에만 수행합니다.
7. 관련 테스트 의도를 `.mustflow/config/commands.toml`에서 찾아 실행합니다.

<!-- mustflow-section: postconditions -->
## 사후 조건

- 명확한 근거, 실행한 명령 의도, 건너뛴 확인, 남은 위험을 포함해 예상 출력을 작성할 수 있습니다.
- 빠진 명령 의도, 알 수 없는 입력, 권한 충돌은 숨기지 않고 보고합니다.

<!-- mustflow-section: verification -->
## 검증

공유 명령 정책은 `.mustflow/docs/agent-workflow.md#명령-실행-정책`을 따릅니다.

관련 명령 의도:

- `test`
- `test_related`
- `test_audit`
- `snapshot_update` (명시적 승인과 설정이 있을 때만 사용)
- `lint`
- `build` (빌드 출력이나 통합 경계에 영향이 있을 때만 사용)

각 의도는 `.mustflow/config/commands.toml`에서 확인하십시오.
`status = "configured"`가 아니면 실행하지 않고, 상태와 건너뛴 이유를 보고하십시오.
`lifecycle = "oneshot"`과 `run_policy = "agent_allowed"`가 아니면 검증 명령으로 실행하지 않습니다.
`test_watch`, `dev`, `start`, 브라우저 UI, 원시 개발 서버 명령은 검증 명령으로 사용하지 않습니다.
스킬 문서 내에 실제 셸 명령을 직접 작성하지 마십시오.

<!-- mustflow-section: failure-handling -->
## 실패 대응

- 테스트 명령 의도가 `unknown`이면 테스트를 추가한 뒤 실행하지 못한 이유를 보고하십시오.
- 실패가 재현되면 가장 작은 실패 입력과 오류 메시지를 기록하십시오.
- 검증을 통과시키기 위해 테스트를 삭제하거나 단언(assertion)을 약화하지 마십시오.
- 낡은 테스트 후보인지 확실하지 않으면 삭제하지 말고 후보로 보고하십시오.
- 테스트 실행이 외부 서비스나 로컬 권한에 의존하는 경우, 수동 확인 필요 사항으로 보고하십시오.

<!-- mustflow-section: output-format -->
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
