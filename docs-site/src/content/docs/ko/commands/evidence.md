---
title: mf evidence
description: 변경 파일과 최신 실행에 대한 읽기 전용 검증 evidence report.
---

`mf evidence`는 무엇을 검증해야 하는지, 어떤 configured intent가 그것을 덮는지, 최신 evidence가 그 계획에 대해 무엇을 말하는지 요약합니다.

명령을 실행하거나 command authority를 부여하지 않습니다. 기본적으로 changed file을 읽고 mustflow 검증과 같은 verification-planning model을 만든 뒤, `.mustflow/state/runs/latest.json`이 있으면 비교합니다. `--export <path>`는 mustflow root 내부 경로에만 report JSON을 씁니다.

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
- `policy` (`object`): report가 read-only이고, 명령을 실행하지 않으며, `.mustflow/config/commands.toml`을 command authority로 유지한다는 정책.
- `plan` (`object | null`): 검증 요구사항, 선택된 intent, command-contract gap.
- `latest` (`object`): raw output 없는 최신 bounded run 또는 verify evidence.
- `coverage` (`object`): 요구사항, 선택된 intent, receipt, skipped check, remaining risk, gap 개수.
- `recommended_commands` (`string[]`): 다음에 확인, 설정, 실행할 수 있는 안전한 mustflow 명령.

## Help and Exit Codes

```sh
npx mf evidence --help
```

- Exit code `0`: Evidence를 확인했습니다.
- Exit code `1`: Evidence를 확인할 수 없거나 선택한 source를 사용할 수 없습니다.
