---
title: mf verify
description: Runs configured verification intents selected by required_after metadata.
---

`mf verify --reason <event>` looks at `.mustflow/config/commands.toml`, finds command intents whose `required_after` list contains the given reason, and runs only the intents that are configured, one-shot, agent-allowed, closed-stdin commands.

`mf verify --from-plan <path>` reads verification reasons from a JSON file inside the mustflow root. The file must be a mustflow classify report with `schema_version: "1"`, `command: "classify"`, the current `mustflow_root`, and `summary.validationReasons`. This keeps hand-written loose JSON from silently selecting runnable verification commands.

`mf verify --changed` classifies the current Git working tree with the same semantics as `mf classify --changed`, then feeds those validation reasons into the existing verification planner. Use `--write-plan <path>` to save the classification report inside the mustflow root while still using the in-memory plan for the current verification run.

`mf verify --plan-only --json` prints the verification plan without running commands. The output includes a `decision_graph` that links changed surfaces, classification reasons, command candidates, eligibility checks, effects, and gaps. When a fresh local index exists, each scheduled entry can include `effectGraph` details from `.mustflow/cache/mustflow.sqlite`, including write locks and lock conflicts. Each `effectGraph` is marked `authority: "explanation_only"` and `grantsCommandAuthority: false`. Requirements can also include `surfaceReadModels` metadata that explains which indexed path-surface rule matched the changed files. Missing or stale indexes show a refresh hint and never change command selection or execution authority.

When `mf verify` actually runs commands, it uses the same schedule model as plan-only output and executes `schedule.entries` serially through `mf run` receipts.

## Selection Rules

- Matching uses the exact `required_after` reason string.
- Plan files must stay inside the mustflow root, must be JSON, and must use the supported `mf classify --json` report shape.
- `--changed` uses current Git status paths; it does not make any command runnable.
- `--write-plan` is available only with `--changed`, and the output path must stay inside the mustflow root.
- Runnable intents are executed through the same safety path as `mf run <intent>`.
- Unknown, manual-only, long-running, blocked, or incomplete intents are not guessed; they are reported as skipped.
- If no intents match the reason, the result is `blocked`.

## Examples

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
npx mf verify --changed --plan-only --json
npx mf verify --changed --write-plan .mustflow/state/change-plan.json --json
npx mf verify --from-plan verify-plan.json --json
```

## JSON Fields

```sh
npx mf verify --reason code_change --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Verify report format version.
- `command` (`string`): Always `verify`.
- `mustflow_root` (`string`): Resolved mustflow root.
- `reason` (`string`): Requested `required_after` reason, or a comma-separated summary of plan reasons.
- `reasons` (`string[]`): Verification reasons used to select command intents.
- `plan_source` (`string | null`): JSON plan path when `--from-plan` was used, `changed` when `--changed` was used, or `null` for `--reason`.
- `status` (`string`): `passed`, `partial`, `failed`, or `blocked`.
- `summary` (`object`): Counts for matched, ran, passed, failed, and skipped intents.
- `results` (`object[]`): Per-intent run or skip results.

For `--plan-only --json`, the output uses the change verification report schema. Its `decision_graph` field is the shared evidence model for changed surfaces, classification reasons, command candidates, eligibility, effects, and gaps. Its `schedule.entries[].effectGraph` field, when present, is read-only local-index metadata for explaining locks and conflicts. The graph includes `commandAuthority: ".mustflow/config/commands.toml"` to make clear that the index describes command effects but cannot make an intent runnable. Its `requirements[].surfaceReadModels` field, when present, is read-only local-index metadata for explaining the path-surface rule behind a verification reason.

## Exit Codes

- `0`: All selected runnable intents passed and no selected intents were skipped.
- `1`: Verification failed, was partial, was blocked, or input was invalid.
