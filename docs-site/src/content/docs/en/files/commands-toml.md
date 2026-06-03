---
title: .mustflow/config/commands.toml
description: Command intent contracts for tests, linting, builds, and documentation checks.
---

`.mustflow/config/commands.toml` serves as the authoritative command intent contract, ensuring that agents do not infer or "guess" project-specific commands.

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
env_policy = "minimal"
env_allowlist = []
allow_project_local_bin_bare_executables = ["mf", "mustflow"]

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
- `defaults.default_timeout_seconds`: Scaffolding and validation default for new intent declarations. `mf run` still requires each runnable oneshot intent to declare `timeout_seconds` explicitly.
- `defaults.stdin`: Scaffolding and validation default for new intent declarations. Agent-runnable intents must still declare `stdin = "closed"` explicitly.
- `defaults.require_lifecycle`: Whether executable intents must declare a command lifecycle.
- `defaults.require_timeout_for_oneshot`: Specifies whether oneshot commands are required to declare a timeout.
- `defaults.deny_unmanaged_long_running`: Whether unmanaged long-running commands are blocked.
- `defaults.max_output_bytes`: Default output limit accepted by the runner for each standard output
  or standard error stream. Values above 16 MiB (16,777,216 bytes) are rejected.
- `defaults.on_timeout`: Timeout handling policy.
- `defaults.kill_after_seconds`: Default extra wait time available to process cleanup. An intent can
  override it with its own `kill_after_seconds`.
- `defaults.env_policy`: Environment policy for command execution when an intent does not override it.
- `defaults.env_allowlist`: Extra environment variable names passed when the effective policy is `allowlist`.
- `defaults.allow_project_local_bin_bare_executables`: Bare executable names that may match project-local `.bin` files without a strict warning. `mf run` may also resolve those names directly from the project-local `.bin` directory instead of exposing the whole local bin directory through `PATH`. The installed template allows `mf` and `mustflow` so built-in mustflow intents stay concise.

## Intent Status

- `configured`: An executable command is declared.
- `unknown`: No command contract exists yet.
- `not_applicable`: This repository does not need this validation.
- `manual_only`: Requires human intervention to decide upon and execute the command. Use this as the status for new human-run command declarations.
- `disabled`: The command is known but must not be run now.

Agents may only run intents with `status = "configured"`, and status alone is not enough. `mf run` also requires a oneshot lifecycle, `run_policy = "agent_allowed"`, closed standard input, an explicit timeout, a declared command, and a working directory inside the current root.

## Intent Fields

- `description`: Purpose of the command intent.
- `reason`: Why the intent is not executable or not declared yet.
- `agent_action`: What the agent should do when it cannot run the intent.
- `required_after`: Change types after which this intent should be considered.
- `kind`: Classification such as mustflow builtin or repository command.
- `lifecycle`: Specifies whether the command is oneshot or long-running.
- `run_policy`: Whether agents may run the intent or explicit approval is required. New configurations should use `agent_allowed` or `requires_explicit_user_request`; `run_policy = "manual_only"` is accepted only for older config compatibility.
- `argv`: Command and arguments executed without shell interpretation. Obvious long-running forms
  such as shell wrappers, interpreter loops, package-manager development scripts, watchers, and
  development servers are rejected for agent-runnable one-shot intents.
