---
mustflow_doc: skill.contract-sync-check
locale: ko
canonical: false
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: contract-sync-check
description: 코드, 스키마, 템플릿, 테스트, 문서 사이에 맞춰져야 하는 선언된 계약에 변경이 영향을 줄 때 적용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.contract-sync-check
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# 계약 동기화 확인

<!-- mustflow-section: purpose -->
## 목적

선언된 동작, 기계가 읽는 계약, 설치 템플릿, 테스트, 공개 문서가 변경 뒤 서로 어긋나지 않게 합니다.

<!-- mustflow-section: use-when -->
## 사용할 때

- 명령, 옵션, JSON 출력, 스키마, 템플릿 파일, 매니페스트, 잠금 항목, 선호값, 공개 문서가 바뀝니다.
- mustflow가 소유한 파일을 추가, 삭제, 이름 변경, 재분류합니다.
- 테스트가 패키지, 템플릿, 스키마, 명령, 대시보드, 문서 동작을 기대값으로 고정합니다.
- 사용자가 문서, 설정, 설치 템플릿 동작도 함께 바꿔야 하는지 묻습니다.

<!-- mustflow-section: do-not-use-when -->
## 사용하지 않을 때

- 선언된 계약이나 공개 표면이 없는 내부 구현 리팩터링입니다.
- 변경 파일이 더 좁은 스킬로 이미 덮이고, 그 절차가 영향을 받는 계약을 모두 확인합니다.
- 사용자가 공개 또는 설치 표면을 갱신하지 않는 로컬 실험을 명시적으로 요청했습니다.

<!-- mustflow-section: required-inputs -->
## 필요한 입력

- 변경 파일 목록과 의도한 동작 변경.
- 코드, 스키마, 설정, 템플릿 메타데이터, 문서 같은 기본 계약 출처.
- 알려진 파생 표면: 테스트, README, 문서 사이트, 지역화 템플릿, 매니페스트, 잠금 파일, JSON 스키마.
- 관련 명령 의도 계약 항목.

<!-- mustflow-section: preconditions -->
## 전제 조건

- 작업이 사용할 때 조건에 맞고 사용하지 않을 때 조건에는 해당하지 않습니다.
- 필요한 입력이 있거나, 부족한 입력을 추측하지 않고 보고할 수 있습니다.
- 현재 범위의 상위 지시와 `.mustflow/config/commands.toml`을 확인했습니다.

<!-- mustflow-section: allowed-edits -->
## 허용되는 수정

- 계약을 일관되게 유지하는 데 필요한 표면만 갱신합니다.
- 변경된 계약이나 패키징 표면을 고정할 때만 테스트를 추가하거나 조정합니다.
- 정확한 문구를 자신 있게 지역화할 수 없으면 번역이나 문장 중심 문서를 검수 대상으로 표시합니다.
- 명령 권한을 넓히거나, 새 계약 파일을 지어내거나, 탐색 메모를 구속력 있는 정책으로 바꾸지 않습니다.

<!-- mustflow-section: procedure -->
## 절차

1. 변경되는 계약의 이름을 붙이고 기준 출처를 확인합니다.
2. 그 계약에 맞춰야 하는 표면을 나열합니다. 예: 소스 코드, 스키마, 명령 메타데이터, 템플릿, 매니페스트, 잠금 파일, 테스트, README, 문서 사이트, 지역화 사본.
3. 변경 파일 목록을 그 표면 목록과 비교하고 빠진 필수 표면을 추가합니다.
4. 파생 파일은 기준 출처와 기계적으로 맞춥니다. 일부 표면을 의도적으로 갱신하지 않았다면 이유를 기록합니다.
5. 명령 의도 이름, 스키마 식별자, 앞부분 메타데이터 리비전, 템플릿 항목, 버전 문자열, 문서 예시가 일치해야 하는 곳에서 정확히 일치하는지 확인합니다.
6. 계약과 건드린 패키징 또는 문서 표면을 덮는 가장 좁은 구성된 검증을 사용합니다.
7. 최종 보고에서 동기화한 표면과 건너뛰거나 미룬 표면을 구분합니다.

<!-- mustflow-section: postconditions -->
## 완료 조건

- 계약 기준 출처와 필요한 모든 파생 표면이 일치합니다.
- 의도적으로 오래 두거나 미루거나 검수가 필요한 표면을 명시합니다.
- 최종 보고에는 계약 정합성 검증에 사용한 명령 의도가 포함됩니다.

<!-- mustflow-section: verification -->
## 검증

사용 가능한 구성된 일회성 명령 의도를 사용합니다.

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

계약이 실행 동작에 영향을 주면 더 좁은 구성된 테스트나 빌드 의도도 실행합니다.

<!-- mustflow-section: failure-handling -->
## 실패 처리

- 검증에서 불일치가 나오면 새 동작을 더하기 전에 첫 계약 불일치부터 고칩니다.
- 기준 출처가 불분명하면 조용히 하나를 고르지 말고 경쟁하는 출처를 보고합니다.
- 필요한 표면이 현재 작업에서 검증하기에 너무 넓으면 건너뛴 표면과 위험을 보고합니다.
- 지역화 표면을 자신 있게 갱신할 수 없으면 출처 메타데이터를 정확히 유지하고 번역을 검수 대상으로 표시합니다.

<!-- mustflow-section: output-format -->
## 출력 형식

- 변경된 계약
- 사용한 기준 출처
- 동기화한 표면
- 미루었거나 검수가 필요한 표면
- 실행한 명령 의도
- 건너뛴 검증과 이유
- 남은 불일치 위험
