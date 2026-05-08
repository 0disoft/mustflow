---
title: mf verify
description: Runs configured verification intents selected by required_after metadata.
---

`mf verify --reason <event>` looks at `.mustflow/config/commands.toml`, finds command intents whose `required_after` list contains the given reason, and runs only the intents that are configured, one-shot, agent-allowed, closed-stdin commands.

## Selection Rules

- Matching uses the exact `required_after` reason string.
- Runnable intents are executed through the same safety path as `mf run <intent>`.
- Unknown, manual-only, long-running, blocked, or incomplete intents are not guessed; they are reported as skipped.
- If no intents match the reason, the result is `blocked`.

## Examples

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
```

## JSON Fields

```sh
npx mf verify --reason code_change --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Verify report format version.
- `command` (`string`): Always `verify`.
- `mustflow_root` (`string`): Resolved mustflow root.
- `reason` (`string`): Requested `required_after` reason.
- `status` (`string`): `passed`, `partial`, `failed`, or `blocked`.
- `summary` (`object`): Counts for matched, ran, passed, failed, and skipped intents.
- `results` (`object[]`): Per-intent run or skip results.

## Exit Codes

- `0`: All selected runnable intents passed and no selected intents were skipped.
- `1`: Verification failed, was partial, was blocked, or input was invalid.
