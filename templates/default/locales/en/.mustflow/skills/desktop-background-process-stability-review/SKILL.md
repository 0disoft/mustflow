---
mustflow_doc: skill.desktop-background-process-stability-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: desktop-background-process-stability-review
description: Apply this skill when Windows services, macOS LaunchDaemon or LaunchAgent jobs, Linux systemd units, Electron main or utility processes, WebView helpers, tray apps, sync workers, local daemons, auto-start helpers, updaters, desktop background jobs, or cross-session desktop processes need stability review for crash recovery, durable checkpoints, single-instance and data-directory locks, OS supervisor configuration, restart backoff, health checks, heartbeats, leases, idempotent jobs, atomic file writes, shutdown and preshutdown handling, exit-code semantics, UI and worker process separation, service Session 0 isolation, launchd daemon versus agent choice, systemd restart limits, sleep/resume, monotonic time, IPC authorization, environment and working-directory determinism, least privilege, startup logging, crash reporting, update safety, lifecycle tests, and safe mode.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.desktop-background-process-stability-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Desktop Background Process Stability Review

<!-- mustflow-section: purpose -->
## Purpose

Review desktop background processes as recoverable local systems, not immortal processes.

The review question is not "how do we keep this process alive forever?" It is "when this service,
agent, helper, worker, tray process, or sync daemon dies, restarts, races another instance, loses
network, resumes from sleep, or updates mid-job, what durable evidence prevents data loss,
duplicate side effects, privilege confusion, or silent stuck work?"

<!-- mustflow-section: use-when -->
## Use When

- Windows services, service helpers, SCM failure actions, preshutdown handlers, service SIDs,
  Session 0 boundaries, scheduled tasks, tray apps, auto-start entries, or user-session helpers are
  created, changed, reviewed, or reported.
- macOS LaunchDaemons, LaunchAgents, login items, app helpers, background items, agent versus daemon
  placement, launchd restart behavior, per-user state, or fork/daemonize behavior is involved.
- Linux desktop services, systemd user units, system units, restart policies, start-rate limits,
  working directories, sandboxing, or service environment are involved.
- Electron, Tauri, WebView, native desktop, .NET, JVM, Python, Rust, C++, Go, Node, or shell-backed
  apps run main-process, utility-process, child-process, updater, sync, indexing, notification,
  tray, plugin, or background work outside the visible UI lifecycle.
- Code touches durable checkpoints, local queues, job leases, single-instance locks, data-directory
  locks, IPC, crash reporting, heartbeat records, sleep/resume handling, network reachability,
  monotonic timers, atomic settings writes, exit codes, update drain, rollback, or safe mode.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only installed app startup from process launch to first frame or fully usable state;
  use `app-startup-performance-review`.
- The task is only memory residency, renderer count, hidden windows, decoded media, caches, or
  after-close memory; use `desktop-memory-footprint-review`.
- The task is only queue acknowledgement, offsets, DLQ, prefetch, redelivery, or broker semantics;
  use `queue-processing-integrity-review`.
- The task is only duplicate external requests or business-command replay; use
  `idempotency-integrity-review`.
- The task is only generic failure handling that can make the system falsely report success; use
  `failure-integrity-review`.
