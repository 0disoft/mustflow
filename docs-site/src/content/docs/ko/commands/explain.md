---
title: mf explain
description: mustflow 정책 결정이 왜 적용되는지 확인하는 읽기 전용 명령입니다.
---

`mf explain authority [path]`는 mustflow가 관리하는 마크다운 문서의 권한을 어떻게 분류하는지 설명합니다. 파일을 수정하지 않으며, 프로젝트 검증으로도 인정되지 않습니다.

경로를 생략하면 권한 분류 모델을 출력합니다. 경로를 지정하면 해당 경로에 기대되는 mustflow 문서 역할이 있는지 보고합니다.

`mf explain command <intent>`는 `.mustflow/config/commands.toml`에 선언된 명령 의도가 `mf run`으로 실행 가능한지, 왜 허용되거나 차단되는지, 실행 시 mustflow 검증으로 인정되는지를 설명합니다.

`mf explain retention`은 `.mustflow/config/mustflow.toml`에서 적용되는 보존 정책을 설명합니다. 원본 이벤트 저장 방식, 크기가 제한된 실행 영수증, 맥락 파일 한도 등을 확인할 수 있습니다.

`mf explain skill <skill_id>`는 `.mustflow/skills/INDEX.md`의 특정 스킬 라우트 하나를 설명합니다. 트리거, 필요한 입력, 수정 범위, 위험, 검증 의도, 기대 출력 형식을 함께 보여줍니다. 대상은 스킬 폴더 이름, 전체 `metadata.skill_id`, `mustflow_doc`, 또는 스킬 경로로 지정할 수 있습니다.

`mf explain skills`는 `mf doctor --strict`가 사용하는 스킬 색인과 스킬 본문 사이의 정합성 요약을 설명합니다. `.mustflow/skills/INDEX.md`의 각 라우트가 실제 스킬 본문을 가리키는지, 각 스킬 본문이 색인에 등록되어 있는지 보고합니다.

## 출력

- `mustflow 루트`: 현재 mustflow 루트입니다.
- `주제`: 설명 주제입니다.
- `결정`: 해석된 정책 결정입니다.
- `이유`: 그 결정이 적용되는 이유입니다.
- `적용할 조치`: 에이전트가 그 결정에 따라 해야 할 일입니다.
- `mustflow 검증으로 인정`: 이 명령 결과가 검증 영수증으로 인정되는지 나타냅니다.
- `근거 파일`: 규칙의 근거가 되는 파일입니다.
- `기대하는 머리말(frontmatter)`: 경로가 인식된 경우 필요한 `mustflow_doc`, `authority`, `lifecycle` 값입니다.
- `권한 경계`: 해당 권한 범위에서 정의할 수 있는 것과 상위 권한 파일, 현재 코드, `commands.toml`에 맡겨야 하는 것을 보여줍니다.
- `명령 의도`: `command` 주제를 사용할 때의 명령 계약 메타데이터입니다.
- `보존 정책`: `retention` 주제를 사용할 때 적용되는 보존 설정입니다.
- `스킬 라우트`: `skill` 주제를 사용할 때의 트리거, 범위, 위험, 검증, 기대 출력입니다.
- `스킬 라우팅`: `skills` 주제를 사용할 때의 엄격한 스킬 색인/본문 정합성 상태입니다.

## 예시

```sh
npx mf explain authority
npx mf explain authority AGENTS.md
npx mf explain command test
npx mf explain command lint --json
npx mf explain retention
npx mf explain retention --json
npx mf explain skill code-review
npx mf explain skill mustflow.core.code-review --json
npx mf explain skills
npx mf explain skills --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## JSON 필드

```sh
npx mf explain authority AGENTS.md --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `explain`입니다.
- `topic` (`string`): `authority`, `command`, `retention`, `skill`, `skills` 중 하나입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `decision` (`object`): 해석된 결정, 이유, 적용할 조치, 근거 파일, 검증 인정 여부, 주제별 세부 정보입니다. `authority` 주제에서는 `boundary.role`, `boundary.canDefine`, `boundary.cannotDefine`도 포함합니다.

## 도움말 및 종료 코드

```sh
npx mf explain --help
```

- 종료 코드 `0`: 권한 결정을 확인하고 출력했습니다.
- 종료 코드 `1`: 잘못된 주제, 알 수 없는 옵션, 또는 예상하지 못한 인자가 제공되었습니다.
