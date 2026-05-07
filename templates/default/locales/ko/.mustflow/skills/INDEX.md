---
mustflow_doc: skills.index
locale: ko
canonical: false
revision: 3
---

# 스킬 색인

현재 작업에 해당하는 스킬 문서만 참조하십시오. 적용 가능한 스킬이 없는 경우, `AGENTS.md`와
`.mustflow/config/commands.toml`을 기준으로 최소한의 안전한 변경을 수행합니다.

| 시나리오 | 스킬 문서 | 관련 명령 의도 |
| --- | --- | --- |
| 코드 변경 검토 | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| 테스트 추가, 수정, 삭제, 점검 | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| 실패 원인 추적 | `.mustflow/skills/failure-triage/SKILL.md` | 실패한 원래 의도 |
| 문서 수정 | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

새 스킬을 추가할 때는 이 표에 링크를 추가하고, 적용 시나리오 중심으로 간결하게 작성하십시오.
스킬 문서에 실제 셸 명령을 직접 포함하지 말고, `.mustflow/config/commands.toml`에
정의된 명령 의도 이름만 참조하십시오.