- `mode`: Set to `shell` only when shell syntax is required.
- `cmd`: Shell command string used when `mode = "shell"`.
- `allow_shell`: Required as `true` before a shell-mode intent can use `run_policy = "agent_allowed"`.
- `allow_long_running_command_patterns`: Optional acknowledgement for a bounded `oneshot` command whose executable name or arguments match a common long-running pattern. Background shell patterns remain blocked.
- `cwd`: Working directory for the command.
- `timeout_seconds`: Command timeout.
- `kill_after_seconds`: Optional per-intent process-cleanup wait time after timeout.
- `stdin`: Standard input behavior. Agent-runnable intents must use `closed`.
- `success_exit_codes`: Exit codes considered successful.
- `env_policy`: Optional override for command environment handling. Use `minimal`, `allowlist`, or explicit `inherit`.
- `env_allowlist`: Extra variable names allowed when `env_policy = "allowlist"`.
- `allow_env_inheritance_risks`: Optional acknowledgement for an agent-runnable intent that intentionally uses `env_policy = "inherit"`.
- `manual_start_hint`: Optional human-facing hint for starting a long-running command outside agent execution.
- `health_check_url`: Optional URL a human can use to inspect a manually started long-running process.
- `stop_instruction`: Optional human-facing instruction for stopping a manually started long-running process.
- `related_oneshot_checks`: Optional one-shot intent names that can verify or inspect the same surface without starting the long-running process.
- `writes`: Paths the command may modify.
- `resources`: Optional top-level resource declarations for shared outputs such as build directories.
- `effects`: Optional per-intent side-effect declarations used to explain resource locks and safe verification order. When absent, `writes` is treated as a conservative exclusive write lock.
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

## Environment Policy

`mf run` records the effective environment policy in previews and run receipts, but it never prints environment variable values.

- `minimal`: pass only basic process-launch variables such as `PATH`, home and temp-directory variables, terminal color flags, language settings, and Windows process essentials. The project-local `node_modules/.bin` path is still removed from `PATH`.
- `allowlist`: start from the minimal environment, then add names from `defaults.env_allowlist` and the intent's `env_allowlist`.
- `inherit`: pass the host process environment after removing the project-local `node_modules/.bin` path from `PATH`. Use this only when a command truly needs broad host state.

Installed templates use `env_policy = "minimal"` by default. Existing configs without an environment policy fall back to `minimal`. New runnable intents should prefer `minimal` or `allowlist`; use `inherit` only when the command really needs broad host state. `mf check --strict` warns when a configured agent-runnable intent uses `inherit`, and treats `inherit` with network, destructive, shell, or write behavior as a stricter risk unless the intent explicitly sets `allow_env_inheritance_risks = true`.

Because the project-local `node_modules/.bin` path is removed from `PATH`, do not declare bare local tool names such as `eslint`, `tsc`, or `vitest` as the executable. Use a package-manager mediated command instead, for example `npm exec eslint -- ...`, `pnpm exec tsc -- --noEmit`, `bun x eslint ...`, or `yarn exec eslint ...`. `mf check --strict` warns when an agent-runnable intent uses a bare executable name that matches a file under the project-local `.bin` directory, except for names listed in `defaults.allow_project_local_bin_bare_executables`. When an allowed name exists locally, `mf run` resolves that executable directly instead of adding all project-local binaries to `PATH`.

If a shell is required for an agent-runnable intent, set `mode = "shell"`, `cmd`, and
`allow_shell = true`, then declare the command impact and write paths. Prefer `argv` when possible.

For `unknown`, `not_applicable`, `manual_only`, and `disabled`, agents must not infer a replacement command.

## Effects and Resource Locks

Use `resources` and `effects` when simple write paths are not enough to explain command conflicts.

```toml
[resources.dist_build_output]
type = "path"
paths = ["dist/**"]
concurrency = "exclusive_writer"
description = "Generated build output."

[intents.test_release]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
writes = ["dist/"]
effects = [
  { type = "write", mode = "delete_recreate", path = "dist/**", lock = "dist_build_output", concurrency = "exclusive" },
]
```

Supported effect modes are `read`, `write`, `append`, `replace`, and `delete_recreate`.
`delete_recreate` conflicts with both readers and writers of the same lock.
Effect paths are resolved from the intent `cwd` and must stay inside the current mustflow root.
If `effects` are omitted, mustflow derives an exclusive lock from each `writes` path.
This metadata explains safe ordering for verification plans; `mf run` itself still executes one command at a time and writes one latest receipt.

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

[intents.test_coverage]
status = "unknown"
reason = "No coverage command has been declared."
agent_action = "do_not_guess_report_missing"

