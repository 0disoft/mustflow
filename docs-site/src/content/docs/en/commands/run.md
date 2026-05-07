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

## What It Refuses

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

With `--json`, the same receipt is printed to standard output. Automation and agents should parse this structured output instead of scraping human help text.

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
- `receipt_path` (`string`): Saved run receipt path.

Output summary objects use these fields:

- `stdout.bytes` (`number`): Total standard output bytes.
- `stdout.truncated` (`boolean`): Whether output was trimmed to the retention limit.
- `stdout.tail` (`string`): Tail of standard output.
- `stderr.bytes` (`number`): Total standard error bytes.
- `stderr.truncated` (`boolean`): Whether output was trimmed to the retention limit.
- `stderr.tail` (`string`): Tail of standard error.

The receipt is evidence for one execution. The source of truth for command contracts remains `.mustflow/config/commands.toml`.

## Exit Codes

- `0`: The command intent exited with an allowed exit code.
- `1`: The intent was missing, refused, timed out, or failed.