- The task is only backend or server deployment rollout, probes, canaries, or rollback; use
  `deployment-rollout-safety-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Process ledger: process role, platform, supervisor, user session, privilege level, data directory,
  account or profile scope, autostart path, UI relationship, updater relationship, and shutdown
  owner.
- Recovery ledger: durable checkpoint, last safe offset, job table, local queue, lease fields,
  startup recovery flow, stale-lock cleanup, partial-write handling, and corruption response.
- Instance ledger: app single-instance lock, user-session lock, data-directory lock, account lock,
  updater/helper lock, lock acquisition timing, stale lock detection, and cross-elevation or
  cross-session behavior.
- Supervisor ledger: Windows SCM, scheduled task, launchd daemon or agent, systemd user or system
  unit, restart policy, backoff, start-rate limit, manual stop behavior, safe mode trigger, and
  environment or working-directory contract.
- Health ledger: PID check, event-loop progress, IPC response, database or file lock check, queue
  progress, heartbeat fields, last progress time, current job id, processed offset, last success,
  last error code, and stuck-work classification.
- Lifecycle ledger: normal stop, crash, kill, logout, shutdown, preshutdown, sleep, resume, network
  loss, VPN change, disk full, permission loss, clock jump, antivirus file lock, update, rollback,
  and first-start-after-update behavior.
- Security ledger: IPC ACL, local token, origin or caller verification, schema version, request size
  limit, request timeout, least privilege, writable paths, service SID, sandboxing, secret storage,
  and crash/log redaction.
- Existing tests, telemetry, crash reports, logs, package or installer surfaces, synchronized docs or
  templates, and configured command-intent evidence.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required process, supervisor, recovery, and lifecycle evidence is available from current files,
  diffs, docs, configured outputs, user-provided evidence, or can be reported as missing without
  guessing.
- Treat OS documentation, installer manifests, service plist or unit files, registry entries,
  autostart entries, and package scripts as contract surfaces when the change depends on them.
- If the change touches money, privacy, security, migrations, queue semantics, file corruption, or
  cloud sync, also use the narrower matching skill when its trigger is present.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten durable checkpoints, local job states, leases, startup recovery, stale-lock cleanup,
  single-instance locks, data-directory locks, idempotency keys, atomic file writes, fsync/rename
  write paths, exit-code classification, health probes, progress heartbeats, restart backoff,
  safe-mode thresholds, lifecycle handlers, sleep/resume recovery, IPC authorization, explicit
  environment setup, least-privilege configuration, early logging, crash reporter metadata, and
  focused lifecycle tests.
- Separate UI process lifecycle from worker process lifecycle when the visible app, tray app,
  renderer, helper, or worker currently owns unrelated shutdown or recovery behavior.
- Prefer OS supervisors such as Windows SCM, launchd, and systemd over hand-rolled infinite monitor
  loops when the platform already owns restart and lifecycle policy.
- Do not add a watchdog, autostart entry, restart policy, or hidden process solely to hide crashes.
- Do not rely on shutdown hooks as the primary persistence path.
- Do not broaden privileges, writable paths, IPC trust, or background execution scope to make
  recovery easier.
- Do not start raw services, background processes, profilers, OS lifecycle tests, login item changes,
  installer changes, or system configuration outside the configured command contract.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the process boundary.
   - Name each background process, helper, renderer, service, agent, updater, tray app, and worker.
   - Record the owner of data, UI, IPC, update, crash reporting, and shutdown for each role.
   - Reject "the app is running" as a sufficient invariant when visible UI and background work have
     different lifecycles.
2. Treat process death as normal.
   - Identify what state is safe after crash, kill, logout, shutdown, update, or power loss.
   - Move essential progress from memory-only state into durable checkpoints, local job records,
     append-only logs, or recoverable files.
   - Report any path whose only recovery story is "the process should not die."
3. Make startup recovery explicit.
   - On process start, recover leased jobs, stale locks, partial files, local queues, pending sync
     records, interrupted migrations, and previous crash metadata before accepting new work.
   - Keep recovery bounded and observable; a restart that immediately re-enters the same corrupted
     state is a crash loop, not resilience.
4. Separate process single-instance from resource ownership.
   - Acquire app or process single-instance locks before opening databases, queues, files, IPC
     sockets, network sessions, or updater resources.
   - Also review locks by data directory, profile id, account id, device id, and privilege/session
     boundary.
   - Do not assume one desktop session, one elevation level, or one helper binary means one writer.
5. Model jobs with leases and terminal states.
   - Prefer `pending`, `leased`, `done`, and `failed` or equivalent explicit states over one
     "processing" boolean.
   - Include `job_id`, `dedupe_key`, `attempt`, `lease_until`, `completed_at`, and failure reason
     when repeated work or restart recovery can happen.
   - Recover expired leases and keep in-flight side effects idempotent.
6. Make writes crash-safe.
   - For settings, checkpoints, queues, indexes, tokens, and manifests, prefer write-temp,
     flush, fsync, and atomic rename or the repository's equivalent safe-write helper.
   - Ensure a crash leaves either the old version or the new version, not a half-written JSON, TOML,
     database, index, or checkpoint.
7. Persist during normal operation.
   - Treat shutdown hooks, preshutdown callbacks, signal handlers, and app quit events as best-effort
     cleanup, not the only moment progress is saved.
   - Keep long cleanup out of direct service control handlers unless the platform contract supports
     reporting progress safely.
8. Use the OS supervisor deliberately.
   - For Windows, review SCM failure actions, delayed auto-start, service SID, preshutdown, and
     Session 0 isolation.
   - For macOS, choose LaunchDaemon for system-wide work and LaunchAgent for per-user work, and do
     not daemonize under launchd.
   - For Linux, review systemd user versus system units, restart policy, start-rate limits, working
     directory, environment, and sandboxing.
9. Add restart discipline.
   - Automatic restart needs backoff, max attempts, failure classification, and safe mode.
   - Preserve a user-intentional stop separately from crash recovery so scheduled restarts do not
     surprise users after they explicitly stopped the background process.
   - Detect crash loops and stop consuming CPU, battery, network, and trust.
10. Replace PID checks with progress checks.
    - A live PID only proves a process exists.
    - Prefer health that proves event-loop turns, IPC responses, local storage access, queue progress,
      last successful sync, last progress time, and bounded latency.
    - Separate alive, ready, progressing, degraded, and blocked states when the UI or supervisor uses
      the result.
11. Make heartbeats useful.
    - Heartbeats should include progress evidence, such as `last_progress_at`, `current_job_id`,
      `processed_offset`, `last_successful_sync_at`, `last_error_code`, process start id, build
      version, and attempt.
    - Avoid `last_seen_at` alone when a tight loop, deadlock, or stuck queue can keep updating it.
12. Keep UI and background lifecycle separate.
    - Closing a window, hiding a tray icon, renderer crash, UI reload, or WebView crash should not
      silently kill durable background work unless that is the explicit product contract.
    - A worker crash should be visible to the UI as degraded or recovering, not hidden behind stale
      status text.
13. Respect desktop platform boundaries.
    - Do not show UI directly from a Windows service running in Session 0; communicate with a
      user-session process through authorized IPC.
    - Do not put per-user macOS camera, clipboard, notification, home-directory, or UI-like work into
      a system daemon when a LaunchAgent is the proper boundary.
    - Do not solve network availability through boot ordering alone.
14. Treat sleep and resume as first-class failures.
    - On resume, suspect sockets, DNS, VPN, file handles, timers, leases, auth sessions, and
      reachability.
    - Revalidate network and storage before resuming queued work.
    - Keep stale in-memory timers from making lease or timeout decisions after a long sleep.
15. Use monotonic time for durations.
    - Measure timeouts, lease intervals, heartbeat gaps, retry delay, and crash-loop windows with a
      monotonic clock or equivalent elapsed-time source.
    - Use wall-clock timestamps only for user-visible time and audit records that need calendar time.
16. Harden IPC.
    - Treat localhost ports, named pipes, Unix sockets, custom protocols, shared memory, and
      renderer-to-main messages as local attack surfaces.
    - Add ACLs, caller tokens, origin checks, message schema versions, request size limits, per-request
      timeouts, and safe error handling where applicable.
17. Make environment deterministic.
    - Use absolute executable paths, explicit working directories, explicit data directories, and
      bounded environment variables.
    - Do not depend on a shell PATH, current directory, inherited locale, inherited HOME, or interactive
      user environment unless the contract states that requirement.
18. Reduce privilege and write scope.
    - Run background work with the least privilege that can do the job.
    - Limit writable directories to data, logs, crash dumps, and update staging paths that are actually
      needed.
    - Keep elevated helpers small, IPC-gated, audited, and unable to execute arbitrary UI commands.
19. Capture earliest failure evidence.
    - Initialize crash reporting and stdout or stderr capture before creating renderers, workers, IPC,
      or long startup work.
    - Include app version, channel, OS, architecture, process role, process start id, job id, safe
      account hash, feature flags, exit reason, and supervisor restart reason when the repository has
      safe observability patterns.
    - Redact secrets, tokens, paths, raw account identifiers, and user content.
20. Make updates restart-safe.
    - Before updating, drain or shorten leases, persist checkpoints, pause risky queue consumers, and
      keep rollback or previous-version compatibility evidence.
    - Make migrations and helper registration re-entrant.
    - Do not delete the old executable, helper, service definition, or data compatibility path before
      the new version proves healthy.
21. Add real lifecycle tests or explicit manual gaps.
    - Prefer tests or probes for double start, stale lock, expired lease recovery, atomic write crash
      boundary, IPC denial, user stop versus crash restart, sleep/resume handling, update interruption,
      corrupted local file, disk full, permission denial, and safe-mode entry.
    - If OS-level lifecycle tests are not configured intents, report them as manual-only evidence gaps.
22. Define safe mode.
    - After repeated crashes or startup failures, disable risky plugins, queue consumption, sync loops,
      GPU-heavy features, recent migrations, or aggressive background work.
    - Keep enough diagnostics for repair, and avoid a crash loop that consumes CPU, battery, network,
      or user trust.

<!-- mustflow-section: postconditions -->
## Postconditions

- Process roles, durable state, startup recovery, instance locks, supervisor policy, restart backoff,
  health checks, progress heartbeats, job leases, atomic writes, shutdown behavior, exit-code
  semantics, UI and worker lifecycle, platform boundaries, sleep/resume, monotonic time, IPC,
  environment, privilege, logging, crash reporting, update safety, lifecycle tests, and safe mode are
  explicit.
- Memory-only state, late single-instance locks, PID-only health checks, `last_seen_at`-only
  heartbeats, one "processing" boolean, non-atomic local files, shutdown-only persistence, hand-rolled
  monitor loops, unbounded restart loops, user-stop/restart confusion, service UI from Session 0,
  daemon/agent mismatch, daemonizing under launchd, boot-order network assumptions, wall-clock lease
  timers, trusted local IPC, inherited PATH or working directory dependence, overprivileged helpers,
  missing early logs, uninitialized crash reporter gaps, one-shot migrations, and no-op safe mode are
  fixed or reported.
- Desktop background stability claims are backed by configured tests, static-review evidence,
  telemetry or crash evidence, or labeled as manual-only or missing.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured test, build, docs, release, or mustflow intent that covers the
changed process, supervisor, template, installer, IPC, file-write, queue, or lifecycle surface. Do
not infer raw service starts, launchd loads, systemd starts, installer changes, login item edits,
sleep/resume automation, crash reporter dashboards, or OS lifecycle harnesses outside the command
contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a configured command fails, preserve the failing intent, failing assertion or output tail, and
  the lifecycle invariant it exercised before editing again.
- If only static evidence is available, report that OS-supervisor, sleep/resume, update, and
  crash-loop behavior still need manual or platform harness validation.
- If safe repair requires installer changes, service registration changes, updater design, privilege
  changes, OS lifecycle harnesses, migration policy, or product decisions outside scope, report that
  boundary instead of inventing commands.
- If process stability conflicts with data safety, user intent, security, privacy, least privilege,
  update rollback, or battery life, keep the safer behavior and report the tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- Desktop background process stability boundary reviewed
- Process, recovery, instance-lock, supervisor, restart, health, heartbeat, lease, atomic-write,
  shutdown, platform, power, time, IPC, environment, privilege, logging, crash, update, lifecycle-test,
  and safe-mode findings
- Stability fixes made or recommended
- Evidence level: configured-test evidence, static desktop-process risk, telemetry/crash evidence,
  manual-only, missing, or not applicable
- Command intents run
- Skipped desktop lifecycle diagnostics and reasons
- Remaining desktop background process stability risk
