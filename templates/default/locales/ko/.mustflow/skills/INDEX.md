---
mustflow_doc: skills.index
locale: ko
canonical: false
revision: 3
---

# Skills Index

작업과 맞는 스킬 문서만 읽습니다. 맞는 스킬이 없으면 `AGENTS.md`와
`.mustflow/config/commands.toml`을 기준으로 가장 작은 변경을 수행합니다.

| 상황 | 읽을 문서 | 관련 명령 의도 |
| --- | --- | --- |
| 코드 변경 검토 | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| 테스트 추가, 수정, 삭제, 점검 | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| 실패 원인 추적 | `.mustflow/skills/failure-triage/SKILL.md` | 실패한 원래 의도 |
| 문서 수정 | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

새 스킬을 추가하면 이 표에 연결하고, 스킬 설명은 실제 사용 조건 중심으로 짧게
작성합니다. 실제 셸 명령은 스킬 문서에 쓰지 말고 `.mustflow/config/commands.toml`의
명령 의도 이름만 참조합니다.