[intents.snapshot_update]
status = "manual_only"
reason = "Snapshot updates can hide unintended output changes."
agent_action = "do_not_update_snapshots_without_approval"
```

Agents should use these intent names when maintaining tests, but must still resolve each one through
`commands.toml`. A missing related-test or audit command is reported; it is not guessed.

Projects that want changed-file test targeting may add `.mustflow/config/test-selection.toml`.
That optional file can match classified paths and surfaces to already-declared command intents and
optional test targets. It does not grant command authority. The selected intent must still be
declared in `commands.toml`, and test targets are passed only when the intent declares
`[intents.<name>.selection] accepts_test_targets = true`.

## Asset Optimization Intent

The default template includes `asset_optimize` as an unknown intent for repository-specific web image optimization pipelines.

```toml
[intents.asset_optimize]
status = "unknown"
description = "Optimize web image assets with the repository's declared image pipeline."
reason = "No image optimization command has been declared for this repository."
agent_action = "do_not_guess_report_missing"
required_after = ["image_asset_change", "web_asset_change"]
```

Agents should use this intent name when a skill or task needs image compression, resizing, or format conversion. The template does not configure a default converter because projects may use framework image pipelines, Sharp, Squoosh, ImageMagick, CDN transforms, or a custom build step.

## Command Lifecycle

- `oneshot`: A command that is expected to exit upon completion.
- `server`: A long-running local server.
- `watch`: A file-watching command that does not exit on its own.
- `interactive`: A command that requires user interaction.
- `browser`: A browser or UI process.
- `background`: A process intended to remain in the background.

Agents may run only `oneshot` intents by default. `server`, `watch`, `interactive`, `browser`, and `background` must not use `run_policy = "agent_allowed"`.

Long-running intents may carry manual guidance metadata, but that metadata is informational only and does not make the intent runnable by agents.

If a bounded `oneshot` command has a name that looks long-running, such as a repository script named `dev` that exits in CI mode, set `allow_long_running_command_patterns = true` on that intent. This does not allow background shell patterns or change the lifecycle requirement.

```toml
[intents.dev_server]
status = "configured"
lifecycle = "server"
run_policy = "requires_explicit_user_request"
description = "Start a development server for manual inspection."
argv = ["pnpm", "dev"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = []
manual_start_hint = "Start this in a human-controlled terminal."
health_check_url = "http://127.0.0.1:3000/health"
stop_instruction = "Stop the terminal process with Ctrl-C."
related_oneshot_checks = ["test_fast"]
```

`mf run <intent>` executes only intents where `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`, `stdin = "closed"`, `timeout_seconds` is a positive integer, a command is declared through `argv` or `mode = "shell"` plus `cmd`, shell mode also sets `allow_shell = true`, and `cwd` stays inside the current mustflow root.
Upon completion, it logs the latest run record to `.mustflow/state/runs/latest.json`; when run with `--json`, it also outputs the same record to standard output.

## Built-In Intents

`mustflow_doctor` performs a read-only inspection of the current mustflow root, including installation state, validation results, runnable command intents, and suggested next steps.

```toml
[intents.mustflow_doctor]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "doctor", "--json"]
cwd = "."
timeout_seconds = 300
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
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = ["REPO_MAP.md"]
```

The default template also exposes `mf update` through built-in intents so agents
can produce run receipts instead of bypassing the command contract. Use
`mustflow_update_dry_run` to run `mf update --dry-run --json` without writes.
Use `mustflow_update_apply` only after a clean plan and only when the task calls
for applying template updates.

The root `config/` directory may belong to the user project, so mustflow does not use it.

## Git-Related Intents

The default template includes read-only Git intents used for final reporting and commit message suggestions.

```toml
[intents.changes_status]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "status", "--short"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
writes = []
network = false
destructive = false

[intents.changes_diff_summary]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "diff", "--stat"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
writes = []
network = false
destructive = false
```

These intents are used to inspect modified files and provide a summary of changes without altering the Git state.

Actual commits are manual-only by default.

```toml
[intents.git_commit]
status = "manual_only"
reason = "Commits require explicit user approval."
agent_action = "do_not_commit_report_suggestion_only"
```

Agents may suggest commit messages, but they must not stage, commit, or push without an explicit user request.
