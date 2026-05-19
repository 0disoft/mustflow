---
title: mf verify
description: required_after 메타데이터로 선택한 설정된 검증 의도를 실행합니다.
---

`mf verify --reason <event>`는 `.mustflow/config/commands.toml`을 읽고, `required_after` 목록에 지정한 이유가 들어 있는 명령 의도를 찾습니다. 그중 설정 완료, 단발 실행, 에이전트 실행 허용, 표준 입력 닫힘 조건을 모두 만족하는 의도만 실행합니다.

`mf verify --from-classification <path>`는 mustflow 루트 안의 JSON 파일에서 검증 이유를 읽습니다. 이 파일은 `schema_version: "1"`, `command: "classify"`, 현재 `mustflow_root`, `summary.validationReasons`를 포함한 mustflow 분류 보고서여야 합니다. 그래서 손으로 만든 느슨한 JSON이 실수로 실행 가능한 검증 명령을 고르지 못하게 합니다. `--from-plan`은 이름 전환 기간 동안 폐기 예정 호환 옵션으로 남아 있지만, 같은 분류 보고서 형식만 읽습니다. `mf verify --plan-only --json` 출력은 읽지 않습니다.

`mf verify --changed`는 `mf classify --changed`와 같은 방식으로 현재 Git 작업 트리를 분류한 뒤, 나온 검증 이유를 검증 선택 모델에 전달합니다. 다른 도구가 파일로 된 분류 보고서를 읽어야 한다면 `mf classify --changed --write <path>`를 우선 사용하세요. `--write-plan <path>`는 `mf verify --changed`에서 같은 분류 보고서를 쓰는 호환 옵션으로 유지됩니다.

`mf verify --plan-only --json`은 명령을 실행하지 않고 검증 계획만 출력합니다. 출력에는 안정적인 `verification_plan_id`와, 변경된 표면, 분류 이유, 명령 후보, 실행 가능성 검사, 효과, 남은 공백을 연결하는 `decision_graph`가 들어갑니다. 최신 로컬 색인이 있으면 각 예정 항목에 `.mustflow/cache/mustflow.sqlite`에서 읽은 `effectGraph` 설명이 붙을 수 있습니다. 이 설명에는 쓰기 잠금과 잠금 충돌이 들어갑니다. 각 요구사항에는 변경 파일과 맞은 경로-표면 규칙을 설명하는 `surfaceReadModels` 메타데이터도 붙을 수 있습니다. 로컬 색인이 없거나 오래되면 다시 색인하라는 안내만 표시하며, 명령 선택이나 실행 권한은 바꾸지 않습니다.

`mf verify`가 실제로 명령을 실행할 때는 plan-only 출력과 같은 예정 실행 모델을 사용하고, 기본값에서는 `schedule.entries`를 `mf run` 영수증으로 순서대로 실행합니다. `--parallel <count>`가 `1`보다 크면 효과가 명시되어 있고 서로 충돌하지 않는 같은 예정 실행 묶음의 항목만 동시에 실행할 수 있으며, 영수증은 여전히 예정 순서대로 기록됩니다. verify 출력, 검증 묶음 매니페스트, latest 포인터, 의도별 영수증은 같은 `verification_plan_id`를 공유합니다.

JSON의 `execution_status` 필드는 명령 실행 결과를 합산한 상태입니다. 기존 소비자를 위해 `status` 필드는 같은 실행 합산 상태를 가리키는 호환 별칭으로 유지됩니다. 요청한 작업이 완전히 검증됐는지 판단해야 하는 자동화는 `completion_verdict.status`를 읽어야 하며, 이 값이 `verified`일 때만 완료 검증 주장으로 취급해야 합니다.

## 선택 규칙

