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

For blocked or unknown intents, `mf run` prints a copyable `manual_only` intent snippet. The snippet is a proposal for `.mustflow/config/commands.toml`; it does not grant command authority until a person reviews and enables it. Dry-run and plan-only JSON include the same proposal in `suggested_intent_snippet`.

## Excluded Lifecycles

`mf run` does not execute intents with these lifecycles:

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

Development servers, watch mode, browser UI, and background processes are not finite validation commands.

Even when an intent declares `lifecycle = "oneshot"`, `mf run` also refuses obvious long-running command shapes in `argv`, such as shell-wrapper payloads (`sh -c "nohup ... &"`), interpreter loops (`node -e "setInterval(...)"`), package scripts like `npm run dev`, and watcher or server commands such as `vite --host`, `next dev`, or `webpack --watch`.

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

- `schema_version` (`string`): Run receipt format version.
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
- `max_output_bytes` (`number`): Maximum retained output size. Values above 16 MiB
  (16,777,216 bytes) are rejected before execution.
- `success_exit_codes` (`number[]`): Exit codes treated as success.
- `exit_code` (`number | null`): Process exit code.
- `signal` (`string | null`): Signal name when the process ended by signal.
- `error` (`string | null`): Start or runtime error message.
- `kill_method` (`string | null`): Method used to stop the process after timeout.
- `stdout` (`object`): Standard output summary.
- `stderr` (`object`): Standard error summary.
- `write_drift` (`object`): Bounded comparison between declared write paths and files changed during the command.
- `performance` (`object`): Safe performance summary for the latest execution.
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

Performance summary objects use safe metadata only:

- `performance.duration_ms` (`number`): Same wall-clock duration as the top-level `duration_ms`.
- `performance.executor_overhead_ms` (`number`): Time spent by the `mf run` executor outside the measured child command runtime, when measured separately.
- `performance.phases` (`object[]`): Optional structured phase timings from an opt-in profile source. mustflow never derives this field by parsing raw command output.
- `performance.timeout_ratio` (`number`): Fraction of the configured timeout used by the run.
- `performance.command_fingerprint` (`string`): Hash of the normalized redacted command identity.
- `performance.intent_fingerprint` (`string`): Hash of the intent and execution contract identity.
- `performance.contract_fingerprint` (`string`): Hash of the execution contract identity.
- `performance.runner` (`object`): Coarse local runner metadata such as platform family, architecture family, runtime, and runtime major version.
- `performance.output_summary` (`object`): Output byte counts and truncation flags only.
- `performance.result_summary` (`object`): Status, exit-code class, timeout flag, and coarse error kind.
- `performance.quality` (`object`): Whether optional phase or target timing sources were present and whether the sample is usable as a performance hint.

Performance summaries do not include command output, environment values, absolute paths, hostnames, branch names, raw commit hashes, or test names. They are local timing hints for already-authorized commands, not command authority and not proof that a verification step can be skipped.

`mf run` also writes bounded local performance hints to `.mustflow/state/perf/samples.json` and `.mustflow/state/perf/summary.json`. These files copy only the safe `performance` metadata from the receipt, use day-level timestamps, and enforce small retention limits. When structured phase timings exist, the sample stores phase names and durations only. It does not copy raw receipts, command output, command lines, environment values, absolute paths, or test names.

Redaction metadata uses these fields:

- `redaction.redacted` (`boolean`): Whether any receipt field was redacted.
- `redaction.redaction_count` (`number`): Total replacement count across redacted receipt fields.
- `redaction.redaction_kinds` (`string[]`): Redaction rule kinds that matched.
- `redaction.fields` (`string[]`): Receipt field paths that were redacted.

The receipt serves as a record of a single execution. The source of truth for command contracts remains `.mustflow/config/commands.toml`.

## Opt-In Profiling

Set `MUSTFLOW_RUN_PROFILE=1` to write `.mustflow/state/runs/latest.profile.json` for the current `mf run` invocation. The profile records bounded phase durations such as root detection, command contract loading, plan creation, environment preparation, write-drift checks, child command runtime, and receipt writing.

The profile is local generated state for diagnosing the latest run path. It does not include command output, environment values, absolute paths, or historical samples, and it does not grant command authority or prove that a verification step can be skipped.

`mf run` does not store environment variable values in the receipt. The environment fields report only the selected policy and allowed variable names so agents can explain the execution boundary without exposing secrets.

`mf run` also scans command strings, retained output tails, and runtime error text for conservative secret-like patterns such as token-shaped values or `password = ...` assignments. Matching values are replaced with `[REDACTED_SECRET]`, and the receipt records redaction metadata. This is a safety net, not a complete secret scanner.

`write_drift` stores path metadata only. It does not store file contents or diffs, and it does not make mustflow a filesystem sandbox. Undeclared changes are warning evidence for review, not an execution blocker.

Write-drift tracking uses `git status` when it is available. If the project is not a Git worktree, mustflow does not recursively snapshot the whole repository by default; set `MUSTFLOW_WRITE_DRIFT_SNAPSHOT=1` only when you explicitly want that local fallback for the current run.

## Exit Codes

- `0`: The command intent exited with an allowed exit code.
- `1`: The intent was missing, refused, timed out, or failed.
