---
title: mf verify
description: required_after 메타데이터로 선택한 설정된 검증 의도를 실행합니다.
---

`mf verify --reason <event>`는 `.mustflow/config/commands.toml`을 읽고, `required_after` 목록에 지정한 이유가 들어 있는 명령 의도를 찾습니다. 그중 설정 완료, 단발 실행, 에이전트 실행 허용, 표준 입력 닫힘 조건을 모두 만족하는 의도만 실행합니다.

`mf verify --from-plan <path>`는 mustflow 루트 안의 JSON 파일에서 검증 이유를 읽습니다. `reason`, `reasons`, `validationReasons`, `summary.validationReasons`, `classification_summary.validationReasons`를 인식하므로 계획이나 변경 분류 명령의 출력을 다시 손으로 옮기지 않고 검증에 연결할 수 있습니다.

`mf verify --changed`는 `mf classify --changed`와 같은 방식으로 현재 Git 작업 트리를 분류한 뒤, 나온 검증 이유를 기존 검증 계획에 전달합니다. `--write-plan <path>`를 함께 쓰면 현재 실행에는 메모리 안의 계획을 사용하면서, 분류 보고서를 mustflow 루트 안에 저장할 수 있습니다.

`mf verify --plan-only --json`은 명령을 실행하지 않고 검증 계획만 출력합니다. 최신 로컬 색인이 있으면 각 예정 항목에 `.mustflow/cache/mustflow.sqlite`에서 읽은 `effectGraph` 설명이 붙을 수 있습니다. 이 설명에는 쓰기 잠금과 잠금 충돌이 들어갑니다. 각 요구사항에는 변경 파일과 맞은 경로-표면 규칙을 설명하는 `surfaceReadModels` 메타데이터도 붙을 수 있습니다. 로컬 색인이 없거나 오래되면 다시 색인하라는 안내만 표시하며, 명령 선택이나 실행 권한은 바꾸지 않습니다.

## 선택 규칙

- `required_after`의 이유 문자열이 정확히 일치해야 선택됩니다.
- 계획 파일은 mustflow 루트 안에 있어야 하며 JSON이어야 합니다.
- `--changed`는 현재 Git 상태 경로를 사용하며, 어떤 명령도 새로 실행 가능하게 만들지 않습니다.
- `--write-plan`은 `--changed`와 함께만 사용할 수 있고, 출력 경로는 mustflow 루트 안에 있어야 합니다.
- 실행 가능한 의도는 `mf run <intent>`와 같은 안전 경로로 실행됩니다.
- 알 수 없음, 수동 전용, 장기 실행, 차단됨, 설정 불완전 상태의 의도는 추측해서 실행하지 않고 건너뛴 항목으로 보고합니다.
- 이유에 맞는 의도가 하나도 없으면 결과는 `blocked`입니다.

## 예시

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
npx mf verify --changed --plan-only --json
npx mf verify --changed --write-plan .mustflow/state/change-plan.json --json
npx mf verify --from-plan verify-plan.json --json
```

## JSON 필드

```sh
npx mf verify --reason code_change --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`string`): 검증 보고서 형식 버전입니다.
- `command` (`string`): 항상 `verify`입니다.
- `mustflow_root` (`string`): 확인된 mustflow 루트입니다.
- `reason` (`string`): 요청한 `required_after` 이유입니다. 계획 파일을 사용한 경우 여러 이유를 쉼표로 요약합니다.
- `reasons` (`string[]`): 명령 의도 선택에 사용한 검증 이유 목록입니다.
- `plan_source` (`string | null`): `--from-plan`을 사용했을 때의 JSON 계획 경로, `--changed`를 사용했을 때의 `changed`, 또는 `--reason`만 사용했을 때의 `null`입니다.
- `status` (`string`): `passed`, `partial`, `failed`, `blocked` 중 하나입니다.
- `summary` (`object`): 일치, 실행, 통과, 실패, 건너뜀 개수입니다.
- `results` (`object[]`): 의도별 실행 또는 건너뜀 결과입니다.

`--plan-only --json` 출력은 변경 검증 보고서 스키마를 사용합니다. `schedule.entries[].effectGraph` 필드가 있으면 잠금과 충돌을 설명하기 위한 읽기 전용 로컬 색인 메타데이터입니다. `requirements[].surfaceReadModels` 필드가 있으면 검증 사유 뒤의 경로-표면 규칙을 설명하기 위한 읽기 전용 로컬 색인 메타데이터입니다.

## 종료 코드

- `0`: 선택된 실행 가능 의도가 모두 통과했고 건너뛴 의도가 없습니다.
- `1`: 검증 실패, 부분 실행, 차단, 또는 잘못된 입력입니다.
