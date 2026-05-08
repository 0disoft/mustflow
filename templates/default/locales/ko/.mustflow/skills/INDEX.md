---
mustflow_doc: skills.index
locale: ko
canonical: false
revision: 8
---

# 스킬 색인

현재 작업에 해당하는 스킬 문서만 참조하십시오. 적용 가능한 스킬이 없는 경우, `AGENTS.md`와
`.mustflow/config/commands.toml`을 기준으로 최소한의 안전한 변경을 수행합니다.

## 선택 규칙

- 작업 시작 시점과 첫 수정 전, 사용자 요청과 예상 변경 파일을 아래 트리거와 비교합니다.
- 맞는 트리거가 하나 이상 있으면 해당 범위를 수정하기 전에 각 `SKILL.md`를 읽습니다.
- 명령 실패, 테스트 계약 변경, 문서 변경처럼 작업 중 새 조건이 생기면 잠시 멈추고
  새로 맞는 스킬을 읽은 뒤 계속합니다.
- 맞는 트리거가 없으면 스킬을 추측해서 만들거나 적용하지 않습니다. `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md`, `.mustflow/config/commands.toml`을 기준으로 진행합니다.
- 스킬 문서는 절차만 안내합니다. 선언된 명령 의도 밖의 명령 실행을 허용하지 않습니다.
- 라우팅 표는 간결하게 유지합니다. 각 행은 트리거, 필요한 입력, 수정 범위, 위험,
  검증 의도, 예상 출력을 함께 적습니다.

| 트리거 | 스킬 문서 | 필요한 입력 | 수정 범위 | 위험 | 검증 의도 | 예상 출력 |
| --- | --- | --- | --- | --- | --- | --- |
| 보고 전 코드 변경 검토가 필요함 | `.mustflow/skills/code-review/SKILL.md` | 변경 diff와 작업 목표 | 변경된 파일 | 동작 회귀 | `test`, `test_related`, `test_audit`, `lint` | 지적 사항 또는 문제 없음 기록 |
| 테스트 추가, 수정, 삭제, 점검이 필요함 | `.mustflow/skills/test-maintenance/SKILL.md` | 변경된 동작 또는 오래된 테스트 근거 | 테스트 파일과 관련 소스 | 계약 불일치 | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` | 테스트 변경 근거와 검증 결과 |
| 보안 민감 동작 변경에 악용 시나리오 회귀 테스트가 필요함 | `.mustflow/skills/security-regression-tests/SKILL.md` | 변경된 경계, 행위자, 기대 거부 동작 | 테스트 파일과 관련 보안 경계 소스 | 가짜 안심과 위험한 범위 | `test`, `test_related`, `test_audit`, `lint`, `build` | 보안 경계, 악용 시나리오, 테스트, 남은 위험 |
| 구성된 명령 의도나 검증 단계가 실패함 | `.mustflow/skills/failure-triage/SKILL.md` | 실패한 의도와 출력 끝부분 | 실패 원인 범위만 | 오진 | `mustflow_check`; 실패한 원래 의도 | 원인, 수정, 재실행 결과 |
| `.mustflow/context/PROJECT.md`에 신중한 프로젝트 맥락이 필요함 | `.mustflow/skills/project-context-authoring/SKILL.md` | 근거가 있는 프로젝트 사실 | `.mustflow/context/PROJECT.md` | 권한 범위 이탈 | `mustflow_check` | 신중하게 갱신된 맥락 |
| 스킬 절차나 경로를 만들거나 유지보수함 | `.mustflow/skills/skill-authoring/SKILL.md` | 반복 작업 근거 | `.mustflow/skills/**` | 절차 중복과 명령 불일치 | `mustflow_check`, `docs_validate` | 스킬 경로와 절차 변경 |
| 웹 이미지 자산을 추가, 변환, 크기 조정, 교체함 | `.mustflow/skills/web-asset-optimization/SKILL.md` | 이미지 자산 요청과 대상 경로 | 웹 이미지 자산 | 자산 품질과 용량 | `asset_optimize`, `build` | 최적화 결과 기록 |
| 공개 문서나 워크플로 문서에 영향을 주는 문서 변경 | `.mustflow/skills/docs-update/SKILL.md` | 변경된 동작 또는 필드 | 관련 문서만 | 오래된 공개 문서 | `docs_validate`, `mustflow_check` | 문서 변경과 건너뛴 검증 |

새 스킬을 추가할 때는 이 표에 링크를 추가하고, 구체적인 트리거와 라우팅 항목을 적습니다.
스킬 문서에 실제 셸 명령을 직접 포함하지 말고, `.mustflow/config/commands.toml`에
정의된 명령 의도 이름만 참조하십시오.
