---
title: mf evidence
description: Read-only verification evidence reporting for changed files and latest runs.
---

`mf evidence` summarizes what must be verified, which configured intents cover it, and what latest evidence says about the plan.

It does not run commands or grant command authority. By default it reads changed files, builds the same verification-planning model used by mustflow verification, and compares it with `.mustflow/state/runs/latest.json` when present. `--export <path>` writes the report JSON only to a path inside the mustflow root.

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

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `evidence`.
- `status` (`string`): `verified`, `unresolved`, `needs_verification`, `gaps`, `latest_only`, `no_changes`, or `unavailable`.
- `policy` (`object`): States that the report is read-only, does not execute commands, and keeps `.mustflow/config/commands.toml` as command authority.
- `plan` (`object | null`): Verification requirements, selected intents, and command-contract gaps.
- `latest` (`object`): Latest bounded run or verify evidence without raw output.
- `coverage` (`object`): Counts for requirements, selected intents, receipts, skipped checks, remaining risks, and gaps.
- `recommended_commands` (`string[]`): Safe mustflow commands to inspect, configure, or run next.

## Help and Exit Codes

```sh
npx mf evidence --help
```

- Exit code `0`: Evidence was inspected.
- Exit code `1`: Evidence could not be inspected or the selected source is unavailable.
