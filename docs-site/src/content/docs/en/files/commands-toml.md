---
title: .mustflow/config/commands.toml
description: Command-intent contracts for tests, linting, builds, and documentation checks.
---

`.mustflow/config/commands.toml` is the command-intent contract that prevents agents from guessing project commands.

## Where It Is Used

- `AGENTS.md` uses this file to enforce the no-command-guessing rule.
- `agent-workflow.md` treats this file as the source of truth for command execution policy.
- Each `SKILL.md` references intent names such as `test`, `lint`, and `build` instead of raw commands.
- Tools such as `mf check` can read this file to validate executability and missing fields.

## Shape

```toml
schema_version = "1"

[defaults]
missing_behavior = "do_not_guess"
allow_inferred_commands = false
default_cwd = "."
default_timeout_seconds = 600
stdin = "closed"
require_lifecycle = true
require_timeout_for_oneshot = true
deny_unmanaged_long_running = true
max_output_bytes = 1048576
on_timeout = "terminate_process_tree"
kill_after_seconds = 5

[intents.test]
status = "unknown"
description = "Run tests."
reason = "No test command has been declared for this repository."
agent_action = "do_not_guess_report_missing"
required_after = ["code_change", "behavior_change"]
```

## Default Fields

- `schema_version`: Version of this file format.
- `defaults.missing_behavior`: What agents do when an intent is missing.
- `defaults.allow_inferred_commands`: Whether agents may infer commands. The default should be `false`.
- `defaults.default_cwd`: Default working directory when an intent does not specify one.
- `defaults.default_timeout_seconds`: Default timeout when an intent does not specify one.
- `defaults.stdin`: Default standard input behavior. Agent-run commands should use `closed`.
- `defaults.require_lifecycle`: Whether executable intents must declare a command lifecycle.
- `defaults.require_timeout_for_oneshot`: Whether finite commands must declare a timeout.
- `defaults.deny_unmanaged_long_running`: Whether unmanaged long-running commands are blocked.
- `defaults.max_output_bytes`: Default output limit accepted by the runner.
- `defaults.on_timeout`: Timeout handling policy.
- `defaults.kill_after_seconds`: Extra wait time available to process cleanup.

## Intent Status

- `configured`: An executable command is declared.
- `unknown`: No command contract exists yet.
- `not_applicable`: This repository does not need this validation.
- `manual_only`: A human must decide whether and how to run it.
- `disabled`: The command is known but must not be run now.

Agents may only run intents with `status = "configured"`.

## Intent Fields

- `description`: Purpose of the command intent.
- `reason`: Why the intent is not executable or not declared yet.
- `agent_action`: What the agent should do when it cannot run the intent.
- `required_after`: Change types after which this intent should be considered.
- `kind`: Classification such as mustflow builtin or repository command.
- `lifecycle`: Whether the command is finite or long-running.
- `run_policy`: Whether agents may run the intent or explicit approval is required.
- `argv`: Command and arguments executed without shell interpretation.
- `mode`: Set to `shell` only when shell syntax is required.
- `cmd`: Shell command string used when `mode = "shell"`.
- `cwd`: Working directory for the command.
- `timeout_seconds`: Command timeout.
- `stdin`: Standard input behavior. Agent-runnable intents must use `closed`.
- `success_exit_codes`: Exit codes considered successful.
- `writes`: Paths the command may modify.
- `network`: Whether the command uses the network.
- `destructive`: Whether the command may be destructive.

## Executable Intents

Configured intents should use an `argv` array where possible.

```toml
[intents.test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run tests."
argv = ["pnpm", "test"]
cwd = "."
timeout_seconds = 900
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
```

If a shell is required, set `mode = "shell"` and `cmd`, then declare the command impact and write paths.

For `unknown`, `not_applicable`, `manual_only`, and `disabled`, agents must not infer a replacement command.

## Test-Related Intents

The default template separates full tests, related tests, audit checks, coverage, and snapshot updates.

```toml
[intents.test_related]
status = "unknown"
reason = "No related-test command has been declared for this repository."
agent_action = "do_not_guess_report_missing"

[intents.test_audit]
status = "unknown"
reason = "No stale-test audit command has been declared."
agent_action = "do_not_guess_report_missing"

[intents.snapshot_update]
status = "manual_only"
reason = "Snapshot updates can hide unintended output changes."
agent_action = "do_not_update_snapshots_without_approval"
```

Agents should use these intent names when maintaining tests, but must still resolve each one through
`commands.toml`. A missing related-test or audit command is reported; it is not guessed.

## Command Lifecycle

- `oneshot`: A finite command that must exit.
- `server`: A long-running local server.
- `watch`: A file-watching command that does not exit on its own.
- `interactive`: A command waiting for user input.
- `browser`: A browser or UI process.
- `background`: A process intended to remain in the background.

Agents may run only `oneshot` intents by default. `server`, `watch`, `interactive`, `browser`, and `background` must not use `run_policy = "agent_allowed"`.

`mf run <intent>` executes only intents with `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`, and `stdin = "closed"`.
After execution, it writes the latest run receipt to `.mustflow/state/runs/latest.json`; with `--json`, it also prints the same receipt to standard output.

## Built-In Intents

`mustflow_doctor` inspects the current mustflow root install state, check result, runnable command intents, and next steps without writing files.

```toml
[intents.mustflow_doctor]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "doctor", "--json"]
stdin = "closed"
writes = []
```

`repo_map` generates or updates `REPO_MAP.md`.

```toml
[intents.repo_map]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "map", "--write"]
stdin = "closed"
writes = ["REPO_MAP.md"]
```

The root `config/` directory may belong to the user project, so mustflow does not use it.

## Git-Related Intents

The default template includes read-only Git intents used for final reporting and commit message suggestions.

```toml
[intents.changes_status]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "status", "--short"]
stdin = "closed"
writes = []
network = false
destructive = false

[intents.changes_diff_summary]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "diff", "--stat"]
stdin = "closed"
writes = []
network = false
destructive = false
```

These intents inspect changed files and a change summary without modifying Git state.

Actual commits are manual-only by default.

```toml
[intents.git_commit]
status = "manual_only"
reason = "Commits require explicit user approval."
agent_action = "do_not_commit_report_suggestion_only"
```

Agents may suggest commit messages, but they must not stage, commit, or push without an explicit user request.
