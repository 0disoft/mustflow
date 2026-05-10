---
title: 스킬 보조 자원
description: 스킬 문서가 커질 때 references, assets, scripts, resources.toml을 어떻게 추가할지 설명합니다.
---

mustflow의 기본 스킬은 `.mustflow/skills/<name>/SKILL.md` 하나로 시작합니다.

빈 `references/`, `assets/`, `scripts/` 폴더를 미리 만들지 않습니다. 보조 자원은 스킬 문서가 너무 길어지거나 반복 실행 보조 도구가 실제로 필요할 때만 추가합니다.

## 기본 원칙

- `SKILL.md`는 스킬의 진입점입니다.
- `resources.toml`은 보조 자원이 있을 때만 둡니다.
- `references/`는 긴 기준표, 사례, 배경 설명처럼 읽기 전용 자료를 둡니다.
- `assets/`는 템플릿, 예시 입력, 스키마처럼 재사용 파일을 둡니다.
- `scripts/`는 스킬 전용 실행 보조 도구가 필요할 때만 둡니다.
- 스크립트는 `SKILL.md`에서 바로 실행하라고 쓰지 않고, `.mustflow/config/commands.toml`의 명령 의도 계약을 통해 실행하게 합니다.

## 선택 구조

```text
.mustflow/skills/<name>/
├─ SKILL.md
├─ resources.toml        # 선택: 보조 자원이 있을 때만 추가
├─ references/           # 선택: 읽기 전용 참고 자료
├─ assets/               # 선택: 템플릿, 스키마, 예시 입력
└─ scripts/              # 선택: 명령 의도에 연결된 보조 실행 도구
```

이 구조는 스킬마다 반드시 만들어야 하는 골격이 아닙니다. 기본 템플릿은 `SKILL.md`만 제공하고, 나머지는 스킬이 실제로 복잡해질 때 추가합니다.

## resources.toml 역할

`resources.toml`은 보조 자원 목록과 사용 조건을 기록하는 선택 파일입니다. 스킬 본문을 대체하는 문서가 아니라, 에이전트가 어떤 자료를 언제 읽거나 실행해도 되는지 판단할 때 돕는 보조 정보입니다.

예상 형식은 다음과 같습니다.

```toml
schema_version = "1"

[resources."references/severity-rubric.md"]
type = "reference"
purpose = "코드 검토 결과의 심각도를 분류할 때 읽는 기준표입니다."
read_when = ["finding_severity_is_unclear"]
required = false

[resources."assets/templates/review-report.md"]
type = "asset"
asset_kind = "template"
purpose = "검토 결과 보고 형식을 맞출 때 사용하는 템플릿입니다."
required = false

[resources."scripts/validate-review-report.py"]
type = "script"
language = "python"
purpose = "검토 보고서 형식을 확인합니다."
run_policy = "requires_command_contract"
command_intent = "review_report_validate"
network = false
destructive = false
writes = []
dependencies = ["python>=3.10"]
```

## references/

`references/`에는 에이전트가 필요할 때 읽는 긴 자료를 둡니다.

적절한 예시는 다음입니다.

- 판단 기준표
- 실패 사례와 해결 방식
- 출력 예시
- 긴 배경 설명

비밀정보, 원본 실행 로그, 생성 캐시, 대용량 파일은 두지 않습니다.

## assets/

`assets/`에는 스킬 실행에 쓰는 정적 파일을 둡니다.

적절한 예시는 다음입니다.

- 보고서 템플릿
- 예시 입력 파일
- 검증용 스키마
- 작은 샘플 데이터

대용량 바이너리, 빌드 산출물, 캐시, 비밀정보는 두지 않습니다.

## scripts/

`scripts/`에는 스킬 전용 보조 실행 도구를 둡니다.

스크립트는 다음 조건을 만족해야 합니다.

- 도움말을 제공합니다.
- 실패 시 0이 아닌 종료 코드를 반환합니다.
- 입력과 출력 형식이 명확합니다.
- 파일을 쓰거나 네트워크를 사용한다면 `resources.toml`, `commands.toml`에 명시합니다.
- 파괴적 작업은 기본값으로 두지 않습니다.

