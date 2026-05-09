---
mustflow_doc: skills.index
locale: ko
canonical: false
revision: 17
lifecycle: mustflow-owned
authority: router
---

# 스킬 색인

현재 작업에 해당하는 스킬 문서만 참조하십시오. 적용 가능한 스킬이 없는 경우, `AGENTS.md`와
`.mustflow/config/commands.toml`을 기준으로 최소한의 안전한 변경을 수행합니다.

## 선택 규칙

- 작업 시작 시점과 첫 수정 전, 사용자 요청과 예상 변경 파일을 아래 트리거와 비교합니다.
- 맞는 트리거가 하나 이상 있으면 해당 범위를 수정하기 전에 각 `SKILL.md`를 읽습니다.
- 스킬을 사용했거나 사용할 수 있어 보이는 스킬을 일부러 건너뛰었다면, 다음 사용자
  업데이트나 최종 보고에 짧은 선택 메모를 남깁니다.
- 명령 실패, 테스트 계약 변경, 문서 변경처럼 작업 중 새 조건이 생기면 잠시 멈추고
  새로 맞는 스킬을 읽은 뒤 계속합니다.
- 맞는 트리거가 없으면 스킬을 추측해서 만들거나 적용하지 않습니다. `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md`, `.mustflow/config/commands.toml`을 기준으로 진행합니다.
- 스킬 문서는 절차만 안내합니다. 선언된 명령 의도 밖의 명령 실행을 허용하지 않습니다.
- 라우팅 표는 간결하게 유지합니다. 각 행은 트리거, 필요한 입력, 수정 범위, 위험,
  검증 의도, 예상 출력을 함께 적습니다.