- `required_after`의 이유 문자열이 정확히 일치해야 선택됩니다.
- 분류 파일은 mustflow 루트 안에 있어야 하며 JSON이어야 하고, 지원되는 `mf classify` 보고서 형식을 따라야 합니다. 새 자동화에는 `--from-classification`을 사용하고, `--from-plan`은 이미 분류 보고서를 넘기던 기존 연동에만 남겨 두는 것이 좋습니다.
- `--changed`는 현재 Git 상태 경로를 사용하며, 어떤 명령도 새로 실행 가능하게 만들지 않습니다.
- `--write-plan`은 `--changed`와 함께만 사용할 수 있으며, 같은 분류 보고서를 쓰는 호환 옵션입니다.
- 실행 가능한 의도는 `mf run <intent>`와 같은 안전 경로로 실행됩니다.
- 알 수 없음, 수동 전용, 장기 실행, 차단됨, 설정 불완전 상태의 의도는 추측해서 실행하지 않고 건너뛴 항목으로 보고합니다.
- 이유에 맞는 의도가 하나도 없으면 결과는 `blocked`입니다.

## 예시

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
npx mf verify --changed --plan-only --json
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
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
- `plan_source` (`string | null`): `--from-classification` 또는 `--from-plan`을 사용했을 때의 JSON 분류 경로, `--changed`를 사용했을 때의 `changed`, 또는 `--reason`만 사용했을 때의 `null`입니다.
- `verification_plan_id` (`string`): 해당 실행을 선택한 검증 계획의 안정적인 SHA-256 식별자입니다.
- `execution_status` (`string`): 명령 실행 결과를 합산한 상태입니다. `passed`, `partial`, `failed`, `blocked` 중 하나입니다.
- `status` (`string`): 기존 소비자를 위해 남겨 둔 `execution_status` 호환 별칭입니다.
- `completion_verdict` (`object`): 근거 기반 완료 판정입니다. 자동화가 최종 검증 여부를 판단할 때는 이 객체의 `status`를 사용해야 합니다. `verified`일 때만 요청한 작업이 선택된 영수증, 건너뛴 검사, 남은 공백 기준으로 완료 검증됐다는 뜻입니다.
- `summary` (`object`): 일치, 실행, 통과, 실패, 건너뜀 개수입니다.
- `run_dir` (`string`): 매니페스트와 의도별 영수증을 담은 고유 검증 묶음 디렉터리입니다.
- `manifest_path` (`string`): 검증 묶음 매니페스트 경로입니다.
- `results` (`object[]`): 의도별 실행 또는 건너뜀 결과입니다.
- `results[].verification_plan_id` (`string | null`): 실행 결과의 검증 계획 식별자입니다. 건너뛴 결과에서는 `null`입니다.
- `results[].receipt_path` (`string | null`): 실행되어 영수증을 만든 결과의 의도별 영수증 경로입니다.
- `results[].receipt_sha256` (`string | null`): 기록된 의도별 영수증의 SHA-256 해시입니다.

`--plan-only --json` 출력은 변경 검증 보고서 스키마를 사용합니다. `verification_plan_id` 필드는 변경 파일 분류, 선택된 검증 모델, 관련 명령 계약 항목, 예정 실행 정책, 테스트 선택 보고서를 바탕으로 계산됩니다. `decision_graph` 필드는 변경된 표면, 분류 이유, 명령 후보, 실행 가능성, 효과, 남은 공백을 설명하는 공통 근거 모델입니다. `schedule.entries[].effectGraph` 필드가 있으면 잠금과 충돌을 설명하기 위한 읽기 전용 로컬 색인 메타데이터입니다. `requirements[].surfaceReadModels` 필드가 있으면 검증 사유 뒤의 경로-표면 규칙을 설명하기 위한 읽기 전용 로컬 색인 메타데이터입니다.

## 종료 코드

- `0`: `completion_verdict.status`가 `verified`입니다.
- `1`: 완료 판정이 부분 검증, 미검증, 차단, 모순 상태이거나 입력이 잘못됐습니다.