에이전트는 스크립트 경로를 추측해 직접 실행하지 않습니다. 실행이 필요하면 먼저 `.mustflow/config/commands.toml`에서 연결된 명령 의도를 확인합니다.

## skills/INDEX.md와의 관계

`.mustflow/skills/INDEX.md`는 스킬 단위 목록만 담습니다. 각 스킬의 보조 파일 전체를 펼쳐 쓰지 않습니다.

보조 파일 목록은 해당 스킬 폴더의 `resources.toml`에서 관리합니다.

## 커뮤니티 스킬 저장소 방향

mustflow core는 기본 스킬을 계속 늘리는 방향을 택하지 않습니다. 기본 템플릿은 작게 유지하고, 추가 스킬은 나중에 별도 커뮤니티 저장소에서 설치하는 방향을 검토합니다.

가능한 저장소 이름은 `mustflow-skills`, `mustflow-community-skills`처럼 mustflow 규약과 연결되는 이름이 좋습니다. 범위가 지나치게 넓거나 다른 생태계와 혼동될 수 있는 이름은 피합니다.

커뮤니티 스킬 저장소를 도입한다면 각 스킬은 `SKILL.md`와 mustflow용 `skill.toml`을 함께 가져야 합니다. `skill.toml`에는 스킬 식별자, 버전, 호환 mustflow 범위, 라이선스, 포함 스크립트, 네트워크 사용 여부, 파일 쓰기 범위, 위험 등급을 선언합니다.

여러 스킬 묶음은 "자동화 스킬"이 아니라 `pack`, `bundle`로 부릅니다. pack은 스킬을 설치만 하며, 명령을 자동 실행하거나 `.mustflow/config/commands.toml`을 자동 수정하지 않습니다. 필요한 명령 의도는 권장 항목으로만 제시하고, 실제 선언은 사용자가 프로젝트에 맞게 작성해야 합니다.

나중에 `mf skill add`, `mf pack add`를 도입한다면 아래 안전장치가 먼저 필요합니다.

- 설치 전 변경 파일, 포함된 스크립트, 권한, 위험 등급을 미리 보여줍니다.
- 스크립트는 설치 중 실행하지 않습니다.
- 설치 뒤 `.mustflow/skills.lock.toml` 같은 잠금 파일에 출처, 버전, 해시를 기록합니다.
- `mf skill audit`는 잠금 파일과 현재 파일 해시, 스크립트-명령 의도 연결, 폐기된 스킬 여부를 확인합니다.
- 도구별 기본 스킬 경로로 내보내는 기능은 기본 설치가 아니라 선택 어댑터(adapter)로만 둡니다.

## 검사 기준

`mf check --strict`는 다음 항목을 검사합니다.

- `resources.toml`에 등록된 파일이 실제로 존재하는지
- 등록된 파일이 `references/`, `assets/`, `scripts/` 아래에 있는지
- 등록되지 않은 `scripts/` 파일이 있는지
- 스크립트가 `run_policy = "requires_command_contract"`를 사용하고, `commands.toml`의 설정된 명령 의도와 연결되어 있는지
- 스크립트가 기본값으로 네트워크 사용이나 파괴적 작업을 열어두지 않았는지
- 스크립트의 `writes` 선언이 스킬 폴더 안쪽 상대 경로만 가리키는지
- `SKILL.md`가 없는 스킬 폴더가 있는지

기본 템플릿에는 첫 리소스 기반 스킬로 `visual-review-artifact/resources.toml`이 들어 있습니다. 다른 리소스 색인은 스킬이 보조 참고 자료, 자산, 스크립트를 실제로 필요로 할 때만 추가합니다.
대용량 파일, 비밀정보, 캐시 파일 검사는 보존 정책·맥락 파일 검사와 함께 별도 저장소 안전 검사로 확장할 수 있습니다.