| 트리거 | 스킬 문서 | 필요한 입력 | 수정 범위 | 위험 | 검증 의도 | 예상 출력 |
| --- | --- | --- | --- | --- | --- | --- |
| 생성 산출물, 패키지 포함 파일, 바이너리 자산, 보고서, 내려받을 수 있는 출력물이 생성, 참조, 보고됨 | `.mustflow/skills/artifact-integrity-check/SKILL.md` | 산출물 경로, 출처 또는 생성 경로, 패키지 규칙, 산출물 기대값 | 산출물 참조, 패키지 메타데이터, 테스트, 문서 | 확인되지 않았거나 오래된 산출물 주장 | `changes_status`, `changes_diff_summary`, `test_release`, `build`, `mustflow_check` | 산출물 근거, 포함 또는 형식 확인, 건너뛴 검증, 무결성 위험 |
| 보고 전 코드 변경 검토가 필요함 | `.mustflow/skills/code-review/SKILL.md` | 변경 diff와 작업 목표 | 변경된 파일 | 동작 회귀 | `test`, `test_related`, `test_audit`, `lint` | 지적 사항 또는 문제 없음 기록 |
| 변경 파일의 위험도 분류와 검증 선택이 필요함 | `.mustflow/skills/diff-risk-review/SKILL.md` | 변경 파일 목록, 차이 요약, 작업 목표 | 변경 표면과 검증 보고 | 과소 또는 과잉 검증 | `changes_status`, `changes_diff_summary`, `test`, `test_related`, `test_audit`, `lint`, `build`, `docs_validate`, `mustflow_check` | 위험도, 검증 선택, 되돌림 메모 |
| 선언된 동작이 코드, 스키마, 템플릿, 테스트, 문서 사이에서 일치해야 함 | `.mustflow/skills/contract-sync-check/SKILL.md` | 변경 파일, 의도한 동작, 기준 출처, 파생 표면, 명령 계약 항목 | 계약 기준 출처와 필수 동기화 표면 | 계약 불일치 | `changes_status`, `changes_diff_summary`, `docs_validate_fast`, `test_release`, `mustflow_check` | 계약 기준 출처, 동기화 표면, 미룬 표면, 검증, 불일치 위험 |
| 패키지, 런타임, 도구, 명령, 서비스, 플랫폼 기능을 가정, 추가, 호출, 문서화함 | `.mustflow/skills/dependency-reality-check/SKILL.md` | 의존성 또는 기능, 저장소 선언, 버전 또는 기능 주장, 명령 계약 항목 | 의존성 선언, 가져오기, 명령 메타데이터, 테스트, 문서 | 지어낸 또는 사용할 수 없는 의존성 | `changes_status`, `changes_diff_summary`, `build`, `test_release`, `mustflow_check` | 의존성 상태, 맞춘 표면, 검증, 남은 의존성 위험 |
| 테스트 추가, 수정, 삭제, 점검이 필요함 | `.mustflow/skills/test-maintenance/SKILL.md` | 변경된 동작 또는 오래된 테스트 근거 | 테스트 파일과 관련 소스 | 계약 불일치 | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` | 테스트 변경 근거와 검증 결과 |
| 보안 민감 동작 변경에 악용 시나리오 회귀 테스트가 필요함 | `.mustflow/skills/security-regression-tests/SKILL.md` | 변경된 경계, 행위자, 기대 거부 동작 | 테스트 파일과 관련 보안 경계 소스 | 가짜 안심과 위험한 범위 | `test`, `test_related`, `test_audit`, `lint`, `build` | 보안 경계, 악용 시나리오, 테스트, 남은 위험 |
| 구성된 명령 의도나 검증 단계가 실패함 | `.mustflow/skills/failure-triage/SKILL.md` | 실패한 의도와 출력 끝부분 | 실패 원인 범위만 | 오진 | `mustflow_check`; 실패한 원래 의도 | 원인, 수정, 재실행 결과 |
| 익숙하지 않은 영역을 구현하기 전 새 구조의 내부 선례가 필요함 | `.mustflow/skills/pattern-scout/SKILL.md` | 사용자 요청, 대상 파일 영역, 주변 예시, 현재 변경 파일 | 패턴 근거와 그 패턴을 따르는 데 필요한 파일 | 병렬 구조 발명 | `changes_status`, `changes_diff_summary`, `mustflow_check` | 내부 패턴, 맞춘 항목, 의도적 차이, 검증 |
| 버그나 혼란스러운 실패를 고치기 전에 가장 작은 재현 경로가 불분명함 | `.mustflow/skills/repro-first-debug/SKILL.md` | 증상, 기대 동작, 관찰 출력, 관련 가능성이 있는 변경 파일 | 재현 기록, 집중 테스트, 가능한 원인 | 추측성 수정 또는 과잉 테스트 | `test_related`, `test_fast`, `mustflow_check` | 재현 근거, 최소 수정, 검증, 남은 위험 |
| 현재성, 외부 출처, 날짜, 버전처럼 변하기 쉬운 정보에 주장이 의존함 | `.mustflow/skills/source-freshness-check/SKILL.md` | 오래될 수 있는 주장, 출처 원문이나 페이지, 날짜 또는 버전 맥락, 출처 정책 | 출처 문구, 문서, 최신성 보고 | 오래되었거나 확인되지 않은 주장 | `changes_status`, `docs_validate_fast`, `mustflow_check` | 확인한 출처 경계, 문구 변경, 건너뛴 확인, 오래된 출처 위험 |
| `.mustflow/context/PROJECT.md`에 신중한 프로젝트 맥락이 필요함 | `.mustflow/skills/project-context-authoring/SKILL.md` | 근거가 있는 프로젝트 사실 | `.mustflow/context/PROJECT.md` | 권한 범위 이탈 | `mustflow_check` | 신중하게 갱신된 맥락 |
| 스킬 절차나 경로를 만들거나 유지보수함 | `.mustflow/skills/skill-authoring/SKILL.md` | 반복 작업 근거 | `.mustflow/skills/**` | 절차 중복과 명령 불일치 | `mustflow_check`, `docs_validate` | 스킬 경로와 절차 변경 |
| 문서 검수 대기열 항목에 문장 다듬기가 필요함 | `.mustflow/skills/docs-prose-review/SKILL.md` | 대기열 항목 또는 선택한 문서 경로, 검수 코멘트가 있으면 그 내용, 대상 언어, 검수자 메타데이터 | 선택한 문서 파일과 검수 기록 항목 | 의미 변형 또는 오래된 대기열 상태 | `docs_validate`, `mustflow_check` | 문장 수정, 기록된 검수 상태, 검증 메모 |
| 웹 이미지 자산을 추가, 변환, 크기 조정, 교체함 | `.mustflow/skills/web-asset-optimization/SKILL.md` | 이미지 자산 요청과 대상 경로 | 웹 이미지 자산 | 자산 품질과 용량 | `asset_optimize`, `build` | 최적화 결과 기록 |
| 공개 문서나 워크플로 문서에 영향을 주는 문서 변경 | `.mustflow/skills/docs-update/SKILL.md` | 변경된 동작 또는 필드 | 관련 문서만 | 오래된 공개 문서 | `docs_validate`, `mustflow_check` | 문서 변경과 건너뛴 검증 |

새 스킬을 추가할 때는 이 표에 링크를 추가하고, 구체적인 트리거와 라우팅 항목을 적습니다.
스킬 문서에 실제 셸 명령을 직접 포함하지 말고, `.mustflow/config/commands.toml`에
정의된 명령 의도 이름만 참조하십시오.
