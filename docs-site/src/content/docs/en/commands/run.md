---
title: mf run
description: Runs a finite command intent declared in commands.toml.
---

`mf run <intent>` executes only finite command intents declared in `.mustflow/config/commands.toml`.

## Execution Conditions

The intent must satisfy all of these conditions:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` is a positive integer

If any condition is not satisfied, the command is not run and the reason is reported.

## Excluded Lifecycles

`mf run` does not execute intents with these lifecycles:

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

Development servers, watch mode, browser UI, and background processes are not finite validation commands.

## Examples

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## JSON Fields

Each execution writes the latest run receipt to `.mustflow/state/runs/latest.json`.

With `--json`, the same receipt is printed to standard output. Automation and agents should parse this structured output instead of parsing human-readable output.

Machine-readable output uses these fields:

- `schema_version` (`number`): Run receipt format version.
- `command` (`string`): Always `run`.
- `intent` (`string`): Command intent name.
- `status` (`string`): Run result. One of `passed`, `failed`, `timed_out`, or `start_failed`.
- `timed_out` (`boolean`): Whether the timeout was reached.
- `started_at` (`string`): Run start time.
- `finished_at` (`string`): Run finish time.
- `duration_ms` (`number`): Run duration.
- `cwd` (`string`): Actual execution directory.
- `lifecycle` (`string`): Intent lifecycle.
- `run_policy` (`string`): Applied execution policy.
- `mode` (`string`): Execution mode.
- `env_policy` (`string`): Effective environment policy, one of `minimal`, `allowlist`, or `inherit`.
- `env_allowlist` (`string[]`): Extra variable names allowed when `env_policy` is `allowlist`.
- `argv` (`string[]`): Command and arguments when not using shell mode.
- `cmd` (`string`): Shell command string when using shell mode.
- `timeout_seconds` (`number`): Applied timeout.
- `max_output_bytes` (`number`): Maximum retained output size.
- `success_exit_codes` (`number[]`): Exit codes treated as success.
- `exit_code` (`number | null`): Process exit code.
- `signal` (`string | null`): Signal name when the process ended by signal.
- `error` (`string | null`): Start or runtime error message.
- `kill_method` (`string | null`): Method used to stop the process after timeout.
- `stdout` (`object`): Standard output summary.
- `stderr` (`object`): Standard error summary.
- `write_drift` (`object`): Bounded comparison between declared write paths and files changed during the command.
- `redaction` (`object`): Secret-like redaction metadata for the receipt.
- `receipt_path` (`string`): Saved run receipt path.

Output summary objects use these fields:

- `stdout.bytes` (`number`): Total standard output bytes.
- `stdout.truncated` (`boolean`): Whether output was trimmed to the retention limit.
- `stdout.tail` (`string`): Tail of standard output.
- `stdout.redacted` (`boolean`): Whether secret-like text was replaced in the retained tail.
- `stdout.redaction_count` (`number`): Count of replacements in the retained tail.
- `stdout.redaction_kinds` (`string[]`): Redaction rule kinds that matched the retained tail.
- `stderr.bytes` (`number`): Total standard error bytes.
- `stderr.truncated` (`boolean`): Whether output was trimmed to the retention limit.
- `stderr.tail` (`string`): Tail of standard error.
- `stderr.redacted` (`boolean`): Whether secret-like text was replaced in the retained tail.
- `stderr.redaction_count` (`number`): Count of replacements in the retained tail.
- `stderr.redaction_kinds` (`string[]`): Redaction rule kinds that matched the retained tail.

Write drift objects use these fields:

- `write_drift.status` (`string`): `checked` when the before/after scan completed, otherwise `unavailable`.
- `write_drift.declared_paths` (`string[]`): Write paths declared by `writes` or write `effects`.
- `write_drift.observed_paths` (`string[]`): Bounded list of files that changed during the command.
- `write_drift.declared_observed_paths` (`string[]`): Observed changes covered by declared write paths.
- `write_drift.undeclared_paths` (`string[]`): Observed changes outside declared write paths.
- `write_drift.observed_count` (`number`): Total observed changed-file count before truncation.
- `write_drift.undeclared_count` (`number`): Total undeclared changed-file count before truncation.
- `write_drift.has_undeclared_changes` (`boolean`): Whether any observed change was outside the declared write paths.
- `write_drift.truncated` (`boolean`): Whether one or more path lists were truncated.
- `write_drift.reason` (`string | null`): Why write drift could not be checked, when unavailable.

Redaction metadata uses these fields:

- `redaction.redacted` (`boolean`): Whether any receipt field was redacted.
- `redaction.redaction_count` (`number`): Total replacement count across redacted receipt fields.
- `redaction.redaction_kinds` (`string[]`): Redaction rule kinds that matched.
- `redaction.fields` (`string[]`): Receipt field paths that were redacted.

The receipt serves as a record of a single execution. The source of truth for command contracts remains `.mustflow/config/commands.toml`.

`mf run` does not store environment variable values in the receipt. The environment fields report only the selected policy and allowed variable names so agents can explain the execution boundary without exposing secrets.

`mf run` also scans command strings, retained output tails, and runtime error text for conservative secret-like patterns such as token-shaped values or `password = ...` assignments. Matching values are replaced with `[REDACTED_SECRET]`, and the receipt records redaction metadata. This is a safety net, not a complete secret scanner.

`write_drift` stores path metadata only. It does not store file contents or diffs, and it does not make mustflow a filesystem sandbox. Undeclared changes are warning evidence for review, not an execution blocker.

## Exit Codes

- `0`: The command intent exited with an allowed exit code.
- `1`: The intent was missing, refused, timed out, or failed.
