---
title: .mustflow/skills/*/SKILL.md
description: 반복 작업을 안정적으로 수행하기 위한 절차 문서입니다.
---

`.mustflow/skills/*/SKILL.md`는 에이전트가 반복 작업을 추측 없이 수행하도록 돕는 절차 문서입니다.

## 어디에 쓰이나

에이전트는 `.mustflow/skills/INDEX.md`에서 현재 작업과 맞는 스킬을 찾은 뒤 해당 `SKILL.md`를 읽습니다.

스킬 문서는 코드 검토, 테스트 유지보수, 실패 추적, 문서 갱신처럼 반복되는 작업 절차를 담습니다. 공통 정책은 중복해서 쓰지 않고 `.mustflow/docs/agent-workflow.md`를 참조합니다.

스킬을 활성화한다는 말은 스킬 절차를 읽고 따른다는 뜻입니다. `.mustflow/config/commands.toml`
밖의 명령 실행 권한을 주거나 더 높은 우선순위의 지침을 무시하게 하지는 않습니다.

## 앞부분 메타데이터

```yaml
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 1
name: code-review
description: Use when reviewing code changes, scope, risks, or missing verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.code-review
  command_intents:
    - test
    - lint
```

- `mustflow_doc`: mustflow 안에서 이 스킬을 식별하는 고정 이름입니다.
- `locale`: 문서 언어입니다.
- `canonical`: 기준 원문인지 나타냅니다.
- `revision`: 기준 문서의 판 번호입니다.
- `name`: 스킬 이름입니다. `.mustflow/skills/<name>/` 폴더 이름과 일치해야 합니다.
- `description`: 에이전트가 이 스킬을 언제 읽어야 하는지 설명합니다.
- `metadata.mustflow_schema`: 스킬 메타데이터 형식의 판 번호입니다. 현재 지원하는 값은 `"1"`입니다.
- `metadata.mustflow_kind`: 문서 종류입니다. 기본 스킬은 `procedure`를 사용해야 합니다.
- `metadata.pack_id`: 스킬을 소유한 패키지나 스킬 묶음의 이름공간입니다. 예: `mustflow.core`.
- `metadata.skill_id`: 전역 범위의 스킬 식별자입니다. `mustflow.core.code-review`처럼 패키지 식별자와 폴더 이름을 결합해야 합니다.
- `metadata.command_intents`: 이 스킬이 참조할 수 있는 명령 의도 이름입니다. 각 이름은 `.mustflow/config/commands.toml`에 있어야 합니다.

영어 스킬 템플릿이 기준 원문입니다. 언어별 번역 스킬은 각자의 `locale`을 쓰고 `canonical: false`로 표시합니다.

## 표준 섹션

각 스킬 문서는 다음 항목을 포함합니다.

- `목적`: 이 스킬이 해결하는 작업을 짧게 설명합니다.
- `사용 조건`: 이 스킬을 읽어야 하는 상황입니다.
- `사용하지 않는 경우`: 스킬을 잘못 적용하지 않기 위한 제외 조건입니다.
- `필요한 입력`: 에이전트가 작업 전에 확보해야 할 정보입니다.
- `절차`: 실제 작업 순서입니다.
- `검증`: 필요한 명령 의도와 확인 방식을 설명합니다.
- `실패 대응`: 명령 실패나 정보 부족 시의 처리 방식입니다.
- `출력 형식`: 작업 결과 보고에 포함할 항목입니다.

## 작성 기준

스킬 문서는 하나의 작업 유형만 다루는 것이 원칙입니다.

스킬 문서에는 실제 셸 명령을 직접 쓰지 않습니다. 검증 섹션에서는 `.mustflow/docs/agent-workflow.md#명령-실행-정책`을 참조하고, 필요한 명령 의도 이름만 적습니다.

각 명령 의도는 `.mustflow/config/commands.toml`에서 확인합니다. `status = "configured"`가 아니면 실행하지 않고, 해당 상태와 건너뛴 이유를 함께 보고합니다.

스킬 자체가 명령 실행 권한을 부여한다고 쓰지 않습니다. 스킬은 절차를 설명하고, 실행 가능한 명령 권한의 기준은 `.mustflow/config/commands.toml` 하나입니다.

예:

```md
## 검증

관련 명령 의도:

- `test`
- `lint`

각 의도는 `.mustflow/config/commands.toml`에서 확인합니다.
```

## 보조 자원

기본 스킬은 `SKILL.md` 하나만으로 시작합니다. 빈 `references/`, `assets/`, `scripts/` 폴더를 미리 만들지 않습니다.

스킬 문서가 길어지거나 별도 보조 자료가 필요해지면 선택적으로 `resources.toml`을 추가하고, 그 안에 참고 문서, 템플릿, 스크립트를 등록합니다. 스크립트는 직접 실행 경로를 적기보다 `.mustflow/config/commands.toml`의 명령 의도와 연결합니다.

자세한 기준은 [스킬 보조 자원](../../design/skill-resources/) 문서를 따릅니다.
