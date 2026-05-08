---
mustflow_doc: skills.index
locale: ko
canonical: false
revision: 4
---

# 스킬 색인

현재 작업에 해당하는 스킬 문서만 참조하십시오. 적용 가능한 스킬이 없는 경우, `AGENTS.md`와
`.mustflow/config/commands.toml`을 기준으로 최소한의 안전한 변경을 수행합니다.

## 선택 규칙

- 작업 시작 시점과 첫 수정 전, 사용자 요청과 예상 변경 파일을 아래 시나리오와 비교합니다.
- 맞는 시나리오가 하나 이상 있으면 해당 범위를 수정하기 전에 각 `SKILL.md`를 읽습니다.
- 명령 실패, 테스트 계약 변경, 문서 변경처럼 작업 중 새 조건이 생기면 잠시 멈추고
  새로 맞는 스킬을 읽은 뒤 계속합니다.
- 맞는 시나리오가 없으면 스킬을 추측해서 만들거나 적용하지 않습니다. `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md`, `.mustflow/config/commands.toml`을 기준으로 진행합니다.
- 스킬 문서는 절차만 안내합니다. 선언된 명령 의도 밖의 명령 실행을 허용하지 않습니다.

| 시나리오 | 스킬 문서 | 관련 명령 의도 |
| --- | --- | --- |
| 코드 변경 검토 | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| 테스트 추가, 수정, 삭제, 점검 | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| 실패 원인 추적 | `.mustflow/skills/failure-triage/SKILL.md` | 실패한 원래 의도 |
| 문서 수정 | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

새 스킬을 추가할 때는 이 표에 링크를 추가하고, 적용 시나리오 중심으로 간결하게 작성하십시오.
스킬 문서에 실제 셸 명령을 직접 포함하지 말고, `.mustflow/config/commands.toml`에
정의된 명령 의도 이름만 참조하십시오.
