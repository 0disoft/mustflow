---
mustflow_doc: skill.process-execution-safety
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: process-execution-safety
description: Apply this skill when spawning, wrapping, previewing, timing out, terminating, buffering, streaming, or reporting child processes, built-in command reruns, shell commands, argv commands, environment variables, output limits, process trees, or long-running command patterns.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.process-execution-safety
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test_release
    - mustflow_check
---

# Process Execution Safety

<!-- mustflow-section: purpose -->
## Purpose

Ensure process execution obeys declared command contracts, terminates reliably, bounds output and environment exposure, and does not treat a kill attempt as a verified process exit.

<!-- mustflow-section: use-when -->
## Use When

- Code spawns, wraps, previews, streams, buffers, times out, kills, reruns, or reports a child process or in-process built-in command.
- A command path handles shell mode, argv mode, process groups, Windows task termination, POSIX signals, output limits, stdin, environment variables, or working directories.
- Long-running, background, watcher, server, browser, daemon, shell wrapper, package-manager, or project-local executable patterns are allowed, blocked, or classified.
- Receipts, logs, verification, write tracking, or final reports depend on whether a command actually finished.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes a command contract entry and not process execution code; use `command-contract-authoring`.
- The task only changes filesystem writes after a process exits; use `cross-platform-filesystem-safety` if path safety is the main risk.
- The task only changes CLI output wording; use `cli-output-contract-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The execution path: shell, argv, built-in rerun, preview, dry run, JSON mode, streaming mode, or configured command intent.
- Timeout, grace period, force-kill behavior, output limit, stdin policy, environment policy, working directory, process tree behavior, and receipt or write-tracking expectations.
- Platform boundary for Windows and POSIX process termination.
- Existing tests for timeout, output overflow, environment redaction, local executable avoidance, command eligibility, and receipt status.
- Relevant command-intent entries for related tests, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- `.mustflow/config/commands.toml` has been checked for configured verification intents.
- Process execution changes are treated as security, data-consistency, and verification-integrity risk, not just runtime plumbing.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update process execution code, process-tree helpers, output buffers, environment creation, receipts, eligibility checks, tests, and directly synchronized docs.
- Prefer one execution path for JSON and human modes when output format alone should differ.
- Do not bypass timeouts, output limits, working-directory checks, environment policy, or receipt generation for convenience.
- Do not run unconfigured servers, watchers, background tasks, or interactive commands.

<!-- mustflow-section: procedure -->
## Procedure

1. Map the execution path from command contract to child process, output handling, receipt writing, write tracking, and final status.
2. Confirm that shell and argv modes enforce the same safety boundary where they represent the same command intent.
3. Check timeout semantics. A timeout should initiate termination, wait through the declared grace behavior when possible, attempt force termination when needed, and record whether cleanup was confirmed or still uncertain.
4. Check output limit semantics. Output overflow should be distinct from process start failure, apply consistently across output modes, preserve bounded tails, and avoid unbounded memory growth.
5. Check process-tree cleanup. On POSIX, account for process groups and signals. On Windows, account for task termination behavior and the fact that process-group semantics differ.
6. Check in-process shortcuts. Built-in commands should not bypass timeout, output, environment, working-directory, or receipt policy unless the command contract explicitly accepts the weaker boundary.
7. Check environment exposure. Minimal or allowlisted environments should be the default for agent-runnable commands, with redaction only as a logging safeguard, not as execution isolation.
8. Check command eligibility before execution. Long-running and shell-wrapper patterns should be blocked or made manual-only before relying on timeout as the only defense.
9. Check write tracking and receipts. Do not finalize a receipt or write-drift snapshot as complete while a child process may still be writing, unless the receipt states cleanup is unconfirmed.
10. Add focused tests for timeout, output limit, environment, built-in rerun, local executable avoidance, and platform-neutral status semantics as justified by the change.

<!-- mustflow-section: postconditions -->
## Postconditions

- Execution status, timeout status, output status, cleanup status, receipt status, and write tracking tell the same story.
- JSON and human modes differ only in presentation unless a documented contract says otherwise.
- Any unconfirmed cleanup or platform limitation is explicit in the report.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test_release`
- `mustflow_check`

Escalate to broader configured tests when execution behavior crosses many command surfaces.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a timed-out or output-limited process cannot be confirmed terminated, record the uncertainty and do not claim full cleanup.
- If environment isolation cannot be applied to a path, fail closed or route through a spawned process that can honor the contract.
- If a platform-specific termination test is not available, report the skipped platform check and cover the shared status contract.
- If a process safety fix conflicts with convenience or performance, preserve safety and report the tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Process execution surface reviewed
- Timeout, force-kill, output-limit, environment, stdin, cwd, and process-tree boundaries
- Receipt, write-tracking, and cleanup-confirmation behavior
- Shell, argv, JSON, streaming, and built-in path consistency
- Tests or fixtures added or reused
- Command intents run
- Remaining process execution risk
