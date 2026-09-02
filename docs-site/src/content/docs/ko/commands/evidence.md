---
title: mf evidence
description: 바뀐 파일에 필요한 검사와 최근 실행 결과를 요약합니다.
---

`mf evidence`는 무엇을 검사해야 하는지, 어떤 `intent`가 그 검사를 맡는지, 최근 실행 결과가 있는지를 요약합니다.

이 명령은 다른 명령을 실행하지 않습니다. 기본적으로 바뀐 파일에서 검사 계획을 만들고, `.mustflow/state/runs/latest.json`이 있으면 최근 결과와 비교합니다. `--export <path>`는 mustflow 루트 안에만 JSON 보고서를 씁니다.

## Example

```sh
npx mf evidence --changed
npx mf evidence --changed --json
npx mf evidence --latest --json
npx mf evidence --plan .mustflow/state/verification-plan.json --json
```

## JSON Fields

```sh
npx mf evidence --changed --json
```

- `schema_version` (`string`): 출력 형식 버전.
- `command` (`string`): 항상 `evidence`.
- `status` (`string`): `verified`, `unresolved`, `needs_verification`, `gaps`, `latest_only`, `no_changes`, `unavailable` 중 하나.
- `policy` (`object`): 보고서가 읽기 전용이고 `.mustflow/config/commands.toml`의 명령 규칙을 바꾸지 않는다는 표시.
- `plan` (`object | null`): 검사 요구사항, 선택된 `intent`, 명령 계약에서 빠진 항목.
- `latest` (`object`): 원본 출력은 제외한 최근 `run` 또는 `verify` 결과.
- `coverage` (`object`): 요구사항, 선택된 `intent`, `receipt`, 건너뛴 검사, 남은 위험과 누락 항목 수.
- `recommended_commands` (`string[]`): 다음에 확인, 설정, 실행할 수 있는 안전한 mustflow 명령.

## Help and Exit Codes

```sh
npx mf evidence --help
```

- Exit code `0`: 결과를 확인했습니다.
- Exit code `1`: 결과를 확인할 수 없거나 선택한 입력을 사용할 수 없습니다.
