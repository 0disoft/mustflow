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

This scheduling metadata does not enable parallel execution in `mf run`. Until run receipts no longer share a single `latest.json` target, copied verification commands should still be executed serially.

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