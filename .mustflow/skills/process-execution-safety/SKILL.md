---
mustflow_doc: skill.process-execution-safety
locale: en
canonical: true
revision: 4
lifecycle: mustflow-owned
authority: procedure
name: process-execution-safety
description: Apply this skill when spawning, wrapping, previewing, timing out, terminating, buffering, streaming, classifying, or reporting child processes, built-in command reruns, shell commands, argv commands, environment variables, output limits, process trees, Git or package-manager failures, or long-running command patterns.
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
- Code invokes Git clone or checkout, package managers, project scaffolders, archive tools, build tools, test runners, Docker wrappers, or installers whose failures can be misclassified as network, token, auth, dependency, or unknown errors.
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
- Timeout, grace period, force-kill behavior, output limit, stdin policy, argv and shell command-length budget, environment policy, working directory, process tree behavior, and receipt or write-tracking expectations.
- Platform boundary for Windows and POSIX process termination.
- Failure classification rules for child-process output and exit causes, including filesystem/path, permission/lock, resource exhaustion, shell/environment, missing executable, network, token, auth, dependency, timeout, output overflow, and unknown categories.
- For Git and scaffolding flows: clone or checkout destination, path-length policy, per-process Git config policy, partial-output owner, cleanup timing, and diagnostic-preservation expectations.
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
- Do not use child-process code to apply privileged host repairs such as registry edits, global Git config, Developer Mode changes, WSL shutdown or mount edits, sysctl writes, Docker Desktop setting changes, antivirus exclusions, shell profile edits, or automatic commits unless an explicit configured command intent and user request authorize that setup operation.

<!-- mustflow-section: procedure -->
## Procedure

1. Map the execution path from command contract to child process, output handling, receipt writing, write tracking, and final status.
2. Confirm that shell and argv modes enforce the same safety boundary where they represent the same command intent.
3. Prefer argv execution over shell-string execution for dynamic commands. Do not build `exec("long command string")` or shell wrappers from repository paths, file lists, prompts, JSON, or user input when the tool can accept a file plus args, stdin, or an owned temporary parameter file.
4. Keep large payloads out of argv and shell strings. Pass large JSON, file lists, AI prompts, generated context, and batch parameters through stdin or an owned temporary file with bounded lifetime, ownership, redaction, and cleanup policy.
5. Classify command-length failures separately. Windows process creation, `cmd.exe`, POSIX `ARG_MAX`, shells, package managers, and wrapper scripts can fail at different limits; map these to `argv_too_long` or `shell_command_too_long` before retrying or reporting an unknown tool failure.
6. In Node.js path handling around process execution, use explicit `path.win32` or `path.posix` behavior when parsing a path format that may differ from the host OS. Do not assume host-default `node:path` behavior proves cross-platform command construction.
7. Check timeout semantics. A timeout should initiate termination, wait through the declared grace behavior when possible, attempt force termination when needed, and record whether cleanup was confirmed or still uncertain.
8. Check output limit semantics. Output overflow should be distinct from process start failure, apply consistently across output modes, preserve bounded tails, and avoid unbounded memory growth.
9. Check process-tree cleanup. On POSIX, account for process groups and signals. On Windows, account for task termination behavior and the fact that process-group semantics differ.
10. Check in-process shortcuts. Built-in commands should not bypass timeout, output, environment, working-directory, or receipt policy unless the command contract explicitly accepts the weaker boundary.
11. Check environment exposure. Minimal or allowlisted environments should be the default for agent-runnable commands, with redaction only as a logging safeguard, not as execution isolation.
12. Check command eligibility before execution. Long-running and shell-wrapper patterns should be blocked or made manual-only before relying on timeout as the only defense.
13. For Git clone or checkout on Windows, prefer argv mode with a per-process `core.longpaths=true` configuration when compatible. Do not mutate global Git config from product code unless the user explicitly selected that setup action.
14. For Git, package-manager, and scaffolder materialization, coordinate with filesystem safety: preflight entries when feasible, run the dangerous operation only against an app-owned staging area, classify failure before cleanup, then delete only owned partial output.
15. Classify child-process failures before retrying or reporting them. Separate filesystem/path, permission/lock, resource exhaustion, shell/environment, missing executable, network, token, auth, dependency, timeout, output overflow, argv length, shell command length, and unknown causes.
16. Do not classify a Git checkout path failure as network, token, or auth merely because the top-level operation was clone. Output such as filename-too-long, invalid path, reserved name, permission denied, file locked, no space left, too many open files, watcher limit, bad interpreter, missing executable bit, argv-too-long, or shell-command-too-long should map to platform, filesystem, resource, or shell categories first.
17. Preserve bounded stdout/stderr tails, exit status, signal, timeout status, cwd, argv summary, and cleanup status before deleting partial output from clone, checkout, scaffold, install, or archive-tool failures.
18. Keep retry policy cause-aware. Retry transient locks or recoverable process cleanup only when bounded and idempotent; do not blindly retry auth, token, path-too-long, reserved-name, or destructive cleanup failures.
19. Treat environment repair as a separate setup workflow, not as an invisible fallback inside clone, install, build, or test execution. Report missing host prerequisites and the blocked action rather than silently running privileged or global mutation commands.
20. Check write tracking and receipts. Do not finalize a receipt or write-drift snapshot as complete while a child process may still be writing, unless the receipt states cleanup is unconfirmed.
21. Add focused tests for timeout, output limit, environment, built-in rerun, local executable avoidance, failure classification, diagnostic preservation, partial-output cleanup, blocked host-repair fallback, and platform-neutral status semantics as justified by the change.

<!-- mustflow-section: postconditions -->
## Postconditions

- Execution status, timeout status, output status, cleanup status, receipt status, and write tracking tell the same story.
- Child-process failures have cause-aware categories that separate filesystem/path, permission/lock, resource exhaustion, shell/environment, network, token, auth, dependency, timeout, output overflow, argv length, shell command length, and unknown causes.
- Partial clone, checkout, scaffold, install, or archive outputs are cleaned up only after bounded diagnostics and app-owned staging or generated-state ownership are known.
- Host repair commands are either modeled as explicit configured setup intents or reported as prerequisites, not hidden inside ordinary command execution.
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
- If a child process fails after creating files, preserve bounded diagnostics and classify path/platform causes before deleting owned partial output or reporting a network, token, auth, dependency, or unknown failure.
- If recovery would require privileged or global host mutation, stop and report the prerequisite instead of running the mutation as a fallback.
- If environment isolation cannot be applied to a path, fail closed or route through a spawned process that can honor the contract.
- If a platform-specific termination test is not available, report the skipped platform check and cover the shared status contract.
- If a process safety fix conflicts with convenience or performance, preserve safety and report the tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Process execution surface reviewed
- Timeout, force-kill, output-limit, environment, stdin, cwd, and process-tree boundaries
- Receipt, write-tracking, and cleanup-confirmation behavior
- Shell, argv, JSON, streaming, and built-in path consistency
- Failure classification, retry policy, argv and shell length handling, diagnostic preservation, and partial-output cleanup behavior
- Host repair prerequisites reported or deferred
- Tests or fixtures added or reused
- Command intents run
- Remaining process execution risk
