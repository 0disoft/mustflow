---
mustflow_doc: skill.diff-risk-review
locale: ko
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: diff-risk-review
description: 최종 보고 전에 변경 파일의 위험도, 검증 선택, 되돌림 메모가 필요할 때 적용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.diff-risk-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - test
    - test_related
    - test_audit
    - lint
    - build
    - docs_validate
    - mustflow_check
---

# 변경 위험 검토

<!-- mustflow-section: purpose -->
## 목적

완료된 변경의 위험도를 분류하고, 관련된 가장 작은 설정된 검증을 고르며, 되돌림 메모를 남깁니다. 이 스킬은 넓은 코드 검토나 추측성 리팩터링으로 확장하지 않습니다.

<!-- mustflow-section: use-when -->
## 사용 조건

- 변경이 공개 표면, 워크플로 파일, 명령 계약, 템플릿, 생성 지도, 테스트, 문서 영역 중 둘 이상에 걸칠 때.
- 사용자가 다음 로드맵 조각, 완료 변경 요약, 커밋 전 확인, 위험을 고려한 최종 보고를 요청할 때.
- 검증 범위가 불명확해서 대상 테스트, 문서 전용 검증, 빌드, 엄격 검사, 전체 테스트 중 무엇을 선택해야 할지 판단해야 할 때.
- 설치 템플릿, 패키지 메타데이터, 생성 파일, 사용자 문서, 명령 동작, 보안 민감 경로, 데이터 처리 규칙에 영향을 줘 되돌림 관점이 필요할 때.

<!-- mustflow-section: do-not-use-when -->
## 사용하지 않는 경우

- 작업의 주목적이 지적 사항을 내는 상세 코드 검토라면 `code-review`를 사용합니다.
- 차이나 변경 파일 목록이 없을 때.
- 더 구체적인 문서 또는 번역 절차가 이미 다루는 단순 문구 수정일 때.
- 사용자가 위험도나 검증 범위를 검토하지 말라고 명시했을 때.

<!-- mustflow-section: required-inputs -->
## 필요한 입력

- 현재 변경 파일 목록 또는 차이 요약.
- 사용자 작업 목표와 인수 기준.
- `.mustflow/config/commands.toml`의 명령 의도 상태.
- `.mustflow/config/preferences.toml`의 검증 선택 설정.
- 변경 표면에 해당하는 스킬 또는 맥락 문서.

<!-- mustflow-section: preconditions -->
## 사전 조건

- 작업이 사용 조건에 맞고 사용하지 않는 경우에는 해당하지 않습니다.
- 필요한 입력을 확보했거나, 빠진 입력을 추측하지 않고 보고할 수 있습니다.
- 현재 범위에 대해 더 높은 우선순위의 지침과 `.mustflow/config/commands.toml`을 확인했습니다.

<!-- mustflow-section: allowed-edits -->
## 허용 수정 범위

- 이 스킬, 사용자 요청, `.mustflow/skills/INDEX.md`의 맞는 경로가 설명하는 범위 안에서만 수정합니다.
- 명령 권한을 넓히거나, 프로젝트 사실을 지어내거나, 관련 없는 파일을 바꾸거나, 위험을 발견했다는 이유만으로 새 추상화를 추가하지 않습니다.

<!-- mustflow-section: procedure -->
## 절차

1. 위험을 판단하기 전에 변경 파일 목록과 차이 요약을 읽습니다.
2. 변경 파일을 표면별로 묶습니다.
   - 소스 또는 실행 동작
   - 테스트와 픽스처
   - 명령 계약 또는 워크플로 정책
   - 설치 템플릿 파일
   - 패키지, 릴리스, 버전 메타데이터
   - 공개 문서
   - 생성 지도 또는 로컬 상태
   - 보안, 개인정보, 데이터, 마이그레이션, 외부 연동 경계
3. 위험도를 지정합니다.
   - `low`: 문구, 번역, 또는 문서 검증으로 충분한 독립 문서 변경
   - `medium`: 실행 동작 변경 없이 템플릿, 테스트, 패키지 메타데이터, 생성 지도, 워크플로 문서가 바뀐 경우
   - `high`: 실행 동작, 명령 실행, 보안, 개인정보, 데이터 처리, 마이그레이션, 릴리스 동작, 여러 표면에 걸친 변경
4. 필요한 최소 검증 의도를 찾습니다. 변경 표면을 덮는 가장 좁은 설정된 의도를 우선하되, 빠졌거나 unknown 또는 manual-only 상태인 의도는 숨기지 않습니다.
5. 설치 템플릿, 명령 계약, 패키지 버전, 생성 파일, 마이그레이션성 변경, 공개 동작 변경에는 되돌림 메모를 남깁니다.
6. 범위 이탈을 확인합니다. 관련 없는 파일, 지어낸 사실, 불필요한 추상화, 약해진 검증, 보고되지 않은 생성 파일 갱신을 찾습니다.
7. 짧은 위험도와 검증 요약을 작성합니다. 지적 사항 중심의 상세 보고가 필요하면 `code-review`를 사용합니다.

<!-- mustflow-section: postconditions -->
## 사후 조건

- 명확한 근거, 실행한 명령 의도, 건너뛴 확인, 남은 위험을 포함해 예상 출력을 작성할 수 있습니다.
- 빠진 명령 의도, 알 수 없는 입력, 권한 충돌은 숨기지 않고 보고합니다.
- 최종 보고에서 각 검증 의도를 실행하거나 건너뛴 이유를 설명할 수 있습니다.

<!-- mustflow-section: verification -->
## 검증

가능한 경우 설정된 일회성 명령 의도를 사용합니다.

- `changes_status`
- `changes_diff_summary`
- `mustflow_check`
- `docs_validate`
- `build`
- `test_related`
- `test`
- `test_audit`
- `lint`

빠진 명령을 추측하지 않습니다. `test_related`, `test_audit`, `lint`가 unknown 또는 manual-only 상태라면 그 상태를 보고하고, 위험을 덮는 다음 설정된 의도를 선택합니다.

<!-- mustflow-section: failure-handling -->
## 실패 대응

- 변경 파일 목록이 없으면 위험도를 분류하기 전에 설정된 상태 확인 의도를 실행하거나 요청합니다.
- 설정된 검증이 실패하면 해당 실패 의도에 대해 `failure-triage`로 전환합니다.
- 위험도가 높지만 맞는 검증 의도가 없으면 위험도를 낮추지 말고 검증 공백을 보고합니다.
- `REPO_MAP.md` 같은 생성 파일이 오래됐다면 설정된 의도로만 갱신합니다.

<!-- mustflow-section: output-format -->
## 출력 형식

- 변경 표면
- 위험도와 이유
- 필요한 최소 검증
- 실행한 명령 의도
- 건너뛴 명령 의도와 이유
- 되돌림 메모
- 범위 이탈 또는 생성 파일 메모
- 남은 위험
