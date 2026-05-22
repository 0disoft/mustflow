# Command Contract v1

This specification defines when a command intent is runnable through `mf run`.

## Scope

The source of truth for project commands is  
[.mustflow/config/commands.toml](../../.mustflow/config/commands.toml). Agents  
and automation must not infer runnable commands from `package.json`, `Makefile`,  
`justfile`, `Taskfile.yml`, source files, or naming conventions.

## Runnable Intent Requirements

An intent is runnable by an agent only when all of the following fields are present and valid:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` is a positive integer
- a command is declared with either `argv` or `mode = "shell"` plus `cmd`
- `cwd` resolves inside the current mustflow root

If any requirement is missing or invalid, `mf run <intent>` must reject the intent.

## Effects and Resource Locks

`writes` remains the backward-compatible path summary for files a command may  
modify. When a command has side effects that affect scheduling, declare  
`effects` and optional top-level `resources`.

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

Effect paths are resolved relative to the intent working directory and must remain inside  
the current mustflow root. When `effects` are absent, mustflow treats each  
`writes` entry as a conservative exclusive write lock. The `delete_recreate` mode conflicts with readers and writers of the same lock.

This scheduling metadata does not grant command authority. `mf run` uses it to
write a local active-lock record before executing a configured intent, block
overlapping commands with conflicting locks, and release the record when the run
finishes or times out. `mf run --dry-run` reports active lock conflicts without
executing the command.

Active locks are stored under ignored local state and contain only bounded
metadata: intent id, process id, start time, command digest, declared locks, and
declared write paths. They must not store raw command output, environment
values, shell transcripts, or absolute personal paths. If a later run finds a
lock whose owning process is no longer live, it may reclaim that stale record
before acquiring its own lock.

This scheduling metadata does not enable broad parallel execution in `mf run`.
Non-conflicting explicit locks may overlap when a higher-level verifier chooses
parallel execution, but commands without explicit effects remain conservative.

## Status Values

- `configured`: the intent may be considered for execution if all runnable  
  requirements are met.
- `unknown`: the project has not declared the command. Agents must report the  
  missing command instead of guessing.
- `manual_only`: the command requires human intervention or manual execution.

## Lifecycle Rules

Only `oneshot` intents are runnable by `mf run`.

Development servers, watch modes, browser sessions, interactive prompts,  
background daemons, autonomous loops, and long-running harnesses must not be  
run through `mf run` unless a future contract introduces a separate lifecycle with  
explicit safety rules.

## Execution Mode

`argv` mode is preferred for configured commands. It executes an explicit  
program and argument list.

`shell` mode may be supported when explicitly declared by the project, but it carries higher risk and must still satisfy lifecycle, policy, timeout, and root boundary checks.

## Typed Intent Inputs

The command contract may declare validation-only typed input metadata under an
intent's `inputs` table. This metadata is a design surface for future
parameterized execution; it does not make an intent runnable.

Supported input types are:

- `path`
- `enum`
- `boolean`
- `integer`
- `literal`

Typed inputs must preserve argument boundaries. An input placeholder may appear
only as a whole `argv` token such as `{target_file}`. Shell command strings and
mixed string interpolation such as `--test={target_file}` are invalid because
they would blur command-authority and escaping rules.

Path inputs must declare one or more normalized repository-relative
`allowed_roots`. Absolute paths, traversal segments, empty roots, and Windows
reserved device-name segments are rejected. `allowed_extensions` entries must
start with a dot.

Until typed execution is implemented together with dry-run output, receipts,
declared effect expansion, and redaction rules, any `configured` intent that
declares `inputs` is rejected.

## Precondition Planning

An intent may declare `preconditions` as planning metadata. Preconditions explain
missing or stale prerequisites in `mf run --dry-run`, `mf verify --plan-only
--json`, and `mf explain command`; they do not execute another intent.

```toml
[intents.test_release]
preconditions = [
  { kind = "path_exists", path = "dist/cli/index.js", satisfy_intent = "build" },
  { kind = "artifact_freshness", artifact = "dist/cli/index.js", sources = ["src/**/*.ts"], satisfy_intent = "build" },
]
```

Supported precondition kinds are:

- `path_exists`: reports `satisfied` when the declared repository-relative path
  exists, otherwise `missing`.
- `artifact_freshness`: reports `missing` when the artifact does not exist,
  `stale` when a matched source file is newer, `satisfied` when the artifact is
  at least as new as matched sources, and `unknown` when no source files match.

`satisfy_intent` points to the configured command a maintainer may use to
satisfy the precondition. It is explanatory only: manual-only, unknown, stale,
or even agent-runnable satisfy intents are never run implicitly as dependencies.

## Built-in mustflow Intents

An intent with `kind = "mustflow_builtin"` and `argv[0]` equal to `mf` or  
`mustflow` should re-enter the current CLI entrypoint rather than relying on  
external PATH lookup. This ensures that self-hosted commands such as  
`mf run mustflow_check` remain portable across shell environments.

## Output and Receipts

Every `mf run` execution must write a latest run receipt according to  
[Verification Receipt v1](verification-receipt-v1.md). A direct host shell  
command may provide useful context, but it does not automatically count as  
mustflow verification.

## Testable Outcomes

- `mf run test` fails when `test` is `unknown`.
- `mf run dev_server` fails when `lifecycle` is not `oneshot`.
- `mf run lint` fails when `stdin` is not `closed`.
- `mf run build` fails when `cwd` escapes the current mustflow root.
- `mf run mustflow_check` does not require an externally discoverable `mf`  
  executable when the intent is a mustflow built-in.
- `mf check` accepts validation-only typed input metadata on non-runnable
  intents and rejects unsafe paths, undeclared placeholders, shell strings, and
  configured intents that declare inputs.
- `mf run <intent> --dry-run --json`, `mf verify --plan-only --json`, and
  `mf explain command <intent> --json` surface declared precondition status
  without running `satisfy_intent`.
