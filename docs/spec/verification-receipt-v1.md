# Verification Receipt v1

This specification defines the latest run receipt written by `mf run`.

## Scope

A run receipt records one command-intent execution. It is evidence, not command
source truth. The command source remains
[.mustflow/config/commands.toml](../../.mustflow/config/commands.toml).

## Location

The latest receipt is written to:

```text
.mustflow/state/runs/latest.json
```

The file is repository-local generated state and should be ignored by version
control.

## Required Fields

A receipt must include:

- `schema_version`
- `command`
- `intent`
- `status`
- `timed_out`
- `started_at`
- `finished_at`
- `duration_ms`
- `cwd`
- `lifecycle`
- `run_policy`
- `mode`
- `timeout_seconds`
- `max_output_bytes`
- `success_exit_codes`
- `exit_code`
- `signal`
- `error`
- `kill_method`
- `stdout`
- `stderr`
- `receipt_path`

`argv` is present for argv-mode commands. `cmd` is present for shell-mode
commands.

## Status Values

- `passed`: the process exited with a configured success exit code.
- `failed`: the process started but did not exit successfully.
- `timed_out`: the command exceeded its configured timeout.
- `start_failed`: the process could not be started.

## Output Tails

Receipts store bounded output summaries, not raw unbounded logs. `stdout` and
`stderr` must each include:

- `bytes`
- `truncated`
- `tail`

The tail must respect the configured output limits. It must not be treated as a
complete log.

## Authority

An `mf run` receipt is stronger verification evidence than direct shell output
because it is tied to a declared command intent. It is still lower authority
than current source files, current user instructions, and the command contract
that produced it.

## Testable Outcomes

- A passing intent writes `status = "passed"` and `exit_code = 0` when `0` is a
  success code.
- A timeout writes `status = "timed_out"` and `timed_out = true`.
- A start failure writes `status = "start_failed"` and includes an error
  message.
- `mf run <intent> --json` prints the same receipt shape that is written to
  `latest.json`.

