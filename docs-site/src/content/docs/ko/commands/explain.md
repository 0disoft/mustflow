---
title: mf explain
description: mustflow 정책 결정이 왜 적용되는지 확인하는 읽기 전용 명령입니다.
---

`mf explain authority [path]`는 mustflow가 관리하는 마크다운 문서의 권한을 어떻게 분류하는지 설명합니다. 파일을 수정하지 않으며, 프로젝트 검증으로도 인정되지 않습니다.

경로를 생략하면 권한 분류 모델을 출력합니다. 경로를 지정하면 해당 경로에 기대되는 mustflow 문서 역할이 있는지 보고합니다.

`mf explain asset-optimization`은 웹 이미지 최적화 판단 경로를 설명합니다. `web-asset-optimization` 스킬이 적용되는지와 `asset_optimize`가 에이전트가 실행할 수 있는 설정된 명령 의도인지 확인해, 에이전트가 이미지 변환 도구나 패키지 명령을 추측해 실행하지 않게 합니다.

`mf explain anchor <anchor_id>`는 구조화된 소스 코드 앵커를 설명합니다. 소스 앵커는 탐색 전용 코드 좌표입니다. 에이전트가 코드를 찾는 데 도움을 줄 수 있지만, 작업 규칙, 명령 권한, 검증 권한을 정의할 수는 없습니다.

`mf explain command <intent>`는 `.mustflow/config/commands.toml`에 선언된 명령 의도가 `mf run`으로 실행 가능한지, 왜 허용되거나 차단되는지, 실행 시 mustflow 검증으로 인정되는지를 설명합니다.
최신 로컬 색인이 있으면 파생된 명령 효과 그래프도 읽어 쓰기 잠금과 잠금 충돌을 보여줍니다. 이 정보는 설명 전용이며 명령 권한을 바꾸지 않습니다.

`mf explain verify --reason <event>`와 `mf explain verify --from-plan <path>`는 명령을 실행하거나 실행 영수증을 쓰지 않고 `mf verify`가 어떤 검증 후보를 고를지 설명합니다. `mf verify`와 같은 `required_after` 매칭 및 명령 실행 가능성 판정 규칙을 쓰며, 건너뛴 후보는 안정적인 이유 코드와 함께 보여줍니다.
검증 설명에는 계획 전용 검증과 대시보드 스냅샷이 함께 쓰는 판단 모델인 `decision.verification.decisionGraph`도 들어갑니다. 최신 로컬 색인이 있으면 맞은 후보의 읽기 전용 명령 효과 그래프 상태도 포함합니다. 색인이 없거나 오래되었으면 다시 색인하라는 안내만 표시하며 명령 선택은 바꾸지 않습니다.

`mf explain retention`은 `.mustflow/config/mustflow.toml`에서 적용되는 보존 정책을 설명합니다. 원본 이벤트 저장 방식, 크기가 제한된 실행 영수증, 맥락 파일 한도 등을 확인할 수 있습니다.

`mf explain skill <skill_id>`는 `.mustflow/skills/INDEX.md`의 특정 스킬 라우트 하나를 설명합니다. 트리거, 필요한 입력, 수정 범위, 위험, 검증 의도, 기대 출력 형식을 함께 보여줍니다. 대상은 스킬 폴더 이름, 전체 `metadata.skill_id`, `mustflow_doc`, 또는 스킬 경로로 지정할 수 있습니다.

`mf explain skills`는 `mf doctor --strict`가 사용하는 스킬 색인과 스킬 본문 사이의 정합성 요약을 설명합니다. `.mustflow/skills/INDEX.md`의 각 라우트가 실제 스킬 본문을 가리키는지, 각 스킬 본문이 색인에 등록되어 있는지 보고합니다.

`mf explain surface [path]`는 저장소 상대 경로가 변경 분류에서 쓰는 공개 표면 계약에 어떻게 대응되는지 설명합니다. 검증을 실행하지 않고 표면 종류, 검증 이유, 영향받는 계약, 갱신 정책, 어긋남 검사를 보여줍니다. 최신 로컬 색인이 있으면 해당 경로와 맞은 파생 경로-표면 규칙도 보여줍니다. 색인이 없거나 오래되었으면 다시 색인하라는 안내만 표시하며, 분류나 명령 선택은 바꾸지 않습니다.

## 출력

- `mustflow 루트`: 현재 mustflow 루트입니다.
- `주제`: 설명 주제입니다.
- `결정`: 해석된 정책 결정입니다.
- `이유`: 그 결정이 적용되는 이유입니다.
- `적용할 조치`: 에이전트가 그 결정에 따라 해야 할 일입니다.
- `mustflow 검증으로 인정`: 이 명령 결과가 검증 영수증으로 인정되는지 나타냅니다.
- `근거 파일`: 규칙의 근거가 되는 파일입니다.
- `소스 앵커`: `anchor` 주제를 사용할 때의 앵커 경로, 줄, 목적, 검색어, 불변조건, 위험, 탐색 전용 권한입니다.
- `기대하는 머리말(frontmatter)`: 경로가 인식된 경우 필요한 `mustflow_doc`, `authority`, `lifecycle` 값입니다.
- `권한 경계`: 해당 권한 범위에서 정의할 수 있는 것과 상위 권한 파일, 현재 코드, `commands.toml`에 맡겨야 하는 것을 보여줍니다.
- `명령 의도`: `command` 주제를 사용할 때의 명령 계약 메타데이터입니다.
- `명령 효과 그래프`: `command` 주제를 사용할 때 최신 로컬 색인에서 읽은 쓰기 잠금과 잠금 충돌입니다. 색인이 없거나 오래되었으면 명령 판단은 그대로 두고 다시 색인하라는 안내만 보여줍니다.
- `검증 설명`: `verify` 주제를 사용할 때의 검증 이유, 맞은 `required_after` 명령 의도, 실행 가능한 후보, 건너뛴 후보, 빈틈, `decisionGraph`, 로컬 색인의 명령 효과 상태입니다.
- `보존 정책`: `retention` 주제를 사용할 때 적용되는 보존 설정입니다.
- `스킬 라우트`: `skill` 주제를 사용할 때의 트리거, 범위, 위험, 검증, 기대 출력입니다.
- `스킬 라우팅`: `skills` 주제를 사용할 때의 엄격한 스킬 색인/본문 정합성 상태입니다.
- `공개 표면`: `surface` 주제를 사용할 때의 표면 종류, 분류, 검증 이유, 영향받는 계약, 갱신 정책, 어긋남 검사입니다.
- `경로-표면 읽기 모델`: `surface` 주제에서 `.mustflow/cache/mustflow.sqlite`를 사용할 수 있을 때 최신 로컬 색인의 규칙 식별자, 패턴, 파생 표면 메타데이터를 보여줍니다. 색인이 없거나 오래되었으면 표면 결정을 바꾸지 않고 다시 색인 안내만 표시합니다.

## 예시

```sh
npx mf explain authority
npx mf explain authority AGENTS.md
npx mf explain anchor auth.session.resolve
npx mf explain anchor auth.session.resolve --json
npx mf explain asset-optimization
npx mf explain asset-optimization --json
npx mf explain command test
npx mf explain command lint --json
npx mf explain verify --reason code_change
npx mf explain verify --from-plan verify-plan.json --json
npx mf explain retention
npx mf explain retention --json
npx mf explain skill code-review
npx mf explain skill mustflow.core.code-review --json
npx mf explain skills
npx mf explain skills --json
npx mf explain surface README.md
npx mf explain surface templates/default/locales/ko/AGENTS.md --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## JSON 필드

```sh
npx mf explain authority AGENTS.md --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `explain`입니다.
- `topic` (`string`): `anchor`, `asset-optimization`, `authority`, `command`, `retention`, `skill`, `skills`, `surface`, `verify` 중 하나입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `decision` (`object`): 해석된 결정, 이유, 적용할 조치, 근거 파일, 검증 인정 여부, 주제별 세부 정보입니다. `authority` 주제에서는 `boundary.role`, `boundary.canDefine`, `boundary.cannotDefine`도 포함합니다. `command` 주제에서는 선언된 명령 의도에 대해 `decision.effectGraph`가 로컬 색인의 명령 효과 그래프 상태, 쓰기 잠금, 충돌, 오래된 경로, 다시 색인 안내를 담습니다. `verify` 주제에서는 `decision.verification`이 선택된 검증 이유, 맞은 후보, 건너뜀 이유, 빈틈, `decisionGraph`, 로컬 색인의 명령 효과 상태를 담습니다. `surface` 주제에서는 사용할 수 있을 때 `decision.readModel`이 읽기 전용 로컬 색인의 경로-표면 상태와 맞은 규칙 메타데이터를 담습니다.

## 도움말 및 종료 코드

```sh
npx mf explain --help
```

- 종료 코드 `0`: 정책 결정을 확인하고 출력했습니다.
- 종료 코드 `1`: 잘못된 주제, 알 수 없는 옵션, 또는 예상하지 못한 인자가 제공되었습니다.
